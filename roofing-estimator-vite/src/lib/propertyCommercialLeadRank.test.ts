import { describe, expect, it } from "vitest";

import {
  addressDedupeKey,
  dedupePropertyImportsByAddress,
  rankCommercialPropertyLeads,
  scoreCommercialRoofingLead,
} from "./propertyCommercialLeadRank";
import { emptyPropertyImportPayload } from "./propertyScraper";

describe("scoreCommercialRoofingLead", () => {
  it("ranks organization + commercial type highly", () => {
    const p = emptyPropertyImportPayload("rentcast", {
      propertyType: "commercial",
      ownerEntityType: "Organization",
      ownerName: "ACME Holdings LLC",
      areaSqFt: "12000",
      ownerPhone: "555-0100",
      ownerEmail: "x@example.com",
      address: "1 Main St, Dallas, TX 75201",
      stateCode: "TX",
    });
    const { score, reasons } = scoreCommercialRoofingLead(p, { ownerPortfolioCount: 5 });
    expect(score).toBeGreaterThanOrEqual(60);
    expect(reasons.join(" ")).toMatch(/Commercial|Organization|portfolio/i);
  });
});

describe("dedupePropertyImportsByAddress", () => {
  it("merges duplicate normalized addresses", () => {
    const a = emptyPropertyImportPayload("csv-upload", {
      address: "100 Oak St, Austin, TX 78701",
      ownerPhone: "111",
      stateCode: "TX",
    });
    const b = emptyPropertyImportPayload("csv-upload", {
      address: "100 Oak St, Austin, TX 78701",
      ownerPhone: "222",
      ownerEmail: "pm@example.com",
      stateCode: "TX",
    });
    const out = dedupePropertyImportsByAddress([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0]!.ownerPhone).toContain("111");
    expect(out[0]!.ownerPhone).toContain("222");
    expect(out[0]!.ownerEmail).toContain("pm@example.com");
  });
});

describe("rankCommercialPropertyLeads", () => {
  it("sorts higher scores first", () => {
    const weak = emptyPropertyImportPayload("rentcast", {
      address: "9 Z St, Houston, TX",
      stateCode: "TX",
      propertyType: "residential",
      ownerName: "Jane Doe",
    });
    const strong = emptyPropertyImportPayload("rentcast", {
      address: "1 A St, Houston, TX",
      stateCode: "TX",
      propertyType: "commercial",
      ownerEntityType: "Organization",
      ownerName: "Big Roof Partners LLC",
      areaSqFt: "20000",
    });
    const ranked = rankCommercialPropertyLeads([weak, strong]);
    expect(ranked[0]!.address).toContain("1 A St");
    expect(ranked[0]!.leadScore).toBeGreaterThan(ranked[1]!.leadScore ?? 0);
  });

  it("assigns shared owner portfolio counts", () => {
    const same = "Same Owner LLC";
    const r1 = emptyPropertyImportPayload("rentcast", {
      address: "10 A St, Dallas, TX",
      ownerName: same,
      stateCode: "TX",
    });
    const r2 = emptyPropertyImportPayload("rentcast", {
      address: "20 B St, Dallas, TX",
      ownerName: same,
      stateCode: "TX",
    });
    const ranked = rankCommercialPropertyLeads([r1, r2]);
    expect(ranked[0]!.ownerPortfolioCount).toBe(2);
    expect(ranked[1]!.ownerPortfolioCount).toBe(2);
  });
});

describe("addressDedupeKey", () => {
  it("normalizes punctuation", () => {
    expect(addressDedupeKey("100 Oak St., Austin TX 78701")).toBe(
      addressDedupeKey("100 oak st austin tx 78701"),
    );
  });
});
