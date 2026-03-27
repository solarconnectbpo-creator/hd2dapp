import { describe, expect, it } from "vitest";

import {
  flattenMeasurementsForExport,
  roofMeasurementsHaveContent,
} from "./roofMeasurementsMerge";

describe("flattenMeasurementsForExport", () => {
  it("uses manual sq ft when trace never wrote roofAreaSqFt", () => {
    const out = flattenMeasurementsForExport({}, "2400", undefined);
    expect(out.roofAreaSqFt).toBe(2400);
    expect(roofMeasurementsHaveContent(out)).toBe(true);
  });

  it("falls back to estimate roofAreaSqFt when measurements lack area", () => {
    const out = flattenMeasurementsForExport({}, "", 3100);
    expect(out.roofAreaSqFt).toBe(3100);
  });
});
