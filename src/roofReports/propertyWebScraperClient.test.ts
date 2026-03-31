import { describe, expect, it } from "vitest";

import {
  normalizePropertyScraperListing,
  scoreListingCommercialRoofingSignal,
} from "./propertyWebScraperClient";

describe("normalizePropertyScraperListing", () => {
  it("extracts address + coordinates from common payload shape", () => {
    const raw = {
      data: {
        address: "123 Main St, St Louis, MO",
        latitude: 38.627,
        longitude: -90.1994,
        area_sqft: 2400,
        price: "$450,000",
      },
    };
    const out = normalizePropertyScraperListing("https://example.com/x", raw);
    expect(out.address).toBe("123 Main St, St Louis, MO");
    expect(out.lat).toBe(38.627);
    expect(out.lng).toBe(-90.1994);
    expect(out.areaSqFt).toBe(2400);
    expect(out.priceText).toBe("$450,000");
  });

  it("composes nested location address and deep coordinates", () => {
    const raw = {
      data: {
        location: {
          streetAddress: "500 Market St",
          city: "San Francisco",
          state: "CA",
          postalCode: "94105",
        },
        geo: {
          latitude: "37.7936",
          longitude: "-122.3965",
        },
      },
    };
    const out = normalizePropertyScraperListing("https://example.com/y", raw);
    expect(out.address).toContain("500 Market St");
    expect(out.address).toContain("San Francisco");
    expect(out.lat).toBe(37.7936);
    expect(out.lng).toBe(-122.3965);
  });

  it("unwraps PropertyWebScraper public_api envelope (listings[0])", () => {
    const raw = {
      success: true,
      listings: [
        {
          import_url: "https://example.com/z",
          address_string: "10 Example Rd, Austin, TX 78701",
          latitude: 30.27,
          longitude: -97.74,
          constructed_area: 1800,
          count_bedrooms: 3,
          count_bathrooms: 2,
          price_string: "$525,000",
          title: "Nice house",
        },
      ],
    };
    const out = normalizePropertyScraperListing("https://example.com/z", raw);
    expect(out.address).toBe("10 Example Rd, Austin, TX 78701");
    expect(out.lat).toBe(30.27);
    expect(out.lng).toBe(-97.74);
    expect(out.areaSqFt).toBe(1800);
    expect(out.beds).toBe(3);
    expect(out.baths).toBe(2);
    expect(out.priceText).toBe("$525,000");
    expect(out.title).toBe("Nice house");
  });

  it("treats 0,0 coordinates as missing (empty scrape)", () => {
    const raw = {
      success: true,
      listings: [{ latitude: 0, longitude: 0, address_string: "" }],
    };
    const out = normalizePropertyScraperListing("https://example.com/bad", raw);
    expect(out.lat).toBeUndefined();
    expect(out.lng).toBeUndefined();
  });

  it("attaches listingLeadScore when listing text is commercial", () => {
    const raw = {
      success: true,
      listings: [
        {
          title: "Industrial warehouse",
          address_string: "200 Warehouse Rd, TX",
          latitude: 32,
          longitude: -96,
          constructed_area: 50_000,
          property_type: "Industrial",
          description: "NNN investment opportunity strip center",
        },
      ],
    };
    const out = normalizePropertyScraperListing("https://example.com/comm", raw);
    expect(out.listingLeadScore).toBeGreaterThan(35);
    expect(out.commercialSignals?.length).toBeGreaterThan(0);
  });
});

describe("scoreListingCommercialRoofingSignal", () => {
  it("scores retail keywords and large sqft", () => {
    const { score, signals } = scoreListingCommercialRoofingSignal({
      title: "Retail plaza",
      textBlob: "mixed use medical office",
      areaSqFt: 15_000,
    });
    expect(score).toBeGreaterThan(25);
    expect(signals.length).toBeGreaterThan(0);
  });
});
