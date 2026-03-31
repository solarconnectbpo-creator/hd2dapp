import { describe, expect, it } from "vitest";

import { parsePropertyContactsCsv, parsePropertyContactsCsvAsync } from "./propertyContactsCsv";

describe("parsePropertyContactsCsv", () => {
  it("combines contact name and company when both columns exist", () => {
    const csv =
      "Contact Name,Company,Address\n" + "Jane Doe,Acme Holdings LLC,100 Oak St, Austin, TX 78701";
    const r = parsePropertyContactsCsv(csv);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows[0]!.ownerName).toContain("Jane");
      expect(r.rows[0]!.ownerName).toContain("Acme");
    }
  });

  it("merges registered agent and brokerage lines into notes", () => {
    const csv =
      "Address,Registered Agent,Brokerage,Notes\n" +
      '"123 Main St, Austin, TX 78701",John Agent LLC,Big Realty Co,Assessor verified';
    const r = parsePropertyContactsCsv(csv);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows[0]!.notes).toMatch(/SOS|registered agent/i);
      expect(r.rows[0]!.notes).toContain("Big Realty");
      expect(r.rows[0]!.notes).toContain("Assessor");
    }
  });

  it("reads contact_person_name and contact_person_phone", () => {
    const csv =
      "property_address,contact_person_name,contact_person_phone,phone,state_code\n" +
      '"1 Oak, Austin, TX 78701",Alex Morgan,(512) 555-0200,(512) 555-0100,TX';
    const r = parsePropertyContactsCsv(csv);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows[0]!.contactPersonName).toBe("Alex Morgan");
      expect(r.rows[0]!.contactPersonPhone).toContain("555-0200");
      expect(r.rows[0]!.ownerPhone).toContain("555-0100");
    }
  });

  it("reads owner_mailing_address and owner_entity_type headers", () => {
    const csv =
      "property_address,owner_mailing_address,owner_entity_type,state_code\n" +
      '"1 Oak, Austin, TX 78701","PO Box 1, Austin, TX 78710",Organization,TX';
    const r = parsePropertyContactsCsv(csv);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows[0]!.ownerMailingAddress).toContain("PO Box");
      expect(r.rows[0]!.ownerEntityType).toBe("Organization");
    }
  });
});

describe("parsePropertyContactsCsvAsync", () => {
  it("matches sync parse for a small file", async () => {
    const csv = "Address,Owner\n" + '"1 A St, Boston, MA 02101","PM LLC"';
    const sync = parsePropertyContactsCsv(csv);
    const asyncR = await parsePropertyContactsCsvAsync(csv, { yieldEvery: 1 });
    expect(sync.ok).toBe(true);
    expect(asyncR.ok).toBe(true);
    if (sync.ok && asyncR.ok) {
      expect(asyncR.rows.length).toBe(sync.rows.length);
      expect(asyncR.rows[0]!.address).toBe(sync.rows[0]!.address);
      expect(asyncR.rows[0]!.ownerName).toBe(sync.rows[0]!.ownerName);
    }
  });
});
