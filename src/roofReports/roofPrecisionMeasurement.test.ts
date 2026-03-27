import { describe, expect, it } from "vitest";

import { mergePrecisionSnapshotIntoRoofMeasurements } from "./roofPrecisionMeasurement";
import type { RoofPrecisionMeasurementSnapshot } from "./roofReportTypes";

describe("mergePrecisionSnapshotIntoRoofMeasurements", () => {
  it("fills area/perimeter/pitch from precision snapshot", () => {
    const snap: RoofPrecisionMeasurementSnapshot = {
      capturedAtIso: new Date().toISOString(),
      success: true,
      provider: "roof3d",
      confidence: 0.9,
      processingTimeMs: 1200,
      priority: "accuracy",
      addressLine: "1 Main",
      city: "St Louis",
      state: "MO",
      zipCode: "63101",
      latitude: 38.6,
      longitude: -90.2,
      roofAreaSqFt: 2450.7,
      roofPerimeterFt: 240.3,
      roofPitch: "6/12",
    };
    const out = mergePrecisionSnapshotIntoRoofMeasurements({}, snap);
    expect(out.roofAreaSqFt).toBe(2451);
    expect(out.roofPerimeterFt).toBe(240);
    expect(out.roofPitch).toBe("6/12");
    expect(out.roofAreaPrimarySource).toBe("precision_import");
    expect(out.measurementConfidenceBadge).toBe("high");
  });
});

