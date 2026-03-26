import { strToU8, zipSync } from "fflate";

/** Build a ZIP synchronously (UTF-8 text entries). Used for web bulk exports in one user gesture. */
export function zipSyncTextFiles(
  files: { path: string; content: string }[],
): Uint8Array {
  const out: Record<string, Uint8Array> = {};
  for (const f of files) {
    const key = f.path.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!key) continue;
    out[key] = strToU8(f.content);
  }
  return zipSync(out);
}
