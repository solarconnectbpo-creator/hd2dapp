import { describe, expect, it } from "vitest";
import { mergeArcgisFeatureSources } from "./arcgisParcelAtPoint";

describe("mergeArcgisFeatureSources", () => {
  it("keeps REST owner when map has empty string for same key", () => {
    const merged = mergeArcgisFeatureSources(
      { OWNER_NAME: "", SITE_ADDR: "123 Main St" },
      { OWNER_NAME: "Jane Doe", SITE_ADDR: "456 Old Rd" },
    );
    expect(merged).toEqual({ OWNER_NAME: "Jane Doe", SITE_ADDR: "123 Main St" });
  });

  it("uses map value when REST is empty for owner-like key", () => {
    const merged = mergeArcgisFeatureSources(
      { OWNER_NAME: "From Map LLC" },
      { OWNER_NAME: "" },
    );
    expect(merged?.OWNER_NAME).toBe("From Map LLC");
  });

  it("prefers REST when both have non-empty owner-like values", () => {
    const merged = mergeArcgisFeatureSources(
      { TAX_NAME: "Map Wrong Name" },
      { TAX_NAME: "Assessor Correct LLC" },
    );
    expect(merged?.TAX_NAME).toBe("Assessor Correct LLC");
  });

  it("prefers map for non-owner keys when both non-empty", () => {
    const merged = mergeArcgisFeatureSources(
      { SITE_ADDRESS: "123 Clicked St", APN: "map-apn" },
      { SITE_ADDRESS: "999 REST St", APN: "rest-apn" },
    );
    expect(merged).toEqual({ SITE_ADDRESS: "123 Clicked St", APN: "map-apn" });
  });
});
