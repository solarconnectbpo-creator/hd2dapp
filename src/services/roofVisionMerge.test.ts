import { describe, expect, it } from "vitest";

import { mergeGptWithVisionDamage } from "@/services/roofVisionMerge";

describe("mergeGptWithVisionDamage", () => {
  const gpt = {
    damageTypes: ["Wind" as const],
    severity: 2 as const,
    recommendedAction: "Repair" as const,
    notes: "GPT note",
    summary: "Summary",
  };

  it("returns GPT when vision errors", () => {
    expect(
      mergeGptWithVisionDamage(gpt, { success: false, error: "fail" }),
    ).toEqual(gpt);
  });

  it("merges types and max severity from vision", () => {
    const out = mergeGptWithVisionDamage(gpt, {
      damageTypes: ["Hail"],
      severity: 4,
      provider: "roboflow",
      confidence: 0.9,
      recommendedAction: "Insurance Claim Help",
      notes: "hail strip",
    });
    expect(out.damageTypes).toContain("Hail");
    expect(out.damageTypes).toContain("Wind");
    expect(out.severity).toBe(4);
    expect(out.recommendedAction).toBe("Insurance Claim Help");
    expect(out.notes).toContain("Vision (roboflow)");
  });

  it("keeps GPT action when vision is stub", () => {
    const out = mergeGptWithVisionDamage(gpt, {
      provider: "stub",
      damageTypes: ["Hail"],
      severity: 3,
      recommendedAction: "Further Inspection",
      confidence: 0.5,
    });
    expect(out.recommendedAction).toBe("Repair");
    expect(out.notes).toContain("Vision (stub)");
  });

  it("merges when vision has only segmentation (no damage fields)", () => {
    const out = mergeGptWithVisionDamage(gpt, {
      provider: "detectron2",
      segmentation: {
        polygonCount: 4,
        totalAreaPx: 12000,
        imageWidth: 1024,
        imageHeight: 768,
      },
    });
    expect(out.notes).toContain("Vision (detectron2)");
  });
});
