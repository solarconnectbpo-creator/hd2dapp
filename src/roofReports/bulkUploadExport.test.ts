import { describe, expect, it } from "vitest";
import Papa from "papaparse";

import {
  BULK_LEADS_CSV_TEMPLATE,
  buildBulkEstimateManifestCsv,
  buildBulkEstimateManifestRows,
  roofReportHtmlFilename,
} from "./bulkEstimateManifestCsv";
import { parsePropertyLeadsCsvText } from "./parsePropertyLeadsCsv";
import type { DamageRoofReport } from "./roofReportTypes";

function minimalReport(overrides?: Partial<DamageRoofReport>): DamageRoofReport {
  return {
    id: "r_bulktest_abc12",
    createdAtIso: "2026-03-22T12:00:00.000Z",
    property: {
      address: "100 Bulk Test Ln, KC, MO",
      lat: 39.123456,
      lng: -94.578901,
      clickedAtIso: "2026-03-22T12:00:00.000Z",
    },
    inspectionDate: "2026-03-20",
    damageTypes: ["Hail"],
    severity: 3,
    recommendedAction: "Insurance Claim Help",
    ...overrides,
  };
}

describe("bulk CSV upload (parsePropertyLeadsCsvText)", () => {
  it("parses the bundled bulk import template into one lead with contacts", () => {
    const { leads, warnings } = parsePropertyLeadsCsvText(BULK_LEADS_CSV_TEMPLATE);
    expect(warnings.length).toBe(0);
    expect(leads).toHaveLength(1);
    const [l] = leads;
    expect(l.lat).toBeCloseTo(39.123456, 5);
    expect(l.lng).toBeCloseTo(-94.578901, 5);
    expect(l.homeownerName).toBe("Jane Doe");
    expect(l.companyName).toBe("Cox Roofing");
    expect(l.email).toBe("jane@example.com");
    expect(l.roofSqFt).toBe(2850);
    expect(l.roofType).toBe("Asphalt Shingle");
    expect(l.inspectorName).toBe("Seth");
  });
});

describe("bulk estimate export (manifest CSV)", () => {
  it("builds stable HTML filename from report id", () => {
    const r = minimalReport();
    expect(roofReportHtmlFilename(r)).toMatch(/^RoofReport_r_bulktest_abc12/);
  });

  it("rounds USD and includes optional EagleView / non-roof / area columns", () => {
    const full = minimalReport({
      homeownerName: "Pat",
      companyName: "Acme Roof",
      measurements: { roofAreaSqFt: 2500.4 },
      estimate: {
        estimateId: "e1",
        createdAtIso: "2026-03-22T12:00:00.000Z",
        scope: "replace",
        lowCostUsd: 90000.2,
        highCostUsd: 150000.8,
        confidence: "medium",
      },
      eagleViewEstimate: {
        materials: {
          shingles: { quantity: 1, cost: 1 },
          underlayment: { quantity: 1, cost: 1 },
          iceAndWater: { quantity: 1, cost: 1 },
          ridgeVent: { quantity: 1, cost: 1 },
          ridgeCap: { quantity: 1, cost: 1 },
          starterStrip: { quantity: 1, cost: 1 },
          nails: { quantity: 1, cost: 1 },
          total: 100,
        },
        labor: { base: 1, adjustedRate: 1, total: 2 },
        additional: { overhead: 1, profit: 1 },
        totals: {
          subtotal: 30000,
          overhead: 1000,
          profit: 2000,
          final: 33290.428,
        },
      },
      nonRoofEstimate: {
        lowCostUsd: 500.4,
        highCostUsd: 800.6,
      },
    });

    const rows = buildBulkEstimateManifestRows([full]);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.estimate_low_usd).toBe(90000);
    expect(row.estimate_high_usd).toBe(150001);
    expect(row.roof_area_sq_ft).toBe(2500);
    expect(row.eagleview_final_usd).toBe(33290);
    expect(row.non_roof_low_usd).toBe(500);
    expect(row.non_roof_high_usd).toBe(801);
    expect(row.estimate_scope).toBe("replace");
  });

  it("produces CSV that round-trips with Papa (header + one row)", () => {
    const r = minimalReport({
      homeownerName: "Sam",
      estimate: {
        estimateId: "e2",
        createdAtIso: "2026-03-22T12:00:00.000Z",
        scope: "repair",
        lowCostUsd: 1000,
        highCostUsd: 2000,
        confidence: "high",
      },
    });
    const csv = buildBulkEstimateManifestCsv([r]);
    expect(csv).toContain("report_id");
    expect(csv).toContain("estimate_low_usd");
    expect(csv).toContain("eagleview_final_usd");

    const parsed = Papa.parse(csv, { header: true });
    expect(parsed.errors.length).toBe(0);
    const data = parsed.data as Record<string, string>[];
    expect(data.length).toBeGreaterThanOrEqual(1);
    const first = data[0]!;
    expect(first.contact_name).toBe("Sam");
    expect(first.estimate_low_usd).toBe("1000");
  });
});
