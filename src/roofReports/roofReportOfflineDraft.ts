import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@hd2d/roof_report_last_export_failure_json";

/** When JSON/HTML export fails, stash payload for support / retry (device-local). */
export async function saveLastFailedExportDraft(json: string): Promise<void> {
  await AsyncStorage.setItem(KEY, json);
}

export async function clearLastFailedExportDraft(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export async function getLastFailedExportDraft(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}
