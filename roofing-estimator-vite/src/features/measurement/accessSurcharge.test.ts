import { describe, expect, it } from "vitest";
import {
  accessSurchargeLabel,
  accessSurchargePerSquare,
  heightSurchargeTier,
  steepSurchargeTier,
} from "./accessSurcharge";

describe("steepSurchargeTier", () => {
  it("returns null for walkable pitches below 4/12", () => {
    expect(steepSurchargeTier(0)).toBeNull();
    expect(steepSurchargeTier(3.99)).toBeNull();
  });

  it("buckets pitches into the right tier", () => {
    expect(steepSurchargeTier(4)).toBe("4-6");
    expect(steepSurchargeTier(6.9)).toBe("4-6");
    expect(steepSurchargeTier(7)).toBe("7-9");
    expect(steepSurchargeTier(9.9)).toBe("7-9");
    expect(steepSurchargeTier(10)).toBe("10+");
    expect(steepSurchargeTier(18)).toBe("10+");
  });

  it("returns null for missing or non-finite input", () => {
    expect(steepSurchargeTier(null)).toBeNull();
    expect(steepSurchargeTier(undefined)).toBeNull();
    expect(steepSurchargeTier(Number.NaN)).toBeNull();
  });
});

describe("heightSurchargeTier", () => {
  it("returns null for a single story", () => {
    expect(heightSurchargeTier(1)).toBeNull();
    expect(heightSurchargeTier(0)).toBeNull();
  });

  it("buckets story counts", () => {
    expect(heightSurchargeTier(2)).toBe("2story");
    expect(heightSurchargeTier(3)).toBe("3story");
    expect(heightSurchargeTier(4)).toBe("4story");
    expect(heightSurchargeTier(9)).toBe("4story");
  });

  it("returns null for missing input", () => {
    expect(heightSurchargeTier(null)).toBeNull();
    expect(heightSurchargeTier(Number.NaN)).toBeNull();
  });
});

describe("accessSurchargePerSquare", () => {
  it("is zero for a walkable single-story roof", () => {
    expect(accessSurchargePerSquare(3, 1)).toBe(0);
    expect(accessSurchargePerSquare(null, null)).toBe(0);
  });

  it("charges steep slope alone", () => {
    expect(accessSurchargePerSquare(8, 1)).toBe(32.0);
  });

  it("charges height alone", () => {
    expect(accessSurchargePerSquare(3, 2)).toBe(8.1);
  });

  it("adds steep and height together", () => {
    expect(accessSurchargePerSquare(12, 3)).toBe(70.5);
    expect(accessSurchargePerSquare(5, 2)).toBe(26.6);
  });

  it("increases monotonically with pitch", () => {
    const flat = accessSurchargePerSquare(3, 1);
    const mid = accessSurchargePerSquare(5, 1);
    const steep = accessSurchargePerSquare(8, 1);
    const steepest = accessSurchargePerSquare(12, 1);
    expect(flat).toBeLessThan(mid);
    expect(mid).toBeLessThan(steep);
    expect(steep).toBeLessThan(steepest);
  });

  it("rounds to cents", () => {
    const v = accessSurchargePerSquare(5, 2);
    expect(Number.isInteger(Math.round(v * 100))).toBe(true);
  });
});

describe("accessSurchargeLabel", () => {
  it("is null when nothing is charged", () => {
    expect(accessSurchargeLabel(3, 1)).toBeNull();
  });

  it("names both drivers when both apply", () => {
    expect(accessSurchargeLabel(12, 3)).toBe("10+/12 pitch + 3-story");
  });

  it("names only the driver that applies", () => {
    expect(accessSurchargeLabel(8, 1)).toBe("7-9/12 pitch");
    expect(accessSurchargeLabel(2, 2)).toBe("2-story");
  });
});
