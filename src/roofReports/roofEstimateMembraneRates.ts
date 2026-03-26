/**
 * Membrane / coating $/SQ lookup tables (from project pricing worksheets).
 * Used by `roofEstimate.ts` for both totals and line-item splits.
 */

export function parseAttachmentFromRoofType(
  text: string,
):
  | "fullyAdhered"
  | "mechanicallyAttached"
  | "ballasted"
  | "inductionWelded"
  | "heatWelded" {
  const t = text.toLowerCase();
  if (t.includes("ballasted")) return "ballasted";
  if (t.includes("induction")) return "inductionWelded";
  if (
    t.includes("heat-weld") ||
    t.includes("heat welded") ||
    t.includes("heat-welded")
  )
    return "heatWelded";
  if (
    t.includes("fully adhered") ||
    t.includes("fully-adhered") ||
    t.includes("fa")
  )
    return "fullyAdhered";
  if (
    t.includes("mechanically attached") ||
    t.includes("mechanically-attached") ||
    t.includes("ma") ||
    t.includes("mechanical")
  ) {
    return "mechanicallyAttached";
  }
  return "mechanicallyAttached";
}

export function getTpoMembraneRate(rt: string): number {
  const milMatch = rt.match(/\b(45|60|80|90)\s*-?\s*mil\b/i);
  const mil = milMatch?.[1] ? milMatch[1] : "60";
  const attachment = parseAttachmentFromRoofType(rt);
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
}

export function getEpdmMembraneRate(rt: string): number {
  const milMatch = rt.match(/\b(45|60|90)\s*-?\s*mil\b/i);
  const mil = milMatch?.[1] ? milMatch[1] : "60";
  const attachment = parseAttachmentFromRoofType(rt);
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
}

export function getPvcMembraneRate(rt: string): number {
  const milMatch = rt.match(/\b(40|50|60|80)\s*-?\s*mil\b/i);
  const mil = milMatch?.[1] ? milMatch[1] : "60";
  const attachment = parseAttachmentFromRoofType(rt);
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
}

export function getModBitReplacementRate(rt: string): number {
  const lower = rt.toLowerCase();
  const hasTorch = lower.includes("torch");
  const isSbs = lower.includes("sbs");
  const isApp = lower.includes("app");
  if (hasTorch || isApp) return 335;
  if (isSbs) {
    if (lower.includes("heat") || lower.includes("weld")) return 342;
    return 320;
  }
  return 335;
}

export function getCoatingReplacementRate(rt: string): number {
  const lower = rt.toLowerCase();
  const is3Coat = lower.includes("3-coat") || lower.includes("3 coat");
  if (lower.includes("silicone")) return is3Coat ? 268 : 185;
  if (lower.includes("acrylic")) {
    if (lower.includes("elastomer")) return 148;
    return is3Coat ? 210 : 142;
  }
  if (lower.includes("spf") || lower.includes("spray foam")) {
    if (
      lower.includes('4"') ||
      lower.includes("4 inch") ||
      lower.includes("4-inch")
    )
      return 445;
    if (
      lower.includes('3"') ||
      lower.includes("3 inch") ||
      lower.includes("3-inch")
    )
      return 345;
    if (
      lower.includes('2"') ||
      lower.includes("2 inch") ||
      lower.includes("2-inch")
    )
      return 248;
    if (
      lower.includes("1.5") ||
      lower.includes('1.5"') ||
      lower.includes("1-1/2")
    )
      return 198;
    return 145;
  }
  if (lower.includes("butyl")) return 225;
  if (lower.includes("aluminum")) {
    const twoCoat = lower.includes("2-coat") || lower.includes("2 coat");
    return twoCoat ? 88 : 48;
  }
  return 185;
}
