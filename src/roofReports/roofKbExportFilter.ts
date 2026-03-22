/**
 * Limits exported HTML reference sections to roof-assembly topics (not full chapter dumps).
 */

import type { DamageRoofReport } from "./roofReportTypes";

/** Missouri IRC supplement — only when property is in MO or state is known as MO. */
export function shouldIncludeMoIrcInsuranceKb(
  report: DamageRoofReport,
): boolean {
  const sc = report.buildingCode?.stateCode?.trim().toUpperCase();
  if (sc === "MO") return true;
  const addr = (report.property.address ?? "").toLowerCase();
  return (
    /\b(?:mo|missouri)\b/.test(addr) ||
    /\bst\.?\s*louis\b/.test(addr) ||
    /\bkansas\b.*\bcity\b/.test(addr)
  );
}

export const IBC_CH15_EXPORT_ROOF_GROUP_IDS = new Set([
  "1501",
  "1502",
  "1503",
  "1504",
  "1505",
  "1506-1507",
  "1512",
]);

/** IRC Ch.8 — roof framing, sheathing, ventilation; omit pure ceiling finishes & attic access for lean export. */
export const IRC8_EXPORT_ROOF_GROUP_IDS = new Set([
  "r801",
  "r802",
  "r803",
  "r804",
  "r806",
]);

/** IRC Ch.9 — assemblies & coverings; omit PV rack/insulation addenda unless you expand logic later. */
export const IRC9_EXPORT_ROOF_GROUP_IDS = new Set([
  "r901",
  "r902",
  "r903",
  "r904",
  "r905a",
  "r905b",
  "r905c",
  "r908",
]);

export function filterKbGroups<
  T extends { id: string; heading: string; items: readonly unknown[] },
>(groups: readonly T[], allowedIds: Set<string>): T[] {
  return groups.filter((g) => allowedIds.has(g.id));
}
