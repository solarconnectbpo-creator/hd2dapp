/** Fields for the Cox Illinois restoration contract print pack. */

export type CoxIlContractFields = {
  contractDate: string;
  customerName: string;
  primaryPhone: string;
  secondaryPhone: string;
  lossAddress: string;
  cityStateZip: string;
  email: string;
  dateOfLoss: string;
  insuranceCompany: string;
  claimNumber: string;
  notes: string;
  /** Optional contractor signer line (rep name). */
  contractorRepName: string;
};

export function emptyCoxIlContractFields(partial?: Partial<CoxIlContractFields>): CoxIlContractFields {
  return {
    contractDate: partial?.contractDate ?? "",
    customerName: partial?.customerName ?? "",
    primaryPhone: partial?.primaryPhone ?? "",
    secondaryPhone: partial?.secondaryPhone ?? "",
    lossAddress: partial?.lossAddress ?? "",
    cityStateZip: partial?.cityStateZip ?? "",
    email: partial?.email ?? "",
    dateOfLoss: partial?.dateOfLoss ?? "",
    insuranceCompany: partial?.insuranceCompany ?? "",
    claimNumber: partial?.claimNumber ?? "",
    notes: partial?.notes ?? "",
    contractorRepName: partial?.contractorRepName ?? "",
  };
}
