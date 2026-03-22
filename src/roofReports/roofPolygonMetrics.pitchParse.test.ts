import { describe, expect, it } from "vitest";

import { parsePitchRiseRun } from "./roofPolygonMetrics";
import { parseRoofPitchRise } from "./roofLogicEngine";

describe("parsePitchRiseRun", () => {
  it("parses rise:run and preserves ratio", () => {
    expect(parsePitchRiseRun("6:12")).toEqual({ rise: 6, run: 12 });
    expect(parsePitchRiseRun("3 / 12")).toEqual({ rise: 3, run: 12 });
  });

  it("handles non-12 run (normalize via roofLogicEngine)", () => {
    expect(parsePitchRiseRun("3:4")).toEqual({ rise: 3, run: 4 });
    expect(parseRoofPitchRise("3:4")).toBeCloseTo(9, 5);
  });

  it("parses degrees", () => {
    const pr = parsePitchRiseRun("26.57°");
    expect(pr?.run).toBe(12);
    expect(pr?.rise).toBeCloseTo(6, 0);
    expect(parseRoofPitchRise("45°")).toBeCloseTo(12, 0);
  });
});
