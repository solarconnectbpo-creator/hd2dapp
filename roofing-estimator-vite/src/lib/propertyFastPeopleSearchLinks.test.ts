import { describe, expect, it } from "vitest";

import {
  FAST_PEOPLE_SEARCH_HOME_LANG_EN,
  googleSiteSearchFastPeopleUrl,
  primaryOwnerName,
} from "./propertyFastPeopleSearchLinks";

describe("propertyFastPeopleSearchLinks", () => {
  it("uses FPS home with lang=en", () => {
    expect(FAST_PEOPLE_SEARCH_HOME_LANG_EN).toBe("https://www.fastpeoplesearch.com/?lang=en");
  });

  it("extracts primary owner", () => {
    expect(primaryOwnerName("ACME LLC | Jane Doe")).toBe("ACME LLC");
  });

  it("builds encoded Google site search URL", () => {
    const u = googleSiteSearchFastPeopleUrl("Jane Doe Austin TX");
    expect(u).toContain("google.com/search");
    expect(decodeURIComponent(u)).toContain("site:fastpeoplesearch.com");
    expect(decodeURIComponent(u)).toContain("Jane Doe Austin TX");
  });
});
