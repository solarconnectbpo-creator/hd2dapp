/**
 * Atlas Cox per-square estimate generator.
 * Keep in sync with roofing-estimator-vite/src/lib/cox/generateCoxEstimate.ts
 */

import {
  calculateTieredEstimateWithTax,
  COX_DEFAULT_TAX_RATE,
  pricingTiers,
  roundMoney,
  type TieredEstimateWithTax,
} from "./pricingTiers";

export type CoxBuildingType = "oneStory" | "twoStory" | "threeStory";
export type CoxRoofSystem = "shingles" | "tpo45mil" | "tpo60mil" | "modBit";

export type CoxEstimateInput = {
  parcelId?: string;
  projectName?: string;
  roofArea: number;
  pitch: string;
  buildingType: CoxBuildingType;
  roofSystem: CoxRoofSystem;
  tearOffLayers: number;
  taxRate?: number;
};

export type CoxEstimateResult = {
  parcelId: string | null;
  projectName: string;
  roofArea: number;
  squares: number;
  pitch: string;
  buildingType: CoxBuildingType;
  roofSystem: CoxRoofSystem;
  tearOffLayers: number;
  basePricePerSquare: number;
  materialCost: number;
  tearOffCost: number;
  totalBasePrice: number;
  taxRate: number;
  estimate: TieredEstimateWithTax;
  tiers: typeof pricingTiers;
  generatedAt: string;
};

const PITCH_RE = /^\d+:\d+$/;

function assertRoofArea(roofArea: number): void {
  if (!Number.isFinite(roofArea) || roofArea <= 0) throw new Error("Roof area must be greater than 0");
  if (roofArea > 50_000) throw new Error("Roof area cannot exceed 50,000 sq ft");
}

function assertPitch(pitch: string): void {
  if (!PITCH_RE.test(pitch)) throw new Error("Pitch must be in format 'rise:run'");
  const [riseRaw, runRaw] = pitch.split(":");
  const rise = Number(riseRaw);
  const run = Number(runRaw);
  if (!(rise >= 0 && rise <= 12 && run > 0 && run <= 12)) {
    throw new Error("Pitch must be between 0:12 and 12:12");
  }
}

function assertTearOffLayers(layers: number): void {
  if (!Number.isInteger(layers) || layers < 0 || layers > 4) {
    throw new Error("Tear-off layers must be an integer from 0 to 4");
  }
}

export function resolveBasePricePerSquare(
  buildingType: CoxBuildingType,
  roofSystem: CoxRoofSystem,
  pitch: string,
): number {
  assertPitch(pitch);
  const [riseRaw, runRaw] = pitch.split(":");
  const rise = Number(riseRaw);
  const run = Number(runRaw);
  const pitchRatio = rise / run;

  let basePricePerSquare = 0;
  if (buildingType === "twoStory") {
    if (pitchRatio <= 7 / 12) basePricePerSquare = 650;
    else if (pitchRatio <= 8 / 12) basePricePerSquare = 700;
    else basePricePerSquare = 750;
  } else if (buildingType === "oneStory") {
    basePricePerSquare = 575;
  } else {
    basePricePerSquare = 800;
  }

  if (roofSystem === "tpo45mil") basePricePerSquare = 1500;
  else if (roofSystem === "tpo60mil") basePricePerSquare = 1775;
  else if (roofSystem === "modBit") basePricePerSquare = 1100;

  return basePricePerSquare;
}

export function generateCoxEstimate(input: CoxEstimateInput): CoxEstimateResult {
  assertRoofArea(input.roofArea);
  assertPitch(input.pitch);
  assertTearOffLayers(input.tearOffLayers);

  const buildingTypes: CoxBuildingType[] = ["oneStory", "twoStory", "threeStory"];
  const roofSystems: CoxRoofSystem[] = ["shingles", "tpo45mil", "tpo60mil", "modBit"];
  if (!buildingTypes.includes(input.buildingType)) throw new Error("Invalid building type");
  if (!roofSystems.includes(input.roofSystem)) throw new Error("Invalid roof system");

  const taxRate = input.taxRate ?? COX_DEFAULT_TAX_RATE;
  const squares = roundMoney(input.roofArea / 100);
  const basePricePerSquare = resolveBasePricePerSquare(input.buildingType, input.roofSystem, input.pitch);
  const materialCost = roundMoney(squares * basePricePerSquare);
  const tearOffCost = roundMoney(squares * 80 * input.tearOffLayers);
  const totalBasePrice = roundMoney(materialCost + tearOffCost);
  const estimate = calculateTieredEstimateWithTax(totalBasePrice, taxRate);
  const projectName =
    (input.projectName?.trim() || input.parcelId?.trim() || "Cox roof estimate").slice(0, 120);

  return {
    parcelId: input.parcelId?.trim() || null,
    projectName,
    roofArea: input.roofArea,
    squares,
    pitch: input.pitch,
    buildingType: input.buildingType,
    roofSystem: input.roofSystem,
    tearOffLayers: input.tearOffLayers,
    basePricePerSquare,
    materialCost,
    tearOffCost,
    totalBasePrice,
    taxRate,
    estimate,
    tiers: pricingTiers,
    generatedAt: new Date().toISOString(),
  };
}
