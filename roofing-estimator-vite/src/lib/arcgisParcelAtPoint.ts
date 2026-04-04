/**
 * Point-in-parcel query against an ArcGIS Feature Layer (public assessor parcels).
 * Use when Mapbox queryRenderedFeatures misses the polygon (click off-line) but the REST API can still hit the parcel.
 *
 * CORS: many *.arcgis.com and county hosts allow browser fetch; some do not. On failure, check DevTools
 * network tab — you may need a same-origin proxy (HD2D Worker in production).
 *
 * @see https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer-.htm
 */

import { normalizeArcgisFeatureLayerUrl } from "./arcgisFeatureLayer";

export type ParcelAtPointOutcome =
  | { ok: true; attributes: Record<string, unknown>; geometry?: GeoJSON.Geometry }
  | { ok: false; reason: "no_layer" | "no_hit" | "network" | "api"; message?: string };

const SPATIAL_RELS = ["esriSpatialRelIntersects", "esriSpatialRelWithin"] as const;

async function runQuery(
  base: string,
  lat: number,
  lng: number,
  spatialRel: (typeof SPATIAL_RELS)[number],
  token?: string,
): Promise<{ features?: Array<{ attributes?: Record<string, unknown> }>; error?: { message?: string } } | null> {
  const geometry = JSON.stringify({
    x: lng,
    y: lat,
    spatialReference: { wkid: 4326 },
  });

  const params = new URLSearchParams({
    f: "json",
    where: "1=1",
    geometry,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel,
    outFields: "*",
    returnGeometry: "false",
    resultRecordCount: "5",
  });
  if (token?.trim()) params.set("token", token.trim());

  const url = `${base}/query?${params.toString()}`;
  const res = await fetch(url);
  const text = await res.text();
  let parsed: {
    features?: Array<{ attributes?: Record<string, unknown> }>;
    error?: { message?: string };
  };
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    return null;
  }
  if (!res.ok && !parsed.error?.message) {
    return { error: { message: `HTTP ${res.status}` } };
  }
  return parsed;
}

/**
 * Query a single parcel feature whose geometry intersects or contains the given WGS84 point.
 * Tries `Intersects` first, then `Within`, since layer behavior varies.
 */
export async function fetchParcelAttributesAtPoint(
  layerBaseUrl: string,
  lat: number,
  lng: number,
  options?: { token?: string },
): Promise<ParcelAtPointOutcome> {
  const base = normalizeArcgisFeatureLayerUrl(layerBaseUrl);
  if (!base) {
    return { ok: false, reason: "no_layer", message: "Invalid or empty Feature layer URL." };
  }

  const token = options?.token;

  try {
    for (const spatialRel of SPATIAL_RELS) {
      const data = await runQuery(base, lat, lng, spatialRel, token);
      if (!data) {
        return {
          ok: false,
          reason: "api",
          message: "ArcGIS did not return JSON (check URL, CORS, or server error).",
        };
      }
      if (data.error?.message) {
        return { ok: false, reason: "api", message: data.error.message };
      }

      const feats = data.features;
      if (Array.isArray(feats) && feats.length > 0) {
        const attrs = feats[0]?.attributes;
        if (attrs && typeof attrs === "object") {
          return { ok: true, attributes: attrs as Record<string, unknown> };
        }
      }
    }

    return { ok: false, reason: "no_hit" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      reason: "network",
      message: `${msg} — if this persists, the layer may block browser CORS; try a public arcgis.com layer or a same-origin proxy.`,
    };
  }
}

function isNonEmptyScalar(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "boolean") return true;
  return false;
}

function isOwnerLikeFieldKey(key: string): boolean {
  return /owner|tax|deed|grantee|taxpayer|mail_name|proprietor|nm_|name_full|holdr|holder/i.test(key);
}

/**
 * Merge map-hit attributes with REST point query.
 * Empty map values no longer wipe non-empty REST fields. When both sides have values, REST wins for owner-like keys (assessor), map wins for site/display fields.
 */
export function mergeArcgisFeatureSources(
  fromMap: Record<string, unknown> | null | undefined,
  fromRest: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  const hasMap = fromMap && Object.keys(fromMap).length > 0;
  const hasRest = fromRest && Object.keys(fromRest).length > 0;
  if (!hasMap && !hasRest) return null;
  if (!hasMap) return { ...fromRest! };
  if (!hasRest) return { ...fromMap! };

  const rest = fromRest!;
  const map = fromMap!;
  const keys = new Set([...Object.keys(rest), ...Object.keys(map)]);
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const rv = rest[k];
    const mv = map[k];
    const rOk = isNonEmptyScalar(rv);
    const mOk = isNonEmptyScalar(mv);
    if (!rOk && !mOk) {
      out[k] = mv !== undefined ? mv : rv;
      continue;
    }
    if (rOk && !mOk) out[k] = rv;
    else if (!rOk && mOk) out[k] = mv;
    else if (isOwnerLikeFieldKey(k)) out[k] = rv;
    else out[k] = mv;
  }
  return out;
}
