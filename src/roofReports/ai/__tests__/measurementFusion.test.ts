/**
 * Unit Tests: Measurement Fusion
 */

import { describe, expect, it } from "vitest";
import {
  fuseMeasurements,
  calculateImprovedConfidence,
  MeasurementSource,
} from "../measurementFusion";

describe("Measurement Fusion", () => {
  describe("fuseMeasurements", () => {
    it("should return empty result for no sources", () => {
      const result = fuseMeasurements([]);
      expect(result.confidence).toBe(0);
      expect(result.sourcesUsed).toHaveLength(0);
    });

    it("should use top confidence source when confidence > 0.85", () => {
      const sources: MeasurementSource[] = [
        {
          areaSqFt: 1000,
          confidence: 0.9,
          source: "ai-vision",
          timestamp: Date.now(),
        },
        {
          areaSqFt: 950,
          confidence: 0.7,
          source: "user-trace",
          timestamp: Date.now(),
        },
      ];

      const result = fuseMeasurements(sources);
      expect(result.areaSqFt).toBe(1000);
      expect(result.fusionStrategy).toBe("top-confidence");
      expect(result.confidence).toBe(0.9);
    });

    it("should compute weighted average when confidence between 0.7-0.85", () => {
      const sources: MeasurementSource[] = [
        {
          areaSqFt: 1000,
          confidence: 0.8,
          source: "ai-vision",
          timestamp: Date.now(),
        },
        {
          areaSqFt: 1100,
          confidence: 0.75,
          source: "user-trace",
          timestamp: Date.now(),
        },
      ];

      const result = fuseMeasurements(sources);
      expect(result.fusionStrategy).toBe("weighted-average");
      expect(result.areaSqFt).toBeGreaterThan(1000);
      expect(result.areaSqFt).toBeLessThan(1100);
    });

    it("should not dilute area when another high-confidence source omits area", () => {
      const sources: MeasurementSource[] = [
        {
          areaSqFt: 2000,
          confidence: 0.8,
          source: "user-trace",
          timestamp: Date.now(),
        },
        {
          confidence: 0.75,
          source: "aerial-api",
          timestamp: Date.now(),
        },
      ];
      const result = fuseMeasurements(sources);
      expect(result.areaSqFt).toBe(2000);
    });

    it("should fuse pitch as weighted rise/12 when multiple sources disagree", () => {
      const sources: MeasurementSource[] = [
        {
          areaSqFt: 1000,
          pitch: "6/12",
          confidence: 0.8,
          source: "ai-vision",
          timestamp: Date.now(),
        },
        {
          areaSqFt: 1000,
          pitch: "8/12",
          confidence: 0.8,
          source: "user-trace",
          timestamp: Date.now(),
        },
      ];
      const result = fuseMeasurements(sources);
      expect(result.pitch).toBe("7/12");
    });

    it("should detect significant discrepancies", () => {
      const sources: MeasurementSource[] = [
        {
          areaSqFt: 1000,
          confidence: 0.8,
          source: "ai-vision",
          timestamp: Date.now(),
        },
        {
          areaSqFt: 1500,
          confidence: 0.75,
          source: "user-trace",
          timestamp: Date.now(),
        },
      ];

      const result = fuseMeasurements(sources, { discrepancyThreshold: 0.15 });
      expect(result.discrepancies).toBeDefined();
      expect(result.discrepancies?.length).toBeGreaterThan(0);
    });

    it("should filter out low-confidence sources", () => {
      const sources: MeasurementSource[] = [
        {
          areaSqFt: 1000,
          confidence: 0.6,
          source: "ai-vision",
          timestamp: Date.now(),
        },
        {
          areaSqFt: 1100,
          confidence: 0.5,
          source: "user-trace",
          timestamp: Date.now(),
        },
      ];

      const result = fuseMeasurements(sources, { minConfidenceThreshold: 0.7 });
      expect(result.confidence).toBe(0);
      expect(result.discrepancies?.length).toBeGreaterThan(0);
    });
  });

  describe("calculateImprovedConfidence", () => {
    it("should return 0 for no sources", () => {
      expect(calculateImprovedConfidence([])).toBe(0);
    });

    it("should return source confidence for single source", () => {
      const sources: MeasurementSource[] = [
        {
          areaSqFt: 1000,
          confidence: 0.85,
          source: "ai-vision",
          timestamp: Date.now(),
        },
      ];
      expect(calculateImprovedConfidence(sources)).toBe(0.85);
    });

    it("should boost confidence with multiple sources", () => {
      const sources: MeasurementSource[] = [
        {
          areaSqFt: 1000,
          confidence: 0.8,
          source: "ai-vision",
          timestamp: Date.now(),
        },
        {
          areaSqFt: 1000,
          confidence: 0.8,
          source: "user-trace",
          timestamp: Date.now(),
        },
        {
          areaSqFt: 1000,
          confidence: 0.8,
          source: "aerial-api",
          timestamp: Date.now(),
        },
      ];
      const improved = calculateImprovedConfidence(sources);
      expect(improved).toBeGreaterThan(0.8);
      expect(improved).toBeLessThanOrEqual(0.99);
    });
  });
});
