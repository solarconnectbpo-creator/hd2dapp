import type { AuthEnv } from "./authRoutes";
import { verifyStripeWebhookSignature } from "./stripeWebhookVerify";
import {
  findUserIdByStripeCustomerId,
  updateUserBillingAndStripe,
  updateUserStripeSmsSubscriptionItem,
} from "../auth/userDb";
import { finalizePurchaseFromStripe } from "../marketplace/marketplaceDb";
import { retryWithBackoffWhen } from "../utils/retry";

export type StripeWebhookEnv = AuthEnv & {
  STRIPE_WEBHOOK_SECRET?: string;
  /** When set, subscription items with this Price id sync to `users.stripe_subscription_item_sms`. */
  STRIPE_SMS_METERED_PRICE_ID?: string;
  /** Used to tell membership vs call-center subscriptions (same webhook). */
  MEMBERSHIP_STRIPE_PRICE_ID?: string;
  MEMBERSHIP_STRIPE_PRICE_ID_SOLO?: string;
  MEMBERSHIP_STRIPE_PRICE_ID_COMPANY?: string;
};

type StripeObj = Record<string, unknown>;

function billingFromSubscriptionStatus(status: string | undefined): "active" | "past_due" | "unpaid" | "canceled" {
  const s = (status || "").trim().toLowerCase();
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid") return "past_due";
  if (s === "canceled" || s === "incomplete_expired") return "canceled";
  if (s === "incomplete" || s === "paused") return "unpaid";
  return "unpaid";
}

function extractSmsSubscriptionItemId(sub: StripeObj, meteredPriceId: string): string | null {
  const items = sub.items as { data?: Array<{ id?: string; price?: unknown }> } | undefined;
  const list = items?.data;
  if (!list || !meteredPriceId) return null;
  for (const it of list) {
    const p = it.price;
    const pid =
      typeof p === "string"
        ? p
        : p && typeof p === "object" && "id" in p && typeof (p as { id?: string }).id === "string"
          ? (p as { id: string }).id
          : "";
    if (pid === meteredPriceId && typeof it.id === "string") return it.id;
  }
  return null;
}

async function resolveUserIdFromSubscription(db: unknown, sub: StripeObj): Promise<string | null> {
  const meta = sub.metadata as Record<string, string> | undefined;
  const uid = (meta?.user_id || "").trim();
  if (uid) return uid;
  const customer = typeof sub.customer === "string" ? sub.customer : "";
  if (customer) return findUserIdByStripeCustomerId(db, customer);
  return null;
}

function membershipPriceIds(env: StripeWebhookEnv): Set<string> {
  const s = new Set<string>();
  for (const k of [env.MEMBERSHIP_STRIPE_PRICE_ID, env.MEMBERSHIP_STRIPE_PRICE_ID_SOLO, env.MEMBERSHIP_STRIPE_PRICE_ID_COMPANY]) {
    const id = (k || "").trim();
    if (id) s.add(id);
  }
  return s;
}

/** True if any subscription line item uses a platform membership Price id. */
function subscriptionHasMembershipPrice(sub: StripeObj, ids: Set<string>): boolean {
  const items = sub.items as { data?: Array<{ price?: unknown }> } | undefined;
  for (const it of items?.data || []) {
    const p = it.price;
    const pid =
      typeof p === "string"
        ? p
        : p && typeof p === "object" && p !== null && "id" in p && typeof (p as { id?: unknown }).id === "string"
          ? (p as { id: string }).id
          : "";
    if (pid && ids.has(pid)) return true;
  }
  return false;
}

function isTransientStripeWebhookError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return /network|fetch|ECONNRESET|502|503|504|52[0-9]|53[0-9]|timeout|temporar|busy|D1|sqlite/i.test(e.message);
}

/** Stripe event handling (D1 updates). Retried only for likely-transient failures so Stripe can re-deliver on 500. */
async function dispatchStripeWebhookEvent(
  env: StripeWebhookEnv,
  type: string,
  obj: StripeObj | undefined,
): Promise<void> {
  if (type === "checkout.session.completed" && obj) {
    const mode = String(obj.mode || "");
    const clientRef = typeof obj.client_reference_id === "string" ? obj.client_reference_id.trim() : "";
    const customer = typeof obj.customer === "string" ? obj.customer : "";
    const meta =
      obj.metadata && typeof obj.metadata === "object" && obj.metadata !== null && !Array.isArray(obj.metadata)
        ? (obj.metadata as Record<string, unknown>)
        : {};
    const aptIdsRaw = typeof meta.hd2d_appointment_ids === "string" ? meta.hd2d_appointment_ids.trim() : "";
    const sessionId = typeof obj.id === "string" ? obj.id : "";
    const buyerFromMeta = typeof meta.hd2d_user_id === "string" ? meta.hd2d_user_id.trim() : "";
    const buyerId = buyerFromMeta || clientRef;
    if (mode === "payment" && aptIdsRaw && sessionId && buyerId) {
      const ids = aptIdsRaw.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length) {
        const fin = await finalizePurchaseFromStripe(env.DB, buyerId, ids, sessionId);
        if (!fin.ok) {
          console.error("[stripe-webhook] marketplace finalize failed", sessionId, buyerId);
        }
      }
    }
    if (mode === "subscription" && clientRef) {
      const kind = typeof meta.hd2d_checkout_kind === "string" ? meta.hd2d_checkout_kind.trim() : "";
      if (kind !== "callcenter") {
        await updateUserBillingAndStripe(env.DB, clientRef, {
          billing_status: "active",
          stripe_customer_id: customer || null,
        });
      }
    }
  } else if (type === "customer.subscription.updated" && obj) {
    const sub = obj;
    const membershipIds = membershipPriceIds(env);
    const isMembershipSub = membershipIds.size === 0 ? true : subscriptionHasMembershipPrice(sub, membershipIds);
    if (!isMembershipSub) {
      // e.g. call-center-only subscription — do not overwrite platform membership billing.
    } else {
      const userId = await resolveUserIdFromSubscription(env.DB, sub);
      if (userId) {
        const st = billingFromSubscriptionStatus(typeof sub.status === "string" ? sub.status : undefined);
        const customer = typeof sub.customer === "string" ? sub.customer : "";
        await updateUserBillingAndStripe(env.DB, userId, {
          billing_status: st,
          stripe_customer_id: customer || undefined,
        });
        const smsPrice = (env.STRIPE_SMS_METERED_PRICE_ID || "").trim();
        if (smsPrice) {
          const smsItem = extractSmsSubscriptionItemId(sub, smsPrice);
          await updateUserStripeSmsSubscriptionItem(env.DB, userId, smsItem);
        }
      }
    }
  } else if (type === "customer.subscription.deleted" && obj) {
    const sub = obj;
    const membershipIds = membershipPriceIds(env);
    const isMembershipSub = membershipIds.size === 0 ? true : subscriptionHasMembershipPrice(sub, membershipIds);
    if (!isMembershipSub) {
      // Non-membership subscription ended — leave platform billing unchanged.
    } else {
      const userId = await resolveUserIdFromSubscription(env.DB, sub);
      if (userId) {
        await updateUserBillingAndStripe(env.DB, userId, { billing_status: "canceled" });
        await updateUserStripeSmsSubscriptionItem(env.DB, userId, null);
      }
    }
  }
}

/**
 * POST /api/webhooks/stripe — raw JSON body; verified with STRIPE_WEBHOOK_SECRET.
 */
export async function handleStripeWebhook(
  request: Request,
  env: StripeWebhookEnv,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const j = { ...corsHeaders, "Content-Type": "application/json" };
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed." }), { status: 405, headers: j });
  }
  const secret = (env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    return new Response(JSON.stringify({ success: false, error: "Webhook not configured." }), { status: 503, headers: j });
  }
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");
  const ok = await verifyStripeWebhookSignature(rawBody, sig, secret);
  if (!ok) {
    return new Response(JSON.stringify({ success: false, error: "Invalid signature." }), { status: 400, headers: j });
  }
  let event: { type?: string; data?: { object?: StripeObj } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON." }), { status: 400, headers: j });
  }
  const type = event.type || "";
  const obj = event.data?.object;

  try {
    await retryWithBackoffWhen(
      () => dispatchStripeWebhookEvent(env, type, obj),
      isTransientStripeWebhookError,
      { maxRetries: 2, baseDelayMs: 1000, maxDelayMs: 8000 },
    );
  } catch (e) {
    console.error("[stripe-webhook]", type, e);
    return new Response(JSON.stringify({ success: false, error: "Webhook handler failed." }), { status: 500, headers: j });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: j });
}
