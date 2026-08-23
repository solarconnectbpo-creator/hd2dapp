/**
 * Cox Solar — Missouri proposal-contract letterhead and licensed EC of record.
 *
 * Electrical installation work is performed under Corvus Pro Solar LLP's
 * Missouri electrical contractor (EC) license. Confirm the current license
 * number on MOPRO (https://mopro.mo.gov/license/s/license-search) before
 * issuing a live contract. This pack is a form template, not legal advice.
 */

export const COX_MO_SOLAR_COMPANY = {
  legalName: "Cox Solar",
  shortName: "Cox Solar",
  tagline: "Solar and Energy Systems • Energy Management",
  establishedLine: "Selling Environmentally-Friendly Products",
  motto: "The Freedom to Produce Your Own Energy",
  addressLine1: "700 Commerce Dr, Suite 500",
  cityStateZip: "Oak Brook, IL 60523",
  phoneDisplay: "(877) 816-4245",
  email: "info@coxroof.com",
  website: "COXROOF.COM",
  venueState: "Missouri",
} as const;

export const CORVUS_PRO_SOLAR = {
  legalName: "Corvus Pro Solar LLP",
  shortName: "Corvus Pro Solar",
  addressLine1: "4665 Pfeiffer Court",
  cityStateZip: "Springfield, MO 65803",
  phoneDisplay: "(417) 988-4300",
  website: "corvusprosolar.com",
  /**
   * Missouri statewide electrical contractor (EC) license number.
   * Leave blank to print a fill-in line. Set this once the current MOPRO
   * number is confirmed.
   */
  ecLicenseNumber: "",
  licenseType: "Missouri Statewide Electrical Contractor (EC)",
  masterElectrician: "Ron Kendall",
} as const;

export function coxMoSolarAddressBlock(): string {
  return `${COX_MO_SOLAR_COMPANY.addressLine1} | ${COX_MO_SOLAR_COMPANY.cityStateZip}`;
}

export function coxMoSolarFooterLine(): string {
  const license = CORVUS_PRO_SOLAR.ecLicenseNumber.trim() || "EC Lic. on file";
  return `${COX_MO_SOLAR_COMPANY.legalName} | ${coxMoSolarAddressBlock()} | ${COX_MO_SOLAR_COMPANY.phoneDisplay} | Licensed EC: ${CORVUS_PRO_SOLAR.legalName} (${license})`;
}

export function corvusAddressBlock(): string {
  return `${CORVUS_PRO_SOLAR.addressLine1} | ${CORVUS_PRO_SOLAR.cityStateZip}`;
}

export function corvusLicenseDisplay(override?: string): string {
  const n = (override || CORVUS_PRO_SOLAR.ecLicenseNumber || "").trim();
  return n || "________________";
}
