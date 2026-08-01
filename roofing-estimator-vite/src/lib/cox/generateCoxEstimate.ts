/**
 * Atlas Cox per-square estimate generator (story + pitch + system + tear-off).
 */

import { getLaborRate, getMaterial } from "./coxPricingDatabase";
import {
  calculateTieredEstimateWithTax,
  COX_DEFAULT_TAX_RATE,
  pricingTiers,
  roundMoney,
  type CoxTierKey,
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

export type CoxEstimateLine = {
  code: string;
  name: string;
  kind: "material" | "labor";
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
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
  lineItems: CoxEstimateLine[];
  generatedAt: string;
};

const PITCH_RE = /^\d+:\d+$/;

export function assertRoofArea(roofArea: number): void {
  if (!Number.isFinite(roofArea) || roofArea <= 0) {
    throw new Error("Roof area must be greater than 0");
  }
  if (roofArea > 50_000) {
    throw new Error("Roof area cannot exceed 50,000 sq ft");
  }
}

export function assertPitch(pitch: string): void {
  if (!PITCH_RE.test(pitch)) {
    throw new Error("Pitch must be in format 'rise:run'");
  }
  const [riseRaw, runRaw] = pitch.split(":");
  const rise = Number(riseRaw);
  const run = Number(runRaw);
  if (!(rise >= 0 && rise <= 12 && run > 0 && run <= 12)) {
    throw new Error("Pitch must be between 0:12 and 12:12");
  }
}

export function assertTearOffLayers(layers: number): void {
  if (!Number.isInteger(layers) || layers < 0 || layers > 4) {
    throw new Error("Tear-off layers must be an integer from 0 to 4");
  }
}

/** $/sq base before tear-off (Atlas roofingEstimateRouter formula). */
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

function shingleMaterialCode(tier: CoxTierKey): string {
  return tier === "good" ? "AS-STD" : "AS-PREM";
}

function buildCatalogLines(squares: number, tearOffLayers: number, roofSystem: CoxRoofSystem): CoxEstimateLine[] {
  const lines: CoxEstimateLine[] = [];
  const sq = roundMoney(squares);

  if (roofSystem === "shingles") {
    const mat = getMaterial("AS-PREM") ?? getMaterial("AS-STD");
    if (mat) {
      lines.push({
        code: mat.code,
        name: mat.name,
        kind: "material",
        quantity: sq,
        unit: mat.unit,
        unitCost: mat.unitPrice,
        totalCost: roundMoney(mat.unitPrice * sq),
      });
    }
  }

  const underlay = getMaterial("SYNTHETIC");
  if (underlay && roofSystem === "shingles") {
    lines.push({
      code: underlay.code,
      name: underlay.name,
      kind: "material",
      quantity: sq,
      unit: underlay.unit,
      unitCost: underlay.unitPrice,
      totalCost: roundMoney(underlay.unitPrice * sq),
    });
  }

  if (tearOffLayers > 0) {
    const removal = getLaborRate("LABOR-REMOVAL");
    if (removal) {
      const qty = roundMoney(sq * tearOffLayers);
      lines.push({
        code: removal.code,
        name: `${removal.name} (${tearOffLayers} layer${tearOffLayers === 1 ? "" : "s"})`,
        kind: "labor",
        quantity: qty,
        unit: removal.unit,
        unitCost: removal.rate,
        totalCost: roundMoney(removal.rate * qty),
      });
    }
  }

  const install = getLaborRate("LABOR-INSTALL");
  if (install) {
    lines.push({
      code: install.code,
      name: install.name,
      kind: "labor",
      quantity: sq,
      unit: install.unit,
      unitCost: install.rate,
      totalCost: roundMoney(install.rate * sq),
    });
  }

  return lines;
}

export function generateCoxEstimate(input: CoxEstimateInput): CoxEstimateResult {
  assertRoofArea(input.roofArea);
  assertPitch(input.pitch);
  assertTearOffLayers(input.tearOffLayers);

  const buildingTypes: CoxBuildingType[] = ["oneStory", "twoStory", "threeStory"];
  const roofSystems: CoxRoofSystem[] = ["shingles", "tpo45mil", "tpo60mil", "modBit"];
  if (!buildingTypes.includes(input.buildingType)) {
    throw new Error("Invalid building type");
  }
  if (!roofSystems.includes(input.roofSystem)) {
    throw new Error("Invalid roof system");
  }

  const taxRate = input.taxRate ?? COX_DEFAULT_TAX_RATE;
  const squares = roundMoney(input.roofArea / 100);
  const basePricePerSquare = resolveBasePricePerSquare(input.buildingType, input.roofSystem, input.pitch);
  const materialCost = roundMoney(squares * basePricePerSquare);
  const tearOffCost = roundMoney(squares * 80 * input.tearOffLayers);
  const totalBasePrice = roundMoney(materialCost + tearOffCost);
  const estimate = calculateTieredEstimateWithTax(totalBasePrice, taxRate);

  const projectName =
    (input.projectName?.trim() || input.parcelId?.trim() || "Roof estimate").slice(0, 120);

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
    lineItems: buildCatalogLines(squares, input.tearOffLayers, input.roofSystem),
    generatedAt: new Date().toISOString(),
  };
}

/** Map a selected Cox tier into HD2D `Estimate` materials/labor/totals. */
export function coxResultToHd2dEstimateLines(
  result: CoxEstimateResult,
  tier: CoxTierKey,
): {
  materials: {
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
  }[];
  labor: {
    description: string;
    hours: number;
    hourlyRate: number;
    totalCost: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
} {
  const tierMeta = pricingTiers[tier];
  const packageSubtotal = roundMoney(result.materialCost * tierMeta.multiplier);
  const tearSubtotal = roundMoney(result.tearOffCost * tierMeta.multiplier);

  const materials: {
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
  }[] = [
    {
      name: `${tierMeta.name} — ${result.roofSystem} (${result.buildingType}, ${result.pitch})`,
      quantity: result.squares,
      unit: "square",
      unitCost: roundMoney(result.basePricePerSquare * tierMeta.multiplier),
      totalCost: packageSubtotal,
    },
  ];

  if (result.tearOffLayers > 0) {
    materials.push({
      name: `Tear-off (${result.tearOffLayers} layer${result.tearOffLayers === 1 ? "" : "s"})`,
      quantity: roundMoney(result.squares * result.tearOffLayers),
      unit: "square",
      unitCost: roundMoney(80 * tierMeta.multiplier),
      totalCost: tearSubtotal,
    });
  }

  const matSum = roundMoney(materials.reduce((s, m) => s + m.totalCost, 0));
  const target = result.estimate.subtotal[tier];
  const drift = roundMoney(target - matSum);
  if (materials[0] && Math.abs(drift) >= 0.01) {
    materials[0] = {
      ...materials[0],
      totalCost: roundMoney(materials[0].totalCost + drift),
    };
  }

  return {
    materials,
    labor: [],
    subtotal: result.estimate.subtotal[tier],
    tax: result.estimate.tax[tier],
    total: result.estimate.total[tier],
  };
}

/** Preferred shingle SKU hint for a tier (catalog reference). */
export function preferredShingleCode(tier: CoxTierKey): string {
  return shingleMaterialCode(tier);
}
