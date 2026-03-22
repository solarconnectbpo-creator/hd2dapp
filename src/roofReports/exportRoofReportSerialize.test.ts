import { describe, expect, it } from "vitest";

import type { DamageRoofReport } from "./roofReportTypes";
import {
  safeExportFilenamePart,
  serializeRoofReportToJsonPretty,
} from "./exportRoofReportSerialize";

/** Minimal valid report — same fields required as Finish & export → Preview. */
function minimalReport(overrides?: Partial<DamageRoofReport>): DamageRoofReport {
  return {
    id: "finish-export-test-1",
    createdAtIso: "2026-03-22T12:00:00.000Z",
    property: {
      address: "456 Finish Flow Rd, St. Louis, MO",
      lat: 38.7525,
      lng: -90.3734,
      clickedAtIso: "2026-03-22T12:00:00.000Z",
    },
    inspectionDate: "2026-03-20",
    damageTypes: ["Hail"],
    severity: 3,
    recommendedAction: "Repair",
    ...overrides,
  };
}

describe("exportRoofReportSerialize (Finish → Preview export payload)", () => {
  it("sanitizes export filenames", () => {
    expect(safeExportFilenamePart("abc/123")).toBe("abc_123");
    expect(safeExportFilenamePart("")).toBe("report");
  });

  it("serializes report JSON identically to what exportRoofReportToJson uploads", () => {
    const report = minimalReport();
    const json = serializeRoofReportToJsonPretty(report);
    const parsed = JSON.parse(json) as DamageRoofReport;
    expect(parsed.id).toBe(report.id);
    expect(parsed.property.address).toBe(report.property.address);
    expect(parsed.damageTypes).toEqual(["Hail"]);
    expect(json).toContain('"456 Finish Flow Rd');
  });
});
