/**
 * Contractor knowledge-base values aligned with in-app training figures
 * (see docs/ROOF_KNOWLEDGE_BASE.md). Typical industry planning numbers — verify per manufacturer.
 */

import type { RoofMaterialType } from "@/src/roofReports/roofLogicEngine";

/** Typical dead load (lbs per roofing square) for planning / structural triage. */
export const MATERIAL_DEAD_LOAD_LBS_PER_SQ: Record<
  "shingle" | "metal" | "tile" | "slate" | "tpo",
  number
> = {
  shingle: 240,
  metal: 140,
  tile: 1000,
  slate: 1000,
  tpo: 50,
};

export function structuralLoadLbsPerSqForMaterial(
  material?: RoofMaterialType | string,
): number {
  const k = String(material ?? "shingle").toLowerCase();
  if (k in MATERIAL_DEAD_LOAD_LBS_PER_SQ) {
    return MATERIAL_DEAD_LOAD_LBS_PER_SQ[
      k as keyof typeof MATERIAL_DEAD_LOAD_LBS_PER_SQ
    ];
  }
  return MATERIAL_DEAD_LOAD_LBS_PER_SQ.shingle;
}

function isHipOrValleyComplex(roofFormType?: string): boolean {
  const f = (roofFormType ?? "").toLowerCase();
  return (
    f.includes("hip") ||
    f.includes("valley") ||
    f.includes("complex") ||
    f.includes("dutch")
  );
}

/**
 * Narrative tying roof form to waste (Fig. 1–2): simple gable vs hip/valley cut-up.
 */
export function geometryWasteNarrative(
  roofMaterialType: RoofMaterialType | string,
  roofFormType?: string,
): string | undefined {
  const m = String(roofMaterialType).toLowerCase();
  if (!["shingle", "metal"].includes(m)) return undefined;
  if (isHipOrValleyComplex(roofFormType)) {
    return "Hip / valley layouts add cut-up vs a simple gable; material takeoff uses a higher waste % than rectangular gable planes (Knowledge Base Fig. 2).";
  }
  return "Simple gable-style planes (ridge–eave–rake) support a lower base waste % than hip/valley-dominant roofs (Knowledge Base Fig. 1).";
}

/** Human-readable alerts for reports (weight / membrane / specialty). */
export function reportAlertsForMaterial(
  roofMaterialType: RoofMaterialType | string,
): string[] {
  const m = String(roofMaterialType).toLowerCase();
  const alerts: string[] = [];
  if (m === "tile") {
    alerts.push(
      "Weight alert: clay/concrete tile often ~1000 lbs/sq dead load — verify deck and framing (Knowledge Base Fig. 3).",
    );
  }
  if (m === "slate") {
    alerts.push(
      "Specialty install: natural slate is high waste (often 20–25%), heavy (~1000 lbs/sq), and needs specialty fasteners and underlayment (Knowledge Base Fig. 4).",
    );
  }
  if (m === "tpo") {
    alerts.push(
      "Membrane system: low-slope TPO uses rolls, seams (heat-weld/adhered), and adhesive/ISO math — not bundle counts (Knowledge Base Fig. 5).",
    );
  }
  if (m === "shingle") {
    alerts.push(
      "Typical asphalt shingle dead load ~240 lbs/sq (1-layer planning) — compare to tile/slate in Knowledge Base Fig. 3.",
    );
  }
  return alerts;
}

/** Short references to the five ordered knowledge figures. */
export function knowledgeBaseFigureRefs(
  roofMaterialType: RoofMaterialType | string,
  roofFormType?: string,
): string[] {
  const refs: string[] = [];
  const form = (roofFormType ?? "").toLowerCase();
  const mat = String(roofMaterialType).toLowerCase();

  refs.push("Fig. 1 — Gable blueprint: ridge, eave, rake tracing.");
  if (isHipOrValleyComplex(roofFormType) || form.includes("hip")) {
    refs.push(
      "Fig. 2 — Hip / valley transition: higher cut-up → higher waste vs gable.",
    );
  }
  if (["shingle", "tile"].includes(mat)) {
    refs.push(
      "Fig. 3 — Shingle vs tile dead load (e.g. ~240 vs ~1000 lbs/sq).",
    );
  }
  if (mat === "slate")
    refs.push(
      "Fig. 4 — Natural slate: steep pitch, specialty install, high waste.",
    );
  if (mat === "tpo")
    refs.push(
      "Fig. 5 — TPO membrane: seams, adhesive, low waste % vs steep-slope.",
    );

  return refs;
}
