import Papa from "papaparse";

import type { DamageRoofReport } from "./roofReportTypes";
import { safeExportFilenamePart } from "./exportRoofReportSerialize";

/** Same basename as `exportRoofReportToHtml` downloads. */
export function roofReportHtmlFilename(report: DamageRoofReport): string {
  return `RoofReport_${safeExportFilenamePart(report.id)}.html`;
}

export type BulkManifestRow = Record<string, string | number | undefined>;

function csvUsd(n: number | undefined | null): string | number {
  if (n == null || !Number.isFinite(n)) return "";
  return Math.round(n);
}

export function buildBulkEstimateManifestRows(
  reports: DamageRoofReport[],
): BulkManifestRow[] {
  return reports.map((r) => {
    const est = r.estimate;
    const ev = r.eagleViewEstimate;
    const nr = r.nonRoofEstimate;
    const area = r.measurements?.roofAreaSqFt;
    return {
      report_id: r.id,
      created_at_utc: r.createdAtIso,
      property_address: r.property.address,
      latitude: r.property.lat,
      longitude: r.property.lng,
      contact_name: r.homeownerName ?? "",
      contact_email: r.homeownerEmail ?? "",
      contact_phone: r.homeownerPhone ?? "",
      company_name: r.companyName ?? "",
      company_phone: r.companyPhone ?? r.property.companyPhone ?? "",
      company_email: r.companyEmail ?? r.property.companyEmail ?? "",
      inspector_name: r.creatorName ?? r.createdBy?.name ?? "",
      roof_type: r.roofType ?? "",
      roof_area_sq_ft: csvUsd(area),
      damage_types: (r.damageTypes ?? []).join("; "),
      severity: r.severity,
      recommended_action: r.recommendedAction,
      estimate_scope: est?.scope ?? "",
      estimate_low_usd: csvUsd(est?.lowCostUsd),
      estimate_high_usd: csvUsd(est?.highCostUsd),
      estimate_confidence: est?.confidence ?? "",
      estimate_notes: est?.notes ? String(est.notes).slice(0, 500) : "",
      eagleview_final_usd: csvUsd(ev?.totals.final),
      non_roof_low_usd: csvUsd(nr?.lowCostUsd),
      non_roof_high_usd: csvUsd(nr?.highCostUsd),
      html_report_filename: roofReportHtmlFilename(r),
    };
  });
}

export function buildBulkEstimateManifestCsv(reports: DamageRoofReport[]): string {
  const rows = buildBulkEstimateManifestRows(reports);
  return Papa.unparse(rows, { header: true });
}

/**
 * Sample CSV for bulk import (lat/lng required). Company + inspector columns optional.
 * Default branding uses Cox Roofing + bundled logo when company includes "Cox".
 */
export const BULK_LEADS_CSV_TEMPLATE = `lat,lng,address,homeowner_name,email,phone,company,company_phone,company_email,inspector_name,roof_sqft,roof_type
39.123456,-94.578901,"123 Example Rd, Kansas City, MO 64108",Jane Doe,jane@example.com,555-0100,Cox Roofing,555-0200,estimates@coxroofing.com,Seth,2850,Asphalt Shingle
`;
