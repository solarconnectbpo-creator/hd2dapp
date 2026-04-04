/**
 * Resize and JPEG-compress images before storing in localStorage (mobile camera files are often huge).
 */

export type CompressOptions = {
  /** Longer edge in CSS pixels after scale (default 1600). */
  maxEdge?: number;
  /** JPEG quality 0–1 (default 0.82). */
  quality?: number;
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };
    img.src = url;
  });
}

/**
 * Returns a `data:image/jpeg;base64,...` URL suitable for `DamagePhoto.imageDataUrl`.
 */
export async function compressImageFileToJpegDataUrl(
  file: File,
  opts: CompressOptions = {},
): Promise<string> {
  const maxEdge = opts.maxEdge ?? 1600;
  const quality = opts.quality ?? 0.82;

  if (!file.type.startsWith("image/")) {
    throw new Error("File is not an image");
  }

  const img = await loadImageFromFile(file);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (w < 1 || h < 1) throw new Error("Invalid image dimensions");

  let tw = w;
  let th = h;
  const long = Math.max(w, h);
  if (long > maxEdge) {
    const scale = maxEdge / long;
    tw = Math.round(w * scale);
    th = Math.round(h * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  ctx.drawImage(img, 0, 0, tw, th);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  if (!dataUrl.startsWith("data:image/jpeg")) {
    throw new Error("JPEG encoding failed");
  }
  return dataUrl;
}

/** Strip `data:mime;base64,` prefix for API bodies. */
export function dataUrlToBase64Payload(dataUrl: string): { base64: string; mimeType: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Not a data URL");
  return { mimeType: m[1], base64: m[2] };
}
