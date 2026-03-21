/**
 * Measurement Fusion Engine
 * Combines multiple measurement sources (AI vision, user trace, aerial APIs, manual)
 * with confidence weighting for highest accuracy.
 */

export interface MeasurementSource {
  areaSqFt?: number;
  perimeterFt?: number;
  pitch?: string; // "rise:run" format
  confidence: number; // 0-1
  source: "ai-vision" | "user-trace" | "aerial-api" | "manual" | "lidar";
  rationale?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface FusedMeasurement {
  areaSqFt?: number;
  perimeterFt?: number;
  pitch?: string;
  confidence: number;
  sourcesUsed: string[];
  fusionStrategy: "weighted-average" | "top-confidence" | "consensus";
  discrepancies?: SourceDiscrepancy[];
}

export interface SourceDiscrepancy {
  metric: "area" | "perimeter" | "pitch";
  variance: number;
  sources: string[];
  recommendation: string;
}

/**
 * Fuse multiple measurement sources using weighted confidence scoring.
 * Prioritizes high-confidence sources but flags significant discrepancies.
 */
export function fuseMeasurements(
  sources: MeasurementSource[],
  options?: {
    minConfidenceThreshold?: number;
    discrepancyThreshold?: number;
  },
): FusedMeasurement {
  const opts = {
    minConfidenceThreshold: 0.7,
    discrepancyThreshold: 0.15,
    ...options,
  };

  if (!sources.length) {
    return {
      confidence: 0,
      sourcesUsed: [],
      fusionStrategy: "weighted-average",
    };
  }

  const validSources = sources.filter((s) => s.confidence >= opts.minConfidenceThreshold);
  if (!validSources.length) {
    return {
      confidence: 0,
      sourcesUsed: [],
      fusionStrategy: "weighted-average",
      discrepancies: [
        {
          metric: "area",
          variance: 1,
          sources: sources.map((s) => s.source),
          recommendation:
            "No sources met minimum confidence threshold. Manual review required.",
        },
      ],
    };
  }

  const sorted = [...validSources].sort((a, b) => b.confidence - a.confidence);
  const topSource = sorted[0];

  if (topSource.confidence > 0.85) {
    return {
      areaSqFt: topSource.areaSqFt,
      perimeterFt: topSource.perimeterFt,
      pitch: topSource.pitch,
      confidence: topSource.confidence,
      sourcesUsed: [topSource.source],
      fusionStrategy: "top-confidence",
      discrepancies: checkDiscrepancies(validSources, opts.discrepancyThreshold),
    };
  }

  const totalWeight = validSources.reduce((sum, s) => sum + s.confidence, 0);

  let fusedArea: number | undefined;
  let fusedPerimeter: number | undefined;

  if (validSources.some((s) => s.areaSqFt)) {
    const weightedArea = validSources.reduce(
      (sum, s) => sum + (s.areaSqFt || 0) * s.confidence,
      0,
    );
    fusedArea = totalWeight > 0 ? weightedArea / totalWeight : undefined;
  }

  if (validSources.some((s) => s.perimeterFt)) {
    const weightedPerimeter = validSources.reduce(
      (sum, s) => sum + (s.perimeterFt || 0) * s.confidence,
      0,
    );
    fusedPerimeter = totalWeight > 0 ? weightedPerimeter / totalWeight : undefined;
  }

  const pitchSource = sorted.find((s) => s.pitch);

  return {
    areaSqFt: fusedArea ? Math.round(fusedArea) : undefined,
    perimeterFt: fusedPerimeter ? Math.round(fusedPerimeter) : undefined,
    pitch: pitchSource?.pitch,
    confidence: Math.max(...validSources.map((s) => s.confidence)),
    sourcesUsed: validSources.map((s) => s.source),
    fusionStrategy: "weighted-average",
    discrepancies: checkDiscrepancies(validSources, opts.discrepancyThreshold),
  };
}

function checkDiscrepancies(
  sources: MeasurementSource[],
  threshold: number,
): SourceDiscrepancy[] {
  const discrepancies: SourceDiscrepancy[] = [];

  const areasWithValues = sources.filter((s) => s.areaSqFt);
  if (areasWithValues.length > 1) {
    const min = Math.min(...areasWithValues.map((s) => s.areaSqFt!));
    const max = Math.max(...areasWithValues.map((s) => s.areaSqFt!));
    const variance = (max - min) / ((max + min) / 2);

    if (variance > threshold) {
      discrepancies.push({
        metric: "area",
        variance,
        sources: areasWithValues.map((s) => s.source),
        recommendation: `Area estimates vary by ${(variance * 100).toFixed(1)}%. Review measurement sources or request manual verification.`,
      });
    }
  }

  return discrepancies;
}

export function calculateImprovedConfidence(sources: MeasurementSource[]): number {
  if (!sources.length) return 0;
  if (sources.length === 1) return sources[0].confidence;

  const avgConfidence = sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length;
  const diversityBoost = Math.min(0.1, sources.length * 0.02);

  return Math.min(0.99, avgConfidence + diversityBoost);
}
