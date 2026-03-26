import { describe, expect, it } from "vitest";

import { computeRoofDamageEstimate } from "./roofEstimate";

describe("computeRoofDamageEstimate (damage report $ range)", () => {
  it("returns zero range and low confidence when roof area is missing", () => {
    const est = computeRoofDamageEstimate({
      damageTypes: ["Hail"],
      severity: 3,
      roofType: "Asphalt Shingle",
    });
    expect(est.lowCostUsd).toBe(0);
    expect(est.highCostUsd).toBe(0);
    expect(est.confidence).toBe("low");
    expect(est.scope).toBe("repair");
  });

  it("produces ordered USD range and repair scope for typical hail + asphalt", () => {
    const est = computeRoofDamageEstimate({
      roofAreaSqFt: 3000,
      damageTypes: ["Hail"],
      severity: 3,
      roofType: "Asphalt Shingle",
    });
    expect(est.roofAreaSqFt).toBe(3000);
    expect(est.scope).toBe("repair");
    expect(est.lowCostUsd).toBeGreaterThan(0);
    expect(est.highCostUsd).toBeGreaterThan(est.lowCostUsd);
    expect(est.confidence).toBe("medium");
    // Deterministic: 3000 * 1.12 / 100 squares, × 1200–2000 $/SQ, × severity 1.13
    expect(est.lowCostUsd).toBe(45562);
    expect(est.highCostUsd).toBe(75936);
    expect(est.notes).toContain("Basis:");
    expect(est.lineItems?.length).toBeGreaterThan(0);
    expect(est.methodology).toContain("effective squares");
    const sumLow = (est.lineItems ?? []).reduce((s, l) => s + l.lowUsd, 0);
    const sumHigh = (est.lineItems ?? []).reduce((s, l) => s + l.highUsd, 0);
    expect(sumLow).toBe(est.lowCostUsd);
    expect(sumHigh).toBe(est.highCostUsd);
    expect(est.codeUpgrades?.length).toBeGreaterThan(0);
  });

  it("forces replace scope when recommended action is Replace", () => {
    const est = computeRoofDamageEstimate({
      roofAreaSqFt: 2000,
      damageTypes: ["Hail"],
      severity: 2,
      roofType: "Asphalt Shingle",
      recommendedAction: "Replace",
    });
    expect(est.scope).toBe("replace");
    expect(est.lowCostUsd).toBeGreaterThan(0);
  });
});
