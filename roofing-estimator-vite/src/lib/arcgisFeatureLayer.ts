/**
 * Query public or token-protected ArcGIS Feature layers as GeoJSON for Mapbox overlays.
 * @see https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer-.htm
 */

export const DEFAULT_ARCGIS_MAX_FEATURES = 2500;

/** Trim and ensure URL points at a layer (…/FeatureServer/{id}) without /query. */
export function normalizeArcgisFeatureLayerUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    let path = u.pathname.replace(/\/+$/, "");
    if (path.toLowerCase().endsWith("/query")) path = path.slice(0, -"/query".length);
    const m = /\/FeatureServer\/\d+$/i.exec(path);
    if (!m) return null;
    return `${u.origin}${path}`;
  } catch {
    return null;
  }
}

export async function fetchArcgisLayerAsGeoJson(
  layerBaseUrl: string,
  options?: { token?: string; maxFeatures?: number },
): Promise<GeoJSON.FeatureCollection> {
  const base = normalizeArcgisFeatureLayerUrl(layerBaseUrl);
  if (!base) throw new Error("Invalid Feature layer URL (need …/FeatureServer/0 style URL).");

  const max = Math.min(
    Math.max(1, options?.maxFeatures ?? DEFAULT_ARCGIS_MAX_FEATURES),
    5000,
  );
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
    resultRecordCount: String(max),
  });
  const token = options?.token?.trim();
  if (token) params.set("token", token);

  const url = `${base}/query?${params.toString()}`;
  const res = await fetch(url);
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    throw new Error("ArcGIS returned non-JSON (check URL and CORS).");
  }

  if (!res.ok) {
    const err = (data as { error?: { message?: string } })?.error?.message;
    throw new Error(err || `ArcGIS query failed (HTTP ${res.status}).`);
  }

  const rec = data as { type?: string; error?: { message?: string } };
  if (rec.error?.message) throw new Error(rec.error.message);
  if (rec.type !== "FeatureCollection") {
    throw new Error("ArcGIS did not return a GeoJSON FeatureCollection.");
  }

  return data as GeoJSON.FeatureCollection;
}

/** Merge org-stored key with Vite env (env wins when set). */
export function resolveArcgisApiKey(orgKey: string | undefined): string {
  const env = import.meta.env.VITE_ARCGIS_API_KEY?.trim();
  if (env) return env;
  return (orgKey ?? "").trim();
}

export function resolveArcgisFeatureLayerUrl(orgUrl: string | undefined): string {
  const env = import.meta.env.VITE_ARCGIS_FEATURE_LAYER_URL?.trim();
  if (env) return env;
  return (orgUrl ?? "").trim();
}
