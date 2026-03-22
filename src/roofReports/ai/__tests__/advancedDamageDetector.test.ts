/**
 * Unit Tests: Advanced Damage Detector
 */

import { describe, expect, it } from "vitest";
import {
  assessDamageAdvanced,
  calculateAggregateSeverity,
  DetectedDamageType,
} from "../advancedDamageDetector";

describe("Advanced Damage Detector", () => {
  describe("assessDamageAdvanced", () => {
    it("should detect no damage when input is empty", () => {
      const result = assessDamageAdvanced(
        { damageTypes: [], severity: 1, notes: "" },
        { roofAge: 5, roofType: "shingle" },
      );
      expect(result.damageDetected).toBe(false);
      expect(result.totalSeverity).toBe(1);
    });

    it("should classify hail damage correctly", () => {
      const result = assessDamageAdvanced(
        { damageTypes: ["hail"], severity: 4, notes: "Hail damage visible" },
        { roofAge: 5, roofType: "shingle", imageQuality: "high" },
      );
      expect(result.damageDetected).toBe(true);
      expect(result.damageTypes[0].label).toBe("hail");
      expect(result.damageTypes[0].severity).toBeGreaterThanOrEqual(3);
    });

    it("should identify risk factors for old roofs", () => {
      const result = assessDamageAdvanced(
        { damageTypes: ["aging"], severity: 2, notes: "Aging roof" },
        { roofAge: 25, roofType: "shingle" },
      );
      expect(result.riskFactors.length).toBeGreaterThan(0);
      expect(result.riskFactors[0]).toContain("age");
    });

    it("should generate recommendations based on severity", () => {
      const result = assessDamageAdvanced(
        {
          damageTypes: ["hail", "wind"],
          severity: 5,
          notes: "Major storm damage",
        },
        { roofAge: 5, roofType: "shingle" },
      );
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]).toContain("URGENT");
    });

    it("should incorporate weather context", () => {
      const result = assessDamageAdvanced(
        { damageTypes: ["hail"], severity: 3, notes: "Possible hail" },
        { roofAge: 5, roofType: "shingle" },
        { hailSwathProbability: 0.9 },
      );
      expect(result.damageTypes[0].confidence).toBeGreaterThan(0.8);
    });
  });

  describe("calculateAggregateSeverity", () => {
    it("should return 1 for no damage types", () => {
      expect(calculateAggregateSeverity([])).toBe(1);
    });

    it("should weight severity by confidence", () => {
      const damageTypes: DetectedDamageType[] = [
        {
          label: "hail",
          confidence: 0.9,
          severity: 5,
          description: "High confidence hail damage",
        },
        {
          label: "wind",
          confidence: 0.3,
          severity: 2,
          description: "Low confidence wind damage",
        },
      ];
      const result = calculateAggregateSeverity(damageTypes);
      expect(result).toBeGreaterThan(3);
      expect(result).toBeLessThanOrEqual(5);
    });
  });
});
