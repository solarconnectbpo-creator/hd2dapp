import type { AuthEnv } from "./authRoutes";
import { getBearerPayload } from "./authRoutes";

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json" };
}

export type LeadsCheckoutEnv = AuthEnv & {
  STRIPE_SECRET_KEY?: string;
  /** Comma-separated Stripe Price ids allowed for /api/leads/checkout-session */
  LEADS_STRIPE_PRICE_IDS?: string;
  /** SPA origin for success/cancel redirects, e.g. https://hardcoredoortodoorclosers.com */
  APP_PUBLIC_ORIGIN?: string;
};

function parsePriceAllowlist(raw: string | undefined): Set<string> {
  return new Set(
    (raw || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * POST /api/leads/checkout-session
 * Body: { priceId: string } — must be in LEADS_STRIPE_PRICE_IDS.
 */
export async function handleLeadsCheckoutSession(
  request: Request,
  env: LeadsCheckoutEnv,
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
  if (payload.user_type !== "company" && payload.user_type !== "admin") {
    return new Response(JSON.stringify({ success: false, error: "Company or admin access required." }), { status: 403, headers: j });
  }

  const secret = (env.STRIPE_SECRET_KEY || "").trim();
  if (!secret) {
    return new Response(JSON.stringify({ success: false, error: "Stripe is not configured on the server." }), {
      status: 503,
      headers: j,
    });
  }

  let body: { priceId?: string } = {};
  try {
    body = (await request.json()) as { priceId?: string };
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), { status: 400, headers: j });
  }

  const priceId = (body.priceId || "").trim();
  if (!priceId) {
    return new Response(JSON.stringify({ success: false, error: "priceId is required." }), { status: 400, headers: j });
  }

  const allow = parsePriceAllowlist(env.LEADS_STRIPE_PRICE_IDS);
  if (allow.size === 0 || !allow.has(priceId)) {
    return new Response(JSON.stringify({ success: false, error: "Unknown or disallowed price." }), { status: 400, headers: j });
  }

  const origin = (env.APP_PUBLIC_ORIGIN || "").trim().replace(/\/+$/, "");
  if (!origin) {
    return new Response(JSON.stringify({ success: false, error: "APP_PUBLIC_ORIGIN is not configured." }), {
      status: 503,
      headers: j,
    });
  }

  // Stripe replaces {CHECKOUT_SESSION_ID} when redirecting (fulfillment / support reference).
  const successUrl = `${origin}/leads?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/leads?checkout=cancel`;

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
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
    console.error("[leads-checkout] stripe error:", stripeRes.status, msg);
    return new Response(JSON.stringify({ success: false, error: "Could not start checkout." }), { status: 502, headers: j });
  }

  return new Response(JSON.stringify({ success: true, url: stripeJson.url }), { status: 200, headers: j });
}
