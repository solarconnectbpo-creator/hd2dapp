export type DamageType =
  | "Hail"
  | "Wind"
  | "Missing Shingles"
  | "Leaks"
  | "Flashing"
  | "Structural";

export type Severity = 1 | 2 | 3 | 4 | 5;

export type RecommendedAction = "Repair" | "Replace" | "Insurance Claim Help" | "Further Inspection";

export interface PropertySelection {
  id?: string;
  address: string;
  lat: number;
  lng: number;
  clickedAtIso: string;

  // Optional contact info that may come from an uploaded CSV
  homeownerName?: string;
  email?: string;
  phone?: string;

  // Optional roof details that may come from an uploaded CSV
  roofSqFt?: number;
  roofType?: string;
}

export interface RoofReportCreatedBy {
  id: string;
  email: string;
  name: string;
  userType: "sales_rep" | "company" | "admin";
}

export interface RoofMeasurements {
  roofAreaSqFt?: number;
  roofPerimeterFt?: number;
  roofPitch?: string;
  roofStories?: number;
  // Free-form notes if you want to record additional measurements manually.
  notes?: string;

  /**
   * Third-party aerial measurement report (e.g. EaveMeasure aerial services).
   * The eavemeasure-aerial-roof-measurement GitHub repo is informational only (no API/SDK there).
   */
  aerialMeasurementProvider?: string;
  aerialMeasurementReference?: string;
  aerialMeasurementReportUrl?: string;
}

export interface BuildingCodeInfo {
  jurisdiction?: string; // city/state/county string
  codeReference?: string; // e.g. "IRC / Roof Covering Requirements"
  checks: Array<{
    id: string;
    label: string;
    details?: string;
  }>;
}

export interface RoofReportImage {
  id: string;
  dataUrl: string; // web-only base64 data URL for embedding into HTML export
  caption?: string;
  uploadedAtIso: string;
}

export interface RoofDamageEstimate {
  estimateId: string;
  createdAtIso: string;

  roofAreaSqFt?: number;
  // "repair" or "replace" is our simplified approach label.
  scope: "repair" | "replace";

  lowCostUsd: number;
  highCostUsd: number;
  confidence: "low" | "medium" | "high";

  // Optional human notes (e.g., "estimated due to hail impact patterns")
  notes?: string;
}

export interface NonRoofLineItemsEstimate {
  hvacUnits?: number;
  finCombUnits?: number;
  fenceCleanSqFt?: number;
  fenceStainSqFt?: number;
  windowWrapSmallQty?: number;
  windowWrapStandardQty?: number;
  houseWrapSqFt?: number;
  fanfoldSqFt?: number;

  lowCostUsd: number;
  highCostUsd: number;
}

/** Latest aviation METAR pulled for storm / weather context (airport observation, not rooftop). */
export interface MetarWeatherSnapshot {
  fetchedAtIso: string;
  stationIcao: string;
  stationName?: string;
  /** Distance from property to chosen reference station when auto-suggested. */
  distanceMilesApprox?: number;
  rawMetar: string;
  summaryLines: string[];
  tempC?: number;
  dewpC?: number;
  windDir?: number;
  windSpdKt?: number;
  windGustKt?: number;
  visibility?: string;
  flightCategory?: string;
  cloudsSummary?: string;
  stormIndicators?: string[];
}

export interface DamageRoofReport {
  id: string;
  createdAtIso: string;

  property: PropertySelection;

  companyName?: string;
  companyLogoUrl?: string;
  creatorName?: string;

  inspectionDate: string; // YYYY-MM-DD
  homeownerName?: string;
  homeownerEmail?: string;
  homeownerPhone?: string;
  roofType?: string;
  /**
   * Roof "form" derived from outline + pitch (gable/hip/flat).
   * This is separate from `roofType` (roofing material/system label).
   */
  roofFormType?: string;
  roofSystemCategory?: string;
  scopeOfWork?: string[];

  // Optional material requirements (computed from selected material + pitch).
  roofMaterialType?: string;
  materialRequirements?: {
    roofType: string;
    mainMaterial: string;
    wasteFactor: number;
    wastePct?: number;
    unit: string;
    notes?: string;
    extras?: string[];
  };

  /**
   * AI-style damage risk score + suggested action plan.
   * (Computed from app inputs; optional roof age improves accuracy.)
   */
  aiDamageRisk?: {
    score: number; // 0-100
    level: "Low" | "Medium" | "High";
    factors: string[];
    actionPlan: string[];
  };

  damageTypes: DamageType[];
  severity: Severity;
  recommendedAction: RecommendedAction;
  notes?: string;

  measurements?: RoofMeasurements;
  buildingCode?: BuildingCodeInfo;
  images?: RoofReportImage[];

  // Optional: GeoJSON roof outline drawn by the user (for measurement & future map overlays).
  roofTraceGeoJson?: any;
  propertyImageUrl?: string;
  propertyImageSource?: string;
  roofDiagramImageUrl?: string;
  roofDiagramSource?: string;
  roofPitchDiagramImageUrl?: string;
  roofPitchDiagramSource?: string;
  roofLengthsDiagramImageUrl?: string;
  roofLengthsDiagramSource?: string;

  estimate?: RoofDamageEstimate;
  nonRoofEstimate?: NonRoofLineItemsEstimate;

  /** Nearest major airport METAR — see `metarWeather.ts`. */
  metarWeather?: MetarWeatherSnapshot;

  // EagleView-style breakdown (ported from InVisionCRM/eagleview-estimator).
  eagleViewEstimate?: {
    materials: {
      shingles: { quantity: number; cost: number };
      underlayment: { quantity: number; cost: number };
      iceAndWater: { quantity: number; cost: number };
      ridgeVent: { quantity: number; cost: number };
      ridgeCap: { quantity: number; cost: number };
      starterStrip: { quantity: number; cost: number };
      nails: { quantity: number; cost: number };
      total: number;
    };
    labor: {
      base: number;
      adjustedRate: number;
      total: number;
    };
    additional: {
      dumpster?: number;
      permit?: number;
      overhead: number;
      profit: number;
    };
    totals: {
      subtotal: number;
      overhead: number;
      profit: number;
      final: number;
    };
  };

  createdBy?: RoofReportCreatedBy;
}

