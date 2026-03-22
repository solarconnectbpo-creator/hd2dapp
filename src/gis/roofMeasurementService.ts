/**
 * Advanced roof measurement helpers — estimates from footprint + roof geometry.
 */

import type { BuildingFootprint, RoofGeometry } from "./gisBuildingService";

export interface DetailedRoofMeasurement {
  totalArea: number;
  pitchAdjustedArea: number;
  dormerArea?: number;
  overhangArea: number;
  eaveLength: number;
  ridgeLength: number;
  skylinePentrationArea: number;
  gutterLength: number;
  downspoutRequirements: number;
  materialRequirementsShingles?: number;
  materialRequirementsTile?: number;
  layersNeeded: number;
  dragCoefficient: number;
  drainageCoefficient: number;
  solarPotential?: number;
}

export class RoofMeasurementService {
  static calculateDetailedMeasurements(
    building: BuildingFootprint,
    roofGeometry: RoofGeometry,
    hasOverhang = true,
    overhangDepth = 0.6,
  ): DetailedRoofMeasurement {
    const baseArea = building.area;

    const pitchRad = (roofGeometry.pitch * Math.PI) / 180;
    const pitchMultiplier = 1 / Math.cos(pitchRad);
    const pitchAdjustedArea = baseArea * pitchMultiplier;

    const overhangPerimeter = this.calculatePerimeterApprox(building);
    const overhangArea = hasOverhang ? overhangPerimeter * overhangDepth : 0;
    const totalArea = pitchAdjustedArea + overhangArea;

    const gutterLength = overhangPerimeter;
    const eaveLength = roofGeometry.eaveLength ?? 0;

    const dormerArea =
      roofGeometry.complexityScore > 0.6
        ? totalArea * (roofGeometry.complexityScore * 0.1)
        : 0;

    const skylinePentrationArea = totalArea * 0.03;

    const sqMetersPerSquare = 9.29;
    const materialRequirementsShingles = Math.ceil(
      totalArea / sqMetersPerSquare,
    );

    const tilesPerMeter = 14;
    const materialRequirementsTile = Math.ceil(totalArea * tilesPerMeter);

    const layersNeeded = roofGeometry.complexityScore > 0.7 ? 2 : 1;

    const dragCoefficient = this.calculateDragCoefficient(roofGeometry.shape);
    const drainageCoefficient = Math.sin(pitchRad);

    const downspoutRequirements = Math.ceil(gutterLength / 9);

    const solarPotential = this.calculateSolarPotential(
      totalArea,
      roofGeometry.direction,
      roofGeometry.pitch,
    );

    return {
      totalArea,
      pitchAdjustedArea,
      dormerArea,
      overhangArea,
      eaveLength,
      ridgeLength: roofGeometry.ridgeLength ?? 0,
      skylinePentrationArea,
      gutterLength,
      downspoutRequirements,
      materialRequirementsShingles,
      materialRequirementsTile,
      layersNeeded,
      dragCoefficient,
      drainageCoefficient,
      solarPotential,
    };
  }

  /** Prefer OSM-derived perimeter; fall back to bbox estimate. */
  private static calculatePerimeterApprox(building: BuildingFootprint): number {
    if (building.perimeter > 0) return building.perimeter;

    const bbox = building.bbox;
    const length = (bbox.maxLat - bbox.minLat) * 111000;
    const width =
      (bbox.maxLon - bbox.minLon) *
      111000 *
      Math.cos((building.centerPoint[1] * Math.PI) / 180);
    return 2 * (length + width);
  }

  private static calculateDragCoefficient(shape: string): number {
    const dragCoefficients: Record<string, number> = {
      flat: 0.8,
      gabled: 0.9,
      hipped: 0.7,
      mansard: 0.75,
      gambrel: 0.85,
      unknown: 0.8,
    };
    return dragCoefficients[shape] ?? 0.8;
  }

  private static calculateSolarPotential(
    area: number,
    direction: number,
    pitch: number,
  ): number {
    const baseIrradiance = 4.5;

    const directionAngle = Math.abs(direction - 180);
    const directionEfficiency =
      Math.max(0, 1 - directionAngle / 180) * 0.9 + 0.1;

    const optimalPitch = 35;
    const pitchDifference = Math.abs(pitch - optimalPitch);
    const pitchEfficiency = Math.max(0.5, 1 - pitchDifference / 90);

    const dailyPotential =
      area * baseIrradiance * directionEfficiency * pitchEfficiency;
    const annualPotential = dailyPotential * 365;

    return Math.round(annualPotential);
  }

  static estimateMaterialCost(
    measurements: DetailedRoofMeasurement,
    materialType: "asphalt_shingle" | "metal" | "tile" | "slate" | "wood",
  ): {
    roofingMaterial: number;
    underlayment: number;
    fasteners: number;
    flashing: number;
    total: number;
  } {
    const costPerSquare: Record<string, number> = {
      asphalt_shingle: 75,
      metal: 200,
      tile: 400,
      slate: 600,
      wood: 350,
    };

    const roofingMaterial =
      (measurements.materialRequirementsShingles ?? 1) *
      (costPerSquare[materialType] ?? 75);

    const underlayment = roofingMaterial * 0.12;
    const fasteners = roofingMaterial * 0.06;
    const flashing = roofingMaterial * 0.1;

    const total = roofingMaterial + underlayment + fasteners + flashing;

    return {
      roofingMaterial: Math.round(roofingMaterial),
      underlayment: Math.round(underlayment),
      fasteners: Math.round(fasteners),
      flashing: Math.round(flashing),
      total: Math.round(total),
    };
  }

  static estimateInstallationTime(
    measurements: DetailedRoofMeasurement,
    workshiftHours = 8,
  ): {
    totalHours: number;
    days: number;
    crewSize: number;
    weeksAtStandardCrew: number;
  } {
    const squareFeet = measurements.totalArea * 10.764;
    const avgRatePerWorker = 300;
    const hoursPerDay = workshiftHours;
    const standardCrewSize = 3;

    const totalWorkerHours = (squareFeet / avgRatePerWorker) * hoursPerDay;

    const days = Math.ceil(totalWorkerHours / (hoursPerDay * standardCrewSize));

    const totalArea = Math.max(measurements.totalArea, 1e-6);
    const dormer = measurements.dormerArea ?? 0;
    const complexityMultiplier =
      1 + measurements.layersNeeded * 0.1 + (dormer * 0.2) / totalArea;

    const adjustedDays = Math.ceil(days * complexityMultiplier);
    const weeksAtStandardCrew = Math.ceil(adjustedDays / 5);

    return {
      totalHours: Math.round(totalWorkerHours),
      days: adjustedDays,
      crewSize: standardCrewSize,
      weeksAtStandardCrew,
    };
  }

  static compareRoofingOptions(measurements: DetailedRoofMeasurement): Array<{
    material: string;
    cost: number;
    lifespan: number;
    maintenanceFrequency: string;
    energyEfficiency: number;
    durability: number;
    aesthetics: number;
    recommendation: string;
  }> {
    const materials = [
      {
        material: "Asphalt Shingles",
        cost: this.estimateMaterialCost(measurements, "asphalt_shingle").total,
        lifespan: 15,
        maintenanceFrequency: "Every 3-5 years",
        energyEfficiency: 40,
        durability: 40,
        aesthetics: 70,
        recommendation: "Budget-friendly, good for most climates",
      },
      {
        material: "Metal",
        cost: this.estimateMaterialCost(measurements, "metal").total,
        lifespan: 40,
        maintenanceFrequency: "Every 5-10 years",
        energyEfficiency: 75,
        durability: 90,
        aesthetics: 60,
        recommendation: "Excellent durability and energy efficiency",
      },
      {
        material: "Tile",
        cost: this.estimateMaterialCost(measurements, "tile").total,
        lifespan: 50,
        maintenanceFrequency: "Every 10 years",
        energyEfficiency: 70,
        durability: 95,
        aesthetics: 85,
        recommendation: "Premium aesthetic, excellent longevity",
      },
      {
        material: "Slate",
        cost: this.estimateMaterialCost(measurements, "slate").total,
        lifespan: 75,
        maintenanceFrequency: "Minimal (20+ years)",
        energyEfficiency: 60,
        durability: 100,
        aesthetics: 90,
        recommendation: "Premium choice, exceptional durability",
      },
      {
        material: "Wood Shakes",
        cost: this.estimateMaterialCost(measurements, "wood").total,
        lifespan: 25,
        maintenanceFrequency: "Every 2-3 years",
        energyEfficiency: 50,
        durability: 60,
        aesthetics: 95,
        recommendation: "Beautiful natural appearance, requires maintenance",
      },
    ];

    return materials.map((m) => ({
      ...m,
      energyEfficiency: Math.round(m.energyEfficiency),
      durability: Math.round(m.durability),
      aesthetics: Math.round(m.aesthetics),
    }));
  }
}

export default RoofMeasurementService;
