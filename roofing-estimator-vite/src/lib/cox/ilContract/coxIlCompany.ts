/** Cox Roofing & Restoration — Illinois office (contract notices & venue). */

export const COX_IL_COMPANY = {
  legalName: "Cox Roofing & Restoration LLC",
  shortName: "Cox Roofing",
  addressLine1: "700 Commerce Dr, Suite 500",
  cityStateZip: "Oak Brook, IL 60523",
  phoneDisplay: "(877) 816-4245",
  phoneE164: "+18778164245",
  website: "COXROOF.COM",
  /** Oak Brook is in DuPage County. */
  venueCounty: "DuPage County",
  venueState: "Illinois",
} as const;

export function coxIlAddressBlock(): string {
  return `${COX_IL_COMPANY.addressLine1} | ${COX_IL_COMPANY.cityStateZip}`;
}

export function coxIlFooterLine(): string {
  return `${COX_IL_COMPANY.legalName} | ${coxIlAddressBlock()} | Phone: ${COX_IL_COMPANY.phoneDisplay} | ${COX_IL_COMPANY.website}`;
}
