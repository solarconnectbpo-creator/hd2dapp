import type { DamageRoofReport } from "./roofReportTypes";

/**
 * Deep clone for JSON export with homeowner contact fields removed or masked.
 * Keeps structure; use before `JSON.stringify` when sharing externally.
 */
export function redactReportPiiForExport(
  report: DamageRoofReport,
): DamageRoofReport {
  const r = JSON.parse(JSON.stringify(report)) as DamageRoofReport;
  if (r.homeownerName) r.homeownerName = "[redacted]";
  if (r.homeownerEmail) r.homeownerEmail = "[redacted]";
  if (r.homeownerPhone) r.homeownerPhone = "[redacted]";
  if (r.scheduleInspection) {
    r.scheduleInspection = {
      ...r.scheduleInspection,
      phone: r.scheduleInspection.phone ? "[redacted]" : undefined,
      email: r.scheduleInspection.email ? "[redacted]" : undefined,
    };
  }
  if (r.createdBy?.email) {
    r.createdBy = { ...r.createdBy, email: "[redacted]" };
  }
  return r;
}
