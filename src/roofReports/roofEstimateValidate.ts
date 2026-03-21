import type { RoofDamageEstimate } from "./roofReportTypes";

const MAX_USD = 50_000_000;

/**
 * Hard validation for any estimate shown to homeowners or exported.
 * Swaps inverted ranges and clamps to sane bounds.
 */
export function sanitizeRoofDamageEstimate(
  est: RoofDamageEstimate,
): RoofDamageEstimate {
  let low = Math.round(Number(est.lowCostUsd));
  let high = Math.round(Number(est.highCostUsd));
  if (!Number.isFinite(low)) low = 0;
  if (!Number.isFinite(high)) high = 0;
  low = Math.max(0, Math.min(low, MAX_USD));
  high = Math.max(0, Math.min(high, MAX_USD));
  if (low > high) {
    const t = low;
    low = high;
    high = t;
  }
  let area = est.roofAreaSqFt;
  if (area != null) {
    const a = Math.round(Number(area));
    area = Number.isFinite(a) && a > 0 ? a : undefined;
  }
  return {
    ...est,
    lowCostUsd: low,
    highCostUsd: high,
    roofAreaSqFt: area,
  };
}

export function isEstimateDisplaySafe(est: RoofDamageEstimate): boolean {
  const { lowCostUsd: lo, highCostUsd: hi } = est;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return false;
  if (lo < 0 || hi < 0) return false;
  if (lo > hi) return false;
  if (lo > MAX_USD || hi > MAX_USD) return false;
  return true;
}
