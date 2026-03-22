/**
 * Quick Price Reference (from your "Quick Price Reference.csv").
 *
 * This project currently does not load CSVs at runtime (Expo bundling constraints),
 * so we capture the specific unit prices we actively use in the estimator here.
 *
 * If you update your sheet, update these constants (or we can implement a CSV->JSON
 * build step if you want automation).
 */
export const QUICK_PRICE_NON_ROOF = {
  // HVAC
  // "R&R AC Unit w/Sleeve – Through-Wall – 8,000 BTU" (EA): replace + tax
  hvacReplaceWithTax: 942.92 + 66.62,

  // "Comb & Straighten A/C Condenser Fins – Trip Charge" (EA): replace (no tax in sheet row)
  finCombReplaceWithTax: 220.13,

  // Fencing
  // "Clean with Pressure/Chemical Spray" (SF): replace + tax
  fenceCleanReplaceWithTax: 0.46 + 0.0,

  // "Stain – Wood Fence/Gate" (SF): replace + tax
  fenceStainReplaceWithTax: 1.05 + 0.03,

  // Window wrap
  // "R&R Wrap Window Frame & Trim – Aluminum – Small" (EA): replace + tax
  windowWrapSmallReplaceWithTax: 146.06 + 4.38,

  // "R&R Wrap Window Frame & Trim – Aluminum – Standard" (EA): replace + tax
  windowWrapStandardReplaceWithTax: 234.8 + 6.56,

  // Siding/house-wrap materials
  // "House Wrap (Air/Moisture Barrier)" (SF): replace + tax
  houseWrapReplaceWithTax: 0.4 + 0.02,

  // "Fanfold Foam Insulation Board – 3/8\"" (SF): replace + tax
  fanfoldReplaceWithTax: 0.74 + 0.04,
} as const;
