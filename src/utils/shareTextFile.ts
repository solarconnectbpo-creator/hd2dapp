import {
  cacheDirectory,
  documentDirectory,
  writeAsStringAsync,
  EncodingType,
} from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

export type ShareTextFileResult = { ok: true } | { ok: false; error: string };

async function shareTextFileNative(
  filename: string,
  mime: string,
  content: string,
): Promise<void> {
  const base = cacheDirectory ?? documentDirectory;
  if (!base) {
    throw new Error("File storage is not available on this device.");
  }
  const path = `${base}${filename}`;
  await writeAsStringAsync(path, content, {
    encoding: EncodingType.UTF8,
  });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    Alert.alert(
      "Export saved",
      `Report file was written to the app cache. Sharing is not available on this device.\n\n${path}`,
    );
    return;
  }
  await Sharing.shareAsync(path, {
    mimeType: mime,
    dialogTitle: "Export report",
  });
}

/**
 * Native: writes to cache and opens the share sheet. Web implementation: `shareTextFile.web.ts`.
 */
export async function shareTextFile(
  filename: string,
  content: string,
  mimeType = "text/plain;charset=utf-8",
): Promise<ShareTextFileResult> {
  try {
    await shareTextFileNative(filename, mimeType, content);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
