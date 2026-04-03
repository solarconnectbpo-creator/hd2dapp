import { describe, expect, it } from "vitest";
import { getComplianceReferencesForCategory } from "./roofComplianceReferences";

describe("getComplianceReferencesForCategory", () => {
  it("returns asphalt-heavy list for asphalt", () => {
    const refs = getComplianceReferencesForCategory("asphalt");
    expect(refs.some((s) => s.includes("R905.2"))).toBe(true);
  });
  it("returns single-ply refs for tpo", () => {
    const refs = getComplianceReferencesForCategory("tpo");
    expect(refs.some((s) => s.includes("D6878"))).toBe(true);
  });
});
