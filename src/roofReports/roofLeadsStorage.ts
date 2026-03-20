import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PropertySelection } from "./roofReportTypes";

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
  return safeParse(raw) as PropertySelection[];
}

export async function saveRoofLeads(leads: PropertySelection[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(leads ?? []));
}

export async function clearRoofLeads(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
}

