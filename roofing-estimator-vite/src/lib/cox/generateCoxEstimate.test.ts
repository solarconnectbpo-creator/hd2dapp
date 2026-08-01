import { describe, expect, it } from "vitest";
import { coxResultToHd2dEstimateLines, generateCoxEstimate } from "./generateCoxEstimate";

describe("generateCoxEstimate", () => {
  it("prices one-story shingles with tear-off and tiers", () => {
    const result = generateCoxEstimate({
      roofArea: 2000,
      pitch: "6:12",
      buildingType: "oneStory",
      roofSystem: "shingles",
      tearOffLayers: 1,
      projectName: "Test Job",
    });

    expect(result.squares).toBe(20);
    expect(result.basePricePerSquare).toBe(575);
    expect(result.materialCost).toBe(11500);
    expect(result.tearOffCost).toBe(1600);
    expect(result.totalBasePrice).toBe(13100);
    expect(result.estimate.subtotal.better).toBe(13100);
    expect(result.estimate.total.better).toBe(14148);
  });

  it("applies TPO override", () => {
    const result = generateCoxEstimate({
      roofArea: 1000,
      pitch: "2:12",
      buildingType: "twoStory",
      roofSystem: "tpo60mil",
      tearOffLayers: 0,
    });
    expect(result.basePricePerSquare).toBe(1775);
    expect(result.materialCost).toBe(17750);
  });

  it("maps a tier into HD2D estimate lines that sum to subtotal", () => {
    const result = generateCoxEstimate({
      roofArea: 2000,
      pitch: "6:12",
      buildingType: "oneStory",
      roofSystem: "shingles",
      tearOffLayers: 1,
    });
    const lines = coxResultToHd2dEstimateLines(result, "good");
    const matSum = lines.materials.reduce((s, m) => s + m.totalCost, 0);
    expect(Math.round(matSum * 100) / 100).toBe(lines.subtotal);
    expect(lines.total).toBe(result.estimate.total.good);
  });

  it("accepts slash pitch and prices two-story bands", () => {
    const result = generateCoxEstimate({
      roofArea: 1000,
      pitch: "9/12",
      buildingType: "twoStory",
      roofSystem: "shingles",
      tearOffLayers: 0,
    });
    expect(result.pitch).toBe("9:12");
    expect(result.basePricePerSquare).toBe(750);
  });
});
