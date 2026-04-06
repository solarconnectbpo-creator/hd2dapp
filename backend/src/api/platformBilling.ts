import type { AuthEnv } from "./authRoutes";
import { getBearerPayload } from "./authRoutes";

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json" };
}

export type PlatformBillingEnv = AuthEnv & {
  STRIPE_SECRET_KEY?: string;
  /** Single Stripe Price id for platform membership (subscription). */
  MEMBERSHIP_STRIPE_PRICE_ID?: string;
  APP_PUBLIC_ORIGIN?: string;
};

/**
 * POST /api/billing/membership-checkout-session
 * Starts Stripe Checkout in subscription mode for the signed-in user (company or sales rep).
 */
export async function handleMembershipCheckoutSession(
  request: Request,
  env: PlatformBillingEnv,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const j = jsonHeaders(corsHeaders);
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed." }), { status: 405, headers: j });
  }

  const payload = await getBearerPayload(request, env);
  if (!payload) {
    return new Response(JSON.stringify({ success: false, error: "Sign in required." }), { status: 401, headers: j });
  }
  if (payload.user_type !== "company" && payload.user_type !== "sales_rep") {
    return new Response(JSON.stringify({ success: false, error: "Membership checkout is for company or rep accounts." }), {
      status: 403,
      headers: j,
    });
  }

  const secret = (env.STRIPE_SECRET_KEY || "").trim();
  if (!secret) {
    return new Response(JSON.stringify({ success: false, error: "Stripe is not configured on the server." }), {
      status: 503,
      headers: j,
    });
  }

  const priceId = (env.MEMBERSHIP_STRIPE_PRICE_ID || "").trim();
  if (!priceId) {
    return new Response(JSON.stringify({ success: false, error: "Membership pricing is not configured." }), {
      status: 503,
      headers: j,
    });
  }

  const origin = (env.APP_PUBLIC_ORIGIN || "").trim().replace(/\/+$/, "");
  if (!origin) {
    return new Response(JSON.stringify({ success: false, error: "APP_PUBLIC_ORIGIN is not configured." }), {
      status: 503,
      headers: j,
    });
  }

  const successUrl = `${origin}/account/pending?checkout=success`;
  const cancelUrl = `${origin}/account/pending?checkout=cancel`;

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("client_reference_id", payload.sub);
  params.set("subscription_data[metadata][user_id]", payload.sub);
  if (payload.email) {
    params.set("customer_email", payload.email);
  }

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const stripeText = await stripeRes.text();
  let stripeJson: { url?: string; error?: { message?: string } } = {};
  try {
    stripeJson = JSON.parse(stripeText) as typeof stripeJson;
  } catch {
    // leave empty
  }

  if (!stripeRes.ok || !stripeJson.url) {
    const msg = stripeJson.error?.message || stripeText.slice(0, 240) || "Stripe error";
    console.error("[membership-checkout] stripe error:", stripeRes.status, msg);
    return new Response(JSON.stringify({ success: false, error: "Could not start checkout." }), { status: 502, headers: j });
  }

  return new Response(JSON.stringify({ success: true, url: stripeJson.url }), { status: 200, headers: j });
}
