/**
 * Custom Hook: useAIEnhancement
 * Integrates all AI modules into measurement and damage detection flows.
 */

import { useState, useCallback } from "react";
import {
  fuseMeasurements,
  MeasurementSource,
  FusedMeasurement,
} from "../measurementFusion";
import {
  assessDamageAdvanced,
  AdvancedDamageAssessment,
  WeatherContext,
} from "../advancedDamageDetector";
import {
  checkMeasurementQuality,
  GuidanceMessage,
  MeasurementQualityCheck,
} from "../userGuidanceSystem";
import {
  storeCorrectionFeedback,
  AICorrectionFeedback,
  generateFeedbackSummary,
  FeedbackSummary,
} from "../feedbackLoopStorage";
import {
  explainDamageAssessment,
  explainMeasurementFusion,
  AIPredictionExplanation,
} from "../explainableAi";

interface UseAIEnhancementReturn {
  fusedMeasurement: FusedMeasurement | null;
  measurementQuality: MeasurementQualityCheck | null;
  measurementExplanation: AIPredictionExplanation | null;
  fuseMeasurementSources: (sources: MeasurementSource[]) => void;

  damageAssessment: AdvancedDamageAssessment | null;
  damageExplanation: AIPredictionExplanation | null;
  assessDamage: (
    aiVisionResult: {
      damageTypes: string[];
      severity: number;
      notes: string;
    },
    imageMetadata: {
      roofAge?: number;
      roofType?: string;
      imageQuality?: "high" | "medium" | "low";
      angle?: "orthogonal" | "oblique" | "satellite";
    },
    weatherContext?: WeatherContext,
  ) => void;

  guidanceMessages: GuidanceMessage[];
  photoCaptureGuidance: GuidanceMessage[];
  dismissGuidance: (messageId: string) => void;

  recordCorrection: (
    feedback: Omit<AICorrectionFeedback, "id" | "timestamp">,
  ) => Promise<void>;
  feedbackSummary: FeedbackSummary | null;
  loadFeedbackSummary: () => Promise<void>;

  isLoading: boolean;
  isProcessing: boolean;
}

export function useAIEnhancement(): UseAIEnhancementReturn {
  const [fusedMeasurement, setFusedMeasurement] =
    useState<FusedMeasurement | null>(null);
  const [measurementQuality, setMeasurementQuality] =
    useState<MeasurementQualityCheck | null>(null);
  const [measurementExplanation, setMeasurementExplanation] =
    useState<AIPredictionExplanation | null>(null);

  const [damageAssessment, setDamageAssessment] =
    useState<AdvancedDamageAssessment | null>(null);
  const [damageExplanation, setDamageExplanation] =
    useState<AIPredictionExplanation | null>(null);

  const [guidanceMessages, setGuidanceMessages] = useState<GuidanceMessage[]>(
    [],
  );
  const [photoCaptureGuidance, setPhotoCaptureGuidance] = useState<
    GuidanceMessage[]
  >([]);

  const [feedbackSummary, setFeedbackSummary] =
    useState<FeedbackSummary | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fuseMeasurementSources = useCallback((sources: MeasurementSource[]) => {
    setIsProcessing(true);
    try {
      const fused = fuseMeasurements(sources);
      setFusedMeasurement(fused);

      const explanation = explainMeasurementFusion(
        sources.map((s) => ({
          source: s.source,
          value: s.areaSqFt || 0,
          confidence: s.confidence,
        })),
        fused.areaSqFt || 0,
        fused.confidence,
      );
      setMeasurementExplanation(explanation);

      const quality = checkMeasurementQuality(
        { areaSqFt: fused.areaSqFt, confidence: fused.confidence },
        { areaSqFt: fused.areaSqFt },
      );
      setMeasurementQuality(quality);
      setGuidanceMessages(quality.issues);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const assessDamage = useCallback(
    (
      aiVisionResult: {
        damageTypes: string[];
        severity: number;
        notes: string;
      },
      imageMetadata: {
        roofAge?: number;
        roofType?: string;
        imageQuality?: "high" | "medium" | "low";
        angle?: "orthogonal" | "oblique" | "satellite";
      },
      weatherContext?: WeatherContext,
    ) => {
      setIsProcessing(true);
      try {
        const assessment = assessDamageAdvanced(
          aiVisionResult,
          imageMetadata,
          weatherContext,
        );
        setDamageAssessment(assessment);

        const explanation = explainDamageAssessment(
          assessment.damageTypes[0]?.label || "unknown",
          assessment.totalSeverity,
          assessment.overallConfidence,
          assessment.damageTypes.length,
        );
        setDamageExplanation(explanation);
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  const recordCorrection = useCallback(
    async (feedback: Omit<AICorrectionFeedback, "id" | "timestamp">) => {
      try {
        await storeCorrectionFeedback(feedback);
      } catch (error) {
        console.error("Error recording correction:", error);
      }
    },
    [],
  );

  const loadFeedbackSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const summary = await generateFeedbackSummary();
      setFeedbackSummary(summary);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const dismissGuidance = useCallback((messageId: string) => {
    setGuidanceMessages((prev) => prev.filter((m) => m.id !== messageId));
    setPhotoCaptureGuidance((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  return {
    fusedMeasurement,
    measurementQuality,
    measurementExplanation,
    fuseMeasurementSources,
    damageAssessment,
    damageExplanation,
    assessDamage,
    guidanceMessages,
    photoCaptureGuidance,
    dismissGuidance,
    recordCorrection,
    feedbackSummary,
    loadFeedbackSummary,
    isLoading,
    isProcessing,
  };
}
