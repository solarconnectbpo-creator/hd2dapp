/**
 * OSM building footprint via HD2D Worker (Overpass) — second tier after ESRI/USGS in canvassing.
 */

import { getHd2dApiBase } from "./hd2dApiBase";
import { getStoredSession } from "./authClient";
import { readJsonResponseBody } from "./readJsonResponse";
import type { ParcelAtPointOutcome } from "./arcgisParcelAtPoint";

function authHeaders(): HeadersInit {
  const s = getStoredSession();
  const h: Record<string, string> = { Accept: "application/json" };
  if (s?.token) h.Authorization = `Bearer ${s.token}`;
  return h;
}

export function formatOsmBuildingFootprintNotes(attrs: Record<string, unknown>): string {
  const rows = Object.entries(attrs)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${String(v)}`);
  return ["OSM building footprint (OpenStreetMap contributors; verify in field)", ...rows].join("\n");
}

export async function fetchOsmBuildingFootprintAtPoint(lat: number, lng: number): Promise<ParcelAtPointOutcome> {
  const base = getHd2dApiBase().replace(/\/$/, "");
  if (!base) {
    return { ok: false, reason: "no_layer", message: "Backend API is not configured." };
  }
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  let res: Response;
  try {
    res = await fetch(`${base}/api/osm/building-at-point?${params.toString()}`, {
      headers: authHeaders(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: "network", message: msg };
  }
  if (res.status === 401) {
    return { ok: false, reason: "api", message: "Sign in required for OSM footprint proxy." };
  }
  let data: unknown;
  try {
    data = await readJsonResponseBody(res);
  } catch {
    return { ok: false, reason: "api", message: "Invalid JSON from OSM proxy." };
  }
  const rec = data as {
    ok?: boolean;
    attributes?: Record<string, unknown>;
    geometry?: GeoJSON.Geometry;
    reason?: string;
    message?: string;
  };
  if (rec.ok === true && rec.geometry) {
    const g = rec.geometry;
    if (g.type === "Polygon" || g.type === "MultiPolygon") {
      return {
        ok: true,
        attributes: rec.attributes && typeof rec.attributes === "object" ? rec.attributes : {},
        geometry: g,
      };
    }
  }
  if (rec.ok === false && rec.reason === "no_hit") {
    return { ok: false, reason: "no_hit" };
  }
  return {
    ok: false,
    reason: "api",
    message: rec.message || `OSM footprint error (HTTP ${res.status}).`,
  };
}
