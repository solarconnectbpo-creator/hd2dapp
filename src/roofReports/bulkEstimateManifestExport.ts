import Papa from "papaparse";
import { Platform } from "react-native";

import { shareTextFile } from "@/src/utils/shareTextFile";

import type { DamageRoofReport } from "./roofReportTypes";
import { buildRoofReportHtmlDocument } from "./exportRoofReport";
import { safeExportFilenamePart } from "./exportRoofReportSerialize";

/** Same basename as `exportRoofReportToHtml` downloads. */
export function roofReportHtmlFilename(report: DamageRoofReport): string {
  return `RoofReport_${safeExportFilenamePart(report.id)}.html`;
}

export type BulkManifestRow = Record<string, string | number | undefined>;

export function buildBulkEstimateManifestRows(
  reports: DamageRoofReport[],
): BulkManifestRow[] {
  return reports.map((r) => {
    const est = r.estimate;
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
      damage_types: (r.damageTypes ?? []).join("; "),
      severity: r.severity,
      recommended_action: r.recommendedAction,
      estimate_low_usd: est?.lowCostUsd ?? "",
      estimate_high_usd: est?.highCostUsd ?? "",
      estimate_confidence: est?.confidence ?? "",
      estimate_notes: est?.notes ? String(est.notes).slice(0, 500) : "",
      html_report_filename: roofReportHtmlFilename(r),
    };
  });
}

export function buildBulkEstimateManifestCsv(reports: DamageRoofReport[]): string {
  const rows = buildBulkEstimateManifestRows(reports);
  return Papa.unparse(rows, { header: true });
}

/**
 * Web: download manifest CSV, then each HTML (filenames match `html_report_filename`).
 * Keeps contacts + estimates aligned with report files for outreach.
 */
/** Native / fallback: share only the manifest CSV (HTML still via Export all as HTML). */
export async function exportBulkEstimateManifestOnly(
  reports: DamageRoofReport[],
  manifestBasename = "bulk-estimates-manifest.csv",
): Promise<void> {
  const csv = buildBulkEstimateManifestCsv(reports);
  const result = await shareTextFile(
    manifestBasename,
    csv,
    "text/csv;charset=utf-8",
  );
  if (!result.ok) throw new Error(result.error);
}

export async function exportBulkEstimatePackageWeb(
  reports: DamageRoofReport[],
  manifestBasename = "bulk-estimates-manifest.csv",
  delayMs = 280,
): Promise<void> {
  if (Platform.OS !== "web") {
    throw new Error("Bulk CSV + HTML package is supported on web.");
  }
  const csv = buildBulkEstimateManifestCsv(reports);
  const { downloadTextFileWebSync } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../utils/shareTextFile.web") as typeof import("../utils/shareTextFile.web");
  const r0 = downloadTextFileWebSync(
    manifestBasename,
    csv,
    "text/csv;charset=utf-8",
  );
  if (!r0.ok) throw new Error(r0.error);

  for (let i = 0; i < reports.length; i++) {
    const rep = reports[i];
    const html = buildRoofReportHtmlDocument(rep);
    const name = roofReportHtmlFilename(rep);
    const r = downloadTextFileWebSync(name, html, "text/html;charset=utf-8");
    if (!r.ok) throw new Error(r.error);
    if (i < reports.length - 1) {
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
}

/**
 * Sample CSV for bulk import (lat/lng required). Company + inspector columns optional.
 * Default branding uses Cox Roofing + bundled logo when company includes "Cox".
 */
export const BULK_LEADS_CSV_TEMPLATE = `lat,lng,address,homeowner_name,email,phone,company,company_phone,company_email,inspector_name,roof_sqft,roof_type
39.123456,-94.578901,"123 Example Rd, Kansas City, MO 64108",Jane Doe,jane@example.com,555-0100,Cox Roofing,555-0200,estimates@coxroofing.com,Seth,2850,Asphalt Shingle
`;
