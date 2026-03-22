import { describe, expect, it } from "vitest";

import { computeMeasurementValidationSummary } from "./roofMeasurementValidation";

describe("computeMeasurementValidationSummary", () => {
  it("flags large trace vs AI area divergence", () => {
    const s = computeMeasurementValidationSummary({
      measurements: {
        roofAreaSqFt: 3000,
        roofPitchAiGauge: {
          estimatePitch: "6/12",
          confidence: "medium",
          rationale: "test",
          estimatedAtIso: new Date().toISOString(),
          estimateRoofAreaSqFt: 2000,
        },
      },
      estimate: null,
    });
    expect(s.areaTraceVsAi?.alertLevel).toBe("critical");
    expect(s.overallConfidence).toBe("low");
    expect(s.messages.some((m) => m.includes("map trace"))).toBe(true);
  });

  it("returns high confidence when only trace area exists", () => {
    const s = computeMeasurementValidationSummary({
      measurements: { roofAreaSqFt: 2400, roofPerimeterFt: 220 },
      estimate: null,
    });
    expect(s.overallConfidence).toBe("high");
    expect(s.messages.length).toBe(0);
  });

  it("flags pitch spread between manual and terrain", () => {
    const s = computeMeasurementValidationSummary({
      measurements: {
        roofPitch: "9/12",
        terrainPitchEstimate: "4/12",
      },
      estimate: null,
    });
    expect(s.pitchManualVsTerrain?.alertLevel).toBe("critical");
    expect(s.messages.some((m) => m.includes("terrain"))).toBe(true);
  });
});
