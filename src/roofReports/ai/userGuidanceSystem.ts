/**
 * Real-Time User Guidance System
 * Provides actionable feedback during roof measurement and assessment.
 */

export interface GuidanceMessage {
  id: string;
  type: "warning" | "suggestion" | "success" | "info";
  title: string;
  message: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  dismissible: boolean;
  priority: number;
}

export interface MeasurementQualityCheck {
  isAcceptable: boolean;
  score: number;
  issues: GuidanceMessage[];
  recommendations: string[];
}

export function checkMeasurementQuality(
  aiEstimate: { areaSqFt?: number; confidence: number },
  userEstimate: { areaSqFt?: number },
  previousMeasurements?: { areaSqFt: number }[],
): MeasurementQualityCheck {
  const issues: GuidanceMessage[] = [];
  let score = 100;

  if (!aiEstimate.areaSqFt || !userEstimate.areaSqFt) {
    issues.push({
      id: "missing-estimate",
      type: "warning",
      title: "Incomplete Measurements",
      message:
        "Both AI and manual measurements are required for accurate assessment.",
      dismissible: false,
      priority: 8,
    });
    return { isAcceptable: false, score: 0, issues, recommendations: [] };
  }

  const delta = Math.abs(aiEstimate.areaSqFt - userEstimate.areaSqFt);
  const threshold = Math.max(
    500,
    (0.15 * (aiEstimate.areaSqFt + userEstimate.areaSqFt)) / 2,
  );

  if (delta > threshold) {
    score -= 30;
    issues.push({
      id: "measurement-variance",
      type: "warning",
      title: "Measurements Differ Significantly",
      message: `AI estimates ${aiEstimate.areaSqFt.toLocaleString()} sq ft, but your trace shows ${userEstimate.areaSqFt.toLocaleString()} sq ft.`,
      dismissible: true,
      priority: 8,
    });
  }

  if (aiEstimate.confidence < 0.7) {
    score -= 20;
    issues.push({
      id: "low-ai-confidence",
      type: "info",
      title: "AI Confidence Low",
      message: `AI confidence is ${(aiEstimate.confidence * 100).toFixed(0)}%. Consider retaking photos.`,
      dismissible: true,
      priority: 6,
    });
  }

  if (previousMeasurements && previousMeasurements.length > 0) {
    const avgHistorical =
      previousMeasurements.reduce((sum, m) => sum + m.areaSqFt, 0) /
      previousMeasurements.length;
    const historicalDelta = Math.abs(userEstimate.areaSqFt - avgHistorical);

    if (historicalDelta > avgHistorical * 0.2) {
      score -= 15;
      issues.push({
        id: "historical-variance",
        type: "suggestion",
        title: "Different from Previous Measurements",
        message: `This differs from your historical average (${Math.round(avgHistorical).toLocaleString()} sq ft).`,
        dismissible: true,
        priority: 5,
      });
    }
  }

  if (issues.length === 0) {
    issues.push({
      id: "measurement-confirmed",
      type: "success",
      title: "Measurements Confirmed",
      message: "AI and manual measurements align well.",
      dismissible: true,
      priority: 2,
    });
  }

  return {
    isAcceptable: score >= 70,
    score: Math.max(0, score),
    issues,
    recommendations: generateMeasurementRecommendations(score, issues),
  };
}

export function getPhotoCaptureGuidance(
  photoCount: number,
  roofType?: string,
  complexity?: "simple" | "moderate" | "complex",
): GuidanceMessage[] {
  const messages: GuidanceMessage[] = [];
  const requiredPhotos =
    complexity === "complex" ? 5 : complexity === "moderate" ? 3 : 2;

  if (photoCount < requiredPhotos) {
    messages.push({
      id: "more-photos-needed",
      type: "info",
      title: "Add More Photos",
      message: `Captured ${photoCount}/${requiredPhotos} photos. Multiple angles improve AI accuracy.`,
      dismissible: false,
      priority: 7,
    });
  }

  if (roofType?.toLowerCase().includes("hip")) {
    if (photoCount < 4) {
      messages.push({
        id: "hip-roof-guidance",
        type: "suggestion",
        title: "Hip Roof Detected",
        message:
          "Hip roofs require photos of all sides. Capture 4+ angles for best results.",
        dismissible: true,
        priority: 6,
      });
    }
  }

  if (photoCount > 0) {
    messages.push({
      id: "angle-guidance",
      type: "suggestion",
      title: "Capture Angle Tips",
      message:
        "Mix orthogonal (top-down) and oblique (45°) views for comprehensive assessment.",
      dismissible: true,
      priority: 4,
    });
  }

  return messages;
}

function generateMeasurementRecommendations(
  score: number,
  issues: GuidanceMessage[],
): string[] {
  const recommendations: string[] = [];

  if (score < 50) {
    recommendations.push(
      "Poor measurement quality. Request manual field verification.",
    );
  } else if (score < 70) {
    recommendations.push("Review before report export.");
  } else {
    recommendations.push(
      "Measurement quality is acceptable. Proceed with report.",
    );
  }

  return [...new Set(recommendations)];
}

export function getDamageAssessmentGuidance(
  damageConfidence: number,
  photoQuality: "high" | "medium" | "low",
): GuidanceMessage[] {
  const messages: GuidanceMessage[] = [];

  if (photoQuality === "low") {
    messages.push({
      id: "poor-photo-quality",
      type: "warning",
      title: "Low Photo Quality",
      message:
        "Poor photo quality limits AI accuracy. Retake with better lighting/clarity.",
      priority: 7,
      dismissible: true,
    });
  }

  if (damageConfidence < 0.6) {
    messages.push({
      id: "uncertain-damage",
      type: "info",
      title: "Damage Assessment Uncertain",
      message: "Professional on-site inspection recommended.",
      priority: 6,
      dismissible: true,
    });
  }

  if (damageConfidence >= 0.85) {
    messages.push({
      id: "confident-damage",
      type: "success",
      title: "Damage Clearly Visible",
      message:
        "High-confidence damage detection. Assessment is reliable for claims.",
      priority: 3,
      dismissible: true,
    });
  }

  return messages;
}
