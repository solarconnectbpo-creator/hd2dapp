/**
 * Roof Logic Engine (material requirements)
 * - Uses pitch to classify low-slope vs steep.
 * - If geometry segments are present, it can classify hip/gable (future enhancement).
 */

import * as turf from "@turf/turf";

export type RoofMaterialType = "shingle" | "tile" | "slate" | "tpo" | string;

export type RoofGeometrySegmentType = "eave" | "ridge" | "hip" | "rake" | "valley" | string;

export type RoofGeometry = {
  segments?: Array<{ type: RoofGeometrySegmentType }>;
};

export type MaterialRequirements = {
  roofType: string;
  mainMaterial: string;
  wasteFactor: number; // e.g. 1.15x
  wastePct?: number; // e.g. 15
  unit: string;
  notes?: string;
  extras?: string[];
};

export type DamageRiskLevel = "Low" | "Medium" | "High";

export type DamageRiskResult = {
  score: number; // 0-100
  level: DamageRiskLevel;
  factors: string[];
  actionPlan: string[];
};

function pitchRiseFromRiseRun(pitch?: string): number | undefined {
  if (!pitch) return undefined;
  const s = pitch.trim();
  const m = s.match(/(\d{1,3}(?:\.\d+)?)\s*[/:]\s*(\d{1,3}(?:\.\d+)?)/);
  if (!m) return undefined;
  const rise = Number(m[1]);
  return Number.isFinite(rise) ? rise : undefined;
}

function classifyRoofType(geometry: RoofGeometry | undefined, pitchRise: number | undefined): string {
  // Default geometry-based classification is limited today; we can still handle low-slope vs steep.
  let roofType = "Gable Roof";

  const segments = geometry?.segments ?? [];
  const hipCount = segments.filter((s) => s.type === "hip").length;
  const rakeCount = segments.filter((s) => s.type === "rake").length;

  const p = typeof pitchRise === "number" && Number.isFinite(pitchRise) ? pitchRise : undefined;
  if (typeof p === "number" && p <= 2) return "Flat / Low Slope";

  // If segments exist, upgrade classification.
  if (hipCount > rakeCount) roofType = "Hip Roof";
  else if (rakeCount >= 2 && hipCount === 0) roofType = "Gable Roof";

  return roofType;
}

function labelForMaterialType(materialType: RoofMaterialType): string {
  switch (String(materialType).toLowerCase()) {
    case "shingle":
      return "Asphalt Shingle (Standard)";
    case "tile":
      return "Clay / Concrete Tile";
    case "slate":
      return "Natural Slate";
    case "tpo":
      return "TPO / Flat Membrane";
    default:
      return String(materialType);
  }
}

export function classifyRoofAndMaterials(geometry: RoofGeometry | undefined, materialType: RoofMaterialType, pitchRise: number | undefined): MaterialRequirements {
  const roofType = classifyRoofType(geometry, pitchRise);
  const m = String(materialType).toLowerCase();

  // Material-specific logic (based on your snippet).
  let wasteFactor = 1.10;
  let unit = "Bundles";
  let notes: string | undefined;
  let extras: string[] | undefined;

  switch (m) {
    case "shingle":
      wasteFactor = roofType === "Hip Roof" ? 1.15 : 1.10;
      unit = "Bundles";
      break;

    case "tile":
      wasteFactor = 1.20;
      unit = "Tiles/Pallets";
      notes = "Check structural load - high weight material.";
      extras = ["Batten Strips", "Bird Stop", "Eave Closers"];
      break;

    case "slate":
      wasteFactor = 1.25;
      unit = "Squares";
      extras = ["Copper Nails", "Ice & Water (Full Deck)"];
      break;

    case "tpo":
      wasteFactor = 1.05;
      unit = "Rolls (10x100)";
      extras = ["Bonding Adhesive", "Termination Bar", "Scuppers"];
      break;

    default:
      wasteFactor = 1.10;
      unit = "Bundles";
  }

  const wastePct = Number.isFinite(wasteFactor) ? Math.max(0, Math.round((wasteFactor - 1) * 100)) : undefined;

  return {
    roofType,
    mainMaterial: labelForMaterialType(materialType),
    wasteFactor,
    wastePct,
    unit,
    notes,
    extras,
  };
}

// Convenience: parse rise/run into the numeric “rise” used by the logic.
export function parseRoofPitchRise(pitch?: string): number | undefined {
  return pitchRiseFromRiseRun(pitch);
}

function extractMainPolygon(geo: any): GeoJSON.Feature<GeoJSON.Polygon> | null {
  if (!geo) return null;
  if (geo?.type === "Feature" && geo?.geometry?.type === "Polygon") return geo as GeoJSON.Feature<GeoJSON.Polygon>;
  if (geo?.type === "Polygon") return { type: "Feature", properties: {}, geometry: geo };
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
    return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: best } };
  }
  if (geo?.type === "MultiPolygon") {
    const mp = geo.coordinates as GeoJSON.Position[][][];
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
    return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: best } };
  }
  return null;
}

function uniqueVertexCountFromTrace(roofTraceGeoJson: any): number | undefined {
  const poly = extractMainPolygon(roofTraceGeoJson);
  if (!poly) return undefined;
  const ring = poly.geometry.coordinates?.[0] ?? [];
  if (ring.length < 4) return undefined; // closed ring needs at least 4 points
  const uniquePts = ring.length - 1; // last repeats first
  if (!Number.isFinite(uniquePts) || uniquePts <= 0) return undefined;
  return uniquePts;
}

/**
 * Roof form (gable/hip/flat) derived from outline vertices + pitch.
 * This is "best-effort" given we only store a 2D traced footprint polygon.
 */
export function classifyRoofFormFromTrace(opts: { roofTraceGeoJson?: any; roofPitch?: string }): string | undefined {
  const rise = pitchRiseFromRiseRun(opts.roofPitch);
  if (typeof rise === "number" && Number.isFinite(rise) && rise <= 2) return "Flat / Low Slope";

  const uniquePts = uniqueVertexCountFromTrace(opts.roofTraceGeoJson);
  if (!uniquePts) return "Gable Roof"; // fallback when we have pitch but no trace

  // Heuristic mapping:
  // - simpler footprints (4-5 vertices) tend to behave like gables
  // - 6-8 vertices often correlate with hips
  // - very complex footprints correlate with complex hips
  if (uniquePts <= 5) return "Gable Roof";
  if (uniquePts <= 8) return "Hip Roof";
  return "Complex Hip Roof";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toNumberOrUndefined(raw?: string): number | undefined {
  if (!raw) return undefined;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) ? n : undefined;
}

/**
 * AI-style damage risk score.
 * Notes:
 * - Your app doesn’t have wind-speed/hail-size measurements unless you add them.
 * - So we approximate “weather event intensity” from: severity + selected damage types.
 * - Roof age is an optional user input.
 */
export function computeAiDamageRisk(opts: {
  roofAgeYears?: string;
  severity: number; // 1-5
  damageTypes: string[]; // DamageType[]
  roofMaterialType: RoofMaterialType;
  pitchRise?: number;
}): DamageRiskResult {
  const roofAge = toNumberOrUndefined(opts.roofAgeYears);
  const sev = Number.isFinite(opts.severity) ? opts.severity : 3;
  const severityFactor = clamp(sev / 5, 0, 1); // 0..1

  const hasHail = opts.damageTypes.some((d) => String(d).toLowerCase() === "hail");
  const hasWind = opts.damageTypes.some((d) => String(d).toLowerCase() === "wind");
  const hasLeaks = opts.damageTypes.some((d) => String(d).toLowerCase() === "leaks");
  const hasStructural = opts.damageTypes.some((d) => String(d).toLowerCase() === "structural");

  const material = String(opts.roofMaterialType).toLowerCase();
  const materialRiskAdj =
    material === "shingle" ? 1.0 : material === "tile" ? 1.08 : material === "slate" ? 1.12 : material === "tpo" ? 0.95 : 1.0;

  const pitchRise = opts.pitchRise;
  // Low-slope roofs tend to have different failure modes; slight bump if very low-slope.
  const lowSlopeAdj = typeof pitchRise === "number" && pitchRise <= 2 ? 1.05 : 1.0;

  // Roof age contribution (if missing, we use a neutral prior around 10 years).
  const ageYears = typeof roofAge === "number" ? clamp(roofAge, 0, 50) : 10;
  const ageFactor = clamp(ageYears / 25, 0, 2); // 0..2-ish

  // “Weather event intensity” approximation from chosen damage types.
  let weather = 0;
  weather += hasHail ? 0.42 * severityFactor : 0;
  weather += hasWind ? 0.34 * severityFactor : 0;
  weather += hasLeaks ? 0.18 * severityFactor : 0;
  weather += hasStructural ? 0.28 * severityFactor : 0;

  // Build score: 0..100
  const scoreRaw = 15 + ageFactor * 18 + weather * 65;
  const score = Math.round(clamp(scoreRaw * materialRiskAdj * lowSlopeAdj, 0, 100));

  const level: DamageRiskLevel = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";

  const factors: string[] = [];
  factors.push(`Severity: ${sev}/5`);
  if (typeof roofAge === "number") factors.push(`Roof age: ${Math.round(ageYears)} year(s)`);
  factors.push(`Material: ${String(opts.roofMaterialType)}`);
  if (hasHail) factors.push("Hail damage selected");
  if (hasWind) factors.push("Wind damage selected");
  if (hasLeaks) factors.push("Leak-related damage selected");
  if (hasStructural) factors.push("Structural damage selected");
  if (typeof pitchRise === "number") factors.push(`Pitch: rise=${pitchRise} (rise/run)`);

  const actionPlan: string[] = [];
  if (level === "High") {
    actionPlan.push("Prioritize inspection and document impacts thoroughly (photos + measurements).");
    actionPlan.push("Confirm underlayment/edge details and check penetrations/flashings for failure patterns.");
    actionPlan.push("Flag potential full-scope replacement areas based on damage severity and roof system.");
  } else if (level === "Medium") {
    actionPlan.push("Target likely affected zones (eaves, valleys, transitions) and verify extent with closeups.");
    actionPlan.push("Perform system checks for uplift/water entry paths and note any localized repair candidates.");
  } else {
    actionPlan.push("Conduct a spot-check inspection and document condition; recommend maintenance-focused repairs if needed.");
    actionPlan.push("Verify for any early indicators (loose components, flashing issues) before planning replacement.");
  }

  return { score, level, factors, actionPlan };
}

