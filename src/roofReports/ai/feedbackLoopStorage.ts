/**
 * Feedback Loop Storage & Learning
 * Stores user corrections and feedback for continuous AI improvement.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

function newFeedbackId(): string {
  return `fb_${Date.now()}_${Math.random().toString(16).slice(2, 14)}`;
}

export interface AICorrectionFeedback {
  id: string;
  reportId: string;
  timestamp: number;
  aiPrediction: {
    field: "area" | "pitch" | "damageType" | "severity";
    value: unknown;
    confidence: number;
  };
  userCorrection: {
    value: unknown;
    reason?: string;
  };
  photoUrl?: string;
  roofType?: string;
  propertyContext?: Record<string, unknown>;
  subsequentValidation?: {
    confirmedCorrect: boolean;
    verificationMethod: "field-visit" | "aerial-api" | "user-report";
    timestamp: number;
  };
}

export interface FeedbackSummary {
  totalFeedbackItems: number;
  correctionRate: number;
  accuracyTrend: "improving" | "stable" | "declining";
  topMistakes: Array<{ field: string; frequency: number; pattern?: string }>;
  confidenceCalibration: {
    aiConfidenceVsActualAccuracy: number;
    overconfident: boolean;
  };
}

const FEEDBACK_STORAGE_KEY = "ai_feedback_corrections_v1";
const MAX_FEEDBACK_ITEMS = 1000;

export async function storeCorrectionFeedback(
  feedback: Omit<AICorrectionFeedback, "id" | "timestamp">,
): Promise<void> {
  const fullFeedback: AICorrectionFeedback = {
    ...feedback,
    id: newFeedbackId(),
    timestamp: Date.now(),
  };

  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_STORAGE_KEY);
    const items = raw ? (JSON.parse(raw) as AICorrectionFeedback[]) : [];

    const filtered = items.slice(0, MAX_FEEDBACK_ITEMS - 1);
    filtered.unshift(fullFeedback);

    await AsyncStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn("Failed to store feedback:", e);
  }
}

export async function getAllFeedback(): Promise<AICorrectionFeedback[]> {
  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AICorrectionFeedback[]) : [];
  } catch (e) {
    console.warn("Failed to retrieve feedback:", e);
    return [];
  }
}

export async function generateFeedbackSummary(): Promise<FeedbackSummary> {
  const feedback = await getAllFeedback();

  if (feedback.length === 0) {
    return {
      totalFeedbackItems: 0,
      correctionRate: 0,
      accuracyTrend: "stable",
      topMistakes: [],
      confidenceCalibration: {
        aiConfidenceVsActualAccuracy: 0,
        overconfident: false,
      },
    };
  }

  const corrected = feedback.filter(
    (f) => f.userCorrection.value !== f.aiPrediction.value,
  );
  const correctionRate = corrected.length / feedback.length;

  const mistakeFreq: Record<string, number> = {};
  corrected.forEach((f) => {
    const key = `${f.aiPrediction.field}`;
    mistakeFreq[key] = (mistakeFreq[key] || 0) + 1;
  });

  const topMistakes = Object.entries(mistakeFreq)
    .map(([field, frequency]) => ({ field, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);

  const verifiedFeedback = feedback.filter((f) => f.subsequentValidation);
  const confidenceCalibration =
    calculateConfidenceCalibration(verifiedFeedback);

  const recent = feedback.slice(0, Math.min(100, feedback.length));
  const recentCorrected = recent.filter(
    (f) => f.userCorrection.value !== f.aiPrediction.value,
  );
  const recentRate = recentCorrected.length / recent.length;

  const accuracyTrend =
    recentRate < correctionRate
      ? "improving"
      : recentRate > correctionRate
        ? "declining"
        : "stable";

  return {
    totalFeedbackItems: feedback.length,
    correctionRate,
    accuracyTrend,
    topMistakes,
    confidenceCalibration,
  };
}

function calculateConfidenceCalibration(
  verifiedFeedback: AICorrectionFeedback[],
): { aiConfidenceVsActualAccuracy: number; overconfident: boolean } {
  if (verifiedFeedback.length < 10) {
    return { aiConfidenceVsActualAccuracy: 0, overconfident: false };
  }

  const confidences = verifiedFeedback.map((f) => f.aiPrediction.confidence);
  const accuracies: number[] = verifiedFeedback.map((f) =>
    f.subsequentValidation?.confirmedCorrect ? 1 : 0,
  );

  const meanConf = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const meanAcc = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;

  const numerator = verifiedFeedback.reduce(
    (sum, _, i) =>
      sum + (confidences[i] - meanConf) * (accuracies[i] - meanAcc),
    0,
  );

  const denomConf = Math.sqrt(
    verifiedFeedback.reduce(
      (sum, _, i) => sum + Math.pow(confidences[i] - meanConf, 2),
      0,
    ),
  );
  const denomAcc = Math.sqrt(
    verifiedFeedback.reduce(
      (sum, _, i) => sum + Math.pow(accuracies[i] - meanAcc, 2),
      0,
    ),
  );

  const correlation =
    denomConf * denomAcc > 0 ? numerator / (denomConf * denomAcc) : 0;

  return {
    aiConfidenceVsActualAccuracy: correlation,
    overconfident: meanConf > meanAcc + 0.15,
  };
}

export async function validateFeedback(
  feedbackId: string,
  confirmedCorrect: boolean,
  verificationMethod: "field-visit" | "aerial-api" | "user-report",
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_STORAGE_KEY);
    const items = raw ? (JSON.parse(raw) as AICorrectionFeedback[]) : [];

    const idx = items.findIndex((f) => f.id === feedbackId);
    if (idx >= 0) {
      items[idx].subsequentValidation = {
        confirmedCorrect,
        verificationMethod,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(items));
    }
  } catch (e) {
    console.warn("Failed to validate feedback:", e);
  }
}

export async function exportFeedbackForRetraining(): Promise<string> {
  const feedback = await getAllFeedback();
  const summary = await generateFeedbackSummary();

  const exportData = {
    exportDate: new Date().toISOString(),
    feedbackCount: feedback.length,
    summary,
    recentItems: feedback.slice(0, 100),
  };

  return JSON.stringify(exportData, null, 2);
}

export async function pruneOldFeedback(daysOld: number = 90): Promise<void> {
  try {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const raw = await AsyncStorage.getItem(FEEDBACK_STORAGE_KEY);
    const items = raw ? (JSON.parse(raw) as AICorrectionFeedback[]) : [];

    const filtered = items.filter((f) => f.timestamp > cutoffTime);
    await AsyncStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn("Failed to prune feedback:", e);
  }
}
