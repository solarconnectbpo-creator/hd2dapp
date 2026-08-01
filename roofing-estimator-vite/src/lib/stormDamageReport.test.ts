import { describe, expect, it } from "vitest";
import { buildStormDamageReport } from "./stormDamageReport";

describe("buildStormDamageReport", () => {
  it("handles empty photos", () => {
    const report = buildStormDamageReport({
      name: "123 Main — storm damage",
      address: "123 Main St",
      photos: [],
    });
    expect(report).toContain("STORM DAMAGE REPORT");
    expect(report).toContain("No site photos yet");
  });

  it("aggregates AI photo findings", () => {
    const report = buildStormDamageReport({
      name: "Job",
      address: "9 Oak Ave",
      photos: [
        {
          id: "ph-1",
          capturedAt: "2026-08-01T12:00:00.000Z",
          imageDataUrl: "data:image/jpeg;base64,a",
          caption: "North slope",
          aiSummary: {
            damageTypes: ["Hail", "Missing Shingles"],
            severity: 4,
            recommendedAction: "Insurance Claim Help",
            notes: "Granule loss visible on north face.",
            summary: "Hail bruising on north slope.",
          },
        },
        {
          id: "ph-2",
          capturedAt: "2026-08-01T12:01:00.000Z",
          imageDataUrl: "data:image/jpeg;base64,b",
          aiSummary: {
            damageTypes: ["Wind"],
            severity: 3,
            recommendedAction: "Further Inspection",
            notes: "Lifted shingles at ridge.",
            summary: "Wind lift at ridge.",
          },
        },
      ],
    });
    expect(report).toContain("9 Oak Ave");
    expect(report).toContain("Hail");
    expect(report).toContain("Wind");
    expect(report).toContain("Insurance Claim Help");
    expect(report).toContain("North slope");
    expect(report).toContain("peak severity 4/5");
  });
});
