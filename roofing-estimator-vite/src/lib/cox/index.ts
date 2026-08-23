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
  COX_IL_COMPANY,
  buildCoxIlContractHtml,
  coxIlAddressBlock,
  coxIlFooterLine,
  emptyCoxIlContractFields,
  mapCoxIlContractFields,
  splitLossAddress,
  type CoxIlContractFields,
} from "./ilContract";

export {
  CORVUS_PRO_SOLAR,
  COX_MO_SOLAR_COMPANY,
  buildCoxMoSolarContractHtml,
  corvusAddressBlock,
  corvusLicenseDisplay,
  coxMoSolarAddressBlock,
  coxMoSolarFooterLine,
  emptyCoxMoSolarContractFields,
  mapCoxMoSolarContractFields,
  type CoxMoSolarContractFields,
} from "./moSolarContract";
