import type {
  RoofDamageEstimate,
  RoofEstimateLineItem,
} from "./roofReportTypes";

/** Sum trade-bucket line items (should match estimate range when non-roof rows are included). */
export function sumRoofEstimateLineItems(
  lineItems: RoofEstimateLineItem[] | undefined,
): { lowUsd: number; highUsd: number } {
  if (!lineItems?.length) return { lowUsd: 0, highUsd: 0 };
  let lowUsd = 0;
  let highUsd = 0;
  for (const row of lineItems) {
    lowUsd += Number(row.lowUsd) || 0;
    highUsd += Number(row.highUsd) || 0;
  }
  return {
    lowUsd: Math.round(lowUsd),
    highUsd: Math.round(highUsd),
  };
}

/**
 * Merge roof-only estimate with non-roof Quick Price add-ons: totals and one extra line item
 * so line-item sums match the reported final range.
 */
export function mergeNonRoofIntoRoofDamageEstimate(
  roof: RoofDamageEstimate,
  nonRoofLowUsd: number,
  nonRoofHighUsd: number,
): RoofDamageEstimate {
  const lo = Math.round(Number(nonRoofLowUsd)) || 0;
  const hi = Math.round(Number(nonRoofHighUsd)) || 0;
  const hasNonRoof = lo > 0 || hi > 0;
  if (!hasNonRoof) return roof;
  const extra: RoofEstimateLineItem = {
    id: "non-roof-property-line-items",
    category: "general",
    description:
      "Other property line items (fencing, HVAC, wraps, etc.) — per Quick Price",
    unit: "EA",
    quantity: 1,
    unitLowUsd: lo,
    unitHighUsd: hi,
    lowUsd: lo,
    highUsd: hi,
  };
  return {
    ...roof,
    lowCostUsd: roof.lowCostUsd + lo,
    highCostUsd: roof.highCostUsd + hi,
    lineItems: [...(roof.lineItems ?? []), extra],
  };
}
