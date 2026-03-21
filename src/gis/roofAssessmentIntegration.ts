/**
 * Orchestrates point-cloud planes, 3D roof geometry, pitch analysis, and 2D measurement/cost heuristics.
 */

import {
  Advanced3DRoofMeasurement,
  type Point3D,
  type RoofGeometryModel,
  type RoofPlane,
} from "@/src/gis/advanced3dRoofMeasurement";
import type {
  BuildingFootprint,
  RoofGeometry,
} from "@/src/gis/gisBuildingService";
import {
  PitchAnalysisService,
  type PitchAnalysisResult,
} from "@/src/gis/pitchAnalysisService";
import {
  RoofMeasurementService,
  type DetailedRoofMeasurement,
} from "@/src/gis/roofMeasurementService";

export interface RoofAssessmentPlaneRow {
  plane: RoofPlane;
  pitchAnalysis: PitchAnalysisResult;
  measurements: DetailedRoofMeasurement;
  materialCosts: {
    roofingMaterial: number;
    underlayment: number;
    fasteners: number;
    flashing: number;
    total: number;
  };
  installationTime: {
    totalHours: number;
    days: number;
    crewSize: number;
  };
}

export interface ComprehensiveRoofAssessment {
  assessmentId: string;
  timestamp: string;
  building: BuildingFootprint;
  roofGeometry: RoofGeometryModel;
  planes: RoofAssessmentPlaneRow[];
  summary: {
    totalRoofArea: number;
    totalPitchAdjustedArea: number;
    averagePitch: number;
    estimatedTotalCost: number;
    estimatedInstallationDays: number;
    complexityLevel: string;
    recommendations: string[];
  };
}

function pitchAnalysisForPlane(plane: RoofPlane): PitchAnalysisResult {
  const runPx = 100;
  const risePx = Math.tan((plane.pitch * Math.PI) / 180) * runPx;
  return PitchAnalysisService.analyzePitchFromReference(10, 100, risePx, runPx);
}

function planeFootprint(
  building: BuildingFootprint,
  plane: RoofPlane,
): BuildingFootprint {
  return {
    ...building,
    area: plane.area,
    perimeter: plane.perimeter,
  };
}

function planeRoofGeometry(
  building: BuildingFootprint,
  plane: RoofPlane,
  complexity: number,
): RoofGeometry {
  const side = Math.sqrt(Math.max(plane.area, 1));
  return {
    area: plane.area,
    pitch: plane.pitch,
    direction: plane.direction,
    shape: building.roofShape ?? "unknown",
    ridgeLength: plane.perimeter / 4,
    eaveLength: plane.perimeter / 4,
    boundingDimensions: { length: side, width: side },
    complexityScore: complexity,
  };
}

export class RoofAssessmentIntegration {
  static async generateComprehensiveAssessment(
    pointCloud: Point3D[],
    building: BuildingFootprint,
    _buildingArea: number,
    materialType:
      | "asphalt_shingle"
      | "metal"
      | "tile"
      | "slate"
      | "wood" = "asphalt_shingle",
  ): Promise<ComprehensiveRoofAssessment> {
    void _buildingArea;
    const assessmentId = `ROOF_ASSESS_${Date.now()}`;

    const planes = Advanced3DRoofMeasurement.detectRoofPlanes(pointCloud);
    const roofGeometry = Advanced3DRoofMeasurement.buildRoofGeometry(planes);

    const planeAssessments = planes.map((plane) => {
      const pitchAnalysis = pitchAnalysisForPlane(plane);
      const fp = planeFootprint(building, plane);
      const rg = planeRoofGeometry(building, plane, roofGeometry.complexity);

      const measurements = RoofMeasurementService.calculateDetailedMeasurements(
        fp,
        rg,
      );

      const materialCosts = RoofMeasurementService.estimateMaterialCost(
        measurements,
        materialType,
      );

      const inst =
        RoofMeasurementService.estimateInstallationTime(measurements);
      const installationTime = {
        totalHours: inst.totalHours,
        days: inst.days,
        crewSize: inst.crewSize,
      };

      return {
        plane,
        pitchAnalysis,
        measurements,
        materialCosts,
        installationTime,
      };
    });

    const totalRoofArea = roofGeometry.totalArea;
    const totalPitchAdjustedArea = roofGeometry.totalPitchAdjustedArea;
    const n = Math.max(1, planes.length);
    const averagePitch = planes.reduce((sum, p) => sum + p.pitch, 0) / n;

    const estimatedTotalCost = planeAssessments.reduce(
      (sum, p) => sum + p.materialCosts.total,
      0,
    );

    const estimatedInstallationDays =
      planeAssessments.length > 0
        ? Math.max(...planeAssessments.map((p) => p.installationTime.days))
        : 0;

    const complexityLevel = RoofAssessmentIntegration.getComplexityLevel(
      roofGeometry.complexity,
    );

    const recommendations = RoofAssessmentIntegration.generateRecommendations(
      roofGeometry,
      planes,
      averagePitch,
    );

    return {
      assessmentId,
      timestamp: new Date().toISOString(),
      building,
      roofGeometry,
      planes: planeAssessments,
      summary: {
        totalRoofArea,
        totalPitchAdjustedArea,
        averagePitch: Math.round(averagePitch * 10) / 10,
        estimatedTotalCost,
        estimatedInstallationDays,
        complexityLevel,
        recommendations,
      },
    };
  }

  private static getComplexityLevel(score: number): string {
    if (score < 0.25) return "Simple";
    if (score < 0.5) return "Moderate";
    if (score < 0.75) return "Complex";
    return "Very Complex";
  }

  private static generateRecommendations(
    roofGeometry: RoofGeometryModel,
    planes: RoofPlane[],
    averagePitch: number,
  ): string[] {
    const recommendations: string[] = [];

    if (averagePitch < 3) {
      recommendations.push(
        "Low-slope roof — ensure proper drainage and waterproofing",
      );
    } else if (averagePitch > 45) {
      recommendations.push(
        "Very steep roof — specialized installation required",
      );
    }

    if (roofGeometry.complexity > 0.7) {
      recommendations.push(
        "Complex roof geometry — allow for extended installation time",
      );
      recommendations.push(
        "Consider additional labor costs for complex intersections",
      );
    }

    if (roofGeometry.ridges.length > 5) {
      recommendations.push(
        `Multiple ridges detected (${roofGeometry.ridges.length}) — ensure proper ridge vent installation`,
      );
    }

    if (roofGeometry.valleys.length > 3) {
      recommendations.push(
        `Multiple valleys detected (${roofGeometry.valleys.length}) — use leak-resistant valley flashing`,
      );
    }

    if (planes.length >= 2) {
      const pitches = planes.map((p) => p.pitch);
      const maxPitch = Math.max(...pitches);
      const minPitch = Math.min(...pitches);
      if (maxPitch - minPitch > 15) {
        recommendations.push(
          "Large pitch variation — plan for different installation techniques per plane",
        );
      }
    }

    return recommendations;
  }

  static generateReport(assessment: ComprehensiveRoofAssessment): string {
    const [lon, lat] = assessment.building.centerPoint;
    const addressLine = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

    let report = `
COMPREHENSIVE ROOF ASSESSMENT REPORT
=====================================

Assessment ID: ${assessment.assessmentId}
Date: ${new Date(assessment.timestamp).toLocaleString()}

PROPERTY INFORMATION
-------------------
Coordinates (lat, lon): ${addressLine}
Building OSM ID: ${assessment.building.osmId}

ROOF GEOMETRY OVERVIEW
---------------------
Total Roof Planes: ${assessment.roofGeometry.planes.length}
Horizontal Area: ${assessment.summary.totalRoofArea.toFixed(2)} m²
Pitch-Adjusted Area: ${assessment.summary.totalPitchAdjustedArea.toFixed(2)} m²
Average Pitch: ${assessment.summary.averagePitch}°
Complexity Level: ${assessment.summary.complexityLevel}

STRUCTURAL FEATURES
------------------
Ridges: ${assessment.roofGeometry.ridges.length}
Valleys: ${assessment.roofGeometry.valleys.length}

INDIVIDUAL PLANE ANALYSIS
------------------------
`;

    assessment.planes.forEach((item, idx) => {
      report += `
Plane ${idx + 1}:
  Area: ${item.plane.area.toFixed(2)} m²
  Pitch: ${item.plane.pitch.toFixed(1)}° (${item.pitchAnalysis.detailedPitch.ratio})
  Direction: ${item.plane.direction}°
  Material Cost: $${item.materialCosts.total.toLocaleString()}
  Installation Time: ${item.installationTime.days} days
`;
    });

    report += `
COST ESTIMATE
-----------
Estimated Total Material Cost: $${assessment.summary.estimatedTotalCost.toLocaleString()}
Estimated Installation Days: ${assessment.summary.estimatedInstallationDays} days

RECOMMENDATIONS
--------------
${assessment.summary.recommendations.map((r) => `• ${r}`).join("\n")}
`;

    return report.trim();
  }
}

export default RoofAssessmentIntegration;
