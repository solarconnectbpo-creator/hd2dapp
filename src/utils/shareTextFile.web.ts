/**
 * Web-only export: anchor download without expo-file-system (keeps native deps off web).
 * Click runs synchronously so the browser treats the download as user-initiated.
 */

export type ShareTextFileResult = { ok: true } | { ok: false; error: string };

function sanitizeDownloadFilename(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "_").trim();
  return base.length > 0 ? base.slice(0, 180) : "download.txt";
}

function blobTypeForMime(mimeType: string): string {
  if (mimeType.includes("charset")) return mimeType;
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/javascript"
  ) {
    return `${mimeType};charset=utf-8`;
  }
  return mimeType;
}

/**
 * Synchronous download (same tick as click). Use this from export paths so the
 * browser keeps the user-activation gate for programmatic downloads.
 */
export function downloadTextFileWebSync(
  filename: string,
  content: string,
  mimeType = "text/plain;charset=utf-8",
): ShareTextFileResult {
  try {
    if (typeof document === "undefined") {
      return {
        ok: false,
        error: "Download is only available in a browser environment.",
      };
    }

    const safeName = sanitizeDownloadFilename(filename);
    const blob = new Blob([content], { type: blobTypeForMime(mimeType) });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = safeName;
    link.rel = "noopener noreferrer";
    // display:none can block downloads; keep off-screen but *clickable* — Chrome may ignore
    // programmatic .click() on pointer-events:none anchors (no user-activation for download).
    link.setAttribute(
      "style",
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0.01;pointer-events:auto",
    );
    document.body.appendChild(link);
    // Ensure layout so Chrome applies the link before navigation/download.
    void link.offsetWidth;
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 8000);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

export async function shareTextFile(
  filename: string,
  content: string,
  mimeType = "text/plain;charset=utf-8",
): Promise<ShareTextFileResult> {
  return downloadTextFileWebSync(filename, content, mimeType);
}
