import { describe, expect, it } from "vitest";
import { computeRoofGeometryFromPlanInputs } from "./roofGeometryFromPolygons";

describe("computeRoofGeometryFromPlanInputs", () => {
  it("computes positive plan area and surface for a 40x25 rectangle with 6/12 pitch", () => {
    const area = 40 * 25;
    const perim = 2 * (40 + 25);
    const g = computeRoofGeometryFromPlanInputs(area, perim, "Asphalt Shingle", "gable", "6/12");
    expect(g).not.toBeNull();
    expect(g!.planAreaSqFt).toBeCloseTo(1000, 0);
    expect(g!.pitchRise).toBe(6);
    const pitchFactor = Math.sqrt(1 + (6 / 12) ** 2);
    expect(g!.surfaceAreaSqFt).toBeCloseTo(1000 * pitchFactor, 0);
  });
});
