/**
 * Explainable AI Module
 * Generates human-readable explanations for all AI predictions.
 */

export interface AIPredictionExplanation {
  prediction: unknown;
  confidence: number;
  reasoning: ExplanationFactor[];
  limitations?: string[];
  disclaimer: string;
  userActions?: UserAction[];
}

export interface ExplanationFactor {
  factor: string;
  impact: "high" | "medium" | "low";
  value?: string;
  explanation: string;
}

export interface UserAction {
  label: string;
  action: string;
  description: string;
}

export function explainPitchPrediction(
  estimatedPitch: string,
  confidence: number,
  imageQuality: string,
  terrainContext?: { avgElevation?: number; elevationVariance?: number },
): AIPredictionExplanation {
  const factors: ExplanationFactor[] = [];

  if (confidence > 0.85) {
    factors.push({
      factor: "Strong visual indicators",
      impact: "high",
      value: `${(confidence * 100).toFixed(0)}% confidence`,
      explanation: "Clear roof edges and slope angles visible in photo.",
    });
  } else if (confidence > 0.7) {
    factors.push({
      factor: "Moderate visual indicators",
      impact: "medium",
      value: `${(confidence * 100).toFixed(0)}% confidence`,
      explanation:
        "Some roof features visible but image angle or lighting limits precision.",
    });
  } else {
    factors.push({
      factor: "Limited visual indicators",
      impact: "low",
      value: `${(confidence * 100).toFixed(0)}% confidence`,
      explanation:
        "Roof pitch difficult to determine from image. Manual verification recommended.",
    });
  }

  const qualityScore =
    { high: 0.9, medium: 0.6, low: 0.3 }[
      imageQuality.toLowerCase() as string
    ] || 0.6;
  factors.push({
    factor: "Photo quality",
    impact: qualityScore > 0.7 ? "high" : qualityScore > 0.4 ? "medium" : "low",
    value: imageQuality,
    explanation:
      qualityScore > 0.7
        ? "High-resolution photo with good lighting aids accuracy."
        : "Lower photo quality may impact precision.",
  });

  if (terrainContext?.elevationVariance !== undefined) {
    const variance = terrainContext.elevationVariance;
    factors.push({
      factor: "Terrain elevation data",
      impact: variance > 100 ? "high" : "medium",
      value: `${variance.toFixed(0)}m elevation range`,
      explanation:
        variance > 100
          ? "Terrain elevation helps validate pitch measurement."
          : "Minimal elevation variation.",
    });
  }

  return {
    prediction: estimatedPitch,
    confidence,
    reasoning: factors,
    limitations: [
      "Measurement assumes uniform pitch; multi-faceted roofs may show variation.",
      "Image angle affects measured pitch accuracy (±2-5%).",
      "Shadows and obstructions can reduce precision.",
    ],
    disclaimer:
      "This is an AI-assisted estimate. Physical field measurement is the gold standard.",
    userActions: [
      {
        label: "Accept Estimate",
        action: "accept",
        description: "Use AI estimate in report.",
      },
      {
        label: "Manual Override",
        action: "override",
        description: "Enter your own measurement.",
      },
      {
        label: "Request Field Verification",
        action: "verify",
        description: "Schedule professional measurement.",
      },
    ],
  };
}

export function explainDamageAssessment(
  damageType: string,
  severity: number,
  confidence: number,
  evidenceCount: number,
): AIPredictionExplanation {
  const factors: ExplanationFactor[] = [];

  factors.push({
    factor: "Damage type detection",
    impact: confidence > 0.8 ? "high" : confidence > 0.6 ? "medium" : "low",
    value: damageType,
    explanation:
      confidence > 0.8
        ? `Clear visual patterns consistent with ${damageType} damage.`
        : confidence > 0.6
          ? `Possible ${damageType} damage, but confirmation needed.`
          : `Uncertain damage classification. Professional review recommended.`,
  });

  const severityExpl: Record<number, string> = {
    1: "Cosmetic or minor damage only.",
    2: "Minor damage affecting small roof areas.",
    3: "Moderate damage; some replacement may be needed.",
    4: "Significant damage; substantial repair or replacement needed.",
    5: "Severe structural damage; urgent repair required.",
  };

  factors.push({
    factor: "Severity level",
    impact: severity >= 4 ? "high" : severity >= 3 ? "medium" : "low",
    value: `${severity}/5`,
    explanation: severityExpl[severity] || "Unknown severity.",
  });

  factors.push({
    factor: "Evidence quantity",
    impact: evidenceCount > 5 ? "high" : evidenceCount > 2 ? "medium" : "low",
    value: `${evidenceCount} damage indicators`,
    explanation:
      evidenceCount > 5
        ? "Multiple instances of damage detected across roof."
        : evidenceCount > 2
          ? "Damage visible in several locations."
          : "Limited damage evidence; may be isolated incident.",
  });

  return {
    prediction: { damageType, severity, confidence },
    confidence,
    reasoning: factors,
    limitations: [
      "Satellite/oblique photos may not show all roof areas.",
      "Older or weathered damage may be harder to detect.",
      "Shadow and lighting variations can create false positives.",
    ],
    disclaimer:
      "Professional on-site inspection is required for insurance claims or repair estimates.",
    userActions: [
      {
        label: "Confirm Assessment",
        action: "confirm",
        description: "Proceed with this damage evaluation.",
      },
      {
        label: "Request Additional Photos",
        action: "more-photos",
        description: "Capture more angles for better accuracy.",
      },
      {
        label: "Schedule Site Visit",
        action: "schedule-visit",
        description: "Arrange professional inspection.",
      },
    ],
  };
}

export function explainMeasurementFusion(
  sources: Array<{ source: string; value: number; confidence: number }>,
  fusedValue: number,
  confidence: number,
): AIPredictionExplanation {
  const factors: ExplanationFactor[] = [];

  sources.forEach((source) => {
    const weighted =
      source.confidence > 0.8
        ? "high"
        : source.confidence > 0.6
          ? "medium"
          : "low";
    factors.push({
      factor: `${source.source} measurement`,
      impact: weighted as "high" | "medium" | "low",
      value: `${source.value.toLocaleString()} (${(source.confidence * 100).toFixed(0)}% confidence)`,
      explanation:
        weighted === "high"
          ? "High-confidence measurement heavily weighted in fusion."
          : weighted === "medium"
            ? "Moderate confidence; balanced with other sources."
            : "Lower confidence; minor impact on final estimate.",
    });
  });

  const variance =
    Math.max(...sources.map((s) => s.value)) -
    Math.min(...sources.map((s) => s.value));
  factors.push({
    factor: "Source agreement",
    impact: variance < fusedValue * 0.1 ? "high" : "medium",
    value: `${variance.toLocaleString()} sq ft variance`,
    explanation:
      variance < fusedValue * 0.1
        ? "Excellent agreement between sources."
        : "Moderate variance; balanced estimate.",
  });

  return {
    prediction: fusedValue,
    confidence,
    reasoning: factors,
    limitations: [
      "Measurement accuracy depends on source data quality.",
      "Multi-faceted roofs may have hidden areas.",
      "Satellite data may be outdated.",
    ],
    disclaimer:
      "Fused measurements combine multiple data sources. Field verification recommended for critical estimates.",
    userActions: [
      {
        label: "Accept Fused Result",
        action: "accept",
        description: "Use combined measurement.",
      },
      {
        label: "Use Single Source",
        action: "single-source",
        description: "Choose one measurement source.",
      },
      {
        label: "Manual Entry",
        action: "manual",
        description: "Enter custom measurement.",
      },
    ],
  };
}

export function formatExplanationForUI(explanation: AIPredictionExplanation): {
  headline: string;
  factors: string[];
  limitations: string[];
  callToAction: string;
} {
  const highImpactFactors = explanation.reasoning
    .filter((f) => f.impact === "high")
    .map((f) => `${f.factor}: ${f.explanation}`);

  const headline =
    explanation.confidence > 0.85
      ? "✓ High Confidence Assessment"
      : explanation.confidence > 0.7
        ? "⚠ Moderate Confidence Assessment"
        : "⚠ Low Confidence – Verify Manually";

  const callToAction =
    explanation.confidence > 0.8
      ? "Ready to proceed with report"
      : "Recommend manual review or additional data";

  return {
    headline,
    factors: highImpactFactors,
    limitations: explanation.limitations || [],
    callToAction,
  };
}
