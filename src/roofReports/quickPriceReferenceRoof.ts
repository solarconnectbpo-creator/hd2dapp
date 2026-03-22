/**
 * Quick Price Reference (roof materials & misc) extracted from:
 * `AIcheatsheets_def81a10.xlsx - Quick Price Reference.csv`
 *
 * Notes:
 * - CSV has separate REPLACE and TAX columns; this module stores totals as (replace + tax)
 *   for the unit cost fields used by the estimator.
 * - The estimator models some units as "per roll" or "per bundle" using coverage
 *   assumptions from `eagleviewEstimator.ts` (e.g. ice & water 62 linear feet per roll).
 */

export const QUICK_PRICE_ROOF = {
  // "3-Tab 25yr Comp. Shingle – without Felt (field)" (SQ)
  // replace $236.32 + tax $12.57
  shinglesBasicPricePerSquare: 236.32 + 12.57,

  // "Roofing Felt – Synthetic Underlayment" (SQ)
  // replace $45.53 + tax $2.20. Estimator synthetic underlayment roll covers 1000 sq ft (10 SQ).
  underlaymentSyntheticPricePerRoll: (45.53 + 2.2) * 10,

  // "Ice & Water Barrier (standard)" (SF)
  // replace $1.54 + tax $0.05. Estimator uses 62 linear feet per roll.
  // The estimator's existing pricing implicitly assumes an effective roll width of ~1 ft.
  iceAndWaterStandardPricePerRoll: (1.54 + 0.05) * 62,

  // "Hip/Ridge Cap – High Profile – Comp. Shingles" (LF)
  // replace $7.71 + tax $0.49.
  // Estimator models quantity as: Math.ceil((length/20)*3) * pricePerBundle where
  // each bundle is treated like ~20/3 linear feet.
  ridgeCapStandardPricePerBundle: (7.71 + 0.49) * (20 / 3),

  // "Asphalt Starter – Universal Starter Course" (LF)
  // replace $1.68 + tax $0.06.
  // Estimator models starterStrip as: Math.ceil((eaves+rakes)/100) * pricePerBundle where
  // each bundle covers ~100 linear feet.
  starterStripStandardPricePerBundle: (1.68 + 0.06) * 100,

  // "Dumpster Load – 40 yards, 7-8 tons" (EA)
  additionalDumpsterFee: 913.0,

  // "Taxes, Insurance, Permits & Fees ★PENDING" (EA)
  additionalPermitFee: 296.0,
} as const;
