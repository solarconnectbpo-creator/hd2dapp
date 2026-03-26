import { describe, expect, it } from "vitest";

import { computeRoofDamageEstimate } from "./roofEstimate";
import {
  mergeNonRoofIntoRoofDamageEstimate,
  sumRoofEstimateLineItems,
} from "./roofEstimateTotals";

describe("roofEstimateTotals", () => {
  it("sums line items to match roof-only estimate from computeRoofDamageEstimate", () => {
    const roof = computeRoofDamageEstimate({
      roofAreaSqFt: 2000,
      damageTypes: ["Hail"],
      severity: 3,
      roofType: "Architectural asphalt shingle",
      recommendedAction: "Repair",
    });
    const sum = sumRoofEstimateLineItems(roof.lineItems);
    expect(sum.lowUsd).toBe(roof.lowCostUsd);
    expect(sum.highUsd).toBe(roof.highCostUsd);
  });

  it("mergeNonRoofIntoRoofDamageEstimate appends a row so sums match combined totals", () => {
    const roof = computeRoofDamageEstimate({
      roofAreaSqFt: 2000,
      damageTypes: ["Hail"],
      severity: 3,
      roofType: "Architectural asphalt shingle",
      recommendedAction: "Repair",
    });
    const nonLo = 500;
    const nonHi = 800;
    const merged = mergeNonRoofIntoRoofDamageEstimate(roof, nonLo, nonHi);
    expect(merged.lowCostUsd).toBe(roof.lowCostUsd + nonLo);
    expect(merged.highCostUsd).toBe(roof.highCostUsd + nonHi);
    const sum = sumRoofEstimateLineItems(merged.lineItems);
    expect(sum.lowUsd).toBe(merged.lowCostUsd);
    expect(sum.highUsd).toBe(merged.highCostUsd);
    expect(merged.lineItems?.some((r) => r.id === "non-roof-property-line-items")).toBe(
      true,
    );
  });

  it("mergeNonRoofIntoRoofDamageEstimate leaves estimate unchanged when non-roof is zero", () => {
    const roof = computeRoofDamageEstimate({
      roofAreaSqFt: 2000,
      damageTypes: ["Hail"],
      severity: 3,
      roofType: "Architectural asphalt shingle",
      recommendedAction: "Repair",
    });
    const merged = mergeNonRoofIntoRoofDamageEstimate(roof, 0, 0);
    expect(merged).toBe(roof);
  });
});
