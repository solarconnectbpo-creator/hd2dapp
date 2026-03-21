import AsyncStorage from "@react-native-async-storage/async-storage";

import type { DamageRoofReport } from "./roofReportTypes";

/** Legacy: all reports in one JSON array (breaks at ~5MB on web). */
const STORAGE_KEY_LEGACY = "roof_reports_v1";
/** Ordered list of report ids (newest first). */
const STORAGE_KEY_INDEX = "roof_report_index_v1";

function reportItemKey(id: string): string {
  return `roof_report_v1_${id}`;
}

function safeParse(json: string | null): any[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let migrationPromise: Promise<void> | null = null;

/**
 * One-time migration from monolithic JSON to per-report keys (web localStorage safe).
 */
function ensureMigrated(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = runMigration().catch((err) => {
      migrationPromise = null;
      throw err;
    });
  }
  return migrationPromise;
}

async function runMigration(): Promise<void> {
  const index = await AsyncStorage.getItem(STORAGE_KEY_INDEX);
  if (index !== null) return;

  const legacy = await AsyncStorage.getItem(STORAGE_KEY_LEGACY);
  if (!legacy) {
    await AsyncStorage.setItem(STORAGE_KEY_INDEX, "[]");
    return;
  }

  const arr = safeParse(legacy);
  if (!Array.isArray(arr) || arr.length === 0) {
    await AsyncStorage.removeItem(STORAGE_KEY_LEGACY);
    await AsyncStorage.setItem(STORAGE_KEY_INDEX, "[]");
    return;
  }

  const ids: string[] = [];
  for (const r of arr) {
    if (r?.id) {
      ids.push(String(r.id));
      await AsyncStorage.setItem(
        reportItemKey(String(r.id)),
        JSON.stringify(r),
      );
    }
  }
  await AsyncStorage.setItem(STORAGE_KEY_INDEX, JSON.stringify(ids));
  await AsyncStorage.removeItem(STORAGE_KEY_LEGACY);
}

const READ_CHUNK = 80;

export async function loadRoofReports(): Promise<DamageRoofReport[]> {
  await ensureMigrated();
  const idsRaw = await AsyncStorage.getItem(STORAGE_KEY_INDEX);
  const ids = idsRaw ? (JSON.parse(idsRaw) as string[]) : [];
  if (ids.length === 0) return [];

  const results: DamageRoofReport[] = [];
  for (let i = 0; i < ids.length; i += READ_CHUNK) {
    const slice = ids.slice(i, i + READ_CHUNK);
    const raw = await Promise.all(
      slice.map((id) => AsyncStorage.getItem(reportItemKey(id))),
    );
    for (let j = 0; j < slice.length; j++) {
      const r = raw[j];
      if (!r) continue;
      try {
        results.push(JSON.parse(r) as DamageRoofReport);
      } catch {
        // skip corrupt
      }
    }
  }
  return results;
}

export async function getRoofReportById(
  id: string,
): Promise<DamageRoofReport | null> {
  await ensureMigrated();
  const raw = await AsyncStorage.getItem(reportItemKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DamageRoofReport;
  } catch {
    return null;
  }
}

export async function upsertRoofReport(
  report: DamageRoofReport,
): Promise<void> {
  await ensureMigrated();
  const idsRaw = await AsyncStorage.getItem(STORAGE_KEY_INDEX);
  let ids = idsRaw ? (JSON.parse(idsRaw) as string[]) : [];
  const idx = ids.indexOf(report.id);
  if (idx >= 0) {
    ids.splice(idx, 1);
  }
  ids = [report.id, ...ids];
  await AsyncStorage.setItem(reportItemKey(report.id), JSON.stringify(report));
  await AsyncStorage.setItem(STORAGE_KEY_INDEX, JSON.stringify(ids));
}

/**
 * Append many reports (bulk import). Writes one small JSON per report — fits large lists on web.
 */
export async function appendRoofReportsBatch(
  reports: DamageRoofReport[],
): Promise<void> {
  if (reports.length === 0) return;
  await ensureMigrated();
  for (const r of reports) {
    await AsyncStorage.setItem(reportItemKey(r.id), JSON.stringify(r));
  }
  const idsRaw = await AsyncStorage.getItem(STORAGE_KEY_INDEX);
  const existing = idsRaw ? (JSON.parse(idsRaw) as string[]) : [];
  const newIds = reports.map((r) => r.id);
  await AsyncStorage.setItem(
    STORAGE_KEY_INDEX,
    JSON.stringify([...newIds, ...existing]),
  );
}

export async function deleteRoofReport(id: string): Promise<void> {
  await ensureMigrated();
  const idsRaw = await AsyncStorage.getItem(STORAGE_KEY_INDEX);
  let ids = idsRaw ? (JSON.parse(idsRaw) as string[]) : [];
  ids = ids.filter((x) => x !== id);
  await AsyncStorage.setItem(STORAGE_KEY_INDEX, JSON.stringify(ids));
  await AsyncStorage.removeItem(reportItemKey(id));
}
