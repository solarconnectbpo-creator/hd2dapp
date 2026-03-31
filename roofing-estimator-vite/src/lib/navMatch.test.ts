import { describe, expect, it } from "vitest";
import { isNavActive } from "./navMatch";

describe("isNavActive", () => {
  it("matches dashboard only at root", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/", "/estimates")).toBe(false);
  });

  it("matches exact and nested paths", () => {
    expect(isNavActive("/measurement/new", "/measurement/new")).toBe(true);
    expect(isNavActive("/canvassing", "/canvassing")).toBe(true);
  });
});
