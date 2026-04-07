import { getStripeSmsSubscriptionItem } from "../auth/userDb";

type D1 = any;

/** Record one SMS unit on Stripe metered subscription item (if configured). */
export async function recordSmsUsageEvent(env: { STRIPE_SECRET_KEY?: string; DB: D1 }, userId: string): Promise<void> {
  const secret = (env.STRIPE_SECRET_KEY || "").trim();
  if (!secret) return;
  const subItem = await getStripeSmsSubscriptionItem(env.DB, userId);
  if (!subItem) return;

  const params = new URLSearchParams();
  params.set("quantity", "1");
  params.set("action", "increment");

  const res = await fetch(`https://api.stripe.com/v1/subscription_items/${encodeURIComponent(subItem)}/usage_records`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("[stripe sms usage]", res.status, t.slice(0, 300));
  }
}
