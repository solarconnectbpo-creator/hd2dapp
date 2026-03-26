import { Platform } from "react-native";

import { shareTextFile } from "@/src/utils/shareTextFile";

import type { DamageRoofReport } from "./roofReportTypes";
import {
  BULK_LEADS_CSV_TEMPLATE,
  buildBulkEstimateManifestCsv,
  roofReportHtmlFilename,
} from "./bulkEstimateManifestCsv";
import {
  buildRoofReportHtmlDocument,
  exportBulkRoofReportsHtml,
} from "./exportRoofReport";

export {
  BULK_LEADS_CSV_TEMPLATE,
  buildBulkEstimateManifestCsv,
  buildBulkEstimateManifestRows,
  type BulkManifestRow,
  roofReportHtmlFilename,
} from "./bulkEstimateManifestCsv";

export type BulkExportDamageReportsOptions = {
  /** Defaults to `bulk-damage-reports-<timestamp>.csv`. */
  manifestBasename?: string;
  /** Delay between HTML downloads on web (browser throttling). */
  delayBetweenHtmlMs?: number;
};

/**
 * Bulk export after CSV upload: manifest CSV (contacts + estimate columns + HTML filename)
 * plus one HTML damage report per row.
 * - **Web:** manifest first, then each `RoofReport_<id>.html` (same names as manifest column).
 * - **Native:** shares manifest CSV, then opens share for each HTML sequentially.
 */
export async function bulkExportDamageReports(
  reports: DamageRoofReport[],
  options?: BulkExportDamageReportsOptions,
): Promise<void> {
  if (reports.length === 0) return;
  const manifest =
    options?.manifestBasename ?? `bulk-damage-reports-${Date.now()}.csv`;
  const delay = options?.delayBetweenHtmlMs ?? 280;

  if (Platform.OS === "web") {
    await exportBulkEstimatePackageWeb(reports, manifest, delay);
    return;
  }

  await exportBulkEstimateManifestOnly(reports, manifest);
  await exportBulkRoofReportsHtml(reports, delay);
}

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

/**
 * Bulk export: one CSV with contacts + estimate columns (same rows as the manifest).
 * No HTML files — use after CSV upload / bulk generate for spreadsheets or CRM.
 */
export async function exportBulkEstimatesCsvOnly(
  reports: DamageRoofReport[],
  basename = `bulk-estimates-${Date.now()}.csv`,
): Promise<void> {
  if (reports.length === 0) return;
  await exportBulkEstimateManifestOnly(reports, basename);
}

export async function exportBulkEstimatePackageWeb(
  reports: DamageRoofReport[],
  manifestBasename = "bulk-estimates-manifest.csv",
  _delayMs = 280,
): Promise<void> {
  if (Platform.OS !== "web") {
    throw new Error("Bulk CSV + HTML package is supported on web.");
  }
  const csv = buildBulkEstimateManifestCsv(reports);
  const { downloadBlobWebSync } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../utils/shareTextFile.web") as typeof import("../utils/shareTextFile.web");
  const { zipSyncTextFiles } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../utils/bulkWebZipDownload") as typeof import("../utils/bulkWebZipDownload");

  const manifestPath = manifestBasename.replace(/[/\\?%*:|"<>]/g, "_").trim() || "manifest.csv";
  const zipEntries: { path: string; content: string }[] = [
    { path: manifestPath, content: csv },
  ];
  for (const rep of reports) {
    zipEntries.push({
      path: roofReportHtmlFilename(rep),
      content: buildRoofReportHtmlDocument(rep),
    });
  }

  const zipped = zipSyncTextFiles(zipEntries);
  const blob = new Blob([new Uint8Array(zipped)], { type: "application/zip" });
  const zipName = manifestBasename.replace(/\.csv$/i, ".zip");
  const safeZip =
    zipName.endsWith(".zip") && zipName.length > 4
      ? zipName
      : `bulk-damage-reports-${Date.now()}.zip`;
  const r = downloadBlobWebSync(safeZip, blob);
  if (!r.ok) throw new Error(r.error);
}
