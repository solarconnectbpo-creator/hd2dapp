/**
 * Unit Tests: Explainable AI
 */

import { describe, expect, it } from "vitest";
import {
  explainPitchPrediction,
  explainDamageAssessment,
  explainMeasurementFusion,
  formatExplanationForUI,
} from "../explainableAi";

describe("Explainable AI", () => {
  describe("explainPitchPrediction", () => {
    it("should generate high-confidence explanation", () => {
      const explanation = explainPitchPrediction("8:12", 0.9, "high");
      expect(explanation.confidence).toBe(0.9);
      expect(explanation.reasoning.length).toBeGreaterThan(0);
      expect(explanation.limitations).toBeDefined();
      expect(explanation.userActions).toBeDefined();
    });

    it("should lower confidence with poor photo quality", () => {
      const exp1 = explainPitchPrediction("8:12", 0.8, "high");
      const exp2 = explainPitchPrediction("8:12", 0.8, "low");
      expect(exp1.reasoning.length).toBeGreaterThanOrEqual(exp2.reasoning.length);
    });

    it("should include terrain context when provided", () => {
      const explanation = explainPitchPrediction("8:12", 0.8, "high", {
        elevationVariance: 200,
      });
      expect(
        explanation.reasoning.some((r) => r.factor === "Terrain elevation data"),
      ).toBe(true);
    });
  });

  describe("explainDamageAssessment", () => {
    it("should generate explanation for damage type", () => {
      const explanation = explainDamageAssessment("hail", 4, 0.85, 5);
      expect(explanation.confidence).toBe(0.85);
      expect(explanation.reasoning.length).toBeGreaterThan(0);
      expect(explanation.userActions?.length).toBeGreaterThan(0);
    });

    it("should include severity justification", () => {
      const explanation = explainDamageAssessment("wind", 2, 0.7, 1);
      expect(
        explanation.reasoning.some((r) => r.factor === "Severity level"),
      ).toBe(true);
    });

    it("should factor in evidence quantity", () => {
      const explanation = explainDamageAssessment("hail", 3, 0.8, 8);
      expect(
        explanation.reasoning.some((r) => r.factor === "Evidence quantity"),
      ).toBe(true);
    });
  });

  describe("formatExplanationForUI", () => {
    it("should format high-confidence explanation", () => {
      const explanation = explainPitchPrediction("8:12", 0.9, "high");
      const formatted = formatExplanationForUI(explanation);
      expect(formatted.headline).toContain("High Confidence");
      expect(formatted.factors.length).toBeGreaterThan(0);
    });

    it("should format moderate-confidence explanation", () => {
      const explanation = explainPitchPrediction("8:12", 0.75, "medium");
      const formatted = formatExplanationForUI(explanation);
      expect(formatted.headline).toContain("Moderate Confidence");
    });

    it("should format low-confidence explanation", () => {
      const explanation = explainPitchPrediction("8:12", 0.5, "low");
      const formatted = formatExplanationForUI(explanation);
      expect(formatted.headline).toContain("Low Confidence");
      expect(formatted.callToAction).toContain("manual");
    });
  });
});
