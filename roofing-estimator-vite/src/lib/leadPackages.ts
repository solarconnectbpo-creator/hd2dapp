export type LeadPackage = {
  key: string;
  title: string;
  description: string;
  stripePriceId: string;
  /** Display only, e.g. "$199" */
  priceLabel?: string;
};

/** Matches Worker `LEADS_STRIPE_PRICE_IDS` in `backend/wrangler.toml` when env JSON is unset. */
const DEFAULT_LEAD_PACKAGES: LeadPackage[] = [
  {
    key: "starter",
    title: "Storm corridor — starter",
    description: "Checkout package for appointment inventory (single / small pack).",
    stripePriceId: "price_1TKaYpFLDUOzenNwUgcM7VFz",
    priceLabel: "Checkout",
  },
  {
    key: "bulk",
    title: "Storm corridor — bulk",
    description: "Larger lead package; Price ID allowlisted on the Worker.",
    stripePriceId: "price_1TKac8FLDUOzenNwtgqkzl9i",
    priceLabel: "Checkout",
  },
];

export function parseLeadPackagesFromEnv(): LeadPackage[] {
  const raw = import.meta.env.VITE_LEAD_PACKAGES_JSON;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const out: LeadPackage[] = [];
        for (const item of parsed) {
          if (!item || typeof item !== "object") continue;
          const o = item as Record<string, unknown>;
          if (
            typeof o.key !== "string" ||
            typeof o.title !== "string" ||
            typeof o.description !== "string" ||
            typeof o.stripePriceId !== "string"
          ) {
            continue;
          }
          out.push({
            key: o.key,
            title: o.title,
            description: o.description,
            stripePriceId: o.stripePriceId,
            priceLabel: typeof o.priceLabel === "string" ? o.priceLabel : undefined,
          });
        }
        if (out.length) return out;
      }
    } catch {
      /* fall through to defaults */
    }
  }
  return DEFAULT_LEAD_PACKAGES;
}
