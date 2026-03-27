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
  /** Shorthand "6" = 6/12 (common in field notes). */
  const lone = s.match(/^\s*(\d{1,2}(?:\.\d+)?)\s*$/);
  if (lone) {
    const rise = Number(lone[1]);
    if (Number.isFinite(rise) && rise >= 0 && rise <= 24) {
      return { rise, run: 12 };
    }
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

function signedArea2(verts: { x: number; y: number }[]): number {
  let a = 0;
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
  }
  return a / 2;
}

/** Concave footprint vertex — valley condition on boundary (plan). */
function vertexIsReflexInternal(
  enu: { x: number; y: number }[],
  i: number,
): boolean {
  const n = enu.length;
  const p0 = enu[(i - 1 + n) % n];
  const p1 = enu[i];
  const p2 = enu[(i + 1) % n];
  const ux = p1.x - p0.x;
  const uy = p1.y - p0.y;
  const vx = p2.x - p1.x;
  const vy = p2.y - p1.y;
  const cross = ux * vy - uy * vx;
  const area = signedArea2(enu);
  const ccw = area > 0;
  return ccw ? cross < 0 : cross > 0;
}

function ringVerticesEnu(openRingLonLat: GeoJSON.Position[]): {
  x: number;
  y: number;
}[] {
  let cLon = 0;
  let cLat = 0;
  for (const p of openRingLonLat) {
    cLon += p[0];
    cLat += p[1];
  }
  cLon /= openRingLonLat.length;
  cLat /= openRingLonLat.length;
  return openRingLonLat.map((p) =>
    toLocalEnuMeters(p[0], p[1], cLon, cLat),
  );
}

/**
 * Whether vertex `i` (0-based on the open ring) is reflex — used for valley vs hip on boundary.
 */
export function vertexIsReflexAt(
  openRingLonLat: GeoJSON.Position[],
  vertexIndex0: number,
): boolean {
  const enu = ringVerticesEnu(openRingLonLat);
  return vertexIsReflexInternal(enu, vertexIndex0);
}

/** Human-readable edge role for diagrams / takeoffs. */
export function roofEdgeDetailLabel(
  kind: RoofEdgeKind,
  openRingLonLat: GeoJSON.Position[],
  /** 0-based index of vertex at end of edge (i+1 for edge i→i+1). */
  endVertexIndex0: number,
): "Eave" | "Rake" | "Hip" | "Valley" {
  if (kind === "rake") return "Rake";
  if (kind === "eave_ridge") return "Eave";
  return vertexIsReflexAt(openRingLonLat, endVertexIndex0)
    ? "Valley"
    : "Hip";
}

const METERS_TO_FT = 3.280839895013123;

export type RoofFootprintLineTotals = {
  /** Boundary edges parallel to ridge axis (drip / horizontal run). */
  eaveLf: number;
  rakeLf: number;
  hipLf: number;
  valleyLf: number;
  /** Plan length of ridge line along PCA ridge axis (interior peak line model). */
  ridgeSpanLf: number;
};

/**
 * Aggregate plan lineal feet by eave / rake / hip / valley, plus ridge span (plan).
 * Ridge span is the extent of the footprint along the PCA ridge direction (not perimeter).
 */
export function computeRoofFootprintLineTotals(
  roofTraceGeoJson: any,
  pitch?: string,
): RoofFootprintLineTotals | null {
  const m = computeRoofPolygonEdgeMetrics(roofTraceGeoJson, pitch);
  if (!m) return null;
  const poly = extractLargestPolygonFromTrace(roofTraceGeoJson);
  if (!poly) return null;
  const ring = poly.geometry.coordinates?.[0] ?? [];
  const openRing =
    ring.length > 3 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring.slice();
  if (openRing.length < 3) return null;

  let eaveLf = 0;
  let rakeLf = 0;
  let hipLf = 0;
  let valleyLf = 0;
  const n = openRing.length;

  for (let i = 0; i < m.edges.length; i++) {
    const e = m.edges[i];
    const endV = (i + 1) % n;
    if (e.kind === "rake") rakeLf += e.planFeet;
    else if (e.kind === "eave_ridge") eaveLf += e.planFeet;
    else if (e.kind === "hip_valley") {
      if (vertexIsReflexAt(openRing, endV)) valleyLf += e.planFeet;
      else hipLf += e.planFeet;
    }
  }

  const ridgeSpanLf = m.ridgeSpanPlanFt ?? 0;

  return {
    eaveLf,
    rakeLf,
    hipLf,
    valleyLf,
    ridgeSpanLf,
  };
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
  /** Plan extent along ridge axis (ft) — model ridge line length for takeoffs. */
  ridgeSpanPlanFt?: number;
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

  let ridgeSpanPlanFt: number | undefined;
  if (ridge && pts.length >= 3) {
    const enuPts = pts.map((p) => toLocalEnuMeters(p[0], p[1], cLon, cLat));
    let minP = Infinity;
    let maxP = -Infinity;
    for (const p of enuPts) {
      const proj = p.x * ridge.ux + p.y * ridge.uy;
      minP = Math.min(minP, proj);
      maxP = Math.max(maxP, proj);
    }
    ridgeSpanPlanFt = (maxP - minP) * METERS_TO_FT;
  }

  const perimeterPlanFt = edges.reduce((s, e) => s + e.planFeet, 0);
  return { edges, perimeterPlanFt, ridgeAxisHeadingDeg, ridgeSpanPlanFt };
}

/** sq m → sq ft (international foot). */
const SQ_M_TO_SQ_FT = 10.76391041670972;

/**
 * Geodesic footprint area from a polygon / multipolygon feature (WGS84), square feet.
 * Matches trace workflow: horizontal projection on the ellipsoid, not sloped surface area.
 */
export function computePolygonFootprintAreaSqFt(
  feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
): number | undefined {
  try {
    const sqM = turf.area(feature);
    if (!Number.isFinite(sqM) || sqM <= 0) return undefined;
    return sqM * SQ_M_TO_SQ_FT;
  } catch {
    return undefined;
  }
}

/**
 * Geodesic perimeter length along polygon rings, feet (WGS84).
 */
export function computePolygonPerimeterFeet(
  feature: GeoJSON.Feature<GeoJSON.Polygon>,
): number | undefined {
  try {
    const line = turf.polygonToLine(feature);
    const length = turf.length(line, { units: "feet" });
    if (!Number.isFinite(length) || length <= 0) return undefined;
    return length;
  } catch {
    return undefined;
  }
}
