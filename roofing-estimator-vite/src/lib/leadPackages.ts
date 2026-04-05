export type LeadPackage = {
  key: string;
  title: string;
  description: string;
  stripePriceId: string;
  /** Display only, e.g. "$199" */
  priceLabel?: string;
};

export function parseLeadPackagesFromEnv(): LeadPackage[] {
  const raw = import.meta.env.VITE_LEAD_PACKAGES_JSON;
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
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
    return out;
  } catch {
    return [];
  }
}
