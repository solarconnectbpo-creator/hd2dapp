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
  carrierScopeText: string;
  carrierBenchmarkProfileId: string;
  carrierBenchmarkRegionFactor: string;
  carrierBenchmarkComplexityFactor: string;
  deductibleUsd: string;
  nonRecDepUsd: string;
  /** Year built, lot size, etc. from property record import (Property records page). */
  propertyRecordNotes: string;
}
