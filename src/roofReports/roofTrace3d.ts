/**
 * Roof trace 3D helpers (web / Mapbox):
 * - Elevation from Map.queryTerrainElevation when terrain is loaded, else Mapbox Tilequery (terrain-v2).
 * - Rough pitch from elevation spread vs horizontal span (advisory only).
 */

import * as turf from "@turf/turf";
import type { Map as MapboxMap } from "mapbox-gl";

export interface RoofPoint3D {
  lng: number;
  lat: number;
  elevation?: number;
}

export interface RoofTrace3D {
  polygon2D: GeoJSON.Feature<GeoJSON.Polygon>;
  points3D: RoofPoint3D[];
  areaM2: number;
  areaSqFt: number;
  perimeterFt: number;
  avgElevationM?: number;
  estimatedPitch?: string;
}

/**
 * Mapbox Tilequery on mapbox-terrain-v2 (vector) — fallback when map terrain query is unavailable.
 */
export async function getElevationTilequery(
  lng: number,
  lat: number,
  mapboxToken: string,
): Promise<number | null> {
  try {
    const url = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${lng},${lat}.json?access_token=${encodeURIComponent(mapboxToken)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{ properties?: Record<string, unknown> }>;
    };
    const props = data.features?.[0]?.properties;
    if (!props) return null;
    const ele = props.ele ?? props.elevation;
    if (typeof ele === "number" && Number.isFinite(ele)) return ele;
    if (typeof ele === "string") {
      const n = Number.parseFloat(ele);
      return Number.isFinite(n) ? n : null;
    }
  } catch (e) {
    console.warn("Elevation tilequery failed:", e);
  }
  return null;
}

/**
 * Prefer in-map terrain RGB (same source as the globe); falls back to Tilequery API.
 */
export async function getElevationAtLngLat(
  lng: number,
  lat: number,
  map: MapboxMap | null,
  mapboxToken: string,
): Promise<number | null> {
  if (map) {
    try {
      const q = map.queryTerrainElevation([lng, lat]);
      if (typeof q === "number" && Number.isFinite(q)) return q;
    } catch {
      // terrain not ready
    }
  }
  return getElevationTilequery(lng, lat, mapboxToken);
}

/**
 * Sample polygon boundary with corners + edge midpoints for smoother terrain sampling.
 */
function sampleRingLngLat(ring: GeoJSON.Position[]): [number, number][] {
  const open = ring.slice(0, -1);
  if (open.length < 3) return [];
  const out: [number, number][] = [];
  for (let i = 0; i < open.length; i++) {
    const a = open[i];
    const b = open[(i + 1) % open.length];
    out.push([a[0], a[1]]);
    out.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  return out;
}

/**
 * Least-squares plane z = a + b*x + c*y in local meters (ENU). Returns |gradient| = sqrt(b²+c²) = dz/d_horizontal.
 */
function fitHorizontalSlopeMm(
  xs: number[],
  ys: number[],
  zs: number[],
): number | null {
  const n = xs.length;
  if (n < 3) return null;

  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  const mz = zs.reduce((s, v) => s + v, 0) / n;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  let sxz = 0;
  let syz = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i] - mx;
    const y = ys[i] - my;
    const z = zs[i] - mz;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
    sxz += x * z;
    syz += y * z;
  }

  const det = sxx * syy - sxy * sxy;
  if (Math.abs(det) < 1e-18) return null;

  const b = (sxz * syy - syz * sxy) / det;
  const c = (sxx * syz - sxz * sxy) / det;
  return Math.hypot(b, c);
}

function metersPerDegLon(latDeg: number): number {
  return 111_320 * Math.cos((latDeg * Math.PI) / 180);
}

function toLocalXyMeters(
  lng: number,
  lat: number,
  originLng: number,
  originLat: number,
): { x: number; y: number } {
  return {
    x: (lng - originLng) * metersPerDegLon(originLat),
    y: (lat - originLat) * 111_320,
  };
}

/**
 * Estimate pitch (rise:12) from terrain elevations by fitting a best-fit plane to samples.
 * More stable than max–min corner pairs (which tracked ground slope across the lot, not a roof plane).
 * Still **advisory**: DEM is ground/terrain, not roof surface.
 */
export function estimatePitchFrom3DTrace(
  points3D: RoofPoint3D[],
  perimeterMeters: number,
): string | undefined {
  const valid = points3D.filter(
    (p) => p.elevation !== undefined && Number.isFinite(p.elevation as number),
  ) as Array<RoofPoint3D & { elevation: number }>;
  if (valid.length < 3) return undefined;

  let cLon = 0;
  let cLat = 0;
  for (const p of valid) {
    cLon += p.lng;
    cLat += p.lat;
  }
  cLon /= valid.length;
  cLat /= valid.length;

  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  for (const p of valid) {
    const { x, y } = toLocalXyMeters(p.lng, p.lat, cLon, cLat);
    xs.push(x);
    ys.push(y);
    zs.push(p.elevation);
  }

  const slope = fitHorizontalSlopeMm(xs, ys, zs);
  if (slope == null || !Number.isFinite(slope)) {
    return fallbackPitchFromExtent(valid, perimeterMeters);
  }

  /** Horizontal gradient magnitude (m/m) → rise per 12 in horizontal. */
  let riseOn12 = slope * 12;
  if (!Number.isFinite(riseOn12) || riseOn12 < 0) return "0:12";

  /** Ignore micro-noise; cap unrealistic terrain-derived steepness. */
  if (riseOn12 < 0.15) return "0:12";
  riseOn12 = Math.min(riseOn12, 24);

  const rounded = Math.round(riseOn12);
  return `${rounded}:12`;
}

/** Legacy heuristic if plane fit is degenerate. */
function fallbackPitchFromExtent(
  valid: Array<RoofPoint3D & { elevation: number }>,
  perimeterMeters: number,
): string | undefined {
  const elevations = valid.map((p) => p.elevation);
  const maxElev = Math.max(...elevations);
  const minElev = Math.min(...elevations);
  const riseM = maxElev - minElev;
  if (riseM < 0.05) return "0:12";

  const maxGroup = valid.filter((p) => p.elevation === maxElev);
  const minGroup = valid.filter((p) => p.elevation === minElev);
  let runM = 0;
  for (const a of maxGroup) {
    for (const b of minGroup) {
      const d = turf.distance(
        turf.point([a.lng, a.lat]),
        turf.point([b.lng, b.lat]),
        {
          units: "meters",
        },
      );
      if (d > runM) runM = d;
    }
  }

  if (!Number.isFinite(runM) || runM < 1) {
    runM = Math.max(perimeterMeters / 4, 2);
  }

  const risePer12 = (riseM / runM) * 12;
  const rise = Math.min(24, Math.max(0, Math.round(risePer12)));
  return `${rise}:12`;
}

/**
 * Build 3D-aware roof trace metrics from a drawn polygon feature.
 */
export async function enhanceRoofTraceWith3D(
  polygonFeature: GeoJSON.Feature<GeoJSON.Polygon>,
  mapboxToken: string,
  map: MapboxMap | null,
): Promise<RoofTrace3D | null> {
  const geom = polygonFeature.geometry;
  if (!geom || geom.type !== "Polygon" || !geom.coordinates?.[0]?.length)
    return null;

  const ring = geom.coordinates[0];
  const samplePts = sampleRingLngLat(ring);

  const points3D: RoofPoint3D[] = await Promise.all(
    samplePts.map(async ([lng, lat]) => {
      const elev = await getElevationAtLngLat(lng, lat, map, mapboxToken);
      return { lng, lat, elevation: elev ?? undefined };
    }),
  );

  const feature = turf.polygon([ring]);
  const areaM2 = turf.area(feature);
  const areaSqFt = areaM2 * 10.7639104167;
  let perimeterFt: number;
  try {
    const line = turf.polygonToLine(feature);
    perimeterFt = turf.length(line, { units: "feet" });
  } catch {
    perimeterFt = turf.length(turf.lineString(ring), { units: "feet" });
  }

  const perimeterM = turf.length(turf.lineString(ring), { units: "meters" });
  const estimatedPitch = estimatePitchFrom3DTrace(points3D, perimeterM);

  const defined = points3D.filter((p) => p.elevation !== undefined);
  const avgElevationM =
    defined.length > 0
      ? defined.reduce((s, p) => s + (p.elevation as number), 0) /
        defined.length
      : undefined;

  return {
    polygon2D: polygonFeature,
    points3D,
    areaM2,
    areaSqFt,
    perimeterFt,
    avgElevationM,
    estimatedPitch,
  };
}
