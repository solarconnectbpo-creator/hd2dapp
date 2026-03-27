import { describe, expect, it } from "vitest";

import type { DamageRoofReport } from "./roofReportTypes";
import { redactReportPiiForExport } from "./exportRoofReportRedact";

describe("redactReportPiiForExport", () => {
  it("masks homeowner and schedule contacts", () => {
    const r: DamageRoofReport = {
      id: "x",
      createdAtIso: new Date().toISOString(),
      property: {
        address: "1 Main",
        lat: 0,
        lng: 0,
      },
      inspectionDate: "2025-01-01",
      damageTypes: ["Hail"],
      severity: 3,
      recommendedAction: "repair",
      homeownerName: "Jane",
      homeownerEmail: "j@example.com",
      homeownerPhone: "555",
      scheduleInspection: {
        headline: "h",
        body: "b",
        disclaimer: "d",
        phone: "555",
        email: "a@b.com",
      },
    };
    const out = redactReportPiiForExport(r);
    expect(out.homeownerName).toBe("[redacted]");
    expect(out.homeownerEmail).toBe("[redacted]");
    expect(out.homeownerPhone).toBe("[redacted]");
    expect(out.scheduleInspection?.phone).toBe("[redacted]");
    expect(out.scheduleInspection?.email).toBe("[redacted]");
  });
});
