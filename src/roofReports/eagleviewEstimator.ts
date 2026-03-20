import * as turf from "@turf/turf";
import { QUICK_PRICE_ROOF } from "@/src/roofReports/quickPriceReferenceRoof";

type MaterialGrade = "basic" | "architectural" | "premium";
type UnderlaymentType = "synthetic" | "felt";

export type EagleViewEstimateBreakdown = NonNullable<
  import("./roofReportTypes").DamageRoofReport["eagleViewEstimate"]
>;

// Michigan (48350) pricing data from InVisionCRM/eagleview-estimator (app/lib/constants.ts)
const MICHIGAN_PRICING = {
  shingles: {
    basic: { pricePerSquare: QUICK_PRICE_ROOF.shinglesBasicPricePerSquare },
    architectural: { pricePerSquare: 115.99 },
    premium: { pricePerSquare: 175.99 },
  },
  underlayment: {
    synthetic: { pricePerRoll: QUICK_PRICE_ROOF.underlaymentSyntheticPricePerRoll }, // covers 1000 sq ft
    felt: { pricePerRoll: 39.99 }, // covers 200 sq ft
  },
  iceAndWater: {
    standard: { pricePerRoll: QUICK_PRICE_ROOF.iceAndWaterStandardPricePerRoll }, // 62 linear feet per roll
  },
  ridgeVent: { standard: { pricePerPiece: 45.99 } }, // 20 lf per piece
  ridgeCap: { standard: { pricePerBundle: 45.99 } }, // bundles for 20 lf * 3
  starterStrip: { standard: { pricePerBundle: QUICK_PRICE_ROOF.starterStripStandardPricePerBundle } }, // 100 lf per bundle
  nails: { standard: { pricePerPound: 3.99 } }, // pounds per square * 1.5
  labor: {
    baseRate: 65.0,
    factors: {
      pitch: {
        "4:12": 1.0,
        "6:12": 1.1,
        "8:12": 1.25,
        "10:12": 1.4,
        "12:12": 1.6,
      } as Record<string, number>,
      complexity: {
        simple: 1.0,
        moderate: 1.2,
        complex: 1.4,
      },
      stories: {
        "1": 1.0,
        "2": 1.15,
        ">2": 1.3,
      } as Record<string, number>,
    },
  },
  additional: {
    dumpsterFee: QUICK_PRICE_ROOF.additionalDumpsterFee,
    permitFee: QUICK_PRICE_ROOF.additionalPermitFee,
    overhead: 0.1, // 10%
    profit: 0.2, // 20%
  },
} as const;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function extractMainPolygon(geo: any): GeoJSON.Feature<GeoJSON.Polygon> | null {
  if (!geo) return null;
  if (geo?.type === "Feature" && geo?.geometry?.type === "Polygon") return geo as GeoJSON.Feature<GeoJSON.Polygon>;
  if (geo?.type === "Polygon") return { type: "Feature", properties: {}, geometry: geo };
  if (geo?.type === "Feature" && geo?.geometry?.type === "MultiPolygon") {
    const mp = geo.geometry.coordinates as GeoJSON.Position[][][];
    let best: GeoJSON.Position[][] | null = null;
    let bestArea = -1;
    for (const rings of mp) {
      try {
        const f = turf.polygon(rings);
        const a = turf.area(f);
        if (a > bestArea) {
          bestArea = a;
          best = rings;
        }
      } catch {
        // ignore
      }
    }
    if (!best) return null;
    return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: best } };
  }
  if (geo?.type === "MultiPolygon") {
    const mp = geo.coordinates as GeoJSON.Position[][][];
    let best: GeoJSON.Position[][] | null = null;
    let bestArea = -1;
    for (const rings of mp) {
      try {
        const f = turf.polygon(rings);
        const a = turf.area(f);
        if (a > bestArea) {
          bestArea = a;
          best = rings;
        }
      } catch {
        // ignore
      }
    }
    if (!best) return null;
    return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: best } };
  }
  return null;
}

function estimateFacetsFromTrace(roofTraceGeoJson: any): number | undefined {
  const poly = extractMainPolygon(roofTraceGeoJson);
  if (!poly) return undefined;
  const ring = poly.geometry.coordinates?.[0] ?? [];
  // closed ring repeats first point at end
  const uniquePts = ring.length > 1 ? ring.length - 1 : ring.length;
  if (!Number.isFinite(uniquePts) || uniquePts <= 0) return undefined;
  // facets is an approximation in our simplified model
  return clamp(uniquePts, 3, 50);
}

function parsePitchRise(pitch?: string): number | undefined {
  if (!pitch) return undefined;
  const m = pitch.match(/(\d{1,3}(?:\.\d+)?)\s*[/:]\s*(\d{1,3}(?:\.\d+)?)/);
  if (!m) return undefined;
  const rise = Number(m[1]);
  const run = Number(m[2]);
  if (!Number.isFinite(rise) || !Number.isFinite(run) || run <= 0) return undefined;
  return rise / run; // rise per foot of run
}

function toNearestTwelveRun(pitch?: string): keyof typeof MICHIGAN_PRICING.labor.factors.pitch | undefined {
  const risePerFoot = parsePitchRise(pitch);
  if (typeof risePerFoot !== "number") return undefined;
  const riseOn12 = risePerFoot * 12;
  const candidates: Array<keyof typeof MICHIGAN_PRICING.labor.factors.pitch> = ["4:12", "6:12", "8:12", "10:12", "12:12"];
  const targetRise = candidates.map((c) => Number(c.split(":")[0]));
  const closestIdx = targetRise.reduce((bestIdx, r, idx) => (Math.abs(r - riseOn12) < Math.abs(targetRise[bestIdx] - riseOn12) ? idx : bestIdx), 0);
  return candidates[closestIdx];
}

function complexityFactorFromFacets(facets?: number): number {
  if (!facets || !Number.isFinite(facets)) return MICHIGAN_PRICING.labor.factors.complexity.simple;
  if (facets <= 8) return MICHIGAN_PRICING.labor.factors.complexity.simple;
  if (facets <= 15) return MICHIGAN_PRICING.labor.factors.complexity.moderate;
  return MICHIGAN_PRICING.labor.factors.complexity.complex;
}

function storiesFactor(stories?: number): number {
  if (!stories || !Number.isFinite(stories) || stories < 1) return MICHIGAN_PRICING.labor.factors.stories["1"];
  if (stories === 1) return MICHIGAN_PRICING.labor.factors.stories["1"];
  if (stories === 2) return MICHIGAN_PRICING.labor.factors.stories["2"];
  return MICHIGAN_PRICING.labor.factors.stories[">2"];
}

function wasteFactorPercentFromFacetsAndPitch(facets?: number, pitchKey?: string): number {
  // In the upstream repo this comes from "wasteCalculation.suggested" derived from complexity + pitch.
  // We approximate:
  // - simple gable-like outlines: 10%
  // - moderate: 15%
  // - complex: 20%
  // If very low-slope pitch, reduce slightly.
  const f = facets ?? 8;
  let pct = f <= 8 ? 0.1 : f <= 15 ? 0.15 : 0.2;
  if (pitchKey && ["4:12", "6:12"].includes(pitchKey)) pct -= 0.01;
  return clamp(pct, 0.05, 0.25) * 100; // return percent
}

export function calculateEagleViewLikeEstimate(opts: {
  roofAreaSqFt?: number;
  roofPerimeterFt?: number;
  roofTraceGeoJson?: any;
  predominantPitch?: string;
  numberOfStories?: number;
  shingleGrade?: MaterialGrade;
  underlaymentType?: UnderlaymentType;
  includePermit?: boolean;
  includeDumpster?: boolean;
}): EagleViewEstimateBreakdown | undefined {
  const area = opts.roofAreaSqFt;
  if (!area || !Number.isFinite(area) || area <= 0) return undefined;

  const squares = area / 100;
  const facets = estimateFacetsFromTrace(opts.roofTraceGeoJson);
  const pitchKey = toNearestTwelveRun(opts.predominantPitch);
  const wasteFactorPercent = wasteFactorPercentFromFacetsAndPitch(facets, pitchKey);
  const totalSquares = squares * (1 + wasteFactorPercent / 100);

  // Approximate eaves/ridges/hips lengths from perimeter.
  // (EagleView provides these exactly; our trace is a polygon.)
  const perimeterFt = opts.roofPerimeterFt ?? 0;
  const totalEavesFt = perimeterFt > 0 ? perimeterFt / 2 : undefined;
  const totalRakesFt = perimeterFt > 0 ? perimeterFt / 2 : undefined;
  const totalRidgesHipsFt = perimeterFt > 0 ? perimeterFt / 4 : undefined;

  const shingleGrade: MaterialGrade = opts.shingleGrade ?? "architectural";
  const underlaymentType: UnderlaymentType = opts.underlaymentType ?? "synthetic";
  const includePermit = opts.includePermit ?? false;
  const includeDumpster = opts.includeDumpster ?? false;
  const numberOfStories = opts.numberOfStories ?? 1;

  if (!totalEavesFt || !totalRidgesHipsFt || !totalRakesFt) {
    // Still return shingles/nails if perimeter missing.
  }

  const materials = {
    shingles: {
      quantity: totalSquares,
      cost: totalSquares * MICHIGAN_PRICING.shingles[shingleGrade].pricePerSquare,
    },
    underlayment: {
      quantity: Math.ceil((totalSquares * 100) / (underlaymentType === "synthetic" ? 1000 : 200)),
      cost:
        Math.ceil((totalSquares * 100) / (underlaymentType === "synthetic" ? 1000 : 200)) *
        MICHIGAN_PRICING.underlayment[underlaymentType].pricePerRoll,
    },
    iceAndWater: {
      quantity: totalEavesFt ? Math.ceil(totalEavesFt / 62) : 0,
      cost: totalEavesFt ? Math.ceil(totalEavesFt / 62) * MICHIGAN_PRICING.iceAndWater.standard.pricePerRoll : 0,
    },
    ridgeVent: {
      quantity: totalRidgesHipsFt ? Math.ceil(totalRidgesHipsFt / 20) : 0,
      cost: totalRidgesHipsFt
        ? Math.ceil(totalRidgesHipsFt / 20) * MICHIGAN_PRICING.ridgeVent.standard.pricePerPiece
        : 0,
    },
    ridgeCap: {
      quantity: totalRidgesHipsFt ? Math.ceil((totalRidgesHipsFt / 20) * 3) : 0,
      cost: totalRidgesHipsFt
        ? Math.ceil((totalRidgesHipsFt / 20) * 3) * MICHIGAN_PRICING.ridgeCap.standard.pricePerBundle
        : 0,
    },
    starterStrip: {
      quantity: totalEavesFt && totalRakesFt ? Math.ceil((totalEavesFt + totalRakesFt) / 100) : 0,
      cost:
        totalEavesFt && totalRakesFt
          ? Math.ceil((totalEavesFt + totalRakesFt) / 100) * MICHIGAN_PRICING.starterStrip.standard.pricePerBundle
          : 0,
    },
    nails: {
      quantity: Math.ceil(totalSquares * 1.5),
      cost: Math.ceil(totalSquares * 1.5) * MICHIGAN_PRICING.nails.standard.pricePerPound,
    },
    total: 0,
  };

  materials.total = Object.entries(materials)
    .filter(([k]) => k !== "total")
    .reduce((sum, [, item]) => sum + (item as any).cost, 0);

  const pitchFactor = pitchKey ? MICHIGAN_PRICING.labor.factors.pitch[pitchKey] : 1.0;
  const complexityFactor = complexityFactorFromFacets(facets);
  const storiesFactorValue = storiesFactor(numberOfStories);

  const labor = {
    base: MICHIGAN_PRICING.labor.baseRate * squares,
    adjustedRate:
      MICHIGAN_PRICING.labor.baseRate * pitchFactor * complexityFactor * storiesFactorValue,
    total: 0,
  };
  labor.total = labor.adjustedRate * squares;

  const additional: EagleViewEstimateBreakdown["additional"] = {
    overhead: 0,
    profit: 0,
    ...(includeDumpster ? { dumpster: MICHIGAN_PRICING.additional.dumpsterFee } : {}),
    ...(includePermit ? { permit: MICHIGAN_PRICING.additional.permitFee } : {}),
  };

  const subtotal =
    materials.total + labor.total + (additional.dumpster || 0) + (additional.permit || 0);
  additional.overhead = subtotal * MICHIGAN_PRICING.additional.overhead;
  additional.profit = subtotal * MICHIGAN_PRICING.additional.profit;

  const totals = {
    subtotal,
    overhead: additional.overhead,
    profit: additional.profit,
    final: subtotal + additional.overhead + additional.profit,
  };

  return {
    materials,
    labor,
    additional,
    totals,
  };
}

