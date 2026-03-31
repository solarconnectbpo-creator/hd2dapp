import * as turf from "@turf/turf";
import type { Feature, Polygon } from "geojson";

type PolyFeature = Feature<Polygon>;

export type RoofStructureMode = "auto" | "gable" | "hip" | "flat" | "mansard" | "complex";

export function inferRoofFormType(
  roofType: string,
  roofStructure: RoofStructureMode = "auto",
): "gable" | "hip" | "flat" | "mansard" | "complex" {
  if (roofStructure !== "auto") return roofStructure;
  const t = roofType.toLowerCase();
  if (t.includes("tpo") || t.includes("epdm") || t.includes("pvc") || t.includes("flat") || t.includes("low slope"))
    return "flat";
  if (t.includes("hip")) return "hip";
  if (t.includes("mansard")) return "mansard";
  if (t.includes("complex") || t.includes("multi-facet")) return "complex";
  return "gable";
}

/** Rise in inches per 12 in run — matches App.tsx flexible parsing. */
function parsePitchRise(pitch?: string): number | null {
  if (!pitch?.trim()) return null;
  const s = pitch.trim().replace(/：/g, ":").replace(/\s+/g, " ");
  const slash12 = s.replace(/:/g, "/").match(/^(\d+(?:\.\d+)?)\s*\/\s*12$/i);
  if (slash12?.[1]) {
    const n = Number.parseFloat(slash12[1]);
    return Number.isFinite(n) ? n : null;
  }
  const ratio = s.replace(/:/g, "/").match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (ratio?.[1] && ratio?.[2]) {
    const rise = Number.parseFloat(ratio[1]);
    const run = Number.parseFloat(ratio[2]);
    if (Number.isFinite(rise) && Number.isFinite(run) && run > 0) return (rise / run) * 12;
  }
  const on12 = s.match(/^(\d+(?:\.\d+)?)\s*(?:on|in|per)\s*12$/i);
  if (on12?.[1]) {
    const n = Number.parseFloat(on12[1]);
    return Number.isFinite(n) ? n : null;
  }
  const plain = s.match(/^(\d+(?:\.\d+)?)$/);
  if (plain?.[1]) {
    const n = Number.parseFloat(plain[1]);
    if (Number.isFinite(n) && n >= 0 && n <= 24) return n;
  }
  return null;
}

function buildRoofGeometryCore(
  planAreaSqFt: number,
  floorPerimeterFt: number,
  buildingL: number,
  buildingW: number,
  roofType: string,
  roofStructure: RoofStructureMode,
  roofPitch: string,
  vertexCount: number,
): PolygonRoofGeometry {
  const pitchRise = parsePitchRise(roofPitch) ?? 6;
  const pitchFactor = Math.sqrt(1 + (pitchRise / 12) ** 2);
  const roofForm = inferRoofFormType(roofType, roofStructure);

  let ridgeFt = 0;
  let eaveFt = 0;
  let rakeFt = 0;
  let valleyFt = 0;
  let hipFt = 0;
  let stepFlashFt = 0;
  let wallFlashFt = 0;

  if (roofForm === "flat") {
    eaveFt = floorPerimeterFt;
  } else if (roofForm === "hip") {
    ridgeFt = Math.max(0, buildingL - buildingW);
    const shortSpan = Math.min(buildingL, buildingW);
    // Square / near-square hip (pyramidal): geometric ridge → 0; use a small span proxy for cap/vent LF
    // in reports unless overridden by map ridge lines.
    const nearlySquare =
      shortSpan > 1 && ridgeFt < 0.01 && (buildingL - buildingW) / shortSpan < 0.025;
    if (nearlySquare) {
      ridgeFt = Math.max(shortSpan * 0.12, 3);
    }
    eaveFt = floorPerimeterFt;
    hipFt = 4 * (buildingW / 2) * Math.sqrt(2 + (pitchRise / 12) ** 2);
  } else if (roofForm === "mansard") {
    ridgeFt = Math.max(0, (buildingL + buildingW) * 0.6);
    eaveFt = floorPerimeterFt;
    hipFt = 4 * (buildingW / 2) * Math.sqrt(2 + (pitchRise / 12) ** 2);
    valleyFt = (buildingL + buildingW) * 0.2;
  } else if (roofForm === "complex") {
    ridgeFt = buildingL * 1.25;
    eaveFt = floorPerimeterFt;
    rakeFt = buildingW * 2.2 * pitchFactor;
    hipFt = buildingW * 1.8 * Math.sqrt(2 + (pitchRise / 12) ** 2);
    valleyFt = buildingW * 1.4 * Math.sqrt(2 + (pitchRise / 12) ** 2);
  } else {
    ridgeFt = buildingL;
    eaveFt = 2 * buildingL;
    rakeFt = 4 * (buildingW / 2) * pitchFactor;
  }

  if (roofForm !== "complex" && vertexCount > 5) {
    const extraEdges = vertexCount - 4;
    valleyFt += extraEdges * (buildingW / 2) * Math.sqrt(2 + (pitchRise / 12) ** 2);
    ridgeFt *= 1 + extraEdges * 0.1;
  }

  stepFlashFt = floorPerimeterFt * 0.13;
  wallFlashFt = floorPerimeterFt * 0.05;

  const surfaceAreaSqFt = planAreaSqFt * pitchFactor;
  const roofingSquaresFromSurface = surfaceAreaSqFt / 100;
  const totalRoofEdgeLf = ridgeFt + eaveFt + rakeFt + valleyFt + hipFt;

  return {
    planAreaSqFt,
    floorPerimeterFt,
    pitchRise,
    pitchFactor,
    roofForm,
    buildingL,
    buildingW,
    ridgeFt,
    eaveFt,
    rakeFt,
    valleyFt,
    hipFt,
    stepFlashFt,
    wallFlashFt,
    surfaceAreaSqFt,
    roofingSquaresFromSurface,
    totalRoofEdgeLf,
  };
}

/**
 * Same roof-edge model as polygon takeoff, from plan area + optional perimeter (rectangle solve).
 * Used when AI (or manual entry) supplies footprint numbers without a drawn polygon.
 */
export function computeRoofGeometryFromPlanInputs(
  planAreaSqFt: number,
  perimeterFt: number | null | undefined,
  roofType: string,
  roofStructure: RoofStructureMode,
  roofPitch: string,
): PolygonRoofGeometry | null {
  if (!Number.isFinite(planAreaSqFt) || planAreaSqFt <= 0) return null;

  let buildingL: number;
  let buildingW: number;
  let floorPerimeterFt: number;

  const P =
    perimeterFt != null && Number.isFinite(perimeterFt) && perimeterFt > 0 ? perimeterFt : null;
  if (P != null) {
    const S = P / 2;
    const discrim = S * S - 4 * planAreaSqFt;
    if (discrim >= 0) {
      const root = Math.sqrt(discrim);
      buildingL = (S + root) / 2;
      buildingW = (S - root) / 2;
      if (buildingW > buildingL) {
        const t = buildingL;
        buildingL = buildingW;
        buildingW = t;
      }
      floorPerimeterFt = P;
    } else {
      const side = Math.sqrt(planAreaSqFt);
      buildingL = buildingW = side;
      floorPerimeterFt = 4 * side;
    }
  } else {
    const side = Math.sqrt(planAreaSqFt);
    buildingL = buildingW = side;
    floorPerimeterFt = 4 * side;
  }

  return buildRoofGeometryCore(
    planAreaSqFt,
    floorPerimeterFt,
    buildingL,
    buildingW,
    roofType,
    roofStructure,
    roofPitch,
    4,
  );
}

export interface PolygonRoofGeometry {
  planAreaSqFt: number;
  floorPerimeterFt: number;
  pitchRise: number;
  pitchFactor: number;
  roofForm: "gable" | "hip" | "flat" | "mansard" | "complex";
  buildingL: number;
  buildingW: number;
  ridgeFt: number;
  eaveFt: number;
  rakeFt: number;
  valleyFt: number;
  hipFt: number;
  stepFlashFt: number;
  wallFlashFt: number;
  surfaceAreaSqFt: number;
  roofingSquaresFromSurface: number;
  totalRoofEdgeLf: number;
}

/**
 * Footprint + simplified roof-edge model from drawn polygon(s), bbox, pitch, and roof form.
 * Used by map auto-calc and form prep — single source of truth.
 */
export function computePolygonRoofGeometry(
  polygons: PolyFeature[],
  roofType: string,
  roofStructure: RoofStructureMode,
  roofPitch: string,
): PolygonRoofGeometry | null {
  if (!polygons.length) return null;

  const totalAreaSqM = polygons.reduce((s, f) => s + (turf.area(f as never) || 0), 0);
  const planAreaSqFt = totalAreaSqM * 10.7639;
  if (planAreaSqFt <= 0) return null;

  let floorPerimeterFt = 0;
  for (const poly of polygons) {
    try {
      const line = turf.polygonToLine(poly as never);
      floorPerimeterFt += turf.length(line, { units: "feet" });
    } catch {
      /* skip malformed polygons */
    }
  }

  const largest = polygons.reduce((best, f) =>
    turf.area(f as never) > turf.area(best as never) ? f : best,
  polygons[0]!);

  const bbox = turf.bbox(largest as never);
  const sw = turf.point([bbox[0], bbox[1]]);
  const se = turf.point([bbox[2], bbox[1]]);
  const ne = turf.point([bbox[2], bbox[3]]);
  const dimA = turf.distance(sw, se, { units: "feet" });
  const dimB = turf.distance(se, ne, { units: "feet" });
  const buildingL = Math.max(dimA, dimB);
  const buildingW = Math.min(dimA, dimB);

  const vertexCount = ((largest.geometry as Polygon).coordinates?.[0]?.length ?? 5) - 1;
  return buildRoofGeometryCore(
    planAreaSqFt,
    floorPerimeterFt,
    buildingL,
    buildingW,
    roofType,
    roofStructure,
    roofPitch,
    vertexCount,
  );
}

/** Wall height for exterior wall SF: override (ft), else stories × 9.5, else 10 ft default. */
export function effectiveWallHeightFt(stories: string, exteriorWallHeightFt: string): number {
  const override = Number.parseFloat(exteriorWallHeightFt);
  if (Number.isFinite(override) && override > 0) return override;
  const st = Number.parseInt(stories, 10);
  if (Number.isFinite(st) && st >= 1) return st * 9.5;
  return 10;
}
