import type {
  DamageType,
  RecommendedAction,
  RoofDamageEstimate,
  RoofEstimateLineItem,
  Severity,
} from "./roofReportTypes";
import {
  getRoofCodeUpgradeHints,
  shouldIncludeIceWaterLine,
} from "./roofEstimateCodeUpgrades";
import {
  buildAsphaltSteepSlopeLines,
  buildCoatingSystemLines,
  buildGenericSteepTradeLines,
  buildModBitLines,
  buildSinglePlyMembraneLines,
  buildThreeTabCompositionLines,
  cloneBosWithTearWeight,
} from "./roofEstimateLineAllocation";
import {
  getCoatingReplacementRate,
  getEpdmMembraneRate,
  getModBitReplacementRate,
  getPvcMembraneRate,
  getTpoMembraneRate,
} from "./roofEstimateMembraneRates";
import { sanitizeRoofDamageEstimate } from "./roofEstimateValidate";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getScope(
  damageTypes: DamageType[],
  severity: Severity,
  roofType?: string,
): "repair" | "replace" {
  const replaceSignals = ["Missing Shingles", "Structural"] as DamageType[];
  const hasReplaceSignal = replaceSignals.some((s) => damageTypes.includes(s));
  const rt = roofType?.toLowerCase() ?? "";
  const isSlate = rt.includes("slate");
  const isTpo = rt.includes("tpo");
  const isEpdm = rt.includes("epdm");
  const isPvc = rt.includes("pvc");
  const isModBit =
    rt.includes("modified") ||
    rt.includes("mod bit") ||
    rt.includes("modbit") ||
    rt.includes("sbs") ||
    rt.includes("app");
  const isCoating = rt.includes("coating");

  if (severity >= 4 && (hasReplaceSignal || damageTypes.length >= 3))
    return "replace";
  if (hasReplaceSignal) return "replace";

  // Slate roofs are commonly handled as a full replacement when any meaningful
  // storm damage is present in this simplified model.
  if (isSlate && damageTypes.length >= 2 && severity >= 3) return "replace";

  // For low-slope TPO systems, replacement becomes more likely as severity rises.
  if (isTpo && severity >= 4 && (hasReplaceSignal || damageTypes.length >= 2))
    return "replace";

  // Flat commercial membranes + modified bitumen become replacement at higher severity.
  if ((isEpdm || isPvc) && severity >= 4 && damageTypes.length >= 2)
    return "replace";
  if (
    isModBit &&
    severity >= 4 &&
    (hasReplaceSignal || damageTypes.length >= 2)
  )
    return "replace";
  if (isCoating && severity >= 4 && hasReplaceSignal) return "replace";

  return "repair";
}

function resolveScope(
  damageTypes: DamageType[],
  severity: Severity,
  roofType: string | undefined,
  recommendedAction?: RecommendedAction,
): "repair" | "replace" {
  const fromDamage = getScope(damageTypes, severity, roofType);
  if (recommendedAction === "Replace") return "replace";
  if (recommendedAction === "Repair") return "repair";
  return fromDamage;
}

const WASTE_FACTOR = 0.12;

function buildEstimateSummary(opts: {
  roofType?: string;
  recommendedAction?: RecommendedAction;
  damageTypes: DamageType[];
  severity: Severity;
  scope: "repair" | "replace";
  areaSqFt: number;
}): string {
  const effective = Math.round(opts.areaSqFt * (1 + WASTE_FACTOR));
  const ra = opts.recommendedAction;
  const scopeWhy =
    ra === "Replace" || ra === "Repair"
      ? `Matches your selected action (${ra}).`
      : `Derived from severity (${opts.severity}/5), damage types, and roof system (not overridden by recommended action).`;

  return [
    `Basis: ${Math.round(opts.areaSqFt).toLocaleString()} sq ft plan area → ~${effective.toLocaleString()} sq ft after ${Math.round(WASTE_FACTOR * 100)}% waste.`,
    `Roof: ${opts.roofType?.trim() || "unspecified"}.`,
    `Scope ${opts.scope.toUpperCase()}: ${scopeWhy}`,
    `Damage profile: ${opts.damageTypes.join(", ") || "—"}.`,
  ].join(" ");
}

/**
 * Roof damage $ range from plan-area (sq ft), roof system, severity, and scope.
 * - Area input should be **horizontal footprint / plan** from trace, lead, or manual entry — not sloped “sheet” area unless you adjust.
 * - Adds a **waste factor** (see `WASTE_FACTOR`) before per-square pricing; line items follow `roofEstimateLineAllocation` + membrane rates.
 * - For **surface-area context**, see `buildRoofMeasurementGuidanceNotes` (pitch → approximate surface).
 */
export function computeRoofDamageEstimate(opts: {
  roofAreaSqFt?: number;
  damageTypes: DamageType[];
  severity: Severity;
  roofType?: string;
  notes?: string;
  recommendedAction?: RecommendedAction;
  /** US state (e.g. MO) — ice-barrier & code-upgrade hints. */
  stateCode?: string;
  /** e.g. "6/12" — drives ice & water line item when low-slope. */
  roofPitch?: string;
}): RoofDamageEstimate {
  const rawArea = opts.roofAreaSqFt;
  const area =
    typeof rawArea === "number" && Number.isFinite(rawArea) && rawArea > 0
      ? rawArea
      : NaN;

  if (!Number.isFinite(area)) {
    return sanitizeRoofDamageEstimate({
      estimateId: `est_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAtIso: new Date().toISOString(),
      roofAreaSqFt: undefined,
      scope: "repair",
      lowCostUsd: 0,
      highCostUsd: 0,
      confidence: "low",
      notes:
        opts.notes?.trim() ||
        "Enter a roof area (sq ft from trace, lead, or manual entry) to generate a dollar range.",
      codeUpgrades: getRoofCodeUpgradeHints({
        roofType: opts.roofType,
        stateCode: opts.stateCode,
        roofPitch: opts.roofPitch,
        scope: "repair",
      }),
    });
  }

  const scope = resolveScope(
    opts.damageTypes,
    opts.severity,
    opts.roofType,
    opts.recommendedAction,
  );

  const effectiveSqFt = area * (1 + WASTE_FACTOR);

  // Convert to "squares" pricing because most roof estimates are per-square.
  const effectiveSquares = effectiveSqFt / 100;

  // Rate model:
  // These are tuned to match the style of an Xactimate-format output where "replace"
  // on slate roofs lands around ~$2,900-$3,100 per square on average (after waste).
  const rt = (opts.roofType ?? "").toLowerCase();
  const isSlate = rt.includes("slate");
  const isMetal = rt.includes("metal");
  const isTile = rt.includes("tile");
  const isTpo = rt.includes("tpo");
  const isEpdm = rt.includes("epdm");
  const isPvc = rt.includes("pvc");
  const isModBit =
    rt.includes("modified") ||
    rt.includes("mod bit") ||
    rt.includes("modbit") ||
    rt.includes("sbs") ||
    rt.includes("app");
  const isCoating = rt.includes("coating");
  // "flat" here means generic low-slope without a known membrane/coating system.
  const isFlat =
    rt.includes("flat") &&
    !isTpo &&
    !isEpdm &&
    !isPvc &&
    !isModBit &&
    !isCoating;

  const is3TabCompShingle =
    rt.includes("3-tab") ||
    rt.includes("3 tab") ||
    rt.includes("comp shingle") ||
    rt.includes("composition shingle");

  // Base per-square ranges for repair/replace.
  let repairRateLow = 1400;
  let repairRateHigh = 2200;
  let replaceRateLow = 2400;
  let replaceRateHigh = 3200;

  if (isSlate) {
    repairRateLow = 1700;
    repairRateHigh = 2600;
    replaceRateLow = 2800;
    replaceRateHigh = 3100;
  } else if (isMetal) {
    repairRateLow = 1600;
    repairRateHigh = 2500;
    replaceRateLow = 2600;
    replaceRateHigh = 3400;
  } else if (isTile) {
    repairRateLow = 1500;
    repairRateHigh = 2400;
    replaceRateLow = 2500;
    replaceRateHigh = 3400;
  } else if (isFlat) {
    repairRateLow = 1300;
    repairRateHigh = 2200;
    replaceRateLow = 2200;
    replaceRateHigh = 3000;
  } else if (isTpo) {
    const membraneRate = getTpoMembraneRate(rt);

    // Base balance-of-system estimate per square (before waste/overhead).
    // Uses key unit prices from your knowledge-base sheets (Quick Price Reference / TPO sheet):
    // - Tear-off removal (TPO single-ply): $48.50 / SQ
    // - Deck prep: $18.50 / SQ
    // - Insulation (default 2"): $142 / SQ
    // - HVAC obstruction surcharge heuristic: $12.50 / SQ
    // - Temp tarp + final cleaning: $28 + $4.50 / SQ
    const balanceOfSystem = 48.5 + 18.5 + 142 + 12.5 + 28 + 4.5; // $/SQ

    const basePerSq = (balanceOfSystem + membraneRate) * 1.21; // include 10% O/H + 11% profit

    // Translate basePerSq into a range (repair vs replace).
    repairRateLow = Math.round(basePerSq * 0.9);
    repairRateHigh = Math.round(basePerSq * 1.05);
    replaceRateLow = Math.round(basePerSq * 1.05);
    replaceRateHigh = Math.round(basePerSq * 1.3);
  } else if (isEpdm) {
    const membraneRate = getEpdmMembraneRate(rt);
    // EPDM tear-off removal (single-ply): $44.75 / SQ
    const balanceOfSystem = 44.75 + 18.5 + 142 + 12.5 + 28 + 4.5; // $/SQ heuristic
    const basePerSq = (balanceOfSystem + membraneRate) * 1.21;
    repairRateLow = Math.round(basePerSq * 0.9);
    repairRateHigh = Math.round(basePerSq * 1.05);
    replaceRateLow = Math.round(basePerSq * 1.05);
    replaceRateHigh = Math.round(basePerSq * 1.3);
  } else if (isPvc) {
    const membraneRate = getPvcMembraneRate(rt);
    // PVC tear-off removal (single-ply): $48.50 / SQ
    const balanceOfSystem = 48.5 + 18.5 + 142 + 12.5 + 28 + 4.5; // $/SQ heuristic
    const basePerSq = (balanceOfSystem + membraneRate) * 1.21;
    repairRateLow = Math.round(basePerSq * 0.9);
    repairRateHigh = Math.round(basePerSq * 1.05);
    replaceRateLow = Math.round(basePerSq * 1.05);
    replaceRateHigh = Math.round(basePerSq * 1.3);
  } else if (isModBit) {
    const modBitRate = getModBitReplacementRate(rt);
    // Modified bitumen tear-off removal (Quick Price Reference / Modified Bitumen tear-off):
    // Remove Modified Bitumen Roof: $80.69 / SQ
    const balanceOfSystem = 80.69 + 18.5 + 142 + 12.5 + 28 + 4.5; // $/SQ heuristic
    const basePerSq = (balanceOfSystem + modBitRate) * 1.21;
    repairRateLow = Math.round(basePerSq * 0.9);
    repairRateHigh = Math.round(basePerSq * 1.05);
    replaceRateLow = Math.round(basePerSq * 1.05);
    replaceRateHigh = Math.round(basePerSq * 1.3);
  } else if (isCoating) {
    const coatingRate = getCoatingReplacementRate(rt);
    const basePerSq = (coatingRate + 18.5) * 1.21; // add light surface prep heuristic
    repairRateLow = Math.round(basePerSq * 0.9);
    repairRateHigh = Math.round(basePerSq * 1.05);
    replaceRateLow = Math.round(basePerSq * 1.05);
    replaceRateHigh = Math.round(basePerSq * 1.3);
  } else {
    // 3-Tab Comp Shingle (from your "3-Tab Comp Shingle" + "Quick Price Reference" sheets)
    if (is3TabCompShingle) {
      // Approximate full replacement line-item $/SQ using your example values:
      // - Remove 3-Tab 25yr Comp. Shingle – incl. felt: $89.24 / SQ
      // - Roofing Felt – Synthetic Underlayment: $45.53 / SQ
      // - 3-Tab 25yr Comp. Shingle Roofing – without felt (field): $236.32 / SQ
      // Remaining "balance of system" tuned so the model matches the worksheet’s total-per-square style.
      const replacePerSq = 604.32; // derived from worksheet line-item total / SQ (see 3-tab sheet example)

      repairRateLow = Math.round(replacePerSq * 0.8);
      repairRateHigh = Math.round(replacePerSq * 1.0);
      replaceRateLow = Math.round(replacePerSq * 0.98);
      replaceRateHigh = Math.round(replacePerSq * 1.25);
    } else {
      // Asphalt/shingle default
      repairRateLow = 1200;
      repairRateHigh = 2000;
      replaceRateLow = 2100;
      replaceRateHigh = 2900;
    }
  }

  const baseLow = scope === "replace" ? replaceRateLow : repairRateLow;
  const baseHigh = scope === "replace" ? replaceRateHigh : repairRateHigh;

  // Damage type mix and severity shape the range.
  const typeCount = Math.max(1, opts.damageTypes.length);
  const mixMultiplier = 1 + clamp((typeCount - 1) * 0.08, 0, 0.35);
  const sevMultiplier = 0.92 + opts.severity * 0.07; // severity 1 => 0.99, severity 5 => 1.27

  const lowCostUsd = Math.round(
    effectiveSquares * baseLow * mixMultiplier * sevMultiplier,
  );
  const highCostUsd = Math.round(
    effectiveSquares * baseHigh * mixMultiplier * sevMultiplier,
  );

  const confidence: RoofDamageEstimate["confidence"] =
    typeCount >= 2 && opts.severity >= 4
      ? "high"
      : opts.severity <= 2 && typeCount === 1
        ? "low"
        : "medium";

  const summary = buildEstimateSummary({
    roofType: opts.roofType,
    recommendedAction: opts.recommendedAction,
    damageTypes: opts.damageTypes,
    severity: opts.severity,
    scope,
    areaSqFt: area,
  });
  const notesMerged = [summary, opts.notes?.trim()]
    .filter(Boolean)
    .join("\n\n");

  const codeUpgrades = getRoofCodeUpgradeHints({
    roofType: opts.roofType,
    stateCode: opts.stateCode,
    roofPitch: opts.roofPitch,
    scope,
  });

  const includeIceWaterLine = shouldIncludeIceWaterLine(
    opts.stateCode,
    opts.roofPitch,
  );

  let lineItems: RoofEstimateLineItem[] = [];
  if (isSlate) {
    lineItems = buildGenericSteepTradeLines({
      label: "Natural slate",
      totalLow: lowCostUsd,
      totalHigh: highCostUsd,
      effectiveSquares,
    });
  } else if (isMetal) {
    lineItems = buildGenericSteepTradeLines({
      label: "Metal panel",
      totalLow: lowCostUsd,
      totalHigh: highCostUsd,
      effectiveSquares,
    });
  } else if (isTile) {
    lineItems = buildGenericSteepTradeLines({
      label: "Tile",
      totalLow: lowCostUsd,
      totalHigh: highCostUsd,
      effectiveSquares,
    });
  } else if (isFlat) {
    lineItems = buildGenericSteepTradeLines({
      label: "Low-slope / built-up (generic)",
      totalLow: lowCostUsd,
      totalHigh: highCostUsd,
      effectiveSquares,
    });
  } else if (isTpo) {
    lineItems = buildSinglePlyMembraneLines({
      membraneLabel: "TPO (thermoplastic olefin)",
      membraneRate: getTpoMembraneRate(rt),
      totalLow: lowCostUsd,
      totalHigh: highCostUsd,
      effectiveSquares,
    });
  } else if (isEpdm) {
    lineItems = buildSinglePlyMembraneLines({
      membraneLabel: "EPDM (rubber)",
      membraneRate: getEpdmMembraneRate(rt),
      bosParts: cloneBosWithTearWeight(
        44.75,
        "Tear-off removal (EPDM single-ply)",
      ),
      totalLow: lowCostUsd,
      totalHigh: highCostUsd,
      effectiveSquares,
    });
  } else if (isPvc) {
    lineItems = buildSinglePlyMembraneLines({
      membraneLabel: "PVC (thermoplastic)",
      membraneRate: getPvcMembraneRate(rt),
      totalLow: lowCostUsd,
      totalHigh: highCostUsd,
      effectiveSquares,
    });
  } else if (isModBit) {
    lineItems = buildModBitLines({
      modBitRate: getModBitReplacementRate(rt),
      totalLow: lowCostUsd,
      totalHigh: highCostUsd,
      effectiveSquares,
    });
  } else if (isCoating) {
    lineItems = buildCoatingSystemLines({
      coatingLabel: (opts.roofType ?? "Coating system").trim().slice(0, 48),
      coatingRate: getCoatingReplacementRate(rt),
      totalLow: lowCostUsd,
      totalHigh: highCostUsd,
      effectiveSquares,
    });
  } else if (is3TabCompShingle) {
    lineItems = buildThreeTabCompositionLines({
      totalLow: lowCostUsd,
      totalHigh: highCostUsd,
      effectiveSquares,
    });
  } else {
    lineItems = buildAsphaltSteepSlopeLines({
      scope,
      totalLow: lowCostUsd,
      totalHigh: highCostUsd,
      effectiveSquares,
      includeIceWaterLine,
    });
  }

  const methodology = [
    `Plan area ${Math.round(area)} sq ft → ${effectiveSquares.toFixed(2)} effective squares (includes ${Math.round(WASTE_FACTOR * 100)}% waste).`,
    `Damage-type mix ×${mixMultiplier.toFixed(2)} and severity ×${sevMultiplier.toFixed(2)} scale the scoped $/SQ model.`,
    `Line items are trade buckets that sum to the ${scope === "replace" ? "replacement" : "repair"} range (±$1 rounding).`,
  ].join(" ");

  return sanitizeRoofDamageEstimate({
    estimateId: `est_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAtIso: new Date().toISOString(),
    roofAreaSqFt: Math.round(area),
    effectiveSquares: Math.round(effectiveSquares * 100) / 100,
    wasteFactorPct: Math.round(WASTE_FACTOR * 100),
    scope,
    lowCostUsd,
    highCostUsd,
    confidence,
    methodology,
    lineItems,
    codeUpgrades,
    notes: notesMerged || undefined,
  });
}
