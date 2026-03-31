import type { Contract, Estimate, Measurement } from "../context/RoofingContext";
import { normalizeMeasurement } from "../context/RoofingContext";

export const ROOFING_BACKUP_SCHEMA_VERSION = 1 as const;

export type RoofingBackupV1 = {
  schemaVersion: typeof ROOFING_BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  measurements: Measurement[];
  estimates: Estimate[];
  contracts: Contract[];
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function isEstimate(x: unknown): x is Estimate {
  if (!isRecord(x)) return false;
  return (
    typeof x.id === "string" &&
    typeof x.measurementId === "string" &&
    typeof x.projectName === "string" &&
    typeof x.date === "string" &&
    typeof x.subtotal === "number" &&
    typeof x.tax === "number" &&
    typeof x.total === "number" &&
    Array.isArray(x.materials) &&
    Array.isArray(x.labor)
  );
}

function isContract(x: unknown): x is Contract {
  if (!isRecord(x)) return false;
  return (
    typeof x.id === "string" &&
    typeof x.estimateId === "string" &&
    typeof x.projectName === "string" &&
    typeof x.clientName === "string" &&
    typeof x.date === "string" &&
    typeof x.totalAmount === "number" &&
    typeof x.depositAmount === "number" &&
    typeof x.status === "string" &&
    ["draft", "sent", "signed"].includes(x.status)
  );
}

export function buildRoofingBackupPayload(
  measurements: Measurement[],
  estimates: Estimate[],
  contracts: Contract[],
): RoofingBackupV1 {
  return {
    schemaVersion: ROOFING_BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    measurements,
    estimates,
    contracts,
  };
}

export function parseRoofingBackupJson(raw: unknown):
  | { ok: true; data: { measurements: Measurement[]; estimates: Estimate[]; contracts: Contract[] } }
  | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: "Backup must be a JSON object." };
  if (raw.schemaVersion !== ROOFING_BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported backup version (expected ${ROOFING_BACKUP_SCHEMA_VERSION}).`,
    };
  }
  if (!Array.isArray(raw.measurements) || !Array.isArray(raw.estimates) || !Array.isArray(raw.contracts)) {
    return { ok: false, error: "Backup is missing measurements, estimates, or contracts arrays." };
  }

  const measurements: Measurement[] = [];
  for (let i = 0; i < raw.measurements.length; i++) {
    const row = raw.measurements[i];
    if (!isRecord(row)) return { ok: false, error: `Invalid measurement at index ${i}.` };
    const m = normalizeMeasurement(row);
    if (!m) return { ok: false, error: `Could not read measurement at index ${i}.` };
    measurements.push(m);
  }

  const estimates: Estimate[] = [];
  for (let i = 0; i < raw.estimates.length; i++) {
    const row = raw.estimates[i];
    if (!isEstimate(row)) return { ok: false, error: `Invalid estimate at index ${i}.` };
    estimates.push(row);
  }

  const contracts: Contract[] = [];
  for (let i = 0; i < raw.contracts.length; i++) {
    const row = raw.contracts[i];
    if (!isContract(row)) return { ok: false, error: `Invalid contract at index ${i}.` };
    contracts.push(row);
  }

  return { ok: true, data: { measurements, estimates, contracts } };
}

export function downloadRoofingBackupJson(payload: RoofingBackupV1, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);
}
