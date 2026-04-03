import {
  computeRoofGeometryFromPlanInputs,
  type RoofStructureMode,
} from "./roofGeometryFromPolygons";

export type TakeoffComparisonInput = {
  areaSqFt: string;
  perimeterFt: string;
  roofType: string;
  roofStructure: RoofStructureMode;
  roofPitch: string;
  ridgesFt: string;
  eavesFt: string;
  rakesFt: string;
  valleysFt: string;
  hipsFt: string;
};

export type TakeoffComparisonRow = {
  edge: string;
  drawnLf: number;
  heuristicLf: number;
  /** Relative difference when both sides positive; else null */
  deltaPct: number | null;
};

function parseLengthFeet(value?: string): number {
  if (!value?.trim()) return 0;
  const text = value.trim().toLowerCase();
  const ftIn = text.match(/(\d+(?:\.\d+)?)\s*ft\s*(\d+(?:\.\d+)?)?\s*in?/);
  if (ftIn?.[1]) {
    const ft = Number.parseFloat(ftIn[1]) || 0;
    const inches = Number.parseFloat(ftIn[2] ?? "0") || 0;
    return ft + inches / 12;
  }
  const n = Number.parseFloat(text.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Relative difference in [0,1]; null if not comparable */
function deltaPct(drawn: number, heuristic: number): number | null {
  if (drawn <= 0 && heuristic <= 0) return null;
  const base = Math.max(drawn, heuristic, 1e-6);
  return Math.abs(drawn - heuristic) / base;
}

const DIVERGENCE_WARN_THRESHOLD = 0.25;

/**
 * Compares user-entered/drawn linear feet to heuristic model lengths from plan area + perimeter + roof form.
 * Used for QC only — estimates still use form line lengths for pricing when entered.
 */
export function compareDrawnVsHeuristic(input: TakeoffComparisonInput): {
  warnings: string[];
  rows: TakeoffComparisonRow[];
} {
  const area = Number.parseFloat(input.areaSqFt);
  if (!Number.isFinite(area) || area <= 0) {
    return { warnings: [], rows: [] };
  }
  const perimRaw = Number.parseFloat(input.perimeterFt);
  const perim = Number.isFinite(perimRaw) && perimRaw > 0 ? perimRaw : null;

  const g = computeRoofGeometryFromPlanInputs(
    area,
    perim,
    input.roofType,
    input.roofStructure,
    input.roofPitch,
  );
  if (!g) return { warnings: [], rows: [] };

  const pairs: Array<{ label: string; drawn: number; h: number }> = [
    { label: "Ridge", drawn: parseLengthFeet(input.ridgesFt), h: g.ridgeFt },
    { label: "Eave", drawn: parseLengthFeet(input.eavesFt), h: g.eaveFt },
    { label: "Rake", drawn: parseLengthFeet(input.rakesFt), h: g.rakeFt },
    { label: "Valley", drawn: parseLengthFeet(input.valleysFt), h: g.valleyFt },
    { label: "Hip", drawn: parseLengthFeet(input.hipsFt), h: g.hipFt },
  ];

  const warnings: string[] = [];
  const rows: TakeoffComparisonRow[] = [];

  for (const { label, drawn, h } of pairs) {
    const dPct = deltaPct(drawn, h);
    rows.push({
      edge: label,
      drawnLf: Math.round(drawn * 100) / 100,
      heuristicLf: Math.round(h * 100) / 100,
      deltaPct: dPct != null ? Math.round(dPct * 1000) / 1000 : null,
    });

    if (drawn > 1 && h <= 0.5) {
      warnings.push(`${label}: drawn ${drawn.toFixed(0)} LF but model expects ~0 LF — verify roof structure mode and pitch.`);
    } else if (h > 5 && drawn <= 0.5 && label !== "Valley") {
      warnings.push(`${label}: model ${h.toFixed(0)} LF but no drawn/entered length — confirm trace or enter LF.`);
    } else if (dPct != null && dPct > DIVERGENCE_WARN_THRESHOLD && drawn > 3 && h > 3) {
      warnings.push(
        `${label}: drawn ${drawn.toFixed(0)} LF vs modeled ${h.toFixed(0)} LF (${Math.round(dPct * 100)}% diff) — verify takeoff.`,
      );
    }
  }

  return { warnings, rows };
}
