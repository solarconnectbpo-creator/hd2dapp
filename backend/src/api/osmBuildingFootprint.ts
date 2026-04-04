/**
 * GET /api/osm/building-at-point — OpenStreetMap building polygon near a point via Overpass API.
 * Proxied from the Worker (rate limits, User-Agent) so the browser never calls Overpass directly.
 *
 * Microsoft Building Footprints (ML tiles) are not wired here — they require a separate data license
 * and quadkey/tile pipeline; OSM is the portable second tier after ESRI/USGS in canvassing.
 */

import { getBearerPayload, type AuthEnv } from "./authRoutes";

type CorsHeaders = Record<string, string>;

function json(data: unknown, status: number, corsHeaders: CorsHeaders): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

type OvWay = {
  type: string;
  geometry?: Array<{ lat: number; lon: number }>;
};

function wayGeometryToPolygon(geometry: Array<{ lat: number; lon: number }>): GeoJSON.Polygon | null {
  if (!geometry?.length || geometry.length < 3) return null;
  const ring: [number, number][] = geometry.map((p) => [p.lon, p.lat]);
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
  return { type: "Polygon", coordinates: [ring] };
}

function parseFirstBuildingPolygon(data: unknown): GeoJSON.Polygon | null {
  const root = data as { elements?: OvWay[] };
  const els = root.elements ?? [];
  for (const el of els) {
    if (el.type !== "way") continue;
    const poly = el.geometry ? wayGeometryToPolygon(el.geometry) : null;
    if (poly) return poly;
  }
  return null;
}

export async function handleOsmBuildingAtPointGet(
  request: Request,
  env: AuthEnv,
  corsHeaders: CorsHeaders,
): Promise<Response> {
  const auth = await getBearerPayload(request, env);
  if (!auth) {
    return json({ success: false, error: "Unauthorized" }, 401, corsHeaders);
  }

  const url = new URL(request.url);
  const lat = Number.parseFloat(url.searchParams.get("lat") ?? "");
  const lng = Number.parseFloat(url.searchParams.get("lng") ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return json({ ok: false, reason: "bad_params", message: "lat and lng are required" }, 400, corsHeaders);
  }

  const rawR = Number.parseFloat(url.searchParams.get("radiusM") ?? "50");
  const radiusM = Number.isFinite(rawR) ? Math.min(100, Math.max(20, rawR)) : 50;

  const q = `[out:json][timeout:25];
(
  way["building"](around:${radiusM},${lat},${lng});
);
out geom;`;

  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "hd2d-backend/1.0 (building footprint; osm overpass)",
      },
      body: `data=${encodeURIComponent(q)}`,
    });
  } catch (e) {
    console.warn(
      `[osm-building] overpass network error after ${Date.now() - t0}ms:`,
      e instanceof Error ? e.message : String(e),
    );
    return json(
      { ok: false, reason: "network", message: e instanceof Error ? e.message : "Overpass request failed" },
      502,
      corsHeaders,
    );
  }

  const ms = Date.now() - t0;
  if (!res.ok) {
    console.warn(`[osm-building] overpass HTTP ${res.status} in ${ms}ms`);
    return json({ ok: false, reason: "upstream", message: `Overpass HTTP ${res.status}` }, 502, corsHeaders);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return json({ ok: false, reason: "parse", message: "Overpass returned non-JSON" }, 502, corsHeaders);
  }

  const polygon = parseFirstBuildingPolygon(data);
  if (!polygon) {
    return json({ ok: false, reason: "no_hit" }, 200, corsHeaders);
  }

  return json(
    {
      ok: true,
      source: "osm-building",
      attributes: { source: "OpenStreetMap", overpassMs: ms, radiusM },
      geometry: polygon,
    },
    200,
    corsHeaders,
  );
}
