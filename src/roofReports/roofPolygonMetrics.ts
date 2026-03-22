import * as turf from "@turf/turf";

export function extractLargestPolygonFromTrace(
  geo: any,
): GeoJSON.Feature<GeoJSON.Polygon> | null {
  if (!geo) return null;
  if (geo?.type === "Feature" && geo?.geometry?.type === "Polygon")
    return geo as GeoJSON.Feature<GeoJSON.Polygon>;
  if (geo?.type === "Polygon")
    return { type: "Feature", properties: {}, geometry: geo };
  if (geo?.type === "Feature" && geo?.geometry?.type === "MultiPolygon") {
    const mp = geo.geometry.coordinates as GeoJSON.Position[][][];
    let best: GeoJSON.Position[][] | null = null;
    let bestArea = -1;
    for (const rings of mp) {
      try {
        const f = turf.polygon(rings);
        const a = turf.area(f);
        if (a > bestArea) {
          bestArea = a;
          best = rings;
        }
      } catch {
        // ignore
      }
    }
    if (!best) return null;
    return {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: best },
    };
  }
  return null;
}

/** Plan-view edge role vs estimated ridge axis (PCA on footprint). */
export type RoofEdgeKind = "eave_ridge" | "rake" | "hip_valley";

export const ROOF_EDGE_KIND_LABEL: Record<RoofEdgeKind, string> = {
  eave_ridge: "Eave / ridge",
  rake: "Rake",
  hip_valley: "Hip / valley",
};

const EDGE_ABBREV: Record<RoofEdgeKind, string> = {
  eave_ridge: "E/R",
  rake: "Rk",
  hip_valley: "H/V",
};

export function roofEdgeKindAbbrev(kind: RoofEdgeKind): string {
  return EDGE_ABBREV[kind];
}

export type RoofPolygonEdgeMetric = {
  index: number;
  /** Geodesic horizontal length along the traced footprint (LF). */
  planFeet: number;
  /** Modeled length along roof surface for lineal takeoff (LF). */
  slopeFeetApprox?: number;
  kind: RoofEdgeKind;
  /** |cos(angle between edge and ridge axis)| — 1 = parallel, 0 = perpendicular. */
  ridgeAlignment: number;
};

/**
 * Parse pitch as rise/run (any positive run), or degrees (e.g. `26.5°`), for geometry math.
 * Use `parseRoofPitchRise` in roofLogicEngine for “rise on 12” comparisons.
 */
export function parsePitchRiseRun(
  pitch?: string,
): { rise: number; run: number } | undefined {
  if (!pitch?.trim()) return undefined;
  const s = pitch.trim();
  const m = s.match(/(\d{1,3}(?:\.\d+)?)\s*[/:]\s*(\d{1,3}(?:\.\d+)?)/);
  if (m) {
    const rise = Number(m[1]);
    const run = Number(m[2]);
    if (!Number.isFinite(rise) || !Number.isFinite(run) || run <= 0)
      return undefined;
    return { rise, run };
  }
  const degM = s.match(/(\d{1,3}(?:\.\d+)?)\s*(?:°|deg)/i);
  if (degM) {
    const deg = Number(degM[1]);
    if (!Number.isFinite(deg) || deg < 0 || deg >= 90) return undefined;
    const rise = Math.tan((deg * Math.PI) / 180) * 12;
    return { rise, run: 12 };
  }
  return undefined;
}

function metersPerDegLon(latDeg: number): number {
  return 111_320 * Math.cos((latDeg * Math.PI) / 180);
}

function toLocalEnuMeters(
  lon: number,
  lat: number,
  originLon: number,
  originLat: number,
): { x: number; y: number } {
  return {
    x: (lon - originLon) * metersPerDegLon(originLat),
    y: (lat - originLat) * 111_320,
  };
}

/**
 * Primary axis of footprint in local ENU (x=east, y=north), unit vector.
 * Interpreting this as ridge direction for gable-style classification.
 * `originLon` / `originLat` should match edge vectors for consistent classification.
 */
function ridgeUnitFromRing(
  openRingLonLat: GeoJSON.Position[],
  originLon: number,
  originLat: number,
): { ux: number; uy: number } | null {
  if (openRingLonLat.length < 3) return null;

  const pts = openRingLonLat.map((p) =>
    toLocalEnuMeters(p[0], p[1], originLon, originLat),
  );
  let mx = 0;
  let my = 0;
  for (const p of pts) {
    mx += p.x;
    my += p.y;
  }
  mx /= pts.length;
  my /= pts.length;

  let cxx = 0;
  let cyy = 0;
  let cxy = 0;
  for (const p of pts) {
    const dx = p.x - mx;
    const dy = p.y - my;
    cxx += dx * dx;
    cyy += dy * dy;
    cxy += dx * dy;
  }
  cxx /= pts.length;
  cyy /= pts.length;
  cxy /= pts.length;

  const theta = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
  const ux = Math.cos(theta);
  const uy = Math.sin(theta);
  const len = Math.hypot(ux, uy) || 1;
  return { ux: ux / len, uy: uy / len };
}

/** Bearing 0–360°, clockwise from geographic north, for ridge axis (east = 90). */
export function ridgeAxisHeadingDegFromUnit(ux: number, uy: number): number {
  const deg = (Math.atan2(ux, uy) * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

function classifyEdgeKind(absDot: number): RoofEdgeKind {
  if (absDot >= 0.82) return "eave_ridge";
  if (absDot <= 0.38) return "rake";
  return "hip_valley";
}

/** Main roof pitch angle from horizontal. */
function mainPitchAngleRad(rise: number, run: number): number {
  return Math.atan(rise / run);
}

/**
 * Regular hip/valley: plan trace at ~45° to ridge; slope angle from horizontal (simplified model).
 */
function hipSlopeAngleRadFromMainPitch(rise: number, run: number): number {
  const tMain = rise / run;
  const tanHip = tMain / Math.SQRT2;
  return Math.atan(tanHip);
}

function slopeLfForKind(
  kind: RoofEdgeKind,
  planFeet: number,
  rise: number,
  run: number,
): number {
  const theta = mainPitchAngleRad(rise, run);
  const sec = 1 / Math.cos(theta);
  switch (kind) {
    case "eave_ridge":
      // Horizontal in plan along/alongside ridge run — lineal ≈ plan (drip, ridge cap, eave metal).
      return planFeet;
    case "rake":
      return planFeet * sec;
    case "hip_valley": {
      const hipAng = hipSlopeAngleRadFromMainPitch(rise, run);
      const c = Math.cos(hipAng);
      return c > 0.08 ? planFeet / c : planFeet * sec;
    }
    default:
      return planFeet * sec;
  }
}

function uniformSecFactor(rise: number, run: number): number {
  const theta = mainPitchAngleRad(rise, run);
  const c = Math.cos(theta);
  if (c < 0.12) return 1;
  return 1 / c;
}

/**
 * Per-edge geodesic LF (feet) plus classified slope lineal from footprint PCA + pitch model.
 */
export function computeRoofPolygonEdgeMetrics(
  roofTraceGeoJson: any,
  pitch?: string,
): {
  edges: RoofPolygonEdgeMetric[];
  perimeterPlanFt: number;
  /** Estimated ridge axis, degrees from north (clockwise). Undefined if axis not computed. */
  ridgeAxisHeadingDeg?: number;
} | null {
  const poly = extractLargestPolygonFromTrace(roofTraceGeoJson);
  if (!poly) return null;

  const ring = poly.geometry.coordinates?.[0] ?? [];
  if (ring.length < 4) return null;

  const pts = ring.slice(0, -1);
  if (pts.length < 3) return null;

  let cLon = 0;
  let cLat = 0;
  for (const p of pts) {
    cLon += p[0];
    cLat += p[1];
  }
  cLon /= pts.length;
  cLat /= pts.length;

  const ridge = ridgeUnitFromRing(pts, cLon, cLat);
  const ridgeAxisHeadingDeg = ridge
    ? ridgeAxisHeadingDegFromUnit(ridge.ux, ridge.uy)
    : undefined;

  const pr = parsePitchRiseRun(pitch);

  const edges: RoofPolygonEdgeMetric[] = [];

  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    try {
      const line = turf.lineString([a, b]);
      const planFeet = turf.length(line, { units: "feet" });
      if (!Number.isFinite(planFeet)) continue;

      let kind: RoofEdgeKind = "hip_valley";
      let ridgeAlignment = 0.5;

      if (ridge) {
        const va = toLocalEnuMeters(a[0], a[1], cLon, cLat);
        const vb = toLocalEnuMeters(b[0], b[1], cLon, cLat);
        let edx = vb.x - va.x;
        let edy = vb.y - va.y;
        const elen = Math.hypot(edx, edy);
        if (elen > 1e-6) {
          edx /= elen;
          edy /= elen;
          ridgeAlignment = Math.abs(edx * ridge.ux + edy * ridge.uy);
          kind = classifyEdgeKind(ridgeAlignment);
        }
      }

      let slopeFeetApprox: number | undefined;
      if (pr) {
        slopeFeetApprox = slopeLfForKind(kind, planFeet, pr.rise, pr.run);
      }

      edges.push({
        index: i + 1,
        planFeet,
        slopeFeetApprox,
        kind,
        ridgeAlignment,
      });
    } catch {
      // skip bad segment
    }
  }

  if (!edges.length) return null;

  // If PCA failed, fall back to uniform sec factor on every edge when pitch set
  if (!ridge && pr) {
    const f = uniformSecFactor(pr.rise, pr.run);
    for (const e of edges) {
      e.kind = "hip_valley";
      e.ridgeAlignment = 0.5;
      e.slopeFeetApprox = e.planFeet * f;
    }
  }

  const perimeterPlanFt = edges.reduce((s, e) => s + e.planFeet, 0);
  return { edges, perimeterPlanFt, ridgeAxisHeadingDeg };
}
