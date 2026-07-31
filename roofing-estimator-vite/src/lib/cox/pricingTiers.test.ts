import { describe, expect, it } from "vitest";
import { calculateTieredEstimateWithTax, formatPrice } from "./pricingTiers";

describe("Pricing Tiers (Atlas Cox)", () => {
  it("should calculate tiered estimates with correct tax", () => {
    const basePrice = 10000;
    const estimate = calculateTieredEstimateWithTax(basePrice);
    expect(estimate.subtotal.good).toBe(8500);
    expect(estimate.subtotal.better).toBe(10000);
    expect(estimate.subtotal.best).toBe(12500);
    expect(estimate.tax.good).toBe(680);
    expect(estimate.tax.better).toBe(800);
    expect(estimate.tax.best).toBe(1000);
    expect(estimate.total.good).toBe(9180);
    expect(estimate.total.better).toBe(10800);
    expect(estimate.total.best).toBe(13500);
  });

  it("should format prices correctly", () => {
    expect(formatPrice(1000)).toBe("$1,000.00");
    expect(formatPrice(9180)).toBe("$9,180.00");
  });

  it("should handle zero base price", () => {
    const estimate = calculateTieredEstimateWithTax(0);
    expect(estimate.total.good).toBe(0);
    expect(estimate.total.better).toBe(0);
    expect(estimate.total.best).toBe(0);
  });
});
