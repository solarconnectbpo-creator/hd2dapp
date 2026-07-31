/**
 * Atlas / Cox roofing pricing tiers with tax (Good / Better / Best).
 * Keep in sync with roofing-estimator-vite/src/lib/cox/pricingTiers.ts
 */

export type CoxTierKey = "good" | "better" | "best";

export const COX_DEFAULT_TAX_RATE = 0.08;

export const pricingTiers = {
  good: {
    name: "Good",
    multiplier: 0.85,
    warranty: "15-year",
    description: "Standard materials, quality installation",
  },
  better: {
    name: "Better",
    multiplier: 1.0,
    warranty: "25-year",
    description: "Premium materials, enhanced durability",
  },
  best: {
    name: "Best",
    multiplier: 1.25,
    warranty: "Lifetime",
    description: "Top-tier materials, superior craftsmanship",
  },
} as const;

export type TieredEstimateWithTax = {
  subtotal: Record<CoxTierKey, number>;
  tax: Record<CoxTierKey, number>;
  total: Record<CoxTierKey, number>;
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateTieredEstimateWithTax(
  basePrice: number,
  taxRate: number = COX_DEFAULT_TAX_RATE,
): TieredEstimateWithTax {
  if (!Number.isFinite(basePrice) || basePrice < 0) throw new Error("Base price cannot be negative");
  if (basePrice > 1_000_000) throw new Error("Base price cannot exceed $1,000,000");
  if (!Number.isFinite(taxRate) || taxRate < 0) throw new Error("Tax rate cannot be negative");
  if (taxRate > 0.2) throw new Error("Tax rate cannot exceed 20%");

  const keys: CoxTierKey[] = ["good", "better", "best"];
  const subtotal = {} as Record<CoxTierKey, number>;
  const tax = {} as Record<CoxTierKey, number>;
  const total = {} as Record<CoxTierKey, number>;

  for (const key of keys) {
    const s = roundMoney(basePrice * pricingTiers[key].multiplier);
    subtotal[key] = s;
    tax[key] = roundMoney(s * taxRate);
    total[key] = roundMoney(s * (1 + taxRate));
  }

  return { subtotal, tax, total };
}
