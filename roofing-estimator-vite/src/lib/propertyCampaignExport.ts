/**
 * Export property / owner rows for outreach (CRM, mail merge, Section 179 campaigns).
 * Import template aligns with free manual sources: county assessor + SOS / registered agent notes.
 */

import Papa from "papaparse";

import { emptyPropertyImportPayload, type PropertyImportPayload } from "./propertyScraper";

/** Columns optimized for spreadsheets + mail merge */
export const CAMPAIGN_CSV_COLUMNS = [
  "property_address",
  "state_code",
  "owner_name_tax_deed",
  "owner_entity_type",
  "pm_or_org_label",
  "owner_mailing_address",
  "phone",
  "email",
  "contact_person_name",
  "contact_person_phone",
  "latitude",
  "longitude",
  "building_sqft",
  "lot_sqft",
  "year_built",
  "property_type",
  "lead_score",
  "portfolio_count_same_owner",
  "data_source",
  "notes",
] as const;

export type CampaignCsvColumn = (typeof CAMPAIGN_CSV_COLUMNS)[number];

function flattenNotes(notes: string): string {
  return notes.replace(/\s*\n\s*/g, " | ").trim();
}

export function propertyPayloadToCampaignRow(p: PropertyImportPayload): Record<CampaignCsvColumn, string> {
  return {
    property_address: p.address,
    state_code: p.stateCode,
    owner_name_tax_deed: p.ownerName,
    owner_entity_type: p.ownerEntityType,
    pm_or_org_label: p.ownerPmEntityLabel ?? "",
    owner_mailing_address: p.ownerMailingAddress,
    phone: p.ownerPhone,
    email: p.ownerEmail,
    contact_person_name: p.contactPersonName ?? "",
    contact_person_phone: p.contactPersonPhone ?? "",
    latitude: p.latitude,
    longitude: p.longitude,
    building_sqft: p.areaSqFt,
    lot_sqft: p.lotSizeSqFt,
    year_built: p.yearBuilt,
    property_type: p.propertyType,
    lead_score: p.leadScore != null ? String(p.leadScore) : "",
    portfolio_count_same_owner: p.ownerPortfolioCount != null ? String(p.ownerPortfolioCount) : "",
    data_source: p.source,
    notes: flattenNotes(p.notes),
  };
}

export function buildPropertyCampaignCsv(rows: PropertyImportPayload[]): string {
  const data = rows.map(propertyPayloadToCampaignRow);
  return Papa.unparse(data, { columns: [...CAMPAIGN_CSV_COLUMNS] });
}

/**
 * Starter CSV for **manual** free research (assessor + SOS / registered agent).
 * Re-import via Property records → Upload CSV.
 */
export const FREE_PUBLIC_RECORDS_CSV_TEMPLATE = buildPropertyCampaignCsv([
  emptyPropertyImportPayload("csv-upload", {
    address: "5500 Example Blvd, Austin, TX 78701",
    stateCode: "TX",
    ownerName: "EXAMPLE HOLDINGS LLC",
    ownerEntityType: "Organization",
    ownerMailingAddress: "PO Box 100, Austin, TX 78710",
    ownerPhone: "(512) 555-0100",
    ownerEmail: "pm@example.com",
    contactPersonName: "Pat Example",
    contactPersonPhone: "(512) 555-0144",
    areaSqFt: "12000",
    lotSizeSqFt: "20000",
    yearBuilt: "1998",
    propertyType: "commercial",
    notes:
      "Replace with your county assessor + Secretary of State data. Add brokerage / rep in phone or email columns as you research (free sources only).",
  }),
]);

export function downloadCsvFile(filename: string, csvText: string): void {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
