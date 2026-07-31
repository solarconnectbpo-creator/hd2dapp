/**
 * Cox Roofing material / labor catalog (Atlas port).
 */

export const MaterialCategory = {
  SHINGLES: "shingles",
  ACCESSORIES: "accessories",
  FLASHING: "flashing",
  UNDERLAYMENT: "underlayment",
  VENTILATION: "ventilation",
  GUTTERS: "gutters",
} as const;

export type MaterialCategory = (typeof MaterialCategory)[keyof typeof MaterialCategory];

export const Unit = {
  SQUARE: "square",
  LINEAR_FT: "linear_ft",
  EACH: "each",
  SQ_FT: "sq_ft",
} as const;

export type Unit = (typeof Unit)[keyof typeof Unit];

export interface Material {
  code: string;
  name: string;
  category: MaterialCategory;
  unit: Unit;
  unitPrice: number;
  warranty?: string;
  notes?: string;
}

export interface LaborRate {
  code: string;
  name: string;
  unit: Unit;
  rate: number;
  notes?: string;
}

type MaterialBucket = Record<string, Material>;

export const coxPricingDatabase = {
  materials: {
    shingles: {
      "AS-STD": {
        code: "AS-STD",
        name: "3-Tab Asphalt Shingles (25-year)",
        category: MaterialCategory.SHINGLES,
        unit: Unit.SQUARE,
        unitPrice: 266.92,
        warranty: "25-year",
        notes: "Standard composition shingles",
      },
      "AS-PREM": {
        code: "AS-PREM",
        name: "Laminated Asphalt Shingles (Premium)",
        category: MaterialCategory.SHINGLES,
        unit: Unit.SQUARE,
        unitPrice: 360.38,
        warranty: "Lifetime",
        notes: "Premium architectural shingles",
      },
      "TILE-CLAY": {
        code: "TILE-CLAY",
        name: "Clay Tile Roofing",
        category: MaterialCategory.SHINGLES,
        unit: Unit.SQUARE,
        unitPrice: 800.0,
        warranty: "Lifetime",
        notes: "Traditional clay tile",
      },
      "METAL-STAND": {
        code: "METAL-STAND",
        name: "Metal Standing Seam",
        category: MaterialCategory.SHINGLES,
        unit: Unit.SQUARE,
        unitPrice: 650.0,
        warranty: "50-year",
        notes: "Galvanized steel",
      },
    } satisfies MaterialBucket,
    accessories: {
      "RIDGE-CAP": {
        code: "RIDGE-CAP",
        name: "Ridge Cap Shingles",
        category: MaterialCategory.ACCESSORIES,
        unit: Unit.LINEAR_FT,
        unitPrice: 2.5,
        notes: "Pre-cut ridge caps",
      },
      STARTER: {
        code: "STARTER",
        name: "Starter Course",
        category: MaterialCategory.ACCESSORIES,
        unit: Unit.LINEAR_FT,
        unitPrice: 1.75,
        notes: "Starter strip for first course",
      },
      "DRIP-EDGE": {
        code: "DRIP-EDGE",
        name: "Drip Edge (Gutter Apron)",
        category: MaterialCategory.ACCESSORIES,
        unit: Unit.LINEAR_FT,
        unitPrice: 1.5,
        notes: "Aluminum drip edge",
      },
    } satisfies MaterialBucket,
    flashing: {
      "FLASHING-STEP": {
        code: "FLASHING-STEP",
        name: "Step Flashing",
        category: MaterialCategory.FLASHING,
        unit: Unit.LINEAR_FT,
        unitPrice: 3.0,
        notes: "Aluminum step flashing",
      },
      "FLASHING-VALLEY": {
        code: "FLASHING-VALLEY",
        name: "Valley Flashing",
        category: MaterialCategory.FLASHING,
        unit: Unit.LINEAR_FT,
        unitPrice: 4.5,
        notes: "Aluminum valley flashing",
      },
      "PIPE-JACK": {
        code: "PIPE-JACK",
        name: "Pipe Jack",
        category: MaterialCategory.FLASHING,
        unit: Unit.EACH,
        unitPrice: 35.0,
        notes: "Rubber pipe boot",
      },
    } satisfies MaterialBucket,
    underlayment: {
      "FELT-15": {
        code: "FELT-15",
        name: "Felt Underlayment (15 lb)",
        category: MaterialCategory.UNDERLAYMENT,
        unit: Unit.SQUARE,
        unitPrice: 15.0,
        notes: "Traditional felt",
      },
      SYNTHETIC: {
        code: "SYNTHETIC",
        name: "Synthetic Underlayment",
        category: MaterialCategory.UNDERLAYMENT,
        unit: Unit.SQUARE,
        unitPrice: 35.0,
        notes: "Modern synthetic material",
      },
    } satisfies MaterialBucket,
    ventilation: {
      "VENT-RIDGE": {
        code: "VENT-RIDGE",
        name: "Ridge Vent",
        category: MaterialCategory.VENTILATION,
        unit: Unit.LINEAR_FT,
        unitPrice: 2.0,
        notes: "Continuous ridge ventilation",
      },
      "VENT-SOFFIT": {
        code: "VENT-SOFFIT",
        name: "Soffit Vent",
        category: MaterialCategory.VENTILATION,
        unit: Unit.EACH,
        unitPrice: 25.0,
        notes: "Soffit ventilation",
      },
    } satisfies MaterialBucket,
  },
  labor: {
    "LABOR-REMOVAL": {
      code: "LABOR-REMOVAL",
      name: "Roof Removal",
      unit: Unit.SQUARE,
      rate: 80.0,
      notes: "Per square of existing roofing",
    },
    "LABOR-INSTALL": {
      code: "LABOR-INSTALL",
      name: "Roof Installation",
      unit: Unit.SQUARE,
      rate: 150.0,
      notes: "Per square of new roofing",
    },
    "LABOR-INSPECTION": {
      code: "LABOR-INSPECTION",
      name: "Roof Inspection",
      unit: Unit.EACH,
      rate: 200.0,
      notes: "Complete roof inspection",
    },
    "LABOR-CLEANUP": {
      code: "LABOR-CLEANUP",
      name: "Cleanup & Debris Removal",
      unit: Unit.SQUARE,
      rate: 20.0,
      notes: "Per square",
    },
  } satisfies Record<string, LaborRate>,
} as const;

export function getMaterial(code: string): Material | null {
  for (const category of Object.values(coxPricingDatabase.materials)) {
    const material = Object.values(category).find((m) => m.code === code);
    if (material) return material;
  }
  return null;
}

export function getLaborRate(code: string): LaborRate | null {
  const rate = Object.values(coxPricingDatabase.labor).find((r) => r.code === code);
  return rate ?? null;
}

export function calculateLineItemTotal(
  materialCode: string,
  quantity: number,
  laborCode?: string,
  laborQuantity?: number,
): number {
  const material = getMaterial(materialCode);
  if (!material) throw new Error(`Material not found: ${materialCode}`);
  if (quantity <= 0) throw new Error("Quantity must be greater than 0");
  let total = material.unitPrice * quantity;
  if (laborCode && laborQuantity != null) {
    const labor = getLaborRate(laborCode);
    if (!labor) throw new Error(`Labor rate not found: ${laborCode}`);
    if (laborQuantity <= 0) throw new Error("Labor quantity must be greater than 0");
    total += labor.rate * laborQuantity;
  }
  return Math.round(total * 100) / 100;
}

export function getAllMaterials(): Material[] {
  const all: Material[] = [];
  for (const category of Object.values(coxPricingDatabase.materials)) {
    all.push(...Object.values(category));
  }
  return all;
}

export function getMaterialsByCategory(category: MaterialCategory): Material[] {
  const key = category as keyof typeof coxPricingDatabase.materials;
  const materials = coxPricingDatabase.materials[key];
  if (!materials) return [];
  return Object.values(materials);
}
