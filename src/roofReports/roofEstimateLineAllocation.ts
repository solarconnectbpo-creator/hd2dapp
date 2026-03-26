import type { RoofEstimateLineItem } from "./roofReportTypes";

export function fixRoundingDrift(values: number[], target: number): number[] {
  const out = values.map((v) => Math.round(v));
  const sum = out.reduce((a, b) => a + b, 0);
  const diff = Math.round(target) - sum;
  if (diff !== 0 && out.length > 0) out[out.length - 1] += diff;
  return out;
}

type WeightRow = {
  id: string;
  category: RoofEstimateLineItem["category"];
  description: string;
  weight: number;
  note?: string;
};

/**
 * Allocate totalLow/totalHigh across rows by weight; returned line $ include all multipliers.
 * quantity = effectiveSquares; unit $/SQ = line / quantity.
 */
export function allocateByWeights(
  rows: WeightRow[],
  totalLow: number,
  totalHigh: number,
  effectiveSquares: number,
): RoofEstimateLineItem[] {
  const wSum = rows.reduce((a, r) => a + r.weight, 0);
  if (wSum <= 0 || effectiveSquares <= 0) return [];

  const lows = rows.map((r) => (r.weight / wSum) * totalLow);
  const highs = rows.map((r) => (r.weight / wSum) * totalHigh);
  const lowFixed = fixRoundingDrift(lows, totalLow);
  const highFixed = fixRoundingDrift(highs, totalHigh);

  return rows.map((r, i) => {
    const lo = lowFixed[i]!;
    const hi = highFixed[i]!;
    return {
      id: r.id,
      category: r.category,
      description: r.description,
      unit: "SQ",
      quantity: effectiveSquares,
      unitLowUsd: lo / effectiveSquares,
      unitHighUsd: hi / effectiveSquares,
      lowUsd: lo,
      highUsd: hi,
      note: r.note,
    };
  });
}

export function buildAsphaltSteepSlopeLines(opts: {
  scope: "repair" | "replace";
  totalLow: number;
  totalHigh: number;
  effectiveSquares: number;
  includeIceWaterLine: boolean;
}): RoofEstimateLineItem[] {
  const { scope, totalLow, totalHigh, effectiveSquares, includeIceWaterLine } =
    opts;

  if (scope === "repair") {
    return allocateByWeights(
      [
        {
          id: "asphalt-repair-local",
          category: "labor",
          description:
            "Localized repair, sealant & spot shingle replacement (labor + material)",
          weight: 0.28,
        },
        {
          id: "asphalt-repair-field",
          category: "roofCover",
          description: "Partial field shingles / bundle match (waste included)",
          weight: 0.24,
        },
        {
          id: "asphalt-repair-flash",
          category: "flashings",
          description: "Flashings, pipe boots, wall ties & penetrations",
          weight: 0.32,
        },
        {
          id: "asphalt-repair-misc",
          category: "accessories",
          description: "Accessories, setup, protection & disposal (partial)",
          weight: 0.16,
        },
      ],
      totalLow,
      totalHigh,
      effectiveSquares,
    );
  }

  const iceWt = includeIceWaterLine ? 0.07 : 0;
  const fieldWt = includeIceWaterLine ? 0.36 : 0.43;
  const rows: WeightRow[] = [
    {
      id: "asphalt-tear",
      category: "tearOff",
      description: "Tear-off, disposal & dump (asphalt shingle roof)",
      weight: 0.16,
    },
    {
      id: "asphalt-underlay",
      category: "underlayment",
      description: "Synthetic underlayment / secondary moisture barrier",
      weight: 0.09,
    },
    {
      id: "asphalt-field",
      category: "roofCover",
      description: "Field shingles (architectural default) incl. waste factor",
      weight: fieldWt,
    },
    {
      id: "asphalt-ridge",
      category: "accessories",
      description: "Starter, ridge / hip cap, nails & manufacturer accessories",
      weight: 0.11,
    },
    {
      id: "asphalt-flash",
      category: "flashings",
      description:
        "Metal flashings, drip edge, valley metal, boots & penetrations",
      weight: 0.12,
    },
  ];

  if (includeIceWaterLine) {
    rows.push({
      id: "asphalt-iw",
      category: "underlayment",
      description:
        "Ice & water shield (self-adhered) — eaves / valleys per IRC R905.2.7",
      weight: iceWt,
      note: "Quantity varies by eave depth, valleys, and local amendment.",
    });
  }

  return allocateByWeights(rows, totalLow, totalHigh, effectiveSquares);
}

/** 3-tab composition — worksheet-style $/SQ split (see roofEstimate comments). */
export function buildThreeTabCompositionLines(opts: {
  totalLow: number;
  totalHigh: number;
  effectiveSquares: number;
}): RoofEstimateLineItem[] {
  const { totalLow, totalHigh, effectiveSquares } = opts;
  return allocateByWeights(
    [
      {
        id: "3tab-remove",
        category: "tearOff",
        description: "Remove 3-tab comp shingle incl. felt (tear-off)",
        weight: 89.24,
        note: "Quick Price Reference style unit cost basis.",
      },
      {
        id: "3tab-synthetic-felt",
        category: "underlayment",
        description: "Roofing felt — synthetic underlayment",
        weight: 45.53,
      },
      {
        id: "3tab-field",
        category: "roofCover",
        description: "3-tab comp shingle roofing — field (without felt)",
        weight: 236.32,
      },
      {
        id: "3tab-accessories",
        category: "accessories",
        description: "Starter, ridge, cap, vents & accessories bundle",
        weight: 120,
      },
      {
        id: "3tab-flashings",
        category: "flashings",
        description: "Valley / wall / penetration flashings & drip metal",
        weight: 113.23,
      },
    ],
    totalLow,
    totalHigh,
    effectiveSquares,
  );
}

export const TPO_BOS_PARTS: WeightRow[] = [
  {
    id: "sp-tear",
    category: "tearOff",
    description: "Tear-off removal (single-ply)",
    weight: 48.5,
  },
  {
    id: "sp-deck",
    category: "general",
    description: "Deck prep & minor substrate repairs",
    weight: 18.5,
  },
  {
    id: "sp-insulation",
    category: "insulation",
    description: "Insulation / cover board package (heuristic R-value)",
    weight: 142,
  },
  {
    id: "sp-hvac",
    category: "general",
    description: "HVAC curbs & obstruction allowance",
    weight: 12.5,
  },
  {
    id: "sp-temp",
    category: "general",
    description: "Temporary protection, cleanup & handling",
    weight: 32.5,
  },
];

/** EPDM tear-off line uses $44.75/SQ vs TPO $48.50 in the price model. */
export function cloneBosWithTearWeight(
  tearWeight: number,
  tearDescription: string,
): WeightRow[] {
  return [
    {
      ...TPO_BOS_PARTS[0]!,
      weight: tearWeight,
      description: tearDescription,
    },
    ...TPO_BOS_PARTS.slice(1),
  ];
}

const MODBIT_BOS_PARTS: WeightRow[] = [
  {
    id: "mb-tear",
    category: "tearOff",
    description: "Remove modified bitumen roof (tear-off)",
    weight: 80.69,
  },
  ...TPO_BOS_PARTS.slice(1),
];

export function buildSinglePlyMembraneLines(opts: {
  membraneLabel: string;
  membraneRate: number;
  bosParts?: WeightRow[];
  totalLow: number;
  totalHigh: number;
  effectiveSquares: number;
}): RoofEstimateLineItem[] {
  const {
    membraneLabel,
    membraneRate,
    bosParts = TPO_BOS_PARTS,
    totalLow,
    totalHigh,
    effectiveSquares,
  } = opts;

  const bosWeight = bosParts.reduce((a, b) => a + b.weight, 0);
  const memW = membraneRate;
  const totalW = memW + bosWeight;

  const memShareLow = (memW / totalW) * totalLow;
  const memShareHigh = (memW / totalW) * totalHigh;
  const bosTotalLow = totalLow - memShareLow;
  const bosTotalHigh = totalHigh - memShareHigh;

  const membraneLines = allocateByWeights(
    [
      {
        id: "sp-membrane",
        category: "membrane",
        description: `${membraneLabel} membrane (field) incl. O&P share`,
        weight: memW,
      },
    ],
    memShareLow,
    memShareHigh,
    effectiveSquares,
  );

  const bosLines = allocateByWeights(
    bosParts,
    bosTotalLow,
    bosTotalHigh,
    effectiveSquares,
  );

  return [...membraneLines, ...bosLines];
}

export function buildCoatingSystemLines(opts: {
  coatingLabel: string;
  coatingRate: number;
  totalLow: number;
  totalHigh: number;
  effectiveSquares: number;
}): RoofEstimateLineItem[] {
  const { coatingLabel, coatingRate, totalLow, totalHigh, effectiveSquares } =
    opts;
  const surfacePrep = 18.5;
  return allocateByWeights(
    [
      {
        id: "coat-field",
        category: "coating",
        description: `${coatingLabel} restoration system (field mil thickness)`,
        weight: coatingRate,
      },
      {
        id: "coat-prep",
        category: "general",
        description: "Surface prep, cleaning & detail priming",
        weight: surfacePrep,
      },
    ],
    totalLow,
    totalHigh,
    effectiveSquares,
  );
}

export function buildModBitLines(opts: {
  modBitRate: number;
  totalLow: number;
  totalHigh: number;
  effectiveSquares: number;
}): RoofEstimateLineItem[] {
  const { modBitRate, totalLow, totalHigh, effectiveSquares } = opts;
  return buildSinglePlyMembraneLines({
    membraneLabel: "Modified bitumen (2-ply system)",
    membraneRate: modBitRate,
    bosParts: MODBIT_BOS_PARTS,
    totalLow,
    totalHigh,
    effectiveSquares,
  });
}

/** Slate, metal, tile, generic steep, generic flat — all-in trade buckets. */
export function buildGenericSteepTradeLines(opts: {
  label: string;
  totalLow: number;
  totalHigh: number;
  effectiveSquares: number;
}): RoofEstimateLineItem[] {
  const { label, totalLow, totalHigh, effectiveSquares } = opts;
  return allocateByWeights(
    [
      {
        id: "gen-tear",
        category: "tearOff",
        description: `Tear-off & disposal (${label})`,
        weight: 0.2,
      },
      {
        id: "gen-cover",
        category: "roofCover",
        description: `Primary roof covering & attachment (${label})`,
        weight: 0.45,
      },
      {
        id: "gen-flash",
        category: "flashings",
        description: "Flashings, edge metal, penetrations & transitions",
        weight: 0.2,
      },
      {
        id: "gen-acc",
        category: "accessories",
        description: "Underlayments, accessories, labor & equipment",
        weight: 0.15,
      },
    ],
    totalLow,
    totalHigh,
    effectiveSquares,
  );
}
