/**
 * Client for POST /api/ai/roof-vision (Worker → Python vision service).
 * Merge results with GPT-based /api/ai/roof-damage in the UI as needed.
 */

export type RoofVisionInferenceResult = {
  success?: boolean;
  provider?: string;
  model?: string;
  damageTypes?: string[];
  severity?: number;
  recommendedAction?: string;
  confidence?: number;
  notes?: string;
  error?: string;
};

export async function inferRoofVision(
  apiBaseUrl: string,
  imageBase64: string,
  mimeType = "image/jpeg",
): Promise<RoofVisionInferenceResult> {
  const base = apiBaseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/api/ai/roof-vision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType }),
  });
  const data = (await res.json()) as RoofVisionInferenceResult;
  if (!res.ok) {
    return {
      success: false,
      error: data?.error ?? `HTTP ${res.status}`,
    };
  }
  return data;
}
