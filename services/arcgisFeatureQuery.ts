/**
 * Minimal ArcGIS FeatureServer query helpers (GET, JSON).
 */

export type ArcGISFeatureQueryResult = {
  features?: Array<{
    attributes?: Record<string, unknown>;
    geometry?: unknown;
  }>;
  error?: { message?: string; code?: number };
};

function buildQueryUrl(
  layerUrl: string,
  params: Record<string, string | number | boolean | undefined>,
): string {
  const u = new URL(layerUrl.replace(/\/$/, "") + "/query");
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined) return;
    sp.set(k, String(v));
  });
  u.search = sp.toString();
  return u.toString();
}

/** Polygon layers: feature containing point (WGS84). */
export async function queryPolygonContainsPoint(
  layerUrl: string,
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<ArcGISFeatureQueryResult> {
  const geometry = JSON.stringify({ x: lng, y: lat });
  const url = buildQueryUrl(layerUrl, {
    f: "json",
    where: "1=1",
    geometry,
    geometryType: "esriGeometryPoint",
    inSR: 4326,
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: true,
    outSR: 4326,
  });
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`ArcGIS query failed: ${res.status}`);
  return (await res.json()) as ArcGISFeatureQueryResult;
}

/** Point layers: features within distance (meters) of a point. */
export async function queryPointsNear(
  layerUrl: string,
  lat: number,
  lng: number,
  distanceMeters: number,
  signal?: AbortSignal,
): Promise<ArcGISFeatureQueryResult> {
  const geometry = JSON.stringify({ x: lng, y: lat });
  const url = buildQueryUrl(layerUrl, {
    f: "json",
    where: "1=1",
    geometry,
    geometryType: "esriGeometryPoint",
    inSR: 4326,
    spatialRel: "esriSpatialRelIntersects",
    distance: distanceMeters,
    units: "esriSRUnit_Meter",
    outFields: "*",
    returnGeometry: true,
    outSR: 4326,
  });
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`ArcGIS query failed: ${res.status}`);
  return (await res.json()) as ArcGISFeatureQueryResult;
}
