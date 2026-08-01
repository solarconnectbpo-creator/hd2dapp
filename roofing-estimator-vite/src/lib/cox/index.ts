export {
  COX_DEFAULT_TAX_RATE,
  calculateTieredEstimateWithTax,
  formatEstimateWithTax,
  formatPrice,
  pricingTiers,
  roundMoney,
  type CoxTierKey,
  type TieredEstimateWithTax,
} from "./pricingTiers";

export {
  MaterialCategory,
  Unit,
  calculateLineItemTotal,
  coxPricingDatabase,
  getAllMaterials,
  getLaborRate,
  getMaterial,
  getMaterialsByCategory,
  type LaborRate,
  type Material,
} from "./coxPricingDatabase";

export {
  coxResultToHd2dEstimateLines,
  generateCoxEstimate,
  preferredShingleCode,
  resolveBasePricePerSquare,
  type CoxBuildingType,
  type CoxEstimateInput,
  type CoxEstimateResult,
  type CoxRoofSystem,
} from "./generateCoxEstimate";

export {
  normalizePitchToColon,
  parsePitchParts,
  pitchRiseToColon,
  type NormalizedPitch,
} from "./normalizePitch";

export {
  inferTearOffLayers,
  mapRoofMaterialToCoxSystem,
  mapStoriesToBuildingType,
  measurementToCoxPrefill,
  surfaceAreaFromMeasurement,
  type CoxMeasurementPrefill,
} from "./measurementPrefill";

export { buildCoxEstimateReportHtml, openCoxEstimateReport } from "./estimateReport";
