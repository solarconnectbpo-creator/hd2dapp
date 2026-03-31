import { describe, expect, it, vi, afterEach } from "vitest";
import {
  extractBatchDataPropertyRecord,
  formatTaxSummaryFromBatchDataRecord,
  fetchBatchDataPropertyByAddress,
  mergeBatchDataIntoPropertyRow,
  nominatimReverseToBatchDataCriteria,
  parseUsAddressLineForBatchData,
} from "./propertyBatchDataLookup";
import { emptyPropertyImportPayload } from "./propertyScraper";

describe("parseUsAddressLineForBatchData", () => {
  it("parses city ST ZIP", () => {
    expect(parseUsAddressLineForBatchData("123 Main St, Austin, TX 78701")).toEqual({
      street_address: "123 Main St",
      city: "Austin",
      state: "TX",
      zip_code: "78701",
    });
  });

  it("returns null for unparseable lines", () => {
    expect(parseUsAddressLineForBatchData("no commas")).toBeNull();
  });

  it("parses Street, City, ST without ZIP", () => {
    expect(parseUsAddressLineForBatchData("123 Main St, Austin, TX")).toEqual({
      street_address: "123 Main St",
      city: "Austin",
      state: "TX",
      zip_code: "",
    });
  });
});

describe("extractBatchDataPropertyRecord", () => {
  it("accepts slim BatchData-style object (score 2)", () => {
    const root = { hit: { formattedAddress: "9 Oak Ave, Dallas, TX", apn: "R123" } };
    const rec = extractBatchDataPropertyRecord(root);
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
    const rec = extractBatchDataPropertyRecord(root);
    expect(rec?.formattedAddress).toBe("1 Test Rd, X, YZ 11111");
  });
});

describe("nominatimReverseToBatchDataCriteria", () => {
  it("maps structured reverse payload with full state name", () => {
    const parsed = nominatimReverseToBatchDataCriteria({
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

describe("formatTaxSummaryFromBatchDataRecord", () => {
  it("formats common assessor fields", () => {
    const out = formatTaxSummaryFromBatchDataRecord({
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

describe("fetchBatchDataPropertyByAddress", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps 200 JSON to payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              results: [
                {
                  formattedAddress: "9 Oak Ave, Dallas, TX 75201",
                  ownerName: "OAK HOLDINGS LLC",
                  squareFootage: 8000,
                },
              ],
            }),
          ),
      }),
    );

    const r = await fetchBatchDataPropertyByAddress("test-key", {
      street_address: "9 Oak Ave",
      city: "Dallas",
      state: "TX",
      zip_code: "75201",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.address).toContain("Dallas");
      expect(r.payload.ownerName).toContain("OAK");
      expect(r.payload.source).toBe("batchdata");
      expect(r.rawRecord).toBeTruthy();
    }
  });

  it("surfaces API error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              status: { code: 403, message: "Insufficient balance." },
            }),
          ),
      }),
    );

    const r = await fetchBatchDataPropertyByAddress("k", {
      street_address: "1 A",
      city: "B",
      state: "TX",
      zip_code: "",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("Insufficient balance");
  });
});

describe("mergeBatchDataIntoPropertyRow", () => {
  it("keeps existing owner when set", () => {
    const base = emptyPropertyImportPayload("csv-upload", {
      address: "1 Main, Austin, TX 78701",
      ownerName: "KEEP ME",
    });
    const api = emptyPropertyImportPayload("batchdata", {
      address: "1 Main St, Austin, TX 78701",
      ownerName: "OTHER LLC",
      areaSqFt: "5000",
    });
    const m = mergeBatchDataIntoPropertyRow(base, api);
    expect(m.ownerName).toBe("KEEP ME");
    expect(m.areaSqFt).toBe("5000");
    expect(m.source).toBe("csv-upload");
  });
});
