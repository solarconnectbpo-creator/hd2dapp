import { describe, expect, it } from "vitest";
import {
  extractParcelAutoFill,
  extractOwnerFromParcel,
  mergeParcelAttributes,
} from "./canvassingParcelOwner";

describe("mergeParcelAttributes", () => {
  it("lets Missouri Intel win on same key as GIS (normalized assessor data)", () => {
    const m = mergeParcelAttributes({ PIN: "1", OWNER_NAME: "From Intel" }, { OWNER_NAME: "From GIS", TAX_NAME: "Alt" });
    expect(m?.OWNER_NAME).toBe("From Intel");
    expect(m?.TAX_NAME).toBe("Alt");
  });

  it("does not let empty Intel owner wipe non-empty GIS owner", () => {
    const m = mergeParcelAttributes({ OWNER_NAME: "" }, { OWNER_NAME: "From GIS", PIN: "99" });
    expect(m?.OWNER_NAME).toBe("From GIS");
    expect(m?.PIN).toBe("99");
  });

  it("does not let placeholder Intel owner wipe non-empty GIS owner", () => {
    const m = mergeParcelAttributes({ OWNER_NAME: "UNKNOWN" }, { OWNER_NAME: "CROSSFACE LLC", PIN: "1" });
    expect(m?.OWNER_NAME).toBe("CROSSFACE LLC");
    expect(m?.PIN).toBe("1");
  });

  it("returns Intel-only when no overlay", () => {
    expect(mergeParcelAttributes({ A: "1" }, null)).toEqual({ A: "1" });
  });
});

describe("extractOwnerFromParcel", () => {
  it("reads common ArcGIS owner keys", () => {
    expect(extractOwnerFromParcel({ OWNER_NAME: "Jane Doe LLC" })).toBe("Jane Doe LLC");
  });

  it("does not use mailing / site address fields as owner", () => {
    expect(
      extractOwnerFromParcel({
        OWNER_ADDRESS: "123 Main St",
        OWNER_NAME: "Right Name LLC",
      }),
    ).toBe("Right Name LLC");
    expect(extractOwnerFromParcel({ OWNER_MAILING_LINE1: "PO Box 1" })).toBe("");
  });

  it("rejects placeholder owner values", () => {
    expect(extractOwnerFromParcel({ OWNER_NAME: "UNKNOWN" })).toBe("");
  });
});

describe("extractParcelAutoFill", () => {
  it("pulls phone and sqft heuristics", () => {
    const x = extractParcelAutoFill({
      OWNER_NAME: "Acme",
      OWNER_PHONE: "314-555-0100",
      BLDG_SQFT: 4200,
    });
    expect(x.ownerName).toContain("Acme");
    expect(x.ownerPhone).toBe("(314) 555-0100");
    expect(x.areaSqFt).toBe("4200");
  });

  it("does not treat price-per-square or geometry area as building sq ft", () => {
    const x = extractParcelAutoFill({
      PRICE_PER_SQUARE: 125,
      Shape_Area: 5000,
      BLDG_SQFT: 2200,
    });
    expect(x.areaSqFt).toBe("2200");
  });

  it("does not use tax year as year built", () => {
    const x = extractParcelAutoFill({
      TAX_YEAR: 2024,
      YEAR_BUILT: 1998,
    });
    expect(x.yearBuilt).toBe("1998");
  });
});
