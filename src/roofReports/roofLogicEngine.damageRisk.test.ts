import { describe, expect, it } from "vitest";

import { computeAiDamageRisk } from "./roofLogicEngine";

describe("computeAiDamageRisk damage patterns", () => {
  it("increases score when hail and wind are both selected", () => {
    const base = computeAiDamageRisk({
      severity: 3,
      damageTypes: ["Hail"],
      roofMaterialType: "shingle",
    });
    const combo = computeAiDamageRisk({
      severity: 3,
      damageTypes: ["Hail", "Wind"],
      roofMaterialType: "shingle",
    });
    expect(combo.score).toBeGreaterThanOrEqual(base.score);
    expect(combo.factors.some((f) => f.includes("hail + wind"))).toBe(true);
  });

  it("uses METAR wind when provided", () => {
    const noMetar = computeAiDamageRisk({
      severity: 3,
      damageTypes: ["Wind"],
      roofMaterialType: "shingle",
    });
    const withMetar = computeAiDamageRisk({
      severity: 3,
      damageTypes: ["Wind"],
      roofMaterialType: "shingle",
      metarWeather: {
        fetchedAtIso: new Date().toISOString(),
        stationIcao: "KTEST",
        rawMetar: "METAR KTEST 121955Z 28018G35KT 10SM FEW250",
        summaryLines: ["test"],
        windSpdKt: 18,
        windGustKt: 35,
        stormIndicators: [],
      },
    });
    expect(withMetar.score).toBeGreaterThanOrEqual(noMetar.score);
    expect(withMetar.factors.some((f) => f.includes("METAR"))).toBe(true);
  });
});
