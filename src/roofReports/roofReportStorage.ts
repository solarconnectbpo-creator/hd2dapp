import AsyncStorage from "@react-native-async-storage/async-storage";

import type { DamageRoofReport } from "./roofReportTypes";

const STORAGE_KEY = "roof_reports_v1";

function safeParse(json: string | null): any[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadRoofReports(): Promise<DamageRoofReport[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return safeParse(raw) as DamageRoofReport[];
}

export async function getRoofReportById(id: string): Promise<DamageRoofReport | null> {
  const reports = await loadRoofReports();
  return reports.find((r) => r.id === id) ?? null;
}

export async function upsertRoofReport(report: DamageRoofReport): Promise<void> {
  const reports = await loadRoofReports();
  const idx = reports.findIndex((r) => r.id === report.id);
  const next = idx === -1 ? [report, ...reports] : [...reports.slice(0, idx), report, ...reports.slice(idx + 1)];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function deleteRoofReport(id: string): Promise<void> {
  const reports = await loadRoofReports();
  const next = reports.filter((r) => r.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

