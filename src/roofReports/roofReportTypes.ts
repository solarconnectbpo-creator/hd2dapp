import type { FieldQaChecklistState } from "./fieldQaChecklist";

export type {
  FieldQaChecklistId,
  FieldQaChecklistState,
} from "./fieldQaChecklist";

export type DamageType =
  | "Hail"
  | "Wind"
  | "Missing Shingles"
  | "Leaks"
  | "Flashing"
  | "Structural";

export type Severity = 1 | 2 | 3 | 4 | 5;

export type RecommendedAction =
  | "Repair"
  | "Replace"
  | "Insurance Claim Help"
  | "Further Inspection";

/** How the building is used — drives IRC vs. IBC reference sections and IRC checklist occupancy. */
export type PropertyUseType = "residential" | "commercial" | "unknown";

export interface PropertySelection {
  id?: string;
  address: string;
  lat: number;
  lng: number;
  clickedAtIso: string;

  // Optional contact info that may come from an uploaded CSV
  homeownerName?: string;
  /** Business / account name from CSV (e.g. company, contractor). */
  companyName?: string;
  /** Office / company phone from CSV (for exports and follow-up). */
  companyPhone?: string;
  /** Office / company email from CSV. */
  companyEmail?: string;
  email?: string;
  phone?: string;
  /** Per-row inspector override (bulk CSV); otherwise screen default applies. */
  inspectorName?: string;

  // Optional roof details that may come from an uploaded CSV
  roofSqFt?: number;
  roofType?: string;
  /** User override or inferred from address / roof system (see `inferPropertyUseType`). */
  propertyUse?: PropertyUseType;
}

export interface RoofReportCreatedBy {
  id: string;
  email: string;
  name: string;
  userType: "sales_rep" | "company" | "admin";
}

/** Advisory flags from `computeMeasurementValidationSummary` (trace vs AI vs estimate). */
export type MeasurementAlertLevel = "ok" | "warning" | "critical";

export interface RoofMeasurementValidationSummary {
  computedAtIso: string;
  overallConfidence: "low" | "medium" | "high";
  areaTraceVsAi?: {
    traceSqFt: number;
    aiSqFt: number;
    divergencePct: number;
    alertLevel: MeasurementAlertLevel;
  };
  perimeterTraceVsAi?: {
    traceFt: number;
    aiFt: number;
    divergencePct: number;
    alertLevel: MeasurementAlertLevel;
  };
  pitchManualVsTerrain?: {
    manualRise?: number;
    terrainRise?: number;
    riseSpread: number;
    alertLevel: MeasurementAlertLevel;
  };
  pitchManualVsAi?: {
    manualRise?: number;
    aiRise?: number;
    riseSpread: number;
    alertLevel: MeasurementAlertLevel;
  };
  estimateAreaVsTrace?: {
    estimateSqFt: number;
    traceSqFt: number;
    divergencePct: number;
    alertLevel: MeasurementAlertLevel;
  };
  messages: string[];
}

export interface RoofMeasurements {
  roofAreaSqFt?: number;
  roofPerimeterFt?: number;
  roofPitch?: string;
  /** Mapbox terrain-derived pitch (web trace); advisory. */
  terrainPitchEstimate?: string;
  /** Mean elevation at traced corners (m, WGS84 terrain). */
  avgTerrainElevationM?: number;
  /** Corners with optional elevation from terrain (web). */
  roofTracePoints3D?: Array<{ lng: number; lat: number; elevation?: number }>;
  /**
   * Last AI vision estimate for pitch (advisory). `roofPitch` may match `estimatePitch` after user applies it.
   */
  roofPitchAiGauge?: {
    estimatePitch: string;
    confidence: "low" | "medium" | "high";
    rationale: string;
    estimatedAtIso: string;
    model?: string;
    imageSource?: "uploaded_photo" | "satellite";
    /** From vision when image includes scale / measurement overlay; advisory. */
    estimateRoofAreaSqFt?: number | null;
    estimateRoofPerimeterFt?: number | null;
    measurementConfidence?: "low" | "medium" | "high" | null;
    measurementRationale?: string;
  };
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

  /**
   * Last integrated run from **Precision measurement** (Nearmap / EagleView via proxy or client fallback).
   * Stored for export/review; does not replace manual roof area unless you copy values elsewhere.
   */
  precisionMeasurementSnapshot?: RoofPrecisionMeasurementSnapshot;

  /** Populated when the report is built — cross-checks trace, AI, terrain, and estimate. */
  measurementValidationSummary?: RoofMeasurementValidationSummary;
}

/** Serializable record of a precision / hybrid provider run for damage reports. */
export interface RoofPrecisionMeasurementSnapshot {
  capturedAtIso: string;
  success: boolean;
  provider: "eagleview" | "nearmap" | "hybrid" | "fallback";
  confidence: number;
  processingTimeMs: number;
  priority: "accuracy" | "speed" | "cost";
  addressLine: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  tile?: { z: number; x: number; y: number };
  nearmapSurveyIds?: string[];
  eagleViewOrderId?: string;
  eagleViewStatus?: string;
  errorMessage?: string;
}

export interface BuildingCodeInfo {
  jurisdiction?: string; // city/state/county string
  codeReference?: string; // e.g. "IRC / Roof Covering Requirements"
  /** US state code when resolved from property location (drives adopted-code text). */
  stateCode?: string;
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

/** Catalog id for `lowSlopeMaterialEstimate` — matches `lowSlopePricingCatalog.generated.ts`. */
export type LowSlopeCatalogSystemId =
  | "modified-bitumen"
  | "epdm"
  | "tpo"
  | "pvc"
  | "roof-coatings";

export interface LowSlopeEstimateLineItem {
  description: string;
  section?: string;
  unit: string;
  quantity: number;
  removePerUnitUsd?: number;
  replacePerUnitUsd?: number;
  taxPerUnitUsd?: number;
  removeTotalUsd: number;
  replaceTotalUsd: number;
  taxTotalUsd: number;
  lineTotalUsd: number;
}

export interface LowSlopeMaterialEstimate {
  priceListReference: string;
  catalogSystem: LowSlopeCatalogSystemId;
  roofSquares: number;
  /** Full tear-off + membrane vs indicative partial repair quantities. */
  scopeMode: "full-replacement" | "repair-indicative";
  lines: LowSlopeEstimateLineItem[];
  totals: {
    removeUsd: number;
    replaceUsd: number;
    taxUsd: number;
    subtotalUsd: number;
  };
  notes: string[];
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

  /**
   * Same as `property.propertyUse` when set — duplicated for quick access in exports and tax heuristics.
   */
  propertyUse?: PropertyUseType;

  companyName?: string;
  /** Company office phone (e.g. from bulk CSV). */
  companyPhone?: string;
  /** Company office email (e.g. from bulk CSV). */
  companyEmail?: string;
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
   * Automatic system resolution: roof type text + material selector → category,
   * standard component checklist, and accuracy notes for complete reports.
   */
  materialSystemAnalysis?: import("./roofMaterialSystemAnalysis").RoofMaterialSystemAnalysis;

  /**
   * Inspector confirmed the roof type field + material selector match field conditions
   * (especially when `materialSystemAnalysis.agreement` is conflict).
   */
  materialSystemFieldVerified?: boolean;

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
  /** Axonometric / LiDAR-style 3D extrusion with per-edge LF from trace + pitch. */
  roofLidar3dDiagramImageUrl?: string;
  roofLidar3dDiagramSource?: string;

  estimate?: RoofDamageEstimate;
  nonRoofEstimate?: NonRoofLineItemsEstimate;

  /**
   * Scheduling CTA + contact (built from env + estimate; optional AI polishes wording only).
   */
  scheduleInspection?: import("./scheduleInspectionBlock").ScheduleInspectionBlock;

  /** Nearest major airport METAR — see `metarWeather.ts`. */
  metarWeather?: MetarWeatherSnapshot;

  /** Optional inspector field QA checklist — see `fieldQaChecklist.ts`. */
  fieldQaChecklist?: FieldQaChecklistState;

  /**
   * Low-slope / commercial membrane & coating line items (MOSL8X cheat sheet catalog).
   * Populated when `roofSystemCategory` is TPO, EPDM, PVC, mod bit, BUR, coating, or flat-generic.
   */
  lowSlopeMaterialEstimate?: LowSlopeMaterialEstimate;

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
