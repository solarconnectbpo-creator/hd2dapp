import type {
  DamageType,
  RecommendedAction,
  Severity,
} from "@/src/roofReports/roofReportTypes";
import type { RoofVisionInferenceResult } from "./roofVisionInference";

const ALL_DAMAGE: DamageType[] = [
  "Hail",
  "Wind",
  "Missing Shingles",
  "Leaks",
  "Flashing",
  "Structural",
];

const ACTIONS: RecommendedAction[] = [
  "Replace",
  "Repair",
  "Insurance Claim Help",
  "Further Inspection",
];

function clampSeverity(n: unknown): Severity {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 1;
  const i = Math.round(v);
  return Math.min(5, Math.max(1, i)) as Severity;
}

function isDamageType(t: string): t is DamageType {
  return (ALL_DAMAGE as string[]).includes(t);
}

function isRecommendedAction(t: string): t is RecommendedAction {
  return (ACTIONS as string[]).includes(t);
}

export type GptDamageDraft = {
  damageTypes: DamageType[];
  severity: Severity;
  recommendedAction: RecommendedAction;
  notes: string;
  summary: string;
};

/** Combine GPT roof-damage draft with CNN / hosted vision output when both exist. */
export function mergeGptWithVisionDamage(
  gpt: GptDamageDraft,
  vision: RoofVisionInferenceResult | null | undefined,
): GptDamageDraft {
  if (!vision || vision.error || vision.success === false) return gpt;

  const hasSeg =
    vision.segmentation != null &&
    typeof vision.segmentation.polygonCount === "number" &&
    typeof vision.segmentation.totalAreaPx === "number";

  const hasSignal =
    (vision.damageTypes && vision.damageTypes.length > 0) ||
    vision.severity != null ||
    vision.recommendedAction;

  if (!hasSignal && !hasSeg) return gpt;

  const vTypes = (vision.damageTypes ?? []).filter(isDamageType);
  const mergedTypes = [...new Set([...gpt.damageTypes, ...vTypes])];
  const severity = Math.max(
    gpt.severity,
    vision.severity != null ? clampSeverity(vision.severity) : 0,
  ) as Severity;

  const conf = vision.confidence ?? 0;
  const useVisionAction =
    vision.recommendedAction &&
    isRecommendedAction(vision.recommendedAction) &&
    conf >= 0.65 &&
    vision.provider &&
    vision.provider !== "stub";

  const recommendedAction = useVisionAction
    ? (vision.recommendedAction as RecommendedAction)
    : gpt.recommendedAction;

  const visionNote =
    vision.provider === "stub"
      ? "Vision (stub): configure backend/ml-vision-service and Worker ROOF_VISION_* for CNN."
      : [
          `Vision (${vision.provider ?? "local"}${vision.model ? ` · ${vision.model}` : ""})`,
          vision.notes?.trim(),
        ]
          .filter(Boolean)
          .join(": ");

  const alreadyHasVisionLine =
    vision.provider === "stub"
      ? gpt.notes.includes("Vision (stub):")
      : vision.provider
        ? gpt.notes.includes(`Vision (${vision.provider}`)
        : false;

  const notes = alreadyHasVisionLine
    ? gpt.notes
    : gpt.notes.trim()
      ? `${gpt.notes.trim()}\n\n${visionNote}`
      : visionNote;

  return {
    ...gpt,
    damageTypes: mergedTypes.length ? mergedTypes : gpt.damageTypes,
    severity,
    recommendedAction,
    notes,
  };
}
