/**
 * Server-side ArcGIS FeatureServer access. URLs and tokens stay in Worker env — never exposed to the browser.
 *
 * Secrets: wrangler secret put ARCGIS_API_TOKEN
 * Vars: ARCGIS_FEATURE_LAYER_URL, ARCGIS_EXTRA_PARCEL_FALLBACKS_JSON (optional), ESRI_BUILDING_FOOTPRINT_LAYER_URL (optional; defaults to USGS building layer).
 * Optional MapServer raster overlay for the map: ARCGIS_MAPSERVER_TILE_URL etc. (see health.ts — not used in this file).
 */

import { getBearerPayload, type AuthEnv } from "./authRoutes";
import {
  bboxIntersectsStLouisIndependentCity,
  pointInStLouisIndependentCity,
  resolveArcgisParcelLayerUrl,
  resolveStlCityParcelLayerUrl,
} from "./arcgisParcelEnv";
import {
  allParcelFallbackRegions,
  bboxIntersectsParcelFallbackRegion,
  parcelFallbackUrlsForPoint,
} from "./arcgisParcelFallbacks";

const DEFAULT_BUILDING_LAYER =
  "https://services.arcgis.com/lQySeXwbBg53XWDi/arcgis/rest/services/Building_Footprints_USGS/FeatureServer/0";

export type ArcgisEnv = AuthEnv & {
  ARCGIS_FEATURE_LAYER_URL?: string;
  ARCGIS_STL_CITY_PARCEL_LAYER_URL?: string;
  ARCGIS_API_TOKEN?: string;
  ARCGIS_EXTRA_PARCEL_FALLBACKS_JSON?: string;
  ESRI_BUILDING_FOOTPRINT_LAYER_URL?: string;
};

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json; charset=utf-8" };
}

/** FeatureServer or MapServer layer base (…/FeatureServer/N or …/MapServer/N) for /query. */
function normalizeArcgisQueryableLayerUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    let path = u.pathname.replace(/\/+$/, "");
    if (path.toLowerCase().endsWith("/query")) path = path.slice(0, -"/query".length);
    if (!/\/(FeatureServer|MapServer)\/\d+$/i.exec(path)) return null;
    return `${u.origin}${path}`;
  } catch {
    return null;
  }
}

const DEFAULT_ARCGIS_MAX_FEATURES = 2500;

/** Max map span (deg) for bbox GeoJSON — keeps queries bounded for dense counties. */
const MAX_BBOX_SPAN_DEG = 0.45;

function mergeFeatureCollections(
  a: GeoJSON.FeatureCollection,
  b: GeoJSON.FeatureCollection,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [...(a.features ?? []), ...(b.features ?? [])],
  };
}

async function fetchLayerGeoJson(
  layerBaseUrl: string,
  token: string | undefined,
  options?: { bbox?: [number, number, number, number] },
): Promise<GeoJSON.FeatureCollection> {
  const base = normalizeArcgisQueryableLayerUrl(layerBaseUrl);
  if (!base) throw new Error("Invalid Feature or Map layer URL.");

  const bbox = options?.bbox;
  const useBbox =
    bbox &&
    bbox.length === 4 &&
    bbox[0] < bbox[2] &&
    bbox[1] < bbox[3] &&
    bbox[2] - bbox[0] <= MAX_BBOX_SPAN_DEG &&
    bbox[3] - bbox[1] <= MAX_BBOX_SPAN_DEG;

  const max = Math.min(DEFAULT_ARCGIS_MAX_FEATURES, useBbox ? 5000 : 2500);
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
    resultRecordCount: String(max),
  });
  if (token?.trim()) params.set("token", token.trim());

  if (useBbox && bbox) {
    params.set("geometryType", "esriGeometryEnvelope");
    params.set("spatialRel", "esriSpatialRelIntersects");
    params.set("inSR", "4326");
    params.set(
      "geometry",
      JSON.stringify({
        xmin: bbox[0],
        ymin: bbox[1],
        xmax: bbox[2],
        ymax: bbox[3],
        spatialReference: { wkid: 4326 },
      }),
    );
  }

  const url = `${base}/query?${params.toString()}`;
  const res = await fetch(url);
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    throw new Error("ArcGIS returned non-JSON.");
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

const SPATIAL_RELS = ["esriSpatialRelIntersects", "esriSpatialRelWithin"] as const;

async function queryAttributesAtPoint(
  layerBaseUrl: string,
  lat: number,
  lng: number,
  token: string | undefined,
): Promise<{
  ok: true;
  attributes: Record<string, unknown>;
} | { ok: false; reason: "no_hit" | "api"; message?: string }> {
  const base = normalizeArcgisQueryableLayerUrl(layerBaseUrl);
  if (!base) {
    return { ok: false, reason: "api", message: "Invalid layer URL." };
  }

  const geometry = JSON.stringify({
    x: lng,
    y: lat,
    spatialReference: { wkid: 4326 },
  });

  for (const spatialRel of SPATIAL_RELS) {
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
      return { ok: false, reason: "api", message: "ArcGIS did not return JSON." };
    }
    if (!res.ok && !parsed.error?.message) {
      return { ok: false, reason: "api", message: `HTTP ${res.status}` };
    }
    if (parsed.error?.message) {
      return { ok: false, reason: "api", message: parsed.error.message };
    }
    const feats = parsed.features;
    if (Array.isArray(feats) && feats.length > 0) {
      const attrs = feats[0]?.attributes;
      if (attrs && typeof attrs === "object") {
        return { ok: true, attributes: attrs as Record<string, unknown> };
      }
    }
  }

  return { ok: false, reason: "no_hit" };
}

/** Point query with geometry — used for building footprints on the map (GeoJSON polygon). */
async function queryGeoJsonFeatureAtPoint(
  layerBaseUrl: string,
  lat: number,
  lng: number,
  token: string | undefined,
): Promise<
  | { ok: true; attributes: Record<string, unknown>; geometry: GeoJSON.Geometry }
  | { ok: false; reason: "no_hit" | "api"; message?: string }
> {
  const base = normalizeArcgisQueryableLayerUrl(layerBaseUrl);
  if (!base) {
    return { ok: false, reason: "api", message: "Invalid layer URL." };
  }

  const pointGeom = JSON.stringify({
    x: lng,
    y: lat,
    spatialReference: { wkid: 4326 },
  });

  for (const spatialRel of SPATIAL_RELS) {
    const params = new URLSearchParams({
      f: "geojson",
      where: "1=1",
      geometry: pointGeom,
      geometryType: "esriGeometryPoint",
      inSR: "4326",
      spatialRel,
      outFields: "*",
      returnGeometry: "true",
      resultRecordCount: "5",
    });
    if (token?.trim()) params.set("token", token.trim());

    const url = `${base}/query?${params.toString()}`;
    const res = await fetch(url);
    const text = await res.text();
    let parsed: {
      type?: string;
      features?: GeoJSON.Feature[];
      error?: { message?: string };
    };
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      return { ok: false, reason: "api", message: "ArcGIS did not return JSON." };
    }
    if (!res.ok && !parsed.error?.message) {
      return { ok: false, reason: "api", message: `HTTP ${res.status}` };
    }
    if (parsed.error?.message) {
      return { ok: false, reason: "api", message: parsed.error.message };
    }
    const feats = parsed.features;
    if (parsed.type === "FeatureCollection" && Array.isArray(feats) && feats.length > 0) {
      const feat = feats[0];
      const geom = feat.geometry;
      if (geom && (geom.type === "Polygon" || geom.type === "MultiPolygon")) {
        const props = feat.properties;
        const attrs =
          props && typeof props === "object" && !Array.isArray(props)
            ? (props as Record<string, unknown>)
            : {};
        return { ok: true, attributes: attrs, geometry: geom };
      }
    }
  }

  return { ok: false, reason: "no_hit" };
}

export async function handleArcgisRequest(
  request: Request,
  env: ArcgisEnv,
  path: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const j = jsonHeaders(corsHeaders);

  /** Canvassing is public; these GETs only read public assessor layers (no user secrets). */
  const publicArcgisRead =
    request.method === "GET" &&
    (path === "/api/arcgis/parcel/geojson" || path === "/api/arcgis/query-at-point");

  const auth = await getBearerPayload(request, env);
  if (!auth && !publicArcgisRead) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: j,
    });
  }

  if (path === "/api/arcgis/parcel/geojson" && request.method === "GET") {
    const rawUrl = resolveArcgisParcelLayerUrl(env);
    if (!rawUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Parcel ArcGIS layer is disabled. Set ARCGIS_FEATURE_LAYER_URL on the Worker or remove __DISABLE_ARCGIS_PARCEL__.",
        }),
        { status: 503, headers: j },
      );
    }
    try {
      const token = (env.ARCGIS_API_TOKEN || "").trim();
      const urlObj = new URL(request.url);
      const bboxParam = urlObj.searchParams.get("bbox");
      let bboxOpts: { bbox?: [number, number, number, number] } | undefined;
      if (bboxParam) {
        const parts = bboxParam.split(",").map((p) => Number.parseFloat(p.trim()));
        if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
          const [west, south, east, north] = parts;
          if (
            west < east &&
            south < north &&
            east - west <= MAX_BBOX_SPAN_DEG &&
            north - south <= MAX_BBOX_SPAN_DEG
          ) {
            bboxOpts = { bbox: [west, south, east, north] };
          }
        }
      }
      let fc = await fetchLayerGeoJson(rawUrl, token || undefined, bboxOpts);
      const bbox = bboxOpts?.bbox;
      if (bbox) {
        const [w, s, e, n] = bbox;
        const cityUrl = resolveStlCityParcelLayerUrl(env);
        if (cityUrl && bboxIntersectsStLouisIndependentCity(w, s, e, n)) {
          try {
            const cityFc = await fetchLayerGeoJson(cityUrl, token || undefined, bboxOpts);
            fc = mergeFeatureCollections(fc, cityFc);
          } catch {
            /* City layer merge is best-effort (MapServer availability). */
          }
        }
        const primaryNorm = normalizeArcgisQueryableLayerUrl(rawUrl);
        const cityNorm = cityUrl ? normalizeArcgisQueryableLayerUrl(cityUrl) : null;
        const fallbackRegions = allParcelFallbackRegions(env).filter((region) => {
          if (!bboxIntersectsParcelFallbackRegion(w, s, e, n, region)) return false;
          const fn = normalizeArcgisQueryableLayerUrl(region.layerUrl);
          return Boolean(fn && fn !== primaryNorm && fn !== cityNorm);
        });
        const fallbackFetches = await Promise.allSettled(
          fallbackRegions.map((region) => fetchLayerGeoJson(region.layerUrl, token || undefined, bboxOpts)),
        );
        for (const settled of fallbackFetches) {
          if (settled.status === "fulfilled") {
            fc = mergeFeatureCollections(fc, settled.value);
          }
        }
      }
      return new Response(JSON.stringify(fc), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ArcGIS parcel layer failed";
      return new Response(JSON.stringify({ success: false, error: msg }), { status: 502, headers: j });
    }
  }

  if (path === "/api/arcgis/query-at-point" && request.method === "GET") {
    const url = new URL(request.url);
    const lat = Number.parseFloat(url.searchParams.get("lat") || "");
    const lng = Number.parseFloat(url.searchParams.get("lng") || "");
    const kind = (url.searchParams.get("kind") || "parcel").toLowerCase();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid lat/lng" }), {
        status: 400,
        headers: j,
      });
    }

    const token = (env.ARCGIS_API_TOKEN || "").trim() || undefined;

    let layerUrl: string;
    if (kind === "building") {
      layerUrl = (env.ESRI_BUILDING_FOOTPRINT_LAYER_URL || "").trim() || DEFAULT_BUILDING_LAYER;
    } else if (kind === "parcel") {
      layerUrl = resolveArcgisParcelLayerUrl(env) ?? "";
      if (!layerUrl) {
        return new Response(
          JSON.stringify({
            ok: false,
            reason: "no_layer",
            message:
              "Parcel ArcGIS layer is disabled. Set ARCGIS_FEATURE_LAYER_URL on the Worker or remove __DISABLE_ARCGIS_PARCEL__.",
          }),
          { status: 200, headers: j },
        );
      }
    } else {
      return new Response(JSON.stringify({ success: false, error: "kind must be parcel or building" }), {
        status: 400,
        headers: j,
      });
    }

    if (kind === "building") {
      const out = await queryGeoJsonFeatureAtPoint(layerUrl, lat, lng, token);
      if (out.ok) {
        return new Response(
          JSON.stringify({
            ok: true,
            attributes: out.attributes,
            geometry: out.geometry,
          }),
          { status: 200, headers: j },
        );
      }
      if (out.reason === "no_hit") {
        return new Response(JSON.stringify({ ok: false, reason: "no_hit" }), { status: 200, headers: j });
      }
      return new Response(
        JSON.stringify({ ok: false, reason: "api", message: out.message }),
        { status: 200, headers: j },
      );
    }

    let out = await queryAttributesAtPoint(layerUrl, lat, lng, token);
    if (out.ok) {
      return new Response(JSON.stringify({ ok: true, attributes: out.attributes }), { status: 200, headers: j });
    }
    if (out.reason === "no_hit" && pointInStLouisIndependentCity(lat, lng)) {
      const cityLayer = resolveStlCityParcelLayerUrl(env);
      const primaryNorm = normalizeArcgisQueryableLayerUrl(layerUrl);
      const cityNorm = cityLayer ? normalizeArcgisQueryableLayerUrl(cityLayer) : null;
      if (cityNorm && cityNorm !== primaryNorm) {
        const cityOut = await queryAttributesAtPoint(cityLayer, lat, lng, token);
        if (cityOut.ok) {
          return new Response(JSON.stringify({ ok: true, attributes: cityOut.attributes }), { status: 200, headers: j });
        }
      }
    }
    if (out.reason === "no_hit") {
      const primaryNorm = normalizeArcgisQueryableLayerUrl(layerUrl);
      const cityLayer = resolveStlCityParcelLayerUrl(env);
      const cityNorm = cityLayer ? normalizeArcgisQueryableLayerUrl(cityLayer) : null;
      const tried = new Set<string>();
      if (primaryNorm) tried.add(primaryNorm);
      if (cityNorm) tried.add(cityNorm);
      for (const fbUrl of parcelFallbackUrlsForPoint(lat, lng, env)) {
        const fn = normalizeArcgisQueryableLayerUrl(fbUrl);
        if (!fn || tried.has(fn)) continue;
        tried.add(fn);
        const fbOut = await queryAttributesAtPoint(fbUrl, lat, lng, token);
        if (fbOut.ok) {
          return new Response(JSON.stringify({ ok: true, attributes: fbOut.attributes }), { status: 200, headers: j });
        }
      }
      return new Response(JSON.stringify({ ok: false, reason: "no_hit" }), { status: 200, headers: j });
    }
    return new Response(
      JSON.stringify({ ok: false, reason: "api", message: out.message }),
      { status: 200, headers: j },
    );
  }

  return new Response(JSON.stringify({ success: false, error: "Not found" }), { status: 404, headers: j });
}
