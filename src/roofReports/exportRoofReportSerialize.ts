import type { DamageRoofReport } from "./roofReportTypes";

/** Safe filename segment for `RoofReport_<id>.html|.json` downloads. */
export function safeExportFilenamePart(id: string): string {
  const s = id.replace(/[^a-zA-Z0-9._-]/g, "_");
  return s.length > 0 ? s.slice(0, 96) : "report";
}

/** Same payload as `exportRoofReportToJson` writes (pretty-printed). */
export function serializeRoofReportToJsonPretty(
  report: DamageRoofReport,
): string {
  return JSON.stringify(report, null, 2);
}
