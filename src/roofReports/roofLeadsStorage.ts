import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PropertySelection } from "./roofReportTypes";
import {
  mergeLeadsFromSupabase,
  pushRoofLeadsToSupabase,
} from "./roofLeadsSupabase";

const STORAGE_KEY = "roof_leads_v1";

function safeParse(json: string | null): any[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadRoofLeads(): Promise<PropertySelection[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const local = safeParse(raw) as PropertySelection[];
  const merged = await mergeLeadsFromSupabase(local);
  if (merged.length !== local.length || JSON.stringify(merged) !== JSON.stringify(local)) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }
  return merged;
}

export async function saveRoofLeads(leads: PropertySelection[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(leads ?? []));
  void pushRoofLeadsToSupabase(leads ?? []).catch((e) => {
    console.warn("[roofLeads] Supabase sync failed:", e);
  });
}

export async function clearRoofLeads(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
}

