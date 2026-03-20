import type { DamageType, RoofDamageEstimate, Severity } from "./roofReportTypes";

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
    rt.includes("modified") || rt.includes("mod bit") || rt.includes("modbit") || rt.includes("sbs") || rt.includes("app");
  const isCoating = rt.includes("coating");

  if (severity >= 4 && (hasReplaceSignal || damageTypes.length >= 3)) return "replace";
  if (hasReplaceSignal) return "replace";

  // Slate roofs are commonly handled as a full replacement when any meaningful
  // storm damage is present in this simplified model.
  if (isSlate && damageTypes.length >= 2 && severity >= 3) return "replace";

  // For low-slope TPO systems, replacement becomes more likely as severity rises.
  if (isTpo && severity >= 4 && (hasReplaceSignal || damageTypes.length >= 2)) return "replace";

  // Flat commercial membranes + modified bitumen become replacement at higher severity.
  if ((isEpdm || isPvc) && severity >= 4 && damageTypes.length >= 2) return "replace";
  if (isModBit && severity >= 4 && (hasReplaceSignal || damageTypes.length >= 2)) return "replace";
  if (isCoating && severity >= 4 && hasReplaceSignal) return "replace";

  return "repair";
}

/**
 * Demo estimate calculator. Replace with your real pricing model later.
 * - Uses roof area (sq ft)
 * - Uses severity + damage type mix
 * - Produces a low/high range.
 */
export function computeRoofDamageEstimate(opts: {
  roofAreaSqFt?: number;
  damageTypes: DamageType[];
  severity: Severity;
  roofType?: string;
  notes?: string;
}): RoofDamageEstimate {
  const area = opts.roofAreaSqFt && Number.isFinite(opts.roofAreaSqFt) ? opts.roofAreaSqFt : 1500;
  const scope = getScope(opts.damageTypes, opts.severity, opts.roofType);

  // Match your example PDF: it uses roof area with a 12% waste factor.
  const WASTE_FACTOR = 0.12;
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
  const isModBit = rt.includes("modified") || rt.includes("mod bit") || rt.includes("modbit") || rt.includes("sbs") || rt.includes("app");
  const isCoating = rt.includes("coating");
  // "flat" here means generic low-slope without a known membrane/coating system.
  const isFlat = rt.includes("flat") && !isTpo && !isEpdm && !isPvc && !isModBit && !isCoating;

  // Approximation based on your knowledge-base CSV:
  // - Uses membrane replacement unit prices by mil/attachment
  // - Adds a constant per-square "balance of system" estimate
  //   (deck prep + insulation + misc conditions), and then applies overhead/profit.
  // This keeps the model comparable to the slate example where we price per square.
  const parseAttachment = (text: string): "fullyAdhered" | "mechanicallyAttached" | "ballasted" | "inductionWelded" | "heatWelded" => {
    const t = text.toLowerCase();
    if (t.includes("ballasted")) return "ballasted";
    if (t.includes("induction")) return "inductionWelded";
    if (t.includes("heat-weld") || t.includes("heat welded") || t.includes("heat-welded")) return "heatWelded";
    if (t.includes("fully adhered") || t.includes("fully-adhered") || t.includes("fa")) return "fullyAdhered";
    if (t.includes("mechanically attached") || t.includes("mechanically-attached") || t.includes("ma") || t.includes("mechanical")) {
      return "mechanicallyAttached";
    }
    return "mechanicallyAttached";
  };

  const getTpoMembraneRate = (): number => {
    // Mil (45/60/80/90). Default to 60 if not found.
    const milMatch = rt.match(/\b(45|60|80|90)\s*-?\s*mil\b/i);
    const mil = milMatch?.[1] ? milMatch[1] : "60";

    // Attachment method. Default to mechanically attached.
    const attachment = parseAttachment(rt);

    // Membrane $/SQ from your CSV (TPO membrane line items).
    const membraneRateTable: Record<string, number> = {
      "45-mechanicallyAttached": 285,
      "45-fullyAdhered": 340,
      "45-inductionWelded": 315,
      "45-ballasted": 265,

      "60-mechanicallyAttached": 345,
      "60-fullyAdhered": 415,
      "60-inductionWelded": 385,
      "60-ballasted": 320,

      "80-mechanicallyAttached": 445,
      "80-fullyAdhered": 525,
      "80-inductionWelded": 495,

      "90-mechanicallyAttached": 520,
      "90-fullyAdhered": 615,
      "90-inductionWelded": 580,
    };

    const key = `${mil}-${attachment}`;
    const fallbackKey = `${mil}-mechanicallyAttached`;
    return membraneRateTable[key] ?? membraneRateTable[fallbackKey] ?? 345;
  };

  const getEpdmMembraneRate = (): number => {
    const milMatch = rt.match(/\b(45|60|90)\s*-?\s*mil\b/i);
    const mil = milMatch?.[1] ? milMatch[1] : "60";
    const attachment = parseAttachment(rt);

    const membraneRateTable: Record<string, number> = {
      "45-fullyAdhered": 295,
      "45-mechanicallyAttached": 265,
      "45-ballasted": 235,

      "60-fullyAdhered": 365,
      "60-mechanicallyAttached": 328,
      "60-ballasted": 298,

      "90-fullyAdhered": 485,
      "90-mechanicallyAttached": 435,
      "90-ballasted": 398,
    };

    const key = `${mil}-${attachment}`;
    const fallbackKey = "60-mechanicallyAttached";
    return membraneRateTable[key] ?? membraneRateTable[fallbackKey] ?? 328;
  };

  const getPvcMembraneRate = (): number => {
    const milMatch = rt.match(/\b(40|50|60|80)\s*-?\s*mil\b/i);
    const mil = milMatch?.[1] ? milMatch[1] : "60";
    const attachment = parseAttachment(rt);

    const membraneRateTable: Record<string, number> = {
      "40-mechanicallyAttached": 310,
      "40-fullyAdhered": 375,

      "50-mechanicallyAttached": 365,
      "50-fullyAdhered": 435,
      "50-heatWelded": 395,

      "60-mechanicallyAttached": 425,
      "60-fullyAdhered": 505,
      "60-heatWelded": 465,

      "80-mechanicallyAttached": 545,
      "80-fullyAdhered": 635,
      "80-heatWelded": 595,
    };

    const key = `${mil}-${attachment}`;
    const fallbackKey = "60-mechanicallyAttached";
    return membraneRateTable[key] ?? membraneRateTable[fallbackKey] ?? 425;
  };

  const getModBitReplacementRate = (): number => {
    // Modified Bitumen CSV default 2-ply system replace rates:
    // - APP torch-applied 2-ply system: $335/SQ
    // - SBS self-adhered 2-ply system: $320/SQ
    // - SBS heat-welded 2-ply system: $342/SQ
    const lower = rt;
    const hasTorch = lower.includes("torch");
    const isSbs = lower.includes("sbs");
    const isApp = lower.includes("app");

    if (hasTorch || isApp) return 335;
    if (isSbs) {
      if (lower.includes("heat") || lower.includes("weld")) return 342;
      return 320;
    }
    // Default to torch-applied APP to avoid under-estimating.
    return 335;
  };

  const getCoatingReplacementRate = (): number => {
    // Uses coating system totals from your CSV as a starting point.
    // Silicone: 2-coat $185, 3-coat $268
    // Acrylic: 2-coat $142, 3-coat $210, elastomeric $148
    // SPF: 1" $145, 1.5" $198, 2" $248, 3" $345, 4" $445
    // Butyl: 2-coat $225
    // Aluminum fibrated: 1-coat $48, 2-coat $88
    const lower = rt;
    const is3Coat = lower.includes("3-coat") || lower.includes("3 coat");

    if (lower.includes("silicone")) return is3Coat ? 268 : 185;
    if (lower.includes("acrylic")) {
      if (lower.includes("elastomer")) return 148;
      return is3Coat ? 210 : 142;
    }
    if (lower.includes("spf") || lower.includes("spray foam")) {
      if (lower.includes("4\"") || lower.includes("4 inch") || lower.includes("4-inch")) return 445;
      if (lower.includes("3\"") || lower.includes("3 inch") || lower.includes("3-inch")) return 345;
      if (lower.includes("2\"") || lower.includes("2 inch") || lower.includes("2-inch")) return 248;
      if (lower.includes("1.5") || lower.includes("1.5\"") || lower.includes("1-1/2")) return 198;
      return 145;
    }
    if (lower.includes("butyl")) return 225;
    if (lower.includes("aluminum")) {
      const twoCoat = lower.includes("2-coat") || lower.includes("2 coat");
      return twoCoat ? 88 : 48;
    }

    // Default to silicone 2-coat.
    return 185;
  };

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
    const membraneRate = getTpoMembraneRate();

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
    const membraneRate = getEpdmMembraneRate();
    // EPDM tear-off removal (single-ply): $44.75 / SQ
    const balanceOfSystem = 44.75 + 18.5 + 142 + 12.5 + 28 + 4.5; // $/SQ heuristic
    const basePerSq = (balanceOfSystem + membraneRate) * 1.21;
    repairRateLow = Math.round(basePerSq * 0.9);
    repairRateHigh = Math.round(basePerSq * 1.05);
    replaceRateLow = Math.round(basePerSq * 1.05);
    replaceRateHigh = Math.round(basePerSq * 1.3);
  } else if (isPvc) {
    const membraneRate = getPvcMembraneRate();
    // PVC tear-off removal (single-ply): $48.50 / SQ
    const balanceOfSystem = 48.5 + 18.5 + 142 + 12.5 + 28 + 4.5; // $/SQ heuristic
    const basePerSq = (balanceOfSystem + membraneRate) * 1.21;
    repairRateLow = Math.round(basePerSq * 0.9);
    repairRateHigh = Math.round(basePerSq * 1.05);
    replaceRateLow = Math.round(basePerSq * 1.05);
    replaceRateHigh = Math.round(basePerSq * 1.3);
  } else if (isModBit) {
    const modBitRate = getModBitReplacementRate();
    // Modified bitumen tear-off removal (Quick Price Reference / Modified Bitumen tear-off):
    // Remove Modified Bitumen Roof: $80.69 / SQ
    const balanceOfSystem = 80.69 + 18.5 + 142 + 12.5 + 28 + 4.5; // $/SQ heuristic
    const basePerSq = (balanceOfSystem + modBitRate) * 1.21;
    repairRateLow = Math.round(basePerSq * 0.9);
    repairRateHigh = Math.round(basePerSq * 1.05);
    replaceRateLow = Math.round(basePerSq * 1.05);
    replaceRateHigh = Math.round(basePerSq * 1.3);
  } else if (isCoating) {
    const coatingRate = getCoatingReplacementRate();
    const basePerSq = (coatingRate + 18.5) * 1.21; // add light surface prep heuristic
    repairRateLow = Math.round(basePerSq * 0.9);
    repairRateHigh = Math.round(basePerSq * 1.05);
    replaceRateLow = Math.round(basePerSq * 1.05);
    replaceRateHigh = Math.round(basePerSq * 1.3);
  } else {
    // 3-Tab Comp Shingle (from your "3-Tab Comp Shingle" + "Quick Price Reference" sheets)
    const is3TabCompShingle =
      rt.includes("3-tab") || rt.includes("3 tab") || rt.includes("comp shingle") || rt.includes("composition shingle");

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

  const lowCostUsd = Math.round(effectiveSquares * baseLow * mixMultiplier * sevMultiplier);
  const highCostUsd = Math.round(effectiveSquares * baseHigh * mixMultiplier * sevMultiplier);

  const confidence: RoofDamageEstimate["confidence"] =
    opts.roofAreaSqFt && opts.roofAreaSqFt > 0
      ? typeCount >= 2 && opts.severity >= 3
        ? "high"
        : "medium"
      : "low";

  return {
    estimateId: `est_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAtIso: new Date().toISOString(),
    roofAreaSqFt: area,
    scope,
    lowCostUsd,
    highCostUsd,
    confidence,
    notes: opts.notes?.trim() || undefined,
  };
}

