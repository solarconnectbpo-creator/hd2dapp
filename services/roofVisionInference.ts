/**
 * Client for POST /api/ai/roof-vision (Worker → Python vision service).
 * Merge results with GPT-based /api/ai/roof-damage in the UI as needed.
 */

/** Detectron2 / future segmentation payloads (pixel space). */
export type RoofSegmentationResult = {
  polygonCount?: number;
  totalAreaPx?: number;
  perPolygonAreaPx?: number[];
  imageWidth?: number;
  imageHeight?: number;
  /** When ml-vision-service sets DETECTRON2_SQFT_PER_PX_SQ (mask px² → ft²). */
  estimatedRoofAreaSqFt?: number;
  /** Omitted when server sets detectron2_include_polygons=false (large). */
  polygons?: number[][][] | null;
};

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
  /** Roof facet masks + areas when Worker → ml-vision-service uses Detectron2. */
  segmentation?: RoofSegmentationResult;
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
