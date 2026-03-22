/**
 * Unit Tests: User Guidance System
 */

import { describe, expect, it } from "vitest";
import {
  checkMeasurementQuality,
  getPhotoCaptureGuidance,
  getDamageAssessmentGuidance,
} from "../userGuidanceSystem";

describe("User Guidance System", () => {
  describe("checkMeasurementQuality", () => {
    it("should mark as unacceptable when estimates are missing", () => {
      const result = checkMeasurementQuality(
        { areaSqFt: undefined, confidence: 0.8 },
        { areaSqFt: 1000 },
      );
      expect(result.isAcceptable).toBe(false);
      expect(result.score).toBe(0);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("should warn about measurement variance", () => {
      const result = checkMeasurementQuality(
        { areaSqFt: 1000, confidence: 0.8 },
        { areaSqFt: 1600 },
      );
      expect(result.score).toBeLessThan(100);
      expect(result.issues.some((i) => i.id === "measurement-variance")).toBe(
        true,
      );
    });

    it("should warn about low AI confidence", () => {
      const result = checkMeasurementQuality(
        { areaSqFt: 1000, confidence: 0.5 },
        { areaSqFt: 1000 },
      );
      expect(result.issues.some((i) => i.id === "low-ai-confidence")).toBe(
        true,
      );
    });

    it("should mark as acceptable when measurements align", () => {
      const result = checkMeasurementQuality(
        { areaSqFt: 1000, confidence: 0.9 },
        { areaSqFt: 1010 },
      );
      expect(result.isAcceptable).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it("should compare against historical measurements", () => {
      const result = checkMeasurementQuality(
        { areaSqFt: 1000, confidence: 0.8 },
        { areaSqFt: 1000 },
        [{ areaSqFt: 2000 }, { areaSqFt: 1900 }],
      );
      expect(result.issues.some((i) => i.id === "historical-variance")).toBe(
        true,
      );
    });
  });

  describe("getPhotoCaptureGuidance", () => {
    it("should request more photos when count is low", () => {
      const guidance = getPhotoCaptureGuidance(1, "gable", "moderate");
      expect(guidance.some((g) => g.id === "more-photos-needed")).toBe(true);
    });

    it("should provide hip roof specific guidance", () => {
      const guidance = getPhotoCaptureGuidance(2, "hip", "complex");
      expect(guidance.some((g) => g.id === "hip-roof-guidance")).toBe(true);
    });

    it("should not request photos when count is sufficient", () => {
      const guidance = getPhotoCaptureGuidance(5, "gable", "moderate");
      const needsMore = guidance.find((g) => g.id === "more-photos-needed");
      expect(needsMore).toBeUndefined();
    });
  });

  describe("getDamageAssessmentGuidance", () => {
    it("should warn about low photo quality", () => {
      const guidance = getDamageAssessmentGuidance(0.8, "low");
      expect(guidance.some((g) => g.id === "poor-photo-quality")).toBe(true);
    });

    it("should suggest inspection when confidence is low", () => {
      const guidance = getDamageAssessmentGuidance(0.5, "medium");
      expect(guidance.some((g) => g.id === "uncertain-damage")).toBe(true);
    });

    it("should show success message for high confidence", () => {
      const guidance = getDamageAssessmentGuidance(0.9, "high");
      expect(guidance.some((g) => g.id === "confident-damage")).toBe(true);
    });
  });
});
