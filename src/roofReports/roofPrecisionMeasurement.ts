import type {
  HybridMeasurementPriority,
  HybridMeasurementResult,
} from "@/app/services/HybridMeasurementService";
import type {
  RoofMeasurements,
  RoofPrecisionMeasurementSnapshot,
} from "@/src/roofReports/roofReportTypes";

const PRECISION_TAG = "[Precision measurement]";

export const PRECISION_PROVIDER_LABEL = "Nearmap / EagleView (precision)";

export function buildRoofPrecisionMeasurementSnapshot(
  result: HybridMeasurementResult,
  meta: {
    priority: HybridMeasurementPriority;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    latitude: number;
    longitude: number;
  },
): RoofPrecisionMeasurementSnapshot {
  const d = result.data;
  return {
    capturedAtIso: new Date().toISOString(),
    success: result.success,
    provider: result.provider,
    confidence: result.confidence,
    processingTimeMs: result.processingTimeMs,
    priority: meta.priority,
    addressLine: meta.address,
    city: meta.city,
    state: meta.state,
    zipCode: meta.zipCode,
    latitude: meta.latitude,
    longitude: meta.longitude,
    tile: d?.tile,
    nearmapSurveyIds: d?.nearmapSurveyIds,
    eagleViewOrderId: d?.eagleViewOrderId,
    eagleViewStatus: d?.eagleViewStatus,
    errorMessage: result.errorMessage,
  };
}

function buildPrecisionNoteBlock(s: RoofPrecisionMeasurementSnapshot): string {
  const lines = [
    `${PRECISION_TAG}`,
    `Captured: ${s.capturedAtIso}`,
    `Success: ${s.success ? "yes" : "no"} · Provider: ${s.provider} · Confidence: ${(s.confidence * 100).toFixed(0)}% · Time: ${s.processingTimeMs} ms · Priority: ${s.priority}`,
    `Address: ${s.addressLine}, ${s.city}, ${s.state} ${s.zipCode}`,
    `Coordinates: ${s.latitude.toFixed(6)}, ${s.longitude.toFixed(6)}`,
  ];
  if (s.tile) {
    lines.push(`Tile z/x/y: ${s.tile.z} / ${s.tile.x} / ${s.tile.y}`);
  }
  if (s.nearmapSurveyIds?.length) {
    const ids = s.nearmapSurveyIds.slice(0, 8).join(", ");
    lines.push(
      `Nearmap survey IDs: ${ids}${s.nearmapSurveyIds.length > 8 ? "…" : ""}`,
    );
  }
  if (s.eagleViewOrderId) {
    lines.push(
      `EagleView order: ${s.eagleViewOrderId}${s.eagleViewStatus ? ` (${s.eagleViewStatus})` : ""}`,
    );
  }
  if (s.errorMessage) {
    lines.push(`Error: ${s.errorMessage}`);
  }
  return lines.join("\n");
}

function mergePrecisionNoteIntoNotes(
  prevNotes: string | undefined,
  block: string,
): string {
  const raw = (prevNotes ?? "").trim();
  const start = raw.indexOf(PRECISION_TAG);
  if (start === -1) return raw ? `${raw}\n\n${block}` : block;
  const afterToken = raw.slice(start + PRECISION_TAG.length);
  const nextBlock = /\n\n(?=\[)/.exec(afterToken);
  const end = nextBlock
    ? start + PRECISION_TAG.length + nextBlock.index
    : raw.length;
  const before = raw.slice(0, start).trimEnd();
  const after = raw.slice(end).trim();
  return [before, block, after].filter(Boolean).join("\n\n");
}

export function mergePrecisionSnapshotIntoRoofMeasurements(
  prev: RoofMeasurements,
  snapshot: RoofPrecisionMeasurementSnapshot,
): RoofMeasurements {
  const refParts: string[] = [];
  if (snapshot.eagleViewOrderId) {
    refParts.push(`EV ${snapshot.eagleViewOrderId}`);
  }
  if (snapshot.nearmapSurveyIds?.length) {
    refParts.push(
      `NM ${snapshot.nearmapSurveyIds.slice(0, 4).join(", ")}${snapshot.nearmapSurveyIds.length > 4 ? "…" : ""}`,
    );
  }
  const refLine = refParts.join(" · ");
  const hasEaveRef = !!prev.aerialMeasurementReference?.trim();
  const next: RoofMeasurements = {
    ...prev,
    precisionMeasurementSnapshot: snapshot,
    notes: mergePrecisionNoteIntoNotes(
      prev.notes,
      buildPrecisionNoteBlock(snapshot),
    ),
  };
  if (!hasEaveRef && refLine) {
    next.aerialMeasurementReference = refLine;
  }
  if (!prev.aerialMeasurementProvider?.trim()) {
    next.aerialMeasurementProvider = PRECISION_PROVIDER_LABEL;
  }
  return next;
}
