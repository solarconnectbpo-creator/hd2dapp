/**
 * Optional field inspection checklist stored on damage reports (export + preview).
 */

export type FieldQaChecklistId =
  | "photos_all_slopes"
  | "edges_eaves_ridges"
  | "flashings_penetrations"
  | "gutters_downspouts"
  | "attic_interior_when_safe"
  | "measurements_confirmed";

export type FieldQaChecklistState = Partial<
  Record<FieldQaChecklistId, boolean>
>;

export const FIELD_QA_ITEMS: ReadonlyArray<{
  id: FieldQaChecklistId;
  label: string;
}> = [
  {
    id: "photos_all_slopes",
    label: "Photos: all slopes / cardinal directions documented",
  },
  {
    id: "edges_eaves_ridges",
    label: "Edges: eaves, rakes, ridges visually checked",
  },
  {
    id: "flashings_penetrations",
    label: "Flashings & penetrations (vents, chimneys, walls) reviewed",
  },
  {
    id: "gutters_downspouts",
    label: "Gutters / downspouts assessed for damage or overflow signs",
  },
  {
    id: "attic_interior_when_safe",
    label: "Attic / interior viewed when safe (leaks, deck, moisture)",
  },
  {
    id: "measurements_confirmed",
    label: "Measurements (trace / pitch / estimate) reviewed for this report",
  },
];

export function fieldQaCompletionCount(
  state: FieldQaChecklistState | undefined,
): number {
  if (!state) return 0;
  return FIELD_QA_ITEMS.filter((it) => state[it.id] === true).length;
}
