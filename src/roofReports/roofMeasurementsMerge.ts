import type { RoofMeasurements } from "./roofReportTypes";

export function roofMeasurementsHaveContent(m?: RoofMeasurements): boolean {
  if (!m) return false;
  return !!(
    (typeof m.roofAreaSqFt === "number" &&
      Number.isFinite(m.roofAreaSqFt) &&
      m.roofAreaSqFt > 0) ||
    (typeof m.roofPerimeterFt === "number" &&
      Number.isFinite(m.roofPerimeterFt) &&
      m.roofPerimeterFt > 0) ||
    (m.roofPitch && m.roofPitch.trim().length > 0) ||
    (m.terrainPitchEstimate && m.terrainPitchEstimate.trim().length > 0) ||
    (typeof m.roofStories === "number" &&
      Number.isFinite(m.roofStories) &&
      m.roofStories > 0) ||
    (m.roofTracePoints3D && m.roofTracePoints3D.length > 0) ||
    (typeof m.avgTerrainElevationM === "number" &&
      Number.isFinite(m.avgTerrainElevationM)) ||
    !!m.roofPitchAiGauge?.estimatePitch?.trim() ||
    (m.notes && m.notes.trim()) ||
    (m.aerialMeasurementReference && m.aerialMeasurementReference.trim()) ||
    (m.aerialMeasurementReportUrl && m.aerialMeasurementReportUrl.trim()) ||
    (m.aerialMeasurementProvider && m.aerialMeasurementProvider.trim()) ||
    !!m.precisionMeasurementSnapshot?.capturedAtIso ||
    !!m.measurementValidationSummary
  );
}

export function mergeManualRoofAreaIntoMeasurements(
  m: RoofMeasurements,
  roofAreaSqFtManual: string,
): RoofMeasurements {
  const manual = roofAreaSqFtManual.trim()
    ? Number(roofAreaSqFtManual)
    : undefined;
  if (
    typeof manual === "number" &&
    Number.isFinite(manual) &&
    manual > 0
  ) {
    return { ...m, roofAreaSqFt: Math.round(manual) };
  }
  return m;
}

export function mergeEstimateRoofAreaIntoMeasurements(
  m: RoofMeasurements,
  estimateRoofAreaSqFt?: number,
): RoofMeasurements {
  const hasArea =
    typeof m.roofAreaSqFt === "number" &&
    Number.isFinite(m.roofAreaSqFt) &&
    m.roofAreaSqFt > 0;
  if (hasArea) return m;
  if (
    estimateRoofAreaSqFt != null &&
    Number.isFinite(estimateRoofAreaSqFt) &&
    estimateRoofAreaSqFt > 0
  ) {
    return { ...m, roofAreaSqFt: Math.round(estimateRoofAreaSqFt) };
  }
  return m;
}

export function flattenMeasurementsForExport(
  m: RoofMeasurements,
  roofAreaSqFtManual: string,
  estimateRoofAreaSqFt?: number,
): RoofMeasurements {
  let out = mergeManualRoofAreaIntoMeasurements(m, roofAreaSqFtManual);
  out = mergeEstimateRoofAreaIntoMeasurements(out, estimateRoofAreaSqFt);
  return out;
}
