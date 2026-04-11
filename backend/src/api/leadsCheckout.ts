import type { AuthEnv } from "./authRoutes";
import { getBearerPayload } from "./authRoutes";
import { releaseReservationByUser, reserveAppointmentsForUser } from "../marketplace/marketplaceDb";

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json" };
}

export type LeadsCheckoutEnv = AuthEnv & {
  STRIPE_SECRET_KEY?: string;
  /** Comma-separated Stripe Price ids allowed for /api/leads/checkout-session */
  LEADS_STRIPE_PRICE_IDS?: string;
  /** Comma-separated Stripe Price ids that use bulk rules (min appointments per checkout). */
  LEADS_BULK_PRICE_IDS?: string;
  /**
   * Subset of bulk Price ids where the Stripe line item is a **fixed package** (e.g. one-time $1,970 for 10 slots).
   * Checkout sends `quantity: 1` to Stripe; appointment ids still go in metadata for fulfillment.
   * Per-unit bulk prices ($197 × qty) should **not** be listed here.
   */
  LEADS_BULK_FIXED_PRICE_IDS?: string;
  /** Min appointments when price id is listed in LEADS_BULK_PRICE_IDS (default 5). */
  LEADS_BULK_MIN_APPOINTMENTS?: string;
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

function parseBulkPriceIds(raw: string | undefined): Set<string> {
  return parsePriceAllowlist(raw);
}

function bulkMinAppointments(env: LeadsCheckoutEnv): number {
  const n = parseInt((env.LEADS_BULK_MIN_APPOINTMENTS || "5").trim(), 10);
  return Number.isFinite(n) && n >= 1 ? n : 5;
}

/**
 * POST /api/leads/checkout-session
 * Body: { priceId: string, appointmentIds?: string[] }
 * When appointmentIds is non-empty, rows are reserved and Stripe metadata carries ids for the webhook.
 * Bulk price ids (LEADS_BULK_PRICE_IDS) require at least LEADS_BULK_MIN_APPOINTMENTS selections; other prices require exactly one.
 * If the bulk Price is a fixed package total, list it in LEADS_BULK_FIXED_PRICE_IDS so Stripe quantity stays 1.
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

  let body: { priceId?: string; appointmentIds?: string[] } = {};
  try {
    body = (await request.json()) as { priceId?: string; appointmentIds?: string[] };
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

  const appointmentIds = Array.isArray(body.appointmentIds)
    ? [...new Set(body.appointmentIds.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean))]
    : [];

  const bulkIds = parseBulkPriceIds(env.LEADS_BULK_PRICE_IDS);
  const fixedBulkIds = parseBulkPriceIds(env.LEADS_BULK_FIXED_PRICE_IDS);
  const isBulkPrice = bulkIds.has(priceId);
  const minBulk = bulkMinAppointments(env);

  if (appointmentIds.length > 0) {
    if (isBulkPrice) {
      if (appointmentIds.length < minBulk) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Bulk pricing requires at least ${minBulk} appointments.`,
          }),
          { status: 400, headers: j },
        );
      }
    } else if (appointmentIds.length !== 1) {
      return new Response(
        JSON.stringify({ success: false, error: "This package is for a single appointment — select exactly one slot." }),
        { status: 400, headers: j },
      );
    }
  }

  const origin = (env.APP_PUBLIC_ORIGIN || "").trim().replace(/\/+$/, "");
  if (!origin) {
    return new Response(JSON.stringify({ success: false, error: "APP_PUBLIC_ORIGIN is not configured." }), {
      status: 503,
      headers: j,
    });
  }

  const reservationTtlSec = 30 * 60;
  const reservedUntil = Math.floor(Date.now() / 1000) + reservationTtlSec;

  if (appointmentIds.length > 0) {
    const { ok } = await reserveAppointmentsForUser(env.DB, payload.sub, appointmentIds, reservedUntil);
    if (!ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "One or more appointments are no longer available. Refresh and try again.",
        }),
        { status: 409, headers: j },
      );
    }
  }

  // Stripe replaces {CHECKOUT_SESSION_ID} when redirecting (fulfillment / support reference).
  const successUrl = `${origin}/leads?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/leads?checkout=cancel`;

  let qty = appointmentIds.length > 0 ? appointmentIds.length : 1;
  if (isBulkPrice && fixedBulkIds.has(priceId) && appointmentIds.length > 0) {
    qty = 1;
  }

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", String(qty));
  params.set("client_reference_id", payload.sub);
  if (payload.email) {
    params.set("customer_email", payload.email);
  }
  if (appointmentIds.length > 0) {
    params.set("metadata[hd2d_user_id]", payload.sub);
    params.set("metadata[hd2d_appointment_ids]", appointmentIds.join(","));
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
    if (appointmentIds.length > 0) {
      await releaseReservationByUser(env.DB, payload.sub, appointmentIds);
    }
    return new Response(JSON.stringify({ success: false, error: "Could not start checkout." }), { status: 502, headers: j });
  }

  return new Response(JSON.stringify({ success: true, url: stripeJson.url }), { status: 200, headers: j });
}

