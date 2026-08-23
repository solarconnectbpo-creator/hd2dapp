/** Fields for the Cox Solar Missouri proposal-contract print pack. */

export type CoxMoSolarContractFields = {
  contractDate: string;
  customerName: string;
  homePhone: string;
  cellPhone: string;
  email: string;
  streetAddress: string;
  cityStateZip: string;
  county: string;
  /** Scope / system specifications shown on the proposal face. */
  specifications: string;
  /** Numeric or formatted contract price (e.g. "24500" or "$24,500"). */
  contractSum: string;
  paymentTerms: string;
  warranty: string;
  exclusions: string;
  financingNotes: string;
  utilityName: string;
  systemSizeKw: string;
  panelCount: string;
  inverter: string;
  contractorRepName: string;
  /** Optional override of Corvus Pro Solar's Missouri EC license number. */
  ecLicenseNumber: string;
};

export function emptyCoxMoSolarContractFields(
  partial?: Partial<CoxMoSolarContractFields>,
): CoxMoSolarContractFields {
  return {
    contractDate: partial?.contractDate ?? "",
    customerName: partial?.customerName ?? "",
    homePhone: partial?.homePhone ?? "",
    cellPhone: partial?.cellPhone ?? "",
    email: partial?.email ?? "",
    streetAddress: partial?.streetAddress ?? "",
    cityStateZip: partial?.cityStateZip ?? "",
    county: partial?.county ?? "",
    specifications: partial?.specifications ?? "",
    contractSum: partial?.contractSum ?? "",
    paymentTerms: partial?.paymentTerms ?? "",
    warranty: partial?.warranty ?? "",
    exclusions: partial?.exclusions ?? "",
    financingNotes: partial?.financingNotes ?? "",
    utilityName: partial?.utilityName ?? "",
    systemSizeKw: partial?.systemSizeKw ?? "",
    panelCount: partial?.panelCount ?? "",
    inverter: partial?.inverter ?? "",
    contractorRepName: partial?.contractorRepName ?? "",
    ecLicenseNumber: partial?.ecLicenseNumber ?? "",
  };
}
