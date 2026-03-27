import type {
  RoofAreaPrimarySource,
  RoofDamageEstimate,
  RoofMeasurements,
} from "./roofReportTypes";

export type MeasurementAuditFields = {
  roofAreaPrimarySource?: RoofAreaPrimarySource;
  /** ISO time when primary roof area was last fixed for export (save time). */
  roofAreaRecordedAtIso?: string;
  measurementConfidenceBadge?: "high" | "medium" | "low";
};

function parseManualArea(manual: string): number | undefined {
  const n = Number(manual.trim());
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n);
}

/**
 * Derives audit labels when saving a report. `resolved` is after flattenMeasurementsForExport.
 */
export function buildMeasurementAuditFields(opts: {
  rawMeasurements: RoofMeasurements;
  resolvedMeasurements: RoofMeasurements;
  roofAreaSqFtManual: string;
  estimate: RoofDamageEstimate | null | undefined;
  hasRoofTraceGeoJson: boolean;
  propertyRoofSqFt?: number;
}): MeasurementAuditFields {
  const now = new Date().toISOString();
  const raw = opts.rawMeasurements;
  const res = opts.resolvedMeasurements;
  const resArea = res.roofAreaSqFt;
  const manual = parseManualArea(opts.roofAreaSqFtManual);
  const rawArea = raw.roofAreaSqFt;

  let roofAreaPrimarySource: RoofAreaPrimarySource = "unknown";

  if (
    manual != null &&
    resArea != null &&
    resArea === manual
  ) {
    roofAreaPrimarySource = "manual_entry";
  } else if (
    resArea != null &&
    opts.estimate?.roofAreaSqFt != null &&
    Math.round(opts.estimate.roofAreaSqFt) === resArea &&
    (rawArea == null || rawArea <= 0)
  ) {
    roofAreaPrimarySource = "estimate_fallback";
  } else if (
    typeof opts.propertyRoofSqFt === "number" &&
    Number.isFinite(opts.propertyRoofSqFt) &&
    opts.propertyRoofSqFt > 0 &&
    resArea === Math.round(opts.propertyRoofSqFt) &&
    !opts.hasRoofTraceGeoJson
  ) {
    roofAreaPrimarySource = "lead_csv";
  } else if (
    raw.roofPitchAiGauge?.estimateRoofAreaSqFt != null &&
    resArea === Math.round(raw.roofPitchAiGauge.estimateRoofAreaSqFt)
  ) {
    roofAreaPrimarySource = "ai_vision";
  } else if (
    raw.precisionMeasurementSnapshot?.success &&
    raw.precisionMeasurementSnapshot.roofAreaSqFt != null &&
    resArea != null &&
    resArea === Math.round(raw.precisionMeasurementSnapshot.roofAreaSqFt)
  ) {
    roofAreaPrimarySource = "precision_import";
  } else if (
    opts.hasRoofTraceGeoJson &&
    resArea != null &&
    (rawArea == null || rawArea > 0)
  ) {
    roofAreaPrimarySource = "trace";
  } else if (raw.precisionMeasurementSnapshot?.success && resArea != null) {
    roofAreaPrimarySource = "precision_import";
  }

  const v = raw.measurementValidationSummary?.overallConfidence;
  let measurementConfidenceBadge: "high" | "medium" | "low" | undefined;
  if (v === "high" || v === "medium" || v === "low") {
    measurementConfidenceBadge = v;
  } else if (roofAreaPrimarySource === "manual_entry" || roofAreaPrimarySource === "trace") {
    measurementConfidenceBadge = "medium";
  } else if (roofAreaPrimarySource === "estimate_fallback") {
    measurementConfidenceBadge = "low";
  } else if (resArea != null) {
    measurementConfidenceBadge = "medium";
  }

  return {
    roofAreaPrimarySource,
    roofAreaRecordedAtIso: now,
    measurementConfidenceBadge,
  };
}

const SOURCE_LABELS: Record<RoofAreaPrimarySource, string> = {
  trace: "Roof trace (map polygon)",
  manual_entry: "Manual sq ft entry",
  estimate_fallback: "Estimate field (no separate trace area)",
  lead_csv: "Property / lead CSV area",
  ai_vision: "AI photo analysis (advisory)",
  precision_import: "Precision / aerial order",
  unknown: "Mixed or unspecified",
};

export function formatRoofAreaSourceLabel(
  source?: RoofAreaPrimarySource,
): string {
  if (!source) return SOURCE_LABELS.unknown;
  return SOURCE_LABELS[source] ?? SOURCE_LABELS.unknown;
}
