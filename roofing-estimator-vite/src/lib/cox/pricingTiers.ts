/**
 * Atlas / Cox roofing pricing tiers with tax (Good / Better / Best).
 * Ported from Atlas Complete Codebase (June 2026).
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
} as const satisfies Record<
  CoxTierKey,
  { name: string; multiplier: number; warranty: string; description: string }
>;

export type TieredEstimateWithTax = {
  subtotal: Record<CoxTierKey, number>;
  tax: Record<CoxTierKey, number>;
  total: Record<CoxTierKey, number>;
};

/** Round to cents (matches Atlas decimal.js toFixed(2) behavior). */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function assertBasePrice(basePrice: number): void {
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw new Error("Base price cannot be negative");
  }
  if (basePrice > 1_000_000) {
    throw new Error("Base price cannot exceed $1,000,000");
  }
}

export function assertTaxRate(taxRate: number): void {
  if (!Number.isFinite(taxRate) || taxRate < 0) {
    throw new Error("Tax rate cannot be negative");
  }
  if (taxRate > 0.2) {
    throw new Error("Tax rate cannot exceed 20%");
  }
}

/** Tiered Good/Better/Best subtotals, tax, and totals from a Cox base price. */
export function calculateTieredEstimateWithTax(
  basePrice: number,
  taxRate: number = COX_DEFAULT_TAX_RATE,
): TieredEstimateWithTax {
  assertBasePrice(basePrice);
  assertTaxRate(taxRate);

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

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatEstimateWithTax(estimate: TieredEstimateWithTax) {
  return {
    subtotal: {
      good: formatPrice(estimate.subtotal.good),
      better: formatPrice(estimate.subtotal.better),
      best: formatPrice(estimate.subtotal.best),
    },
    tax: {
      good: formatPrice(estimate.tax.good),
      better: formatPrice(estimate.tax.better),
      best: formatPrice(estimate.tax.best),
    },
    total: {
      good: formatPrice(estimate.total.good),
      better: formatPrice(estimate.total.better),
      best: formatPrice(estimate.total.best),
    },
  };
}
