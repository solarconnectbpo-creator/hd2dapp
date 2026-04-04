import { describe, expect, it } from "vitest";
import {
  extractNestedPropertyRecordFromJson,
  formatAssessorTaxSummaryFromRecord,
  nominatimReverseToAddressCriteria,
  parseUsAddressLineForSearch,
} from "./propertyAddressCriteria";

describe("parseUsAddressLineForSearch", () => {
  it("parses city ST ZIP", () => {
    expect(parseUsAddressLineForSearch("123 Main St, Austin, TX 78701")).toEqual({
      street_address: "123 Main St",
      city: "Austin",
      state: "TX",
      zip_code: "78701",
    });
  });

  it("returns null for unparseable lines", () => {
    expect(parseUsAddressLineForSearch("no commas")).toBeNull();
  });

  it("parses Street, City, ST without ZIP", () => {
    expect(parseUsAddressLineForSearch("123 Main St, Austin, TX")).toEqual({
      street_address: "123 Main St",
      city: "Austin",
      state: "TX",
      zip_code: "",
    });
  });

  it("parses full state name and strips United States suffix (Nominatim display_name)", () => {
    expect(
      parseUsAddressLineForSearch("4521 Oak Ave, St. Louis, Missouri, United States"),
    ).toEqual({
      street_address: "4521 Oak Ave",
      city: "St. Louis",
      state: "MO",
      zip_code: "",
    });
  });

  it("parses City, Full State, ZIP when last segment is ZIP", () => {
    expect(parseUsAddressLineForSearch("4521 Oak Ave, St. Louis, Missouri, 63108")).toEqual({
      street_address: "4521 Oak Ave",
      city: "St. Louis",
      state: "MO",
      zip_code: "63108",
    });
  });
});

describe("extractNestedPropertyRecordFromJson", () => {
  it("accepts slim property-style object (score 2)", () => {
    const root = { hit: { formattedAddress: "9 Oak Ave, Dallas, TX", apn: "R123" } };
    const rec = extractNestedPropertyRecordFromJson(root);
    expect(rec?.formattedAddress).toContain("Dallas");
  });

  it("finds nested property-like object", () => {
    const root = {
      data: {
        properties: [
          {
            formattedAddress: "1 Test Rd, X, YZ 11111",
            squareFootage: 1200,
            ownerName: "ACME LLC",
          },
        ],
      },
    };
    const rec = extractNestedPropertyRecordFromJson(root);
    expect(rec?.formattedAddress).toBe("1 Test Rd, X, YZ 11111");
  });
});

describe("nominatimReverseToAddressCriteria", () => {
  it("maps structured reverse payload with full state name", () => {
    const parsed = nominatimReverseToAddressCriteria({
      display_name: "1600 Pennsylvania Avenue NW, Washington, District of Columbia 20500, United States",
      address: {
        house_number: "1600",
        road: "Pennsylvania Avenue NW",
        city: "Washington",
        state: "District of Columbia",
        postcode: "20500",
      },
    });
    expect(parsed).toEqual({
      street_address: "1600 Pennsylvania Avenue NW",
      city: "Washington",
      state: "DC",
      zip_code: "20500",
    });
  });
});

describe("formatAssessorTaxSummaryFromRecord", () => {
  it("formats common assessor fields", () => {
    const out = formatAssessorTaxSummaryFromRecord({
      apn: "A-123",
      county: "Dallas",
      assessedValue: 250000,
      annualTax: 5100,
      taxYear: 2025,
    });
    expect(out).toContain("APN / Parcel: A-123");
    expect(out).toContain("Assessed value: 250000");
    expect(out).toContain("Annual / tax amount: 5100");
  });
});
