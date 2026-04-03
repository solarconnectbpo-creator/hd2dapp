import { describe, expect, it } from "vitest";
import { compareDrawnVsHeuristic } from "./roofTakeoffComparison";

describe("compareDrawnVsHeuristic", () => {
  it("returns rows when area and perimeter are valid", () => {
    const r = compareDrawnVsHeuristic({
      areaSqFt: "2000",
      perimeterFt: "200",
      roofType: "Asphalt Shingle",
      roofStructure: "gable",
      roofPitch: "6/12",
      ridgesFt: "40",
      eavesFt: "80",
      rakesFt: "30",
      valleysFt: "0",
      hipsFt: "0",
    });
    expect(r.rows.length).toBe(5);
    expect(r.rows.some((x) => x.edge === "Ridge")).toBe(true);
  });
});
