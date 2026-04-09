import type { DamageType, EstimateScopeMode, FormState } from "../features/measurement/measurementFormTypes";
import { DAMAGE_TYPES } from "../features/measurement/measurementFormTypes";

const DAMAGE_SET = new Set<string>(DAMAGE_TYPES);

type ProposalClientSlice = {
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  companyName: string;
  proposalTitle: string;
};

function isRoofStructure(v: string): v is FormState["roofStructure"] {
  return (
    v === "auto" ||
    v === "gable" ||
    v === "hip" ||
    v === "flat" ||
    v === "mansard" ||
    v === "complex"
  );
}

/** Merge server-suggested partial fields into FormState (client-side guard). */
export function mergeFormPatch(base: FormState, patch: Record<string, unknown>): FormState {
  const next = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in base)) continue;
    if (k === "severity") {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n) && n >= 1 && n <= 5) next.severity = Math.round(n);
      continue;
    }
    if (k === "damageTypes" && Array.isArray(v)) {
      const tags = v
        .map((x) => String(x).trim())
        .filter((x): x is DamageType => DAMAGE_SET.has(x));
      if (tags.length) next.damageTypes = tags;
      continue;
    }
    if (k === "roofStructure" && typeof v === "string") {
      const s = v.trim();
      if (isRoofStructure(s)) next.roofStructure = s;
      continue;
    }
    if (k === "estimateScopeMode" && typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s === "replace" || s === "repair" || s === "auto") next.estimateScopeMode = s as EstimateScopeMode;
      continue;
    }
    if (typeof v === "string" && k !== "damageTypes" && k !== "roofStructure") {
      (next as Record<string, unknown>)[k] = v.trim().slice(0, 8000);
    }
  }
  return next;
}

export function mergeProposalPatch<T extends ProposalClientSlice>(
  base: T,
  patch: Record<string, unknown>,
): T {
  const next = { ...base };
  const keys: (keyof ProposalClientSlice)[] = [
    "clientName",
    "clientCompany",
    "clientEmail",
    "clientPhone",
    "companyName",
    "proposalTitle",
  ];
  for (const key of keys) {
    const v = patch[key as string];
    if (typeof v === "string" && v.trim()) {
      (next as Record<string, string>)[key as string] = v.trim().slice(0, 500);
    }
  }
  return next;
}

export function buildGhlSummaryNote(form: FormState, proposal: ProposalClientSlice): string {
  const carrier = (form.carrierScopeText || "").trim();
  const lines = [
    "HD2D — Roofing estimator (Copilot / New Measurement)",
    `Proposal title: ${proposal.proposalTitle || "—"}`,
    `Contractor / company: ${proposal.companyName || "—"}`,
    `Address: ${form.address || "—"}`,
    `State: ${form.stateCode || "—"} | Lat/Lng: ${form.latitude || "—"}, ${form.longitude || "—"}`,
    `Client: ${proposal.clientName || "—"} | ${proposal.clientCompany || ""}`.trim(),
    `Email: ${proposal.clientEmail || "—"} | Phone: ${proposal.clientPhone || "—"}`,
    `Roof: ${form.roofType} | Structure: ${form.roofStructure} | Pitch: ${form.roofPitch}`,
    `Plan area sq ft: ${form.areaSqFt || "—"} | Perimeter ft: ${form.perimeterFt || "—"}`,
    `Squares: ${form.measuredSquares || "—"} | Waste %: ${form.wastePercent || "—"}`,
    `Scope mode: ${form.estimateScopeMode} | Damage: ${form.damageTypes.join(", ") || "—"} | Severity: ${form.severity}`,
    `Deductible: ${form.deductibleUsd || "—"} | Non-rec dep: ${form.nonRecDepUsd || "—"}`,
    carrier ? `Carrier / scope narrative: ${carrier.slice(0, 2000)}${carrier.length > 2000 ? "…" : ""}` : "",
    `Property / field notes: ${form.propertyRecordNotes || "—"}`,
  ].filter(Boolean);
  return lines.join("\n");
}
