import { describe, expect, it } from "vitest";

import { normalizePropertyScraperListing } from "./propertyWebScraperClient";

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
});

