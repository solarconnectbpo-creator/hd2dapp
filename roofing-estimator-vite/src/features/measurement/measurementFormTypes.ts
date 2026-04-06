import type { RoofStructureMode } from "../../lib/roofGeometryFromPolygons";

export type DamageType = "Hail" | "Wind" | "Missing Shingles" | "Leaks" | "Flashing" | "Structural";

export const DAMAGE_TYPES: DamageType[] = [
  "Hail",
  "Wind",
  "Missing Shingles",
  "Leaks",
  "Flashing",
  "Structural",
];

/**
 * How line-item scope is chosen for the estimate.
 * - replace: full roof replacement (tear-off + system lines for full effective squares).
 * - repair: partial / targeted repair quantities.
 * - auto: legacy rule (severity ≥ 4 or certain damage types → replace).
 */
export type EstimateScopeMode = "replace" | "repair" | "auto";

/** Main intake + carrier fields for the measurement / estimate screen. */
export interface FormState {
  address: string;
  stateCode: string;
  latitude: string;
  longitude: string;
  roofType: string;
  roofStructure: RoofStructureMode;
  stories: string;
  exteriorWallHeightFt: string;
  areaSqFt: string;
  perimeterFt: string;
  roofPitch: string;
  wastePercent: string;
  measuredSquares: string;
  ridgesFt: string;
  eavesFt: string;
  rakesFt: string;
  valleysFt: string;
  hipsFt: string;
  wallFlashingFt: string;
  stepFlashingFt: string;
  othersFt: string;
  severity: number;
  damageTypes: DamageType[];
  estimateScopeMode: EstimateScopeMode;
  carrierScopeText: string;
  carrierBenchmarkProfileId: string;
  carrierBenchmarkRegionFactor: string;
  carrierBenchmarkComplexityFactor: string;
  deductibleUsd: string;
  nonRecDepUsd: string;
  /** Year built, lot size, etc. from property record import (Property records page). */
  propertyRecordNotes: string;

  /** When "1", mod-bit replace uses explicit tear/flash/deck/haul lines instead of generic tear-off + dumpster. */
  estimateAddonModBitDetailed: string;
  estimateAddonDryInSq: string;
  /** Gutter run LF (optional add-on line). */
  estimateAddonGutterLf: string;
  /** Lump-sum general conditions allowance ($), one EA line. */
  estimateAddonGcAllowanceUsd: string;
  estimateAddonCopperLf: string;
  estimateAddonFreightEa: string;
  estimateAddonEngineeringEa: string;
  estimateAddonSidingSf: string;
  estimateAddonWindowEa: string;
  estimateAddonTrimLf: string;
  estimateAddonTileLoadSq: string;
  estimateAddonTileInstallSq: string;
}
