/**
 * Map HD2D Measurement records into Atlas/Cox estimate inputs.
 */

import type { Measurement } from "../../context/RoofingContext";
import type { CoxBuildingType, CoxRoofSystem } from "./generateCoxEstimate";
import { pitchRiseToColon } from "./normalizePitch";

export type CoxMeasurementPrefill = {
  measurementId: string;
  projectName: string;
  /** Surface SF before waste — Atlas `roofArea`. */
  roofArea: number;
  /** With-waste SF (for display only). */
  adjustedArea: number;
  wastePercentage: number;
  pitch: string;
  buildingType: CoxBuildingType;
  roofSystem: CoxRoofSystem;
  tearOffLayers: number;
  roofMaterial: string;
};

/** Roof surface SF before waste factor (Atlas package input). */
export function surfaceAreaFromMeasurement(m: Measurement): number {
  if (typeof m.surfaceArea === "number" && Number.isFinite(m.surfaceArea) && m.surfaceArea > 0) {
    return m.surfaceArea;
  }
  const waste = m.wastePercentage;
  if (Number.isFinite(waste) && waste > 0 && m.adjustedArea > 0) {
    return Math.round((m.adjustedArea / (1 + waste / 100)) * 100) / 100;
  }
  // Newer saves: totalArea = surface, adjustedArea = with waste.
  if (m.totalArea > 0 && m.adjustedArea > 0 && m.totalArea < m.adjustedArea - 0.5) {
    return m.totalArea;
  }
  if (m.totalArea > 0) return m.totalArea;
  return m.adjustedArea > 0 ? m.adjustedArea : 0;
}

export function mapRoofMaterialToCoxSystem(roofMaterial: string): CoxRoofSystem {
  const s = (roofMaterial || "").toLowerCase();
  if (/\btpo\b/.test(s) && /45/.test(s)) return "tpo45mil";
  if (/\btpo\b/.test(s)) return "tpo60mil";
  if (/\bpvc\b|\bepdm\b/.test(s)) return "tpo60mil";
  if (/mod(?:ified)?\s*bit|modbit|\bsbs\b|\bapp\b/.test(s)) return "modBit";
  return "shingles";
}

export function mapStoriesToBuildingType(stories: number | undefined | null): CoxBuildingType {
  if (stories == null || !Number.isFinite(stories) || stories < 1.5) return "oneStory";
  if (stories < 2.5) return "twoStory";
  return "threeStory";
}

/**
 * Infer tear-off layers when measurement did not store them.
 * Overlay/coating scopes → 0; otherwise default 1 layer.
 */
export function inferTearOffLayers(m: Measurement): number {
  if (typeof m.tearOffLayers === "number" && Number.isInteger(m.tearOffLayers)) {
    return Math.max(0, Math.min(4, m.tearOffLayers));
  }
  const mat = (m.roofMaterial || "").toLowerCase();
  if (/coating|overlay|recover/.test(mat)) return 0;
  return 1;
}

export function measurementToCoxPrefill(m: Measurement): CoxMeasurementPrefill {
  const roofArea = surfaceAreaFromMeasurement(m);
  const stories =
    typeof m.stories === "number" && Number.isFinite(m.stories) ? m.stories : undefined;
  return {
    measurementId: m.id,
    projectName: m.projectName,
    roofArea,
    adjustedArea: m.adjustedArea > 0 ? m.adjustedArea : roofArea,
    wastePercentage: m.wastePercentage || 0,
    pitch: pitchRiseToColon(m.pitch),
    buildingType: mapStoriesToBuildingType(stories),
    roofSystem: mapRoofMaterialToCoxSystem(m.roofMaterial),
    tearOffLayers: inferTearOffLayers(m),
    roofMaterial: m.roofMaterial,
  };
}
