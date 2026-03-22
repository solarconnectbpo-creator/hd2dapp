/**
 * Cross-validates roof measurements from trace, AI vision, terrain, and cost estimate.
 * Advisory only — field verification always wins.
 */

import type {
  RoofDamageEstimate,
  RoofMeasurements,
  RoofMeasurementValidationSummary,
  MeasurementAlertLevel,
} from "./roofReportTypes";
import { parseRoofPitchRise } from "./roofLogicEngine";

const AREA_DIV_WARN_PCT = 15;
const AREA_DIV_CRIT_PCT = 30;
const PITCH_SPREAD_WARN = 1.5;
const PITCH_SPREAD_CRIT = 3;

function pctDivergence(a: number, b: number): number {
  const max = Math.max(Math.abs(a), Math.abs(b), 1e-6);
  return (Math.abs(a - b) / max) * 100;
}

function levelFromDivergencePct(pct: number): MeasurementAlertLevel {
  if (pct >= AREA_DIV_CRIT_PCT) return "critical";
  if (pct >= AREA_DIV_WARN_PCT) return "warning";
  return "ok";
}

function levelFromPitchSpread(spread: number): MeasurementAlertLevel {
  if (spread >= PITCH_SPREAD_CRIT) return "critical";
  if (spread >= PITCH_SPREAD_WARN) return "warning";
  return "ok";
}

function minOverall(
  current: "low" | "medium" | "high",
  next: "low" | "medium" | "high",
): "low" | "medium" | "high" {
  const rank = { low: 0, medium: 1, high: 2 };
  return rank[current] <= rank[next] ? current : next;
}

/**
 * Computes validation summary from current measurements and optional estimate row.
 * Safe to call on partial data (returns high confidence + empty messages when nothing to compare).
 */
export function computeMeasurementValidationSummary(opts: {
  measurements: RoofMeasurements;
  estimate?: RoofDamageEstimate | null;
}): RoofMeasurementValidationSummary {
  const m = opts.measurements;
  const messages: string[] = [];
  let overallConfidence: "low" | "medium" | "high" = "high";

  const bumpOverall = (level: MeasurementAlertLevel) => {
    if (level === "critical") overallConfidence = minOverall(overallConfidence, "low");
    else if (level === "warning") overallConfidence = minOverall(overallConfidence, "medium");
  };

  let areaTraceVsAi: RoofMeasurementValidationSummary["areaTraceVsAi"];
  const traceArea = m.roofAreaSqFt;
  const aiArea = m.roofPitchAiGauge?.estimateRoofAreaSqFt ?? undefined;
  if (
    typeof traceArea === "number" &&
    traceArea > 0 &&
    typeof aiArea === "number" &&
    aiArea > 0
  ) {
    const divergencePct = pctDivergence(traceArea, aiArea);
    const alertLevel = levelFromDivergencePct(divergencePct);
    areaTraceVsAi = {
      traceSqFt: traceArea,
      aiSqFt: aiArea,
      divergencePct,
      alertLevel,
    };
    bumpOverall(alertLevel);
    if (alertLevel === "critical") {
      messages.push(
        `Roof area differs by ${divergencePct.toFixed(0)}% between map trace (${traceArea.toLocaleString()} sq ft) and AI vision (${aiArea.toLocaleString()} sq ft). Confirm on site before pricing.`,
      );
    } else if (alertLevel === "warning") {
      messages.push(
        `Trace vs AI roof area differ by ~${divergencePct.toFixed(0)}% — choose the source you trust for this job.`,
      );
    }
  }

  let perimeterTraceVsAi: RoofMeasurementValidationSummary["perimeterTraceVsAi"];
  const tracePerim = m.roofPerimeterFt;
  const aiPerim = m.roofPitchAiGauge?.estimateRoofPerimeterFt ?? undefined;
  if (
    typeof tracePerim === "number" &&
    tracePerim > 0 &&
    typeof aiPerim === "number" &&
    aiPerim > 0
  ) {
    const divergencePct = pctDivergence(tracePerim, aiPerim);
    const alertLevel = levelFromDivergencePct(divergencePct);
    perimeterTraceVsAi = {
      traceFt: tracePerim,
      aiFt: aiPerim,
      divergencePct,
      alertLevel,
    };
    bumpOverall(alertLevel);
    if (alertLevel === "critical") {
      messages.push(
        `Perimeter differs by ${divergencePct.toFixed(0)}% between trace and AI — verify edge counts and overhangs.`,
      );
    } else if (alertLevel === "warning") {
      messages.push(
        `Trace vs AI perimeter differ by ~${divergencePct.toFixed(0)}% — double-check if using lineal LF for material.`,
      );
    }
  }

  let pitchManualVsTerrain: RoofMeasurementValidationSummary["pitchManualVsTerrain"];
  const manualRise = parseRoofPitchRise(m.roofPitch);
  const terrainRise = parseRoofPitchRise(m.terrainPitchEstimate);
  if (
    typeof manualRise === "number" &&
    Number.isFinite(manualRise) &&
    typeof terrainRise === "number" &&
    Number.isFinite(terrainRise)
  ) {
    const riseSpread = Math.abs(manualRise - terrainRise);
    const alertLevel = levelFromPitchSpread(riseSpread);
    pitchManualVsTerrain = { manualRise, terrainRise, riseSpread, alertLevel };
    bumpOverall(alertLevel);
    if (alertLevel !== "ok") {
      messages.push(
        `Manual pitch (${m.roofPitch}) vs terrain-derived (${m.terrainPitchEstimate}) differ by ${riseSpread.toFixed(1)} in rise — confirm on a slope gauge or plans.`,
      );
    }
  }

  let pitchManualVsAi: RoofMeasurementValidationSummary["pitchManualVsAi"];
  const aiPitchStr = m.roofPitchAiGauge?.estimatePitch;
  const aiRise = parseRoofPitchRise(aiPitchStr);
  if (
    typeof manualRise === "number" &&
    Number.isFinite(manualRise) &&
    typeof aiRise === "number" &&
    Number.isFinite(aiRise)
  ) {
    const riseSpread = Math.abs(manualRise - aiRise);
    const alertLevel = levelFromPitchSpread(riseSpread);
    pitchManualVsAi = { manualRise, aiRise, riseSpread, alertLevel };
    bumpOverall(alertLevel);
    if (alertLevel !== "ok") {
      messages.push(
        `Manual pitch vs AI-estimated pitch differ by ${riseSpread.toFixed(1)} in rise — AI is advisory; use field measurement when in doubt.`,
      );
    }
  }

  let estimateAreaVsTrace: RoofMeasurementValidationSummary["estimateAreaVsTrace"];
  const est = opts.estimate;
  const estArea =
    est?.roofAreaSqFt != null && Number.isFinite(est.roofAreaSqFt) && est.roofAreaSqFt > 0
      ? est.roofAreaSqFt
      : undefined;
  if (typeof traceArea === "number" && traceArea > 0 && typeof estArea === "number") {
    const divergencePct = pctDivergence(traceArea, estArea);
    const alertLevel = levelFromDivergencePct(divergencePct);
    estimateAreaVsTrace = {
      traceSqFt: traceArea,
      estimateSqFt: estArea,
      divergencePct,
      alertLevel,
    };
    bumpOverall(alertLevel);
    if (alertLevel === "critical") {
      messages.push(
        `Saved estimate basis (${estArea.toLocaleString()} sq ft) differs from trace (${traceArea.toLocaleString()} sq ft) by ${divergencePct.toFixed(0)}% — regenerate estimate or re-trace.`,
      );
    } else if (alertLevel === "warning") {
      messages.push(
        `Estimate area vs trace differ by ~${divergencePct.toFixed(0)}% — consider refreshing the estimate after locking measurements.`,
      );
    }
  }

  return {
    computedAtIso: new Date().toISOString(),
    overallConfidence,
    areaTraceVsAi,
    perimeterTraceVsAi,
    pitchManualVsTerrain,
    pitchManualVsAi,
    estimateAreaVsTrace,
    messages,
  };
}

/** Exported for tests — internal thresholds. */
export const MEASUREMENT_VALIDATION_THRESHOLDS = {
  AREA_DIV_WARN_PCT,
  AREA_DIV_CRIT_PCT,
  PITCH_SPREAD_WARN,
  PITCH_SPREAD_CRIT,
} as const;
