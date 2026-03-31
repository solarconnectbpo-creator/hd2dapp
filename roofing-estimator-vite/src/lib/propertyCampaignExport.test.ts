import { describe, expect, it } from "vitest";

import {
  buildPropertyCampaignCsv,
  CAMPAIGN_CSV_COLUMNS,
  FREE_PUBLIC_RECORDS_CSV_TEMPLATE,
  propertyPayloadToCampaignRow,
} from "./propertyCampaignExport";
import { parsePropertyContactsCsv } from "./propertyContactsCsv";
import { emptyPropertyImportPayload } from "./propertyScraper";

describe("propertyCampaignExport", () => {
  it("maps payloads to campaign columns", () => {
    const p = emptyPropertyImportPayload("rentcast", {
      address: "1 Main St, Dallas, TX 75201",
      stateCode: "TX",
      ownerName: "ACME LLC",
      leadScore: 70,
      ownerPortfolioCount: 3,
    });
    const row = propertyPayloadToCampaignRow(p);
    expect(row.property_address).toBe("1 Main St, Dallas, TX 75201");
    expect(row.lead_score).toBe("70");
    expect(row.portfolio_count_same_owner).toBe("3");
  });

  it("includes every campaign column in CSV header", () => {
    const csv = buildPropertyCampaignCsv([
      emptyPropertyImportPayload("csv-upload", { address: "A St, Austin, TX 78701", stateCode: "TX" }),
    ]);
    const firstLine = csv.split(/\r?\n/)[0]!;
    for (const col of CAMPAIGN_CSV_COLUMNS) {
      expect(firstLine).toContain(col);
    }
  });

  it("template round-trips through property CSV import", () => {
    const r = parsePropertyContactsCsv(FREE_PUBLIC_RECORDS_CSV_TEMPLATE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows.length).toBeGreaterThanOrEqual(1);
      expect(r.rows[0]!.address).toContain("Example Blvd");
    }
  });

  it("includes street address and phone in CSV for B2B campaign export", () => {
    const p = emptyPropertyImportPayload("rentcast", {
      address: "200 Commerce Dr, Houston, TX 77002",
      stateCode: "TX",
      ownerPhone: "(713) 555-0199",
      ownerName: "Gulf Roofing Holdings LLC",
      ownerEmail: "ops@example.com",
      contactPersonName: "Jordan Lee",
      contactPersonPhone: "(713) 555-0111",
    });
    const csv = buildPropertyCampaignCsv([p]);
    expect(csv).toContain("property_address");
    expect(csv).toContain("phone");
    expect(csv).toContain("contact_person_name");
    expect(csv).toContain("contact_person_phone");
    expect(csv).toContain("200 Commerce Dr, Houston, TX 77002");
    expect(csv).toContain("(713) 555-0199");
    expect(csv).toContain("Jordan Lee");
    expect(csv).toContain("(713) 555-0111");
  });
});
