import { describe, expect, it } from "vitest";

import {
  extractUsPhonesFromText,
  mergeOwnerNameFromManualResearch,
  mergePhonesFromManualResearch,
} from "./propertyClipboardContactMerge";
import { emptyPropertyImportPayload } from "./propertyScraper";

describe("extractUsPhonesFromText", () => {
  it("finds multiple US numbers", () => {
    const t = "Call (555) 123-4567 or 555.987.6543 ext 2";
    expect(extractUsPhonesFromText(t)).toEqual(["(555) 123-4567", "(555) 987-6543"]);
  });

  it("dedupes same number in different formats", () => {
    const t = "5551234567 and +1 (555) 123-4567";
    expect(extractUsPhonesFromText(t)).toHaveLength(1);
  });
});

describe("mergePhonesFromManualResearch", () => {
  it("merges into contact person phone and leaves main owner phone", () => {
    const p = emptyPropertyImportPayload("rentcast", { ownerPhone: "(111) 111-1111" });
    const next = mergePhonesFromManualResearch(p, ["(222) 222-2222"], "FastPeopleSearch");
    expect(next.ownerPhone).toContain("111");
    expect(next.ownerPhone).not.toContain("222");
    expect(next.contactPersonPhone).toContain("222");
    expect(next.notes).toMatch(/FastPeopleSearch/);
  });
});

describe("mergeOwnerNameFromManualResearch", () => {
  it("sets contact person name without changing deed / company ownerName", () => {
    const p = emptyPropertyImportPayload("rentcast", { ownerName: "OLD LLC" });
    const next = mergeOwnerNameFromManualResearch(p, "Jane Manager", "FPS");
    expect(next.ownerName).toBe("OLD LLC");
    expect(next.contactPersonName).toBe("Jane Manager");
    expect(next.notes).toMatch(/FPS/);
  });
});
