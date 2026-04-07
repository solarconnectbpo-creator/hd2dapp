import type { AuthEnv } from "./authRoutes";
import { verifyStripeWebhookSignature } from "./stripeWebhookVerify";
import {
  findUserIdByStripeCustomerId,
  updateUserBillingAndStripe,
  updateUserStripeSmsSubscriptionItem,
} from "../auth/userDb";

export type StripeWebhookEnv = AuthEnv & {
  STRIPE_WEBHOOK_SECRET?: string;
  /** When set, subscription items with this Price id sync to `users.stripe_subscription_item_sms`. */
  STRIPE_SMS_METERED_PRICE_ID?: string;
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
    if (type === "checkout.session.completed" && obj) {
      const mode = String(obj.mode || "");
      const clientRef = typeof obj.client_reference_id === "string" ? obj.client_reference_id.trim() : "";
      const customer = typeof obj.customer === "string" ? obj.customer : "";
      if (mode === "subscription" && clientRef) {
        await updateUserBillingAndStripe(env.DB, clientRef, {
          billing_status: "active",
          stripe_customer_id: customer || null,
        });
      }
    } else if (type === "customer.subscription.updated" && obj) {
      const sub = obj;
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
    } else if (type === "customer.subscription.deleted" && obj) {
      const sub = obj;
      const userId = await resolveUserIdFromSubscription(env.DB, sub);
      if (userId) {
        await updateUserBillingAndStripe(env.DB, userId, { billing_status: "canceled" });
        await updateUserStripeSmsSubscriptionItem(env.DB, userId, null);
      }
    }
  } catch (e) {
    console.error("[stripe-webhook]", type, e);
    return new Response(JSON.stringify({ success: false, error: "Webhook handler failed." }), { status: 500, headers: j });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: j });
}
