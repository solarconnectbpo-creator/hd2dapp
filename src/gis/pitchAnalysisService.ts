/**
 * Heuristic roof pitch analysis from shadows, edges, depth, or reference scaling.
 */

export interface PitchAnalysisResult {
  estimatedPitch: number;
  confidence: number;
  method: "shadow" | "edge" | "depth" | "reference";
  detailedPitch: {
    rise: number;
    run: number;
    ratio: string;
    degrees: number;
    percentage: number;
  };
  pitchVariation?: number;
  roofType: string;
  recommendations: string[];
}

export class PitchAnalysisService {
  static analyzePitchFromShadow(
    shadowLength: number,
    buildingHeight: number,
    pixelsPerMeter: number,
    sunElevationAngle: number,
  ): PitchAnalysisResult {
    const ppm = Math.max(pixelsPerMeter, 1e-9);
    const shadowMeters = shadowLength / ppm;

    const sunAngleRad = (sunElevationAngle * Math.PI) / 180;
    const denom = Math.max(shadowMeters, 1e-9);
    const estimatedPitch = Math.atan(buildingHeight / denom) * (180 / Math.PI);

    const rise = buildingHeight;
    const run = shadowMeters;
    const ratio = this.pitchToRatio(estimatedPitch);

    return {
      estimatedPitch,
      confidence: Math.min(1, Math.abs(sunElevationAngle / 45)),
      method: "shadow",
      detailedPitch: {
        rise,
        run,
        ratio,
        degrees: Math.round(estimatedPitch * 10) / 10,
        percentage: Math.round(
          Math.tan((estimatedPitch * Math.PI) / 180) * 100,
        ),
      },
      roofType: this.classifyRoofByPitch(estimatedPitch),
      recommendations: this.getPitchRecommendations(estimatedPitch),
    };
  }

  static analyzePitchFromEdges(
    edgePoints: Array<{ x: number; y: number }>,
    imageWidth: number,
    imageHeight: number,
    cameraFOV = 50,
  ): PitchAnalysisResult {
    const empty = (): PitchAnalysisResult => ({
      estimatedPitch: 0,
      confidence: 0,
      method: "edge",
      detailedPitch: {
        rise: 0,
        run: 1,
        ratio: "0:12",
        degrees: 0,
        percentage: 0,
      },
      roofType: "flat",
      recommendations: [],
    });

    if (edgePoints.length < 4 || imageWidth <= 0 || imageHeight <= 0) {
      return empty();
    }

    const ridge = edgePoints.reduce((prev, curr) =>
      prev.y < curr.y ? prev : curr,
    );

    const eaves = edgePoints
      .filter((p) => p.y > ridge.y + 10)
      .sort((a, b) => a.y - b.y)
      .slice(-2);

    if (eaves.length < 2) {
      return empty();
    }

    const pixelRise = eaves[0].y - ridge.y;
    const pixelRun = Math.abs(eaves[1].x - eaves[0].x);
    const safeRun = Math.max(pixelRun, 1e-6);
    const pixelPitch = Math.atan(pixelRise / safeRun) * (180 / Math.PI);

    const perspectiveCorrection = (cameraFOV / imageWidth) * imageHeight;
    const estimatedPitch = pixelPitch * perspectiveCorrection;

    const ratio = this.pitchToRatio(estimatedPitch);

    return {
      estimatedPitch,
      confidence: 0.65,
      method: "edge",
      detailedPitch: {
        rise: pixelRise,
        run: pixelRun,
        ratio,
        degrees: Math.round(estimatedPitch * 10) / 10,
        percentage: Math.round(
          Math.tan((estimatedPitch * Math.PI) / 180) * 100,
        ),
      },
      roofType: this.classifyRoofByPitch(estimatedPitch),
      recommendations: this.getPitchRecommendations(estimatedPitch),
    };
  }

  static analyzePitchFromDepth(
    depthMap: number[][],
    pixelsPerMeter: number,
  ): PitchAnalysisResult {
    const empty = (): PitchAnalysisResult => ({
      estimatedPitch: 0,
      confidence: 0,
      method: "depth",
      detailedPitch: {
        rise: 0,
        run: 1,
        ratio: "0:12",
        degrees: 0,
        percentage: 0,
      },
      roofType: "flat",
      recommendations: [],
    });

    if (!depthMap.length || !depthMap[0]?.length) {
      return empty();
    }

    const height = depthMap.length;
    const width = depthMap[0].length;
    const ppm = Math.max(pixelsPerMeter, 1e-9);

    let ridgeRow = 0;
    let maxHeight = -Infinity;

    for (let y = 0; y < height; y++) {
      const row = depthMap[y];
      if (!row?.length) continue;
      const rowMax = Math.max(...row);
      if (rowMax > maxHeight) {
        maxHeight = rowMax;
        ridgeRow = y;
      }
    }

    const eaveRow = height - 1;
    const mid = Math.floor(width / 2);
    const eaveHeight = depthMap[eaveRow]?.[mid] ?? 0;

    const pixelRise = (maxHeight - eaveHeight) / ppm;
    const runPixels = Math.abs(eaveRow - ridgeRow);
    const pixelRun = Math.max(runPixels / ppm, 1e-9);

    const estimatedPitch = Math.atan(pixelRise / pixelRun) * (180 / Math.PI);
    const ratio = this.pitchToRatio(estimatedPitch);

    return {
      estimatedPitch,
      confidence: 0.85,
      method: "depth",
      detailedPitch: {
        rise: pixelRise,
        run: pixelRun,
        ratio,
        degrees: Math.round(estimatedPitch * 10) / 10,
        percentage: Math.round(
          Math.tan((estimatedPitch * Math.PI) / 180) * 100,
        ),
      },
      roofType: this.classifyRoofByPitch(estimatedPitch),
      recommendations: this.getPitchRecommendations(estimatedPitch),
    };
  }

  static analyzePitchFromReference(
    referenceHeight: number,
    referencePixels: number,
    roofRisePixels: number,
    roofRunPixels: number,
  ): PitchAnalysisResult {
    const refPx = Math.max(referencePixels, 1e-9);
    const refH = Math.max(referenceHeight, 1e-9);
    const pixelsPerMeter = refPx / refH;

    const riseMeters = roofRisePixels / pixelsPerMeter;
    const runMeters = Math.max(roofRunPixels / pixelsPerMeter, 1e-9);

    const estimatedPitch = Math.atan(riseMeters / runMeters) * (180 / Math.PI);
    const ratio = this.pitchToRatio(estimatedPitch);

    return {
      estimatedPitch,
      confidence: 0.95,
      method: "reference",
      detailedPitch: {
        rise: riseMeters,
        run: runMeters,
        ratio,
        degrees: Math.round(estimatedPitch * 10) / 10,
        percentage: Math.round(
          Math.tan((estimatedPitch * Math.PI) / 180) * 100,
        ),
      },
      roofType: this.classifyRoofByPitch(estimatedPitch),
      recommendations: this.getPitchRecommendations(estimatedPitch),
    };
  }

  private static pitchToRatio(degrees: number): string {
    const ratio = Math.tan((degrees * Math.PI) / 180) * 12;
    return `${Math.round(ratio)}:12`;
  }

  private static classifyRoofByPitch(pitch: number): string {
    if (pitch < 2) return "Flat or Nearly Flat";
    if (pitch < 6) return "Low-Pitch";
    if (pitch < 10) return "Moderate-Low";
    if (pitch < 20) return "Standard";
    if (pitch < 35) return "Steep";
    if (pitch < 50) return "Very Steep";
    return "Extreme Pitch";
  }

  private static getPitchRecommendations(pitch: number): string[] {
    const recommendations: string[] = [];

    if (pitch < 3) {
      recommendations.push("Low-slope roof - ensure proper drainage");
      recommendations.push("May require additional waterproofing");
      recommendations.push("Consider walkway protection for maintenance");
    } else if (pitch < 10) {
      recommendations.push("Moderate pitch - good for water drainage");
      recommendations.push("Suitable for most asphalt shingles");
      recommendations.push("Consider additional fasteners for high winds");
    } else if (pitch < 20) {
      recommendations.push("Standard residential pitch");
      recommendations.push("Excellent water drainage");
      recommendations.push("Suitable for all roofing materials");
    } else if (pitch < 35) {
      recommendations.push("Steep roof - reduced load-carrying capacity");
      recommendations.push("Requires skilled installation");
      recommendations.push("May need additional bracing for high winds");
      recommendations.push("Safety equipment required for maintenance");
    } else {
      recommendations.push("Very steep roof - specialized installation");
      recommendations.push("Extreme safety requirements");
      recommendations.push("Professional installation strongly recommended");
      recommendations.push("Limited material options");
    }

    return recommendations;
  }

  static calculateMaterialsByPitch(
    baseArea: number,
    pitch: number,
  ): {
    actualArea: number;
    shingles: number;
    nails: number;
    underlayment: number;
    fastenerSpacer: number;
  } {
    const pitchRad = (pitch * Math.PI) / 180;
    const c = Math.cos(pitchRad);
    const pitchMultiplier = Math.abs(c) < 1e-9 ? 1 : 1 / c;
    const actualArea = baseArea * pitchMultiplier;

    const shingles = Math.ceil(actualArea / 9.29);

    const nailsPerSquare = Math.ceil(1 + pitch / 20);
    const nails = shingles * nailsPerSquare;

    const underlayment = Math.ceil(actualArea / 37.16);

    const fastenerSpacer = Math.max(4, 6 - pitch / 10);

    return {
      actualArea,
      shingles,
      nails,
      underlayment,
      fastenerSpacer,
    };
  }
}

export default PitchAnalysisService;
