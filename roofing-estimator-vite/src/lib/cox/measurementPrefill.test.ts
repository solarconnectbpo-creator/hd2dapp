import { describe, expect, it } from "vitest";
import type { Measurement } from "../../context/RoofingContext";
import {
  mapRoofMaterialToCoxSystem,
  mapStoriesToBuildingType,
  measurementToCoxPrefill,
  surfaceAreaFromMeasurement,
} from "./measurementPrefill";
import { generateCoxEstimate } from "./generateCoxEstimate";
import { normalizePitchToColon } from "./normalizePitch";

function baseMeasurement(overrides: Partial<Measurement> = {}): Measurement {
  return {
    id: "m1",
    projectName: "123 Main",
    date: "2026-08-01",
    roofMaterial: "Asphalt Shingle (laminated)",
    roofForm: "gable",
    length: 40,
    width: 50,
    pitch: 6,
    totalArea: 2000,
    wastePercentage: 10,
    adjustedArea: 2200,
    surfaceArea: 2000,
    stories: 2,
    tearOffLayers: 1,
    ...overrides,
  };
}

describe("normalizePitchToColon", () => {
  it("accepts slash and colon forms", () => {
    expect(normalizePitchToColon("6/12").colon).toBe("6:12");
    expect(normalizePitchToColon("6:12").colon).toBe("6:12");
    expect(normalizePitchToColon("8 on 12").colon).toBe("8:12");
  });
});

describe("measurementToCoxPrefill", () => {
  it("uses surface SF before waste and maps stories/system", () => {
    const prefill = measurementToCoxPrefill(
      baseMeasurement({
        roofMaterial: "TPO 60-mil Mechanically Attached",
        stories: 2,
      }),
    );
    expect(prefill.roofArea).toBe(2000);
    expect(prefill.adjustedArea).toBe(2200);
    expect(prefill.pitch).toBe("6:12");
    expect(prefill.buildingType).toBe("twoStory");
    expect(prefill.roofSystem).toBe("tpo60mil");
    expect(prefill.tearOffLayers).toBe(1);
    expect(prefill.measurementId).toBe("m1");
  });

  it("derives surface from waste when surfaceArea missing (legacy)", () => {
    const area = surfaceAreaFromMeasurement(
      baseMeasurement({
        surfaceArea: undefined,
        totalArea: 2200,
        adjustedArea: 2200,
        wastePercentage: 10,
      }),
    );
    expect(area).toBe(2000);
  });

  it("maps materials and stories", () => {
    expect(mapRoofMaterialToCoxSystem("Modified Bitumen – APP")).toBe("modBit");
    expect(mapRoofMaterialToCoxSystem("TPO 45-mil")).toBe("tpo45mil");
    expect(mapStoriesToBuildingType(1)).toBe("oneStory");
    expect(mapStoriesToBuildingType(3)).toBe("threeStory");
  });

  it("feeds Atlas engine without double-counting waste", () => {
    const prefill = measurementToCoxPrefill(baseMeasurement({ stories: 1 }));
    const result = generateCoxEstimate({
      roofArea: prefill.roofArea,
      pitch: "6/12",
      buildingType: prefill.buildingType,
      roofSystem: prefill.roofSystem,
      tearOffLayers: prefill.tearOffLayers,
      projectName: prefill.projectName,
    });
    expect(result.pitch).toBe("6:12");
    expect(result.squares).toBe(20);
    expect(result.basePricePerSquare).toBe(575);
    // Would be 22 SQ / inflated if waste-adjusted area were used.
    expect(result.materialCost).toBe(11500);
  });
});
