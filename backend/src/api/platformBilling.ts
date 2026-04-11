import type { AuthEnv } from "./authRoutes";
import { getBearerPayload } from "./authRoutes";

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json" };
}

export type PlatformBillingEnv = AuthEnv & {
  STRIPE_SECRET_KEY?: string;
  /** Legacy: one Price for all membership checkout when SOLO/COMPANY are unset. */
  MEMBERSHIP_STRIPE_PRICE_ID?: string;
  /** Monthly membership for field reps (`sales_rep`) — e.g. $97/mo. */
  MEMBERSHIP_STRIPE_PRICE_ID_SOLO?: string;
  /** Monthly membership for contractors (`company`) — e.g. $197/mo. */
  MEMBERSHIP_STRIPE_PRICE_ID_COMPANY?: string;
  APP_PUBLIC_ORIGIN?: string;
};

/** Pick Stripe Price id from env; reps use SOLO, companies use COMPANY, with legacy fallback. */
export function resolveMembershipStripePriceId(
  env: PlatformBillingEnv,
  userType: string,
): string | null {
  const legacy = (env.MEMBERSHIP_STRIPE_PRICE_ID || "").trim();
  const solo = (env.MEMBERSHIP_STRIPE_PRICE_ID_SOLO || "").trim();
  const company = (env.MEMBERSHIP_STRIPE_PRICE_ID_COMPANY || "").trim();

  if (userType === "sales_rep") {
    if (solo) return solo;
    if (legacy) return legacy;
    return null;
  }
  if (userType === "company") {
    if (company) return company;
    if (legacy) return legacy;
    return null;
  }
  return null;
}

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

  const priceId = resolveMembershipStripePriceId(env, payload.user_type);
  if (!priceId) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          "Membership pricing is not configured for your account type. Set MEMBERSHIP_STRIPE_PRICE_ID_SOLO and MEMBERSHIP_STRIPE_PRICE_ID_COMPANY (or MEMBERSHIP_STRIPE_PRICE_ID) on the Worker.",
      }),
      {
        status: 503,
        headers: j,
      },
    );
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
  params.set("metadata[hd2d_checkout_kind]", "membership");
  params.set("subscription_data[metadata][user_id]", payload.sub);
  params.set("subscription_data[metadata][hd2d_checkout_kind]", "membership");
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
