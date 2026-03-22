/**
 * Roof Logic Engine (material requirements)
 * - Uses pitch to classify low-slope vs steep.
 * - If geometry segments are present, it can classify hip/gable (future enhancement).
 */

import * as turf from "@turf/turf";

import type { MetarWeatherSnapshot } from "./roofReportTypes";

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

function classifyRoofType(
  geometry: RoofGeometry | undefined,
  pitchRise: number | undefined,
  roofFormHint?: string,
): string {
  const p = typeof pitchRise === "number" && Number.isFinite(pitchRise) ? pitchRise : undefined;
  if (typeof p === "number" && p <= 2) return "Flat / Low Slope";

  const hint = roofFormHint?.toLowerCase() ?? "";
  if (hint.includes("hip")) return "Hip Roof";
  if (hint.includes("gable")) return "Gable Roof";
  if (hint.includes("flat") || hint.includes("low slope")) return "Flat / Low Slope";

  let roofType = "Gable Roof";
  const segments = geometry?.segments ?? [];
  const hipCount = segments.filter((s) => s.type === "hip").length;
  const rakeCount = segments.filter((s) => s.type === "rake").length;

  if (hipCount > rakeCount) roofType = "Hip Roof";
  else if (rakeCount >= 2 && hipCount === 0) roofType = "Gable Roof";

  return roofType;
}

function labelForMaterialType(materialType: RoofMaterialType): string {
  switch (String(materialType).toLowerCase()) {
    case "shingle":
      return "Asphalt Shingle (Standard)";
    case "metal":
      return "Metal (standing seam / panel)";
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

export function classifyRoofAndMaterials(
  geometry: RoofGeometry | undefined,
  materialType: RoofMaterialType,
  pitchRise: number | undefined,
  roofFormHint?: string,
): MaterialRequirements {
  const roofType = classifyRoofType(geometry, pitchRise, roofFormHint);
  const m = String(materialType).toLowerCase();

  // Material-specific logic (based on your snippet).
  let wasteFactor = 1.10;
  let unit = "Bundles";
  let notes: string | undefined;
  let extras: string[] | undefined;

  switch (m) {
    case "shingle":
      // Knowledge base: ~10% simple gable planes vs ~15% hip/valley cut-up (Fig. 1–2).
      {
        const hipOrComplex =
          roofType === "Hip Roof" ||
          /complex|valley|hip/i.test(roofType);
        wasteFactor = hipOrComplex ? 1.15 : 1.1;
      }
      unit = "Bundles";
      extras = ["Starter strip (eaves/rakes)", "Hip/ridge cap", "Underlayment"];
      notes =
        roofType === "Hip Roof" || /valley|complex/i.test(roofType)
          ? "Hip/valley cut-up: waste toward 15% — verify starter, cap, and valley metal."
          : "Gable-style planes: baseline waste toward 10% — include starter per eave/rake detail.";
      break;

    case "metal":
      wasteFactor = roofType === "Hip Roof" ? 1.12 : 1.08;
      unit = "Squares (panels)";
      extras = ["Closure strips", "Clips / fasteners", "Sealants & tape"];
      break;

    case "tile":
      wasteFactor = 1.2;
      unit = "Tiles/Pallets";
      notes =
        "Batten layout + structural load: verify deck and framing for tile weight.";
      extras = ["Battens / direct deck (system-dependent)", "Bird stop", "Eave closures"];
      break;

    case "slate":
      wasteFactor = 1.25;
      unit = "Squares";
      extras = [
        "Slate hooks / copper nails (specialized fasteners)",
        "Ice & water (full deck where spec’d)",
        "Ridge / hip slate & flashings",
      ];
      break;

    case "tpo":
      wasteFactor = 1.05;
      unit = "Rolls (10x100)";
      notes =
        "Adhesive / induction-weld vs mechanically fastened: confirm ISO thickness and attachment pattern.";
      extras = [
        "Bonding adhesive or heat-weld supplies",
        "ISO insulation (thickness per uplift/energy)",
        "Termination bars, flashings, drains/scuppers",
      ];
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
  /** Nearest airport METAR — nudges wind/storm context when available. */
  metarWeather?: MetarWeatherSnapshot;
}): DamageRiskResult {
  const roofAge = toNumberOrUndefined(opts.roofAgeYears);
  const sev = Number.isFinite(opts.severity) ? opts.severity : 3;
  const severityFactor = clamp(sev / 5, 0, 1); // 0..1

  const hasHail = opts.damageTypes.some((d) => String(d).toLowerCase() === "hail");
  const hasWind = opts.damageTypes.some((d) => String(d).toLowerCase() === "wind");
  const hasLeaks = opts.damageTypes.some((d) => String(d).toLowerCase() === "leaks");
  const hasStructural = opts.damageTypes.some((d) => String(d).toLowerCase() === "structural");
  const hasMissingShingles = opts.damageTypes.some(
    (d) => String(d).toLowerCase() === "missing shingles",
  );
  const hasFlashing = opts.damageTypes.some((d) => String(d).toLowerCase() === "flashing");
  const damageTypeCount = opts.damageTypes.length;

  const material = String(opts.roofMaterialType).toLowerCase();
  const materialRiskAdj =
    material === "shingle"
      ? 1.0
      : material === "metal"
        ? 0.98
        : material === "tile"
          ? 1.08
          : material === "slate"
            ? 1.12
            : material === "tpo"
              ? 0.95
              : 1.0;

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
  weather += hasMissingShingles ? 0.12 * severityFactor : 0;
  weather += hasFlashing ? 0.06 * severityFactor : 0;
  if (hasHail && hasWind) weather += 0.08 * severityFactor;
  if (damageTypeCount >= 3) weather += 0.06 * severityFactor;

  const mw = opts.metarWeather;
  if (mw) {
    const gust = typeof mw.windGustKt === "number" ? mw.windGustKt : 0;
    const spd = typeof mw.windSpdKt === "number" ? mw.windSpdKt : 0;
    const peakWind = Math.max(gust, spd);
    if (peakWind >= 28) weather += 0.14 * severityFactor;
    else if (peakWind >= 20) weather += 0.08 * severityFactor;
    if (mw.stormIndicators?.length) weather += 0.09 * severityFactor;
    const raw = (mw.rawMetar ?? "").toUpperCase();
    if (raw.includes(" TS") || raw.includes("TS ") || raw.includes("+TS")) {
      weather += 0.1 * severityFactor;
    }
  }

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
  if (hasMissingShingles) factors.push("Missing shingles / blow-off pattern noted");
  if (hasFlashing) factors.push("Flashing-related damage selected");
  if (hasHail && hasWind) factors.push("Combined hail + wind selection (multi-mode event)");
  if (damageTypeCount >= 3) factors.push(`Multiple damage modes selected (${damageTypeCount})`);
  if (typeof pitchRise === "number") factors.push(`Pitch: rise=${pitchRise} (rise/run)`);
  if (mw) {
    factors.push(`METAR ${mw.stationIcao} @ ${mw.fetchedAtIso.slice(0, 16)}`);
    if (typeof mw.windGustKt === "number" || typeof mw.windSpdKt === "number") {
      factors.push(
        `Observed wind: ${Math.round(mw.windSpdKt ?? 0)} kt gust ${Math.round(mw.windGustKt ?? 0)} kt (airport, not rooftop)`,
      );
    }
  }

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

