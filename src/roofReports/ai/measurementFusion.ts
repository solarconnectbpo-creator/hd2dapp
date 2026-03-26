/**
 * Measurement Fusion Engine
 * Combines multiple measurement sources (AI vision, user trace, aerial APIs, manual)
 * with confidence weighting for highest accuracy.
 */

import { parsePitchRiseRun } from "../roofPolygonMetrics";

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

/** Weighted mean of pitch as rise/12 when multiple sources disagree (parseable pitches only). */
function fusePitchFromSources(
  sources: MeasurementSource[],
): string | undefined {
  let num = 0;
  let den = 0;
  for (const s of sources) {
    const rr = parsePitchRiseRun(s.pitch);
    if (!rr || rr.run <= 0) continue;
    const riseOn12 = (rr.rise / rr.run) * 12;
    num += riseOn12 * s.confidence;
    den += s.confidence;
  }
  if (den <= 0) {
    const raw = sources.find((x) => x.pitch?.trim())?.pitch?.trim();
    return raw;
  }
  const riseOn12 = num / den;
  const r = Math.round(riseOn12 * 10) / 10;
  return `${r}/12`;
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

  const validSources = sources.filter(
    (s) => s.confidence >= opts.minConfidenceThreshold,
  );
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
      discrepancies: checkDiscrepancies(
        validSources,
        opts.discrepancyThreshold,
      ),
    };
  }

  let fusedArea: number | undefined;
  let fusedPerimeter: number | undefined;

  /** Weighted mean using only sources that supply the metric (avoids diluting by empty fields). */
  const weightedMean = (
    pick: (s: MeasurementSource) => number | undefined,
  ): number | undefined => {
    let num = 0;
    let den = 0;
    for (const s of validSources) {
      const v = pick(s);
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        num += v * s.confidence;
        den += s.confidence;
      }
    }
    return den > 0 ? num / den : undefined;
  };

  fusedArea = weightedMean((s) => s.areaSqFt);
  fusedPerimeter = weightedMean((s) => s.perimeterFt);

  const fusedPitch = fusePitchFromSources(validSources);

  return {
    areaSqFt: fusedArea ? Math.round(fusedArea) : undefined,
    perimeterFt: fusedPerimeter ? Math.round(fusedPerimeter) : undefined,
    pitch: fusedPitch,
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

  const areasWithValues = sources.filter(
    (s) =>
      typeof s.areaSqFt === "number" &&
      Number.isFinite(s.areaSqFt) &&
      s.areaSqFt > 0,
  );
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

export function calculateImprovedConfidence(
  sources: MeasurementSource[],
): number {
  if (!sources.length) return 0;
  if (sources.length === 1) return sources[0].confidence;

  const avgConfidence =
    sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length;
  const diversityBoost = Math.min(0.1, sources.length * 0.02);

  return Math.min(0.99, avgConfidence + diversityBoost);
}
