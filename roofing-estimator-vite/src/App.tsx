import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useSearchParams } from "react-router";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useRoofing } from "./context/RoofingContext";
import { type ContactRecord, parseContactsCsv } from "./lib/contactsCsv";
import {
  loadContactsFromStorage,
  loadOrgSettings,
  saveContactsToStorageSafe,
} from "./lib/orgSettings";
import {
  PENDING_PROPERTY_IMPORT_KEY,
  type PropertyImportPayload,
} from "./lib/propertyScraper";
import {
  PROPERTY_SCRAPER_BATCHDATA_KEY_STORAGE,
  fetchBatchDataPropertyByAddress,
  formatTaxSummaryFromBatchDataRecord,
  nominatimReverseToBatchDataCriteria,
  parseUsAddressLineForBatchData,
} from "./lib/propertyBatchDataLookup";
import {
  computePolygonRoofGeometry,
  computeRoofGeometryFromPlanInputs,
  effectiveWallHeightFt,
  inferRoofFormType,
  type RoofStructureMode,
} from "./lib/roofGeometryFromPolygons";
import {
  exteriorRingLngLatFromPolygonFeature,
  fetchRaybevelSkeletonSvg,
} from "./lib/raybevelDiagramClient";
import { getHd2dApiBase } from "./lib/hd2dApiBase";
import { applyMapboxCspWorker } from "./lib/mapboxViteWorker";

type DamageType = "Hail" | "Wind" | "Missing Shingles" | "Leaks" | "Flashing" | "Structural";
type ParserConfidence = "low" | "medium" | "high";
type ValuationBasis = "RCV" | "ACV" | "line-total";
type DeltaDirection = "under-scoped" | "over-scoped" | "aligned";
type RoofLineType = "ridge" | "hip" | "valley" | "eave" | "rake" | "wall-flashing" | "step-flashing";

const DAMAGE_TYPES: DamageType[] = ["Hail", "Wind", "Missing Shingles", "Leaks", "Flashing", "Structural"];
const DAMAGE_PHOTO_TAGS = [
  "hail-impact",
  "wind-crease",
  "granule-loss",
  "puncture",
  "uplift",
  "exposed-fastener",
  "ponding",
  "seam-failure",
  "flashing-failure",
  "interior-leak",
  "gutter-damage",
  "collateral",
] as const;
const STORAGE_KEY = "roofing-estimator-vite-jobs-v1";
const MAPBOX_TOKEN_STORAGE_KEY = "roofing-estimator-vite-mapbox-token-v1";
const PROPERTY_DB_KEY = "roofing-estimator-vite-property-db-v1";

const INTEL_API_BASE = getHd2dApiBase();
/**
 * Esri vector tiles for [Microsoft US Building Footprints](https://github.com/microsoft/USBuildingFootprints) (ODbL).
 * Source-layer id matches Esri style `root.json`.
 */
const MS_BUILDING_FOOTPRINT_TILES =
  "https://tiles.arcgis.com/tiles/P3ePLMYs2RVChkJx/arcgis/rest/services/Microsoft_Building_Footprints/VectorTileServer/tile/{z}/{y}/{x}.pbf";
const MS_BUILDING_FOOTPRINT_SOURCE_LAYER = "MSBFLow";
/** Applied per effective square (after waste) in scope; scaled by regional multiplier like other lines. */
const LABOR_PER_SQUARE_USD = 350;

function isLaborScopeLine(code: string): boolean {
  return code === "LAB-SQ" || code.startsWith("LABMIN");
}
const MISSOURI_BBOX = { west: -95.78, east: -89.09, north: 40.62, south: 35.99 } as const;

const ROOF_LINE_TYPES: { type: RoofLineType; label: string; color: string; formKey: string }[] = [
  { type: "ridge", label: "Ridge", color: "#ef4444", formKey: "ridgesFt" },
  { type: "hip", label: "Hip", color: "#f97316", formKey: "hipsFt" },
  { type: "valley", label: "Valley", color: "#22c55e", formKey: "valleysFt" },
  { type: "eave", label: "Eave", color: "#3b82f6", formKey: "eavesFt" },
  { type: "rake", label: "Rake", color: "#a855f7", formKey: "rakesFt" },
  { type: "wall-flashing", label: "Wall Flashing", color: "#eab308", formKey: "wallFlashingFt" },
  { type: "step-flashing", label: "Step Flashing", color: "#06b6d4", formKey: "stepFlashingFt" },
];

interface DrawnRoofLine {
  id: string;
  type: RoofLineType;
  lengthFt: number;
  geometry: any;
}

const STATE_MULTIPLIER: Record<string, number> = {
  AK: 1.34, CA: 1.28, CO: 1.09, CT: 1.12, DC: 1.2, FL: 1.03, HI: 1.36, MA: 1.16,
  MD: 1.1, NJ: 1.16, NY: 1.2, OR: 1.07, WA: 1.12, TX: 0.96, MO: 0.94, MN: 1.05,
};

interface FormState {
  address: string;
  stateCode: string;
  latitude: string;
  longitude: string;
  roofType: string;
  roofStructure: RoofStructureMode;
  stories: string;
  exteriorWallHeightFt: string;
  areaSqFt: string;
  perimeterFt: string;
  roofPitch: string;
  wastePercent: string;
  measuredSquares: string;
  ridgesFt: string;
  eavesFt: string;
  rakesFt: string;
  valleysFt: string;
  hipsFt: string;
  wallFlashingFt: string;
  stepFlashingFt: string;
  othersFt: string;
  severity: number;
  damageTypes: DamageType[];
  carrierScopeText: string;
  deductibleUsd: string;
  nonRecDepUsd: string;
  /** Year built, lot size, etc. from property record import (Property records page). */
  propertyRecordNotes: string;
}

interface CarrierParsed {
  valuationBasis: ValuationBasis;
  total: number;
  rcv: number | null;
  acv: number | null;
  dep: number | null;
  /** Parsed “Supplement … RCV/Total” style figures from pasted carrier scope. */
  supplementAmounts: number[];
  supplementLabeledTotal: number | null;
  deductibleFromCarrier: number | null;
  netClaimFromCarrier: number | null;
  parsedLineCount: number;
  parserConfidence: ParserConfidence;
  lineMathMismatchCount: number;
  lineMathTotal: number;
  lineCodes: string[];
  likelyMissingItems: string[];
}

interface DrawingMeasurement {
  code: string;
  label: string;
  value: string;
}

interface ScopeLine {
  code: string;
  description: string;
  quantity: number;
  unit: "SQ" | "LF" | "EA" | "SF" | "HR" | "DA";
  unitCost: number;
  total: number;
}

interface RoofStructureSuggestion {
  mode: Exclude<RoofStructureMode, "auto">;
  confidence: "low" | "medium" | "high";
  score: number;
  reason: string;
  rules: string[];
}

interface EstimateResult {
  scope: "repair" | "replace";
  scopeLines: ScopeLine[];
  drawingMeasurements: DrawingMeasurement[];
  lineItemTotal: number;
  materialSalesTax: number;
  /** Line items + material sales tax, before estimate markup. */
  rcvSubtotalBeforeMarkup: number;
  /** Added to `rcvSubtotalBeforeMarkup` so RCV = × ESTIMATE_TOTAL_MARKUP_MULTIPLIER. */
  estimateMarkupAmount: number;
  replacementCostValue: number;
  depreciation: number;
  actualCashValue: number;
  totalCost: number;
  finalCost: number;
  confidence: "low" | "medium" | "high";
  /** Surface takeoff squares (100 SF roof surface per SQ), before waste factor. */
  surfaceSquares: number;
  /** Same as surface × (1 + waste%); drives SQ-priced scope lines. */
  effectiveSquares: number;
  wastePct: number;
  regional: number;
  quality: number;
  warnings: string[];
  carrier: CarrierParsed;
  delta: number;
  deltaDirection: DeltaDirection;
  settlement: {
    deductible: number;
    recoverableDep: number;
    initialPayment: number;
    finalProjected: number;
    outOfPocket: number;
  };
}

interface SavedJob {
  id: string;
  name: string;
  createdAtIso: string;
  form: FormState;
}

interface SavedApiReport {
  id: number;
  total_area_sqft: number;
  roof_sections: number;
  created_at: string;
  address?: string;
  state?: string;
  pitch?: string;
  features?: Array<Record<string, unknown>>;
}

interface PropertyOwnerRecord {
  id: string;
  address: string;
  lat: number;
  lng: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  propertyType: "residential" | "commercial" | "multi-family" | "other";
  yearBuilt: string;
  lotSizeSqFt: string;
  roofType: string;
  stories: string;
  /** Human-readable assessor/tax lines collected from BatchData. */
  taxSummary: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface StlIntelData {
  parcel: Record<string, unknown> | null;
  buildingPermits: Array<Record<string, unknown>>;
  tradesPermits: Array<Record<string, unknown>>;
  lraParcel: Record<string, unknown> | null;
  taxSaleParcel: Record<string, unknown> | null;
  demolitionParcel: Record<string, unknown> | null;
  esriWorldImageryTiles?: string;
}

interface StlStormData {
  days: number;
  iemLocalStormReports?: { type?: string; features?: Array<Record<string, unknown>> };
  spcDay1Outlook?: { type?: string; features?: Array<Record<string, unknown>> };
  nwsActiveAlerts?: { type?: string; features?: Array<Record<string, unknown>> };
}

interface TaggedDamagePhoto {
  id: string;
  name: string;
  previewUrl: string;
  tags: string[];
}

type ProposalProfile = "residential" | "commercial";

interface ProposalState {
  profile: ProposalProfile;
  companyName: string;
  companyAddress: string;
  companyWebsite: string;
  logoDataUrl: string;
  preparedBy: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  contactEmail: string;
  contactPhone: string;
  proposalTitle: string;
  inclusions: string;
  exclusions: string;
  paymentSchedule: string;
  warranty: string;
  alternates: string;
  financingNotes: string;
  /** Auto-filled from carrier comparison + settlement when you run Generate Estimate. */
  insuranceSupplementNotes: string;
  /** Auto-filled payout summary (initial ACV, projected final, OOP) when you run Generate Estimate. */
  estimatedInsurancePayout: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Rise in inches per 12 in horizontal run. Accepts 6/12, 6:12, "6 on 12", arbitrary rise/run, or a plain rise number. */
function parsePitchRise(pitch?: string): number | null {
  if (!pitch?.trim()) return null;
  const s = pitch.trim().replace(/：/g, ":").replace(/\s+/g, " ");
  const slash12 = s.replace(/:/g, "/").match(/^(\d+(?:\.\d+)?)\s*\/\s*12$/i);
  if (slash12?.[1]) {
    const n = Number.parseFloat(slash12[1]);
    return Number.isFinite(n) ? n : null;
  }
  const ratio = s.replace(/:/g, "/").match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (ratio?.[1] && ratio?.[2]) {
    const rise = Number.parseFloat(ratio[1]);
    const run = Number.parseFloat(ratio[2]);
    if (Number.isFinite(rise) && Number.isFinite(run) && run > 0) return (rise / run) * 12;
  }
  const on12 = s.match(/^(\d+(?:\.\d+)?)\s*(?:on|in|per)\s*12$/i);
  if (on12?.[1]) {
    const n = Number.parseFloat(on12[1]);
    return Number.isFinite(n) ? n : null;
  }
  const plain = s.match(/^(\d+(?:\.\d+)?)$/);
  if (plain?.[1]) {
    const n = Number.parseFloat(plain[1]);
    if (Number.isFinite(n) && n >= 0 && n <= 24) return n;
  }
  return null;
}

function canonicalPitchRiseOver12(pitch: string | number): string {
  const s = String(pitch).trim();
  const rise = parsePitchRise(s);
  if (rise == null) return s;
  const r = Math.round(rise * 100) / 100;
  return `${r}/12`;
}

function fmtLengthFeetInches(ft: number): string {
  if (ft <= 0) return "0ft 0in";
  const w = Math.floor(ft);
  const inches = Math.round((ft - w) * 12);
  return `${w}ft ${inches}in`;
}

/** Rectangle footprint on map (feet) aligned N–S × E–W from property coordinates. */
async function buildAiFootprintPolygonFeature(
  lng: number,
  lat: number,
  buildingLFt: number,
  buildingWFt: number,
): Promise<{ type: "Feature"; id: string; geometry: { type: "Polygon"; coordinates: number[][][] }; properties: Record<string, never> }> {
  const turf = await import("@turf/turf");
  const c = turf.point([lng, lat]);
  const north = turf.destination(c, buildingWFt / 2, 0, { units: "feet" });
  const south = turf.destination(c, buildingWFt / 2, 180, { units: "feet" });
  const ne = turf.destination(north, buildingLFt / 2, 90, { units: "feet" });
  const nw = turf.destination(north, buildingLFt / 2, 270, { units: "feet" });
  const se = turf.destination(south, buildingLFt / 2, 90, { units: "feet" });
  const sw = turf.destination(south, buildingLFt / 2, 270, { units: "feet" });
  const ring: number[][] = [
    ne.geometry.coordinates as number[],
    se.geometry.coordinates as number[],
    sw.geometry.coordinates as number[],
    nw.geometry.coordinates as number[],
    ne.geometry.coordinates as number[],
  ];
  const poly = turf.polygon([ring]);
  return {
    type: "Feature",
    id: `ai-footprint-${Date.now()}`,
    geometry: poly.geometry as { type: "Polygon"; coordinates: number[][][] },
    properties: {},
  };
}

/** Largest polygon from a Mapbox query hit (Microsoft footprints are Polygon or MultiPolygon). */
async function msFootprintFeatureForDraw(mapFeature: {
  geometry?: { type?: string; coordinates?: unknown };
}): Promise<{ type: "Feature"; id: string; geometry: { type: "Polygon"; coordinates: number[][][] }; properties: Record<string, string> } | null> {
  const turf = await import("@turf/turf");
  const g = mapFeature.geometry;
  if (!g || !g.coordinates) return null;
  if (g.type === "Polygon") {
    const coords = g.coordinates as number[][][];
    return {
      type: "Feature",
      id: `ms-footprint-${Date.now()}`,
      geometry: { type: "Polygon", coordinates: coords },
      properties: { source: "microsoft-us-building-footprints" },
    };
  }
  if (g.type === "MultiPolygon") {
    const polys = g.coordinates as number[][][][];
    let best: number[][][] | null = null;
    let bestA = -1;
    for (const rings of polys) {
      const poly = turf.polygon(rings);
      const a = turf.area(poly);
      if (a > bestA) {
        bestA = a;
        best = rings;
      }
    }
    if (!best) return null;
    return {
      type: "Feature",
      id: `ms-footprint-${Date.now()}`,
      geometry: { type: "Polygon", coordinates: best },
      properties: { source: "microsoft-us-building-footprints" },
    };
  }
  return null;
}

function parseLengthFeet(value?: string): number {
  if (!value?.trim()) return 0;
  const text = value.trim().toLowerCase();
  const ftIn = text.match(/(\d+(?:\.\d+)?)\s*ft\s*(\d+(?:\.\d+)?)?\s*in?/);
  if (ftIn?.[1]) {
    const ft = Number.parseFloat(ftIn[1]) || 0;
    const inches = Number.parseFloat(ftIn[2] ?? "0") || 0;
    return ft + inches / 12;
  }
  const n = Number.parseFloat(text.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Line lengths for diagrams — same source as `buildResult` (parsed from form), not re-parsed from formatted DRW strings. */
function getLineLengthsFromForm(form: FormState) {
  return {
    ridges: parseLengthFeet(form.ridgesFt),
    eaves: parseLengthFeet(form.eavesFt),
    rakes: parseLengthFeet(form.rakesFt),
    valleys: parseLengthFeet(form.valleysFt),
    hips: parseLengthFeet(form.hipsFt),
    wallFlashing: parseLengthFeet(form.wallFlashingFt),
    stepFlashing: parseLengthFeet(form.stepFlashingFt),
  };
}

/** Rectangle plan dimensions (long × short) from plan area + optional perimeter — matches polygon-free geometry in `computeRoofGeometryFromPlanInputs`. */
function diagramFootprintFromForm(form: FormState): { lengthFt: number; widthFt: number } | null {
  const area = Number.parseFloat(form.areaSqFt);
  if (!Number.isFinite(area) || area <= 0) return null;
  const perimRaw = Number.parseFloat(form.perimeterFt);
  const perim = Number.isFinite(perimRaw) && perimRaw > 0 ? perimRaw : null;
  const g = computeRoofGeometryFromPlanInputs(
    area,
    perim,
    form.roofType,
    form.roofStructure,
    form.roofPitch,
  );
  if (
    !g ||
    !Number.isFinite(g.buildingL) ||
    !Number.isFinite(g.buildingW) ||
    g.buildingL <= 0 ||
    g.buildingW <= 0
  ) {
    return null;
  }
  return { lengthFt: g.buildingL, widthFt: g.buildingW };
}

function readFileAsBase64Raw(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result || "");
      const comma = s.indexOf(",");
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/** Downscale and JPEG-encode so the Worker JSON body stays small and vision still works. */
async function prepareImageForRoofPitchAi(file: File): Promise<{ imageBase64: string; mimeType: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const maxEdge = 2048;
      const w = bitmap.width;
      const h = bitmap.height;
      const scale = Math.min(1, maxEdge / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not prepare image");
      ctx.drawImage(bitmap, 0, 0, cw, ch);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      const comma = dataUrl.indexOf(",");
      const imageBase64 = (comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl).replace(/\s/g, "");
      return { imageBase64, mimeType: "image/jpeg" };
    } finally {
      bitmap.close();
    }
  } catch {
    const raw = (await readFileAsBase64Raw(file)).replace(/\s/g, "");
    return {
      imageBase64: raw,
      mimeType: file.type?.startsWith("image/") ? file.type : "image/jpeg",
    };
  }
}

/**
 * Plan footprint (SF) and surface takeoff squares (100 SF roof surface per SQ) for estimates.
 * When only plan area is entered, surface squares = (plan SF / 100) × pitch factor.
 */
function deriveRoofQuantities(form: FormState): { planAreaSqFt: number; surfaceSquares: number } | null {
  const explicitArea = Number.parseFloat(form.areaSqFt);
  const measuredSquares = Number.parseFloat(form.measuredSquares);
  const hasMeasured = Number.isFinite(measuredSquares) && measuredSquares > 0;
  const hasPlan = Number.isFinite(explicitArea) && explicitArea > 0;
  if (!hasMeasured && !hasPlan) return null;

  const pitchRise = parsePitchRise(form.roofPitch) ?? 6;
  const pitchFactor = Math.sqrt(1 + (pitchRise / 12) ** 2);

  if (hasMeasured && hasPlan) {
    return { planAreaSqFt: explicitArea, surfaceSquares: measuredSquares };
  }
  if (hasMeasured) {
    const surfaceSf = measuredSquares * 100;
    return { planAreaSqFt: surfaceSf / pitchFactor, surfaceSquares: measuredSquares };
  }
  return {
    planAreaSqFt: explicitArea,
    surfaceSquares: (explicitArea / 100) * pitchFactor,
  };
}

function suggestRoofStructureFromInputs(form: FormState): RoofStructureSuggestion {
  const buildSuggestion = (
    mode: Exclude<RoofStructureMode, "auto">,
    score: number,
    reason: string,
    rules: string[],
  ): RoofStructureSuggestion => ({
    mode,
    score,
    confidence: score >= 80 ? "high" : score >= 60 ? "medium" : "low",
    reason,
    rules,
  });

  const inferred = inferRoofFormType(form.roofType, "auto");
  if (inferred === "complex") {
    return buildSuggestion("complex", 95, "Roof type already indicates a complex/multi-facet roof.", [
      "roof-type-inference:complex",
    ]);
  }
  if (inferred === "mansard") {
    return buildSuggestion("mansard", 92, "Roof type indicates mansard.", [
      "roof-type-inference:mansard",
    ]);
  }

  const pitch = parsePitchRise(form.roofPitch);
  const ridges = parseLengthFeet(form.ridgesFt);
  const hips = parseLengthFeet(form.hipsFt);
  const valleys = parseLengthFeet(form.valleysFt);
  const eaves = parseLengthFeet(form.eavesFt);
  const rakes = parseLengthFeet(form.rakesFt);
  const perimeter = Number.parseFloat(form.perimeterFt) || 0;
  const areaSqFt = deriveRoofQuantities(form)?.planAreaSqFt ?? 0;

  const edgeTotal = Math.max(1, eaves + rakes + (perimeter > 0 ? perimeter : 0));
  const structuralTotal = ridges + hips + valleys;
  const complexityRatio = structuralTotal / edgeTotal;
  const rules: string[] = [];

  if ((valleys >= 120 && hips >= 120) || (structuralTotal >= 320 && complexityRatio >= 0.6)) {
    rules.push("high-valley-hip-footage", "high-structural-edge-ratio");
    return buildSuggestion(
      "complex",
      91,
      "High combined ridge/hip/valley linear footage indicates a multi-facet roof geometry.",
      rules,
    );
  }

  if (pitch != null && pitch <= 2) {
    rules.push("pitch-low-slope");
    return buildSuggestion("flat", 89, "Low pitch (2/12 or less) indicates a flat/low-slope roof.", rules);
  }

  if (hips > 0 && hips >= ridges * 0.75 && hips >= 30) {
    rules.push("hip-to-ridge-ratio");
    return buildSuggestion("hip", 72, "Hip footage is strong relative to ridge footage.", rules);
  }

  if (valleys > 0 && ridges > 0 && valleys >= ridges * 0.9 && areaSqFt > 2200) {
    rules.push("valley-density-large-area");
    return buildSuggestion("complex", 68, "Valley density is high for the measured roof area.", rules);
  }

  if (inferred === "flat" || inferred === "hip") {
    rules.push("roof-type-material-inference");
    return buildSuggestion(inferred, 64, "Suggested from selected material/roof type.", rules);
  }

  rules.push("default-gable-fallback");
  return buildSuggestion("gable", 48, "Defaulted to gable from current roof type and measured geometry.", rules);
}

function inferPropertyTypeFromParcel(parcel: Record<string, unknown> | null): "residential" | "commercial" | "other" {
  if (!parcel) return "other";
  const text = Object.values(parcel).filter((v) => typeof v === "string").join(" ").toLowerCase();
  if (text.includes("single family") || text.includes("residential") || text.includes("dwelling")) return "residential";
  if (text.includes("commercial") || text.includes("industrial") || text.includes("retail") || text.includes("office")) return "commercial";
  return "other";
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

/** Applied after line items + reference material sales tax to produce RCV / proposal total (50% added → ×1.5). */
const ESTIMATE_TOTAL_MARKUP_MULTIPLIER = 1.5;

/** IBC 2018 Ch. 15 — roof assemblies & rooftop structures (ICC Digital Codes). */
const ICC_IBC2018_CHAPTER15_ROOF_URL =
  "https://codes.iccsafe.org/content/IBC2018P6/chapter-15-roof-assemblies-and-rooftop-structures#IBC2018P6_Ch15";

/** 2024 IRC — ICC Digital Codes (https://codes.iccsafe.org/content/IRC2024P2); confirm adopted edition with AHJ. */
const ICC_IRC2024_URL = "https://codes.iccsafe.org/content/IRC2024P2";

/**
 * IRC / IBC / ASTM references for proposals (material-appropriate; verify against adopted code year / AHJ).
 * Replaces vague pairings (e.g. “R905/R908”) with chapter/section-level citations used on typical roofing bids.
 */
const ROOFING_COMPLIANCE_REFERENCES: readonly string[] = [
  "IRC R903 — Weather protection (flashing, drainage)",
  "IRC R904 — Materials (roof covering)",
  "IRC R905 — Roof coverings (R905.2 asphalt shingles, R905.3 slate, R905.4 tile, R905.5 metal; low-slope / single-ply per adopted edition subsections)",
  "IRC R806 — Roof ventilation",
  "IBC Chapter 15 — Roof assemblies & rooftop structures; §1504 weather protection; §1507 roof coverings (confirm adopted IBC edition)",
  "ASTM D3462 — Asphalt shingles (glass mat)",
  "ASTM D7158 — Asphalt shingles (wind-resistance classification)",
  "ASTM D3161 — Asphalt shingles (fan-induced wind)",
  "ASTM D1970 — Self-adhering polymer-modified bituminous underlayment (ice & water shield)",
  "ASTM D6757 / D4869 / D228 — Underlayments used with steep-slope roofing",
  "ASTM D6878 — TPO sheet roofing",
  "ASTM D4434 — PVC sheet roofing",
  "ASTM D4637 — EPDM sheet roofing",
  "ASTM D6162 — SBS-modified bituminous sheet (modified bitumen)",
  "ASTM E96 — Water vapor transmission of materials",
];

// ── MOSL8X_OCT25 Material Pricing Database (from AI cheat sheet CSVs) ──

interface MaterialLineItem {
  code: string;
  description: string;
  unit: "SQ" | "LF" | "EA" | "SF" | "HR" | "DA";
  remove?: number;
  replace: number;
  tax?: number;
  qtyFn:
    | "sq"
    | "perim"
    | "ridge"
    | "ridgehip"
    | "eave"
    | "rake"
    | "valley"
    | "hip"
    | "wallflash"
    | "stepflash"
    | "fixed1"
    | "dumpster";
}

interface MaterialProfile {
  label: string;
  category: string;
  tearOffRate: number;
  items: MaterialLineItem[];
}

const STEEP_SURCHARGE: Record<string, number> = { "4-6": 18.50, "7-9": 32.00, "10+": 55.00 };
const HEIGHT_SURCHARGE: Record<string, number> = { "2story": 8.10, "3story": 15.50, "4story": 24.00 };
const GENERAL_CONDITIONS: MaterialLineItem[] = [
  { code: "GEN-DMP", description: "Dumpster load (~40 yds)", unit: "EA", replace: 913, qtyFn: "dumpster" },
  { code: "GEN-SAF", description: "Safety: fall protection setup", unit: "EA", replace: 385, qtyFn: "fixed1" },
  { code: "GEN-CLN", description: "Final cleaning", unit: "SQ", replace: 4.50, qtyFn: "sq" },
];

const SHINGLE_PROFILE: MaterialProfile = {
  label: "Asphalt Shingle", category: "asphalt", tearOffRate: 140,
  items: [
    /** $/SQ material + accessories bucket (aligns with TPO/PVC line-item magnitude; labor is LAB-SQ) */
    { code: "RFG300", description: "Architectural shingle system (field + starter)", unit: "SQ", replace: 285, tax: 21.78, qtyFn: "sq" },
    { code: "RFGDRP", description: "Drip edge / edge metal", unit: "LF", replace: 4.25, tax: 0.32, qtyFn: "perim" },
    { code: "RFGCAP", description: "Ridge cap shingles", unit: "LF", replace: 8.40, tax: 0.64, qtyFn: "ridge" },
    { code: "RFGVLY", description: "Valley metal / membrane", unit: "LF", replace: 11.50, tax: 0.88, qtyFn: "valley" },
    { code: "RFGSFL", description: "Step / wall flashing", unit: "LF", replace: 9.25, tax: 0.71, qtyFn: "stepflash" },
    { code: "RFGFLS", description: "Flashing and seal updates", unit: "EA", replace: 55, tax: 4.2, qtyFn: "fixed1" },
  ],
};

const METAL_STANDING_SEAM_PROFILE: MaterialProfile = {
  label: "Metal roofing (standing seam)",
  category: "metal",
  tearOffRate: 72,
  items: [
    { code: "MET-PREP", description: "Synthetic underlayment & deck prep", unit: "SQ", replace: 32, tax: 2.45, qtyFn: "sq" },
    { code: "MET-PNL", description: "Standing seam panels, clips & fasteners", unit: "SQ", replace: 725, tax: 55.46, qtyFn: "sq" },
    { code: "MET-EDG", description: "Eave/rake trim, drip edge, Z-closure", unit: "LF", replace: 16.5, tax: 1.26, qtyFn: "perim" },
    { code: "MET-RDG", description: "Ridge vent / cap metal", unit: "LF", replace: 22, tax: 1.68, qtyFn: "ridge" },
    { code: "MET-PEN", description: "Pipe & penetration flashings", unit: "EA", replace: 185, tax: 14.14, qtyFn: "fixed1" },
  ],
};

const TILE_PROFILE: MaterialProfile = {
  label: "Tile roofing (concrete/clay)",
  category: "tile",
  tearOffRate: 155,
  items: [
    { code: "TIL-UND", description: "High-temp underlayment (tile-rated)", unit: "SQ", replace: 95, tax: 7.26, qtyFn: "sq" },
    { code: "TIL-BAT", description: "Battens / fastening system", unit: "SQ", replace: 85, tax: 6.5, qtyFn: "sq" },
    { code: "TIL-FLD", description: "Tile field install", unit: "SQ", replace: 425, tax: 32.46, qtyFn: "sq" },
    { code: "TIL-RDG", description: "Ridge / hip tile & accessories", unit: "LF", replace: 38, tax: 2.91, qtyFn: "ridge" },
    { code: "TIL-VLY", description: "Valley metal & pans", unit: "LF", replace: 32, tax: 2.45, qtyFn: "valley" },
    { code: "TIL-FLS", description: "Wall / pan flashings", unit: "LF", replace: 14.5, tax: 1.11, qtyFn: "wallflash" },
  ],
};

/**
 * Ludowici clay tile — line items aligned to reference export (7325 Princeton Ave, St. Louis; 3/19/26).
 * PDF: `/reference/ludowici-tile-estimate-7325-princeton-st-louis.pdf`
 *
 * Tear-off: RFG TEAR TILE 26.1 SQ @ $374.26 → `tearOffRate`. Gutter LF uses `perim` as proxy for measured gutter run.
 * OSB: 261 SF @ $2.89 on ~26.1 plan SQ → $28.90/SQ (10 SF deck/SQ). FLS PJ listed twice on bid → single scope line.
 */
const LUDOWICI_TILE_PROFILE: MaterialProfile = {
  label: "Ludowici clay tile (reference bid)",
  category: "ludowici",
  tearOffRate: 374.26,
  items: [
    {
      code: "RFG-TILE-LUD",
      description: "RFG TILE — Ludowici field (supply & install)",
      unit: "SQ",
      replace: 2439.8,
      tax: 186.4,
      qtyFn: "sq",
    },
    {
      code: "RFG-IWB-HT",
      description: "RFG IWB HT — ice & water / high-temp ($1.83/SF as $/SQ)",
      unit: "SQ",
      replace: 183,
      tax: 13.98,
      qtyFn: "sq",
    },
    {
      code: "RFG-RDG-LUD",
      description: "RFG RDG — Ludowici ridge / hip cap",
      unit: "LF",
      replace: 62.67,
      tax: 4.79,
      qtyFn: "ridgehip",
    },
    {
      code: "RFG-DRPE-CU",
      description: "RFG DRPE — copper drip / perimeter edge",
      unit: "LF",
      replace: 9.77,
      tax: 0.75,
      qtyFn: "perim",
    },
    {
      code: "FLS-PJ",
      description: "FLS PJ — pipe jacks (6 EA @ $55.94)",
      unit: "EA",
      replace: 335.64,
      tax: 25.64,
      qtyFn: "fixed1",
    },
    {
      code: "GUT-CU-5",
      description: "GUT COPPER 5\" — half-round / copper gutter",
      unit: "LF",
      replace: 45,
      tax: 3.44,
      qtyFn: "perim",
    },
    {
      code: "GUT-AL5-DR",
      description: "GUT ALU 5 — drop / accessory (aluminum)",
      unit: "LF",
      replace: 4.52,
      tax: 0.35,
      qtyFn: "perim",
    },
    {
      code: "RFG-STORAGE",
      description: "RFG STORAGE — on-site material handling",
      unit: "EA",
      replace: 150,
      tax: 11.46,
      qtyFn: "fixed1",
    },
    {
      code: "FLS-STEP-CU",
      description: "FLS STEP — copper step flashing",
      unit: "LF",
      replace: 21.48,
      tax: 1.64,
      qtyFn: "stepflash",
    },
    {
      code: "RFG-TEAR2-LAM",
      description: "RFG TEAR2 — laminate / second layer tear-off",
      unit: "SQ",
      replace: 61.94,
      tax: 4.73,
      qtyFn: "sq",
    },
    {
      code: "SHT-OSB",
      description: "SHT OSB — deck sheathing (≈10 SF/SQ @ $2.89/SF from ref. job)",
      unit: "SQ",
      replace: 28.9,
      tax: 2.21,
      qtyFn: "sq",
    },
    {
      code: "FLS-CHIM",
      description: "FLS CHIM — chimney flashing (average allowance)",
      unit: "EA",
      replace: 422.67,
      tax: 32.25,
      qtyFn: "fixed1",
    },
    {
      code: "GUT-AL-5",
      description: "GUT ALU 5 — aluminum gutter body",
      unit: "LF",
      replace: 9.64,
      tax: 0.74,
      qtyFn: "perim",
    },
    {
      code: "GUT-GUARD",
      description: "GUT GUARD — gutter protection",
      unit: "LF",
      replace: 4.42,
      tax: 0.34,
      qtyFn: "perim",
    },
    {
      code: "RFG-VENT-TRTL",
      description: "RFG VENT — turtle / static metal vents (3 @ $75.90)",
      unit: "EA",
      replace: 227.7,
      tax: 17.4,
      qtyFn: "fixed1",
    },
    {
      code: "RFG-VENT-PWR",
      description: "RFG VENT — powered vent",
      unit: "EA",
      replace: 270.78,
      tax: 20.69,
      qtyFn: "fixed1",
    },
    {
      code: "RFG-CORN-LAM",
      description: "RFG CORN — laminate hip / corner detail (2 @ $91.97)",
      unit: "EA",
      replace: 183.94,
      tax: 14.05,
      qtyFn: "fixed1",
    },
  ],
};

const SLATE_PROFILE: MaterialProfile = {
  label: "Natural slate roofing",
  category: "slate",
  tearOffRate: 185,
  items: [
    { code: "SLT-UND", description: "Ice & water + synthetic underlayment", unit: "SQ", replace: 125, tax: 9.56, qtyFn: "sq" },
    { code: "SLT-FLD", description: "Slate field & fasteners", unit: "SQ", replace: 890, tax: 67.98, qtyFn: "sq" },
    { code: "SLT-RDG", description: "Ridge / hip slate & metal", unit: "LF", replace: 52, tax: 3.98, qtyFn: "ridge" },
    { code: "SLT-VLY", description: "Valley — metal / slate", unit: "LF", replace: 45, tax: 3.44, qtyFn: "valley" },
    { code: "SLT-FLS", description: "Custom wall / chimney flashing", unit: "LF", replace: 28, tax: 2.14, qtyFn: "wallflash" },
  ],
};

/** Steep mansard: heavier shingle + accessory load than standard gable. */
const MANSARD_PROFILE: MaterialProfile = {
  label: "Mansard / multi-plane steep roof",
  category: "asphalt",
  tearOffRate: 165,
  items: [
    { code: "MNS-UND", description: "Underlayment upgrade (multi-plane)", unit: "SQ", replace: 42, tax: 3.21, qtyFn: "sq" },
    { code: "MNS-SHG", description: "Architectural shingle (steep labor allowance)", unit: "SQ", replace: 335, tax: 25.59, qtyFn: "sq" },
    { code: "MNS-DRP", description: "Drip / gravel-stop / edge metal", unit: "LF", replace: 6.25, tax: 0.48, qtyFn: "perim" },
    { code: "MNS-CAP", description: "Ridge / hip cap", unit: "LF", replace: 11.2, tax: 0.86, qtyFn: "ridge" },
    { code: "MNS-VLY", description: "Valley metal / membrane", unit: "LF", replace: 14, tax: 1.07, qtyFn: "valley" },
    { code: "MNS-FLS", description: "Step / wall flashing", unit: "LF", replace: 11.5, tax: 0.88, qtyFn: "wallflash" },
  ],
};

const MATERIAL_PROFILES: Record<string, MaterialProfile> = {
  "Asphalt Shingle": SHINGLE_PROFILE,
  "TPO 45-mil MA": {
    label: "TPO 45-mil Mechanically Attached", category: "tpo", tearOffRate: 48.50,
    items: [
      { code: "TPO-PREP", description: "Deck prep – clean & prime", unit: "SQ", replace: 18.50, tax: 1.25, qtyFn: "sq" },
      { code: "TPO-INS2", description: "Polyiso insulation 2\" (R-12)", unit: "SQ", replace: 142, tax: 10.85, qtyFn: "sq" },
      { code: "TPO-CVR", description: "Coverboard – ½\" HD polyiso", unit: "SQ", replace: 65, tax: 4.97, qtyFn: "sq" },
      { code: "TPO-MEM", description: "TPO membrane 45-mil – MA", unit: "SQ", replace: 285, tax: 21.78, qtyFn: "sq" },
      { code: "TPO-BFL", description: "TPO base flashing – walls", unit: "LF", replace: 18.50, tax: 1.41, qtyFn: "wallflash" },
      { code: "TPO-EDG", description: "Sheet metal edge metal 4\"", unit: "LF", replace: 12.50, tax: 0.96, qtyFn: "perim" },
      { code: "TPO-PBT", description: "TPO pipe boot – standard", unit: "EA", replace: 95, tax: 7.26, qtyFn: "fixed1" },
    ],
  },
  "TPO 60-mil MA": {
    label: "TPO 60-mil Mechanically Attached", category: "tpo", tearOffRate: 48.50,
    items: [
      { code: "TPO-PREP", description: "Deck prep – clean & prime", unit: "SQ", replace: 18.50, tax: 1.25, qtyFn: "sq" },
      { code: "TPO-INS2", description: "Polyiso insulation 2\" (R-12)", unit: "SQ", replace: 142, tax: 10.85, qtyFn: "sq" },
      { code: "TPO-CVR", description: "Coverboard – ½\" HD polyiso", unit: "SQ", replace: 65, tax: 4.97, qtyFn: "sq" },
      { code: "TPO-MEM", description: "TPO membrane 60-mil – MA", unit: "SQ", replace: 345, tax: 26.37, qtyFn: "sq" },
      { code: "TPO-BFL", description: "TPO base flashing – walls", unit: "LF", replace: 18.50, tax: 1.41, qtyFn: "wallflash" },
      { code: "TPO-EDG", description: "Sheet metal edge metal 4\"", unit: "LF", replace: 12.50, tax: 0.96, qtyFn: "perim" },
      { code: "TPO-PBT", description: "TPO pipe boot – standard", unit: "EA", replace: 95, tax: 7.26, qtyFn: "fixed1" },
    ],
  },
  "TPO 60-mil FA": {
    label: "TPO 60-mil Fully Adhered", category: "tpo", tearOffRate: 48.50,
    items: [
      { code: "TPO-PREP", description: "Deck prep – clean & prime", unit: "SQ", replace: 18.50, tax: 1.25, qtyFn: "sq" },
      { code: "TPO-INS2", description: "Polyiso insulation 2\" (R-12)", unit: "SQ", replace: 142, tax: 10.85, qtyFn: "sq" },
      { code: "TPO-CVR", description: "Coverboard – ½\" HD polyiso", unit: "SQ", replace: 65, tax: 4.97, qtyFn: "sq" },
      { code: "TPO-MEM", description: "TPO membrane 60-mil – FA", unit: "SQ", replace: 415, tax: 31.72, qtyFn: "sq" },
      { code: "TPO-BFL", description: "TPO base flashing – walls", unit: "LF", replace: 18.50, tax: 1.41, qtyFn: "wallflash" },
      { code: "TPO-EDG", description: "Sheet metal edge metal 4\"", unit: "LF", replace: 12.50, tax: 0.96, qtyFn: "perim" },
      { code: "TPO-PBT", description: "TPO pipe boot – standard", unit: "EA", replace: 95, tax: 7.26, qtyFn: "fixed1" },
    ],
  },
  "TPO 80-mil MA": {
    label: "TPO 80-mil Mechanically Attached", category: "tpo", tearOffRate: 48.50,
    items: [
      { code: "TPO-PREP", description: "Deck prep – clean & prime", unit: "SQ", replace: 18.50, tax: 1.25, qtyFn: "sq" },
      { code: "TPO-INS2", description: "Polyiso insulation 2\" (R-12)", unit: "SQ", replace: 142, tax: 10.85, qtyFn: "sq" },
      { code: "TPO-CVR", description: "Coverboard – ½\" HD polyiso", unit: "SQ", replace: 65, tax: 4.97, qtyFn: "sq" },
      { code: "TPO-MEM", description: "TPO membrane 80-mil – MA", unit: "SQ", replace: 445, tax: 34.02, qtyFn: "sq" },
      { code: "TPO-BFL", description: "TPO base flashing – walls", unit: "LF", replace: 18.50, tax: 1.41, qtyFn: "wallflash" },
      { code: "TPO-EDG", description: "Sheet metal edge metal 4\"", unit: "LF", replace: 12.50, tax: 0.96, qtyFn: "perim" },
      { code: "TPO-PBT", description: "TPO pipe boot – standard", unit: "EA", replace: 95, tax: 7.26, qtyFn: "fixed1" },
    ],
  },
  "PVC 60-mil MA": {
    label: "PVC 60-mil Mechanically Attached", category: "pvc", tearOffRate: 48.50,
    items: [
      { code: "PVC-PREP", description: "Deck prep – clean & prime", unit: "SQ", replace: 18.50, tax: 1.41, qtyFn: "sq" },
      { code: "PVC-INS2", description: "Polyiso insulation 2\" (R-12)", unit: "SQ", replace: 142, tax: 10.85, qtyFn: "sq" },
      { code: "PVC-CVR", description: "Coverboard – ½\" HD polyiso", unit: "SQ", replace: 65, tax: 4.97, qtyFn: "sq" },
      { code: "PVC-MEM", description: "PVC membrane 60-mil – MA", unit: "SQ", replace: 425, tax: 32.50, qtyFn: "sq" },
      { code: "PVC-BFL", description: "PVC base flashing – walls", unit: "LF", replace: 18.50, tax: 1.41, qtyFn: "wallflash" },
      { code: "PVC-EDG", description: "Sheet metal edge metal 4\"", unit: "LF", replace: 12.50, tax: 0.96, qtyFn: "perim" },
      { code: "PVC-PBT", description: "PVC pipe boot – standard", unit: "EA", replace: 98, tax: 7.49, qtyFn: "fixed1" },
    ],
  },
  "PVC 60-mil FA": {
    label: "PVC 60-mil Fully Adhered", category: "pvc", tearOffRate: 48.50,
    items: [
      { code: "PVC-PREP", description: "Deck prep – clean & prime", unit: "SQ", replace: 18.50, tax: 1.41, qtyFn: "sq" },
      { code: "PVC-INS2", description: "Polyiso insulation 2\" (R-12)", unit: "SQ", replace: 142, tax: 10.85, qtyFn: "sq" },
      { code: "PVC-CVR", description: "Coverboard – ½\" HD polyiso", unit: "SQ", replace: 65, tax: 4.97, qtyFn: "sq" },
      { code: "PVC-MEM", description: "PVC membrane 60-mil – FA", unit: "SQ", replace: 505, tax: 38.63, qtyFn: "sq" },
      { code: "PVC-BFL", description: "PVC base flashing – walls", unit: "LF", replace: 18.50, tax: 1.41, qtyFn: "wallflash" },
      { code: "PVC-EDG", description: "Sheet metal edge metal 4\"", unit: "LF", replace: 12.50, tax: 0.96, qtyFn: "perim" },
      { code: "PVC-PBT", description: "PVC pipe boot – standard", unit: "EA", replace: 98, tax: 7.49, qtyFn: "fixed1" },
    ],
  },
  "PVC 80-mil MA": {
    label: "PVC 80-mil Mechanically Attached", category: "pvc", tearOffRate: 48.50,
    items: [
      { code: "PVC-PREP", description: "Deck prep – clean & prime", unit: "SQ", replace: 18.50, tax: 1.41, qtyFn: "sq" },
      { code: "PVC-INS2", description: "Polyiso insulation 2\" (R-12)", unit: "SQ", replace: 142, tax: 10.85, qtyFn: "sq" },
      { code: "PVC-CVR", description: "Coverboard – ½\" HD polyiso", unit: "SQ", replace: 65, tax: 4.97, qtyFn: "sq" },
      { code: "PVC-MEM", description: "PVC membrane 80-mil – MA", unit: "SQ", replace: 545, tax: 41.68, qtyFn: "sq" },
      { code: "PVC-BFL", description: "PVC base flashing – walls", unit: "LF", replace: 18.50, tax: 1.41, qtyFn: "wallflash" },
      { code: "PVC-EDG", description: "Sheet metal edge metal 4\"", unit: "LF", replace: 12.50, tax: 0.96, qtyFn: "perim" },
      { code: "PVC-PBT", description: "PVC pipe boot – standard", unit: "EA", replace: 98, tax: 7.49, qtyFn: "fixed1" },
    ],
  },
  "EPDM 60-mil FA": {
    label: "EPDM 60-mil Fully Adhered", category: "epdm", tearOffRate: 44.75,
    items: [
      { code: "EPD-PREP", description: "Deck prep – clean & prime", unit: "SQ", replace: 18.50, tax: 1.41, qtyFn: "sq" },
      { code: "EPD-INS2", description: "Polyiso insulation 2\" (R-12)", unit: "SQ", replace: 142, tax: 10.85, qtyFn: "sq" },
      { code: "EPD-CVR", description: "Coverboard – ½\" HD polyiso", unit: "SQ", replace: 65, tax: 4.97, qtyFn: "sq" },
      { code: "EPD-MEM", description: "EPDM 60-mil – fully adhered", unit: "SQ", replace: 365, tax: 27.91, qtyFn: "sq" },
      { code: "EPD-BFL", description: "EPDM base flashing – walls", unit: "LF", replace: 18.50, tax: 1.41, qtyFn: "wallflash" },
      { code: "EPD-EDG", description: "Sheet metal edge metal 4\"", unit: "LF", replace: 12.50, tax: 0.96, qtyFn: "perim" },
      { code: "EPD-PBT", description: "EPDM pipe boot – standard", unit: "EA", replace: 88, tax: 6.73, qtyFn: "fixed1" },
    ],
  },
  "EPDM 60-mil MA": {
    label: "EPDM 60-mil Mechanically Attached", category: "epdm", tearOffRate: 44.75,
    items: [
      { code: "EPD-PREP", description: "Deck prep – clean & prime", unit: "SQ", replace: 18.50, tax: 1.41, qtyFn: "sq" },
      { code: "EPD-INS2", description: "Polyiso insulation 2\" (R-12)", unit: "SQ", replace: 142, tax: 10.85, qtyFn: "sq" },
      { code: "EPD-CVR", description: "Coverboard – ½\" HD polyiso", unit: "SQ", replace: 65, tax: 4.97, qtyFn: "sq" },
      { code: "EPD-MEM", description: "EPDM 60-mil – mech attached", unit: "SQ", replace: 328, tax: 25.08, qtyFn: "sq" },
      { code: "EPD-BFL", description: "EPDM base flashing – walls", unit: "LF", replace: 18.50, tax: 1.41, qtyFn: "wallflash" },
      { code: "EPD-EDG", description: "Sheet metal edge metal 4\"", unit: "LF", replace: 12.50, tax: 0.96, qtyFn: "perim" },
      { code: "EPD-PBT", description: "EPDM pipe boot – standard", unit: "EA", replace: 88, tax: 6.73, qtyFn: "fixed1" },
    ],
  },
  "EPDM 90-mil FA": {
    label: "EPDM 90-mil Fully Adhered", category: "epdm", tearOffRate: 44.75,
    items: [
      { code: "EPD-PREP", description: "Deck prep – clean & prime", unit: "SQ", replace: 18.50, tax: 1.41, qtyFn: "sq" },
      { code: "EPD-INS2", description: "Polyiso insulation 2\" (R-12)", unit: "SQ", replace: 142, tax: 10.85, qtyFn: "sq" },
      { code: "EPD-CVR", description: "Coverboard – ½\" HD polyiso", unit: "SQ", replace: 65, tax: 4.97, qtyFn: "sq" },
      { code: "EPD-MEM", description: "EPDM 90-mil – fully adhered", unit: "SQ", replace: 485, tax: 37.10, qtyFn: "sq" },
      { code: "EPD-BFL", description: "EPDM base flashing – walls", unit: "LF", replace: 18.50, tax: 1.41, qtyFn: "wallflash" },
      { code: "EPD-EDG", description: "Sheet metal edge metal 4\"", unit: "LF", replace: 12.50, tax: 0.96, qtyFn: "perim" },
      { code: "EPD-PBT", description: "EPDM pipe boot – standard", unit: "EA", replace: 88, tax: 6.73, qtyFn: "fixed1" },
    ],
  },
  "Modified Bitumen (APP)": {
    label: "Modified Bitumen – APP Torch Applied", category: "modbit", tearOffRate: 62.40,
    items: [
      { code: "MOD-PREP", description: "Deck prep – clean & prime", unit: "SQ", replace: 18.50, tax: 1.41, qtyFn: "sq" },
      { code: "MOD-INS2", description: "Polyiso insulation 2\" (R-12)", unit: "SQ", replace: 142, tax: 10.85, qtyFn: "sq" },
      { code: "MOD-CVR", description: "Coverboard – ½\" HD polyiso", unit: "SQ", replace: 65, tax: 4.97, qtyFn: "sq" },
      { code: "MOD-MEM", description: "APP Mod Bit – 2-ply torch system", unit: "SQ", replace: 335, tax: 25.62, qtyFn: "sq" },
      { code: "MOD-BFL", description: "Mod bit base flashing", unit: "LF", replace: 22.50, tax: 1.72, qtyFn: "wallflash" },
      { code: "MOD-EDG", description: "Sheet metal edge metal 4\"", unit: "LF", replace: 12.50, tax: 0.96, qtyFn: "perim" },
      { code: "MOD-PBT", description: "Pipe boot – standard", unit: "EA", replace: 95, tax: 7.26, qtyFn: "fixed1" },
    ],
  },
  "Modified Bitumen (SBS)": {
    label: "Modified Bitumen – SBS Cold-Applied", category: "modbit", tearOffRate: 62.40,
    items: [
      { code: "MOD-PREP", description: "Deck prep – clean & prime", unit: "SQ", replace: 18.50, tax: 1.41, qtyFn: "sq" },
      { code: "MOD-INS2", description: "Polyiso insulation 2\" (R-12)", unit: "SQ", replace: 142, tax: 10.85, qtyFn: "sq" },
      { code: "MOD-CVR", description: "Coverboard – ½\" HD polyiso", unit: "SQ", replace: 65, tax: 4.97, qtyFn: "sq" },
      { code: "MOD-MEM", description: "SBS Mod Bit – 2-ply cold system", unit: "SQ", replace: 320, tax: 24.47, qtyFn: "sq" },
      { code: "MOD-BFL", description: "Mod bit base flashing", unit: "LF", replace: 22.50, tax: 1.72, qtyFn: "wallflash" },
      { code: "MOD-EDG", description: "Sheet metal edge metal 4\"", unit: "LF", replace: 12.50, tax: 0.96, qtyFn: "perim" },
      { code: "MOD-PBT", description: "Pipe boot – standard", unit: "EA", replace: 95, tax: 7.26, qtyFn: "fixed1" },
    ],
  },
  "Coating (Silicone)": {
    label: "Silicone Coating – 2-coat system", category: "coating", tearOffRate: 0,
    items: [
      { code: "CTG-WASH", description: "Pressure wash / clean surface", unit: "SQ", replace: 18.50, qtyFn: "sq" },
      { code: "CTG-PRM", description: "Silicone primer coat", unit: "SQ", replace: 42, tax: 3.21, qtyFn: "sq" },
      { code: "CTG-FAB", description: "Reinforcing polyester fabric", unit: "SQ", replace: 38, tax: 2.91, qtyFn: "sq" },
      { code: "CTG-MEM", description: "Silicone coating – 2-coat (40 mils)", unit: "SQ", replace: 185, tax: 14.14, qtyFn: "sq" },
      { code: "CTG-DET", description: "Detail coating – flashings", unit: "LF", replace: 8.50, tax: 0.65, qtyFn: "wallflash" },
      { code: "CTG-EDG", description: "Sheet metal edge metal 4\"", unit: "LF", replace: 12.50, tax: 0.96, qtyFn: "perim" },
    ],
  },
  "Coating (Acrylic)": {
    label: "Acrylic Coating – 2-coat system", category: "coating", tearOffRate: 0,
    items: [
      { code: "CTG-WASH", description: "Pressure wash / clean surface", unit: "SQ", replace: 18.50, qtyFn: "sq" },
      { code: "CTG-PRM", description: "Acrylic primer coat", unit: "SQ", replace: 35, tax: 2.68, qtyFn: "sq" },
      { code: "CTG-FAB", description: "Reinforcing polyester fabric", unit: "SQ", replace: 38, tax: 2.91, qtyFn: "sq" },
      { code: "CTG-MEM", description: "Acrylic coating – 2-coat (40 mils)", unit: "SQ", replace: 142, tax: 10.86, qtyFn: "sq" },
      { code: "CTG-DET", description: "Detail coating – flashings", unit: "LF", replace: 7.50, tax: 0.57, qtyFn: "wallflash" },
      { code: "CTG-EDG", description: "Sheet metal edge metal 4\"", unit: "LF", replace: 12.50, tax: 0.96, qtyFn: "perim" },
    ],
  },
  "Coating (SPF)": {
    label: "SPF Spray Foam + Silicone Topcoat", category: "coating", tearOffRate: 0,
    items: [
      { code: "CTG-WASH", description: "Pressure wash / clean surface", unit: "SQ", replace: 18.50, qtyFn: "sq" },
      { code: "SPF-FOAM", description: "SPF spray foam – 2\" (R-12)", unit: "SQ", replace: 248, tax: 18.97, qtyFn: "sq" },
      { code: "SPF-TOP", description: "Silicone topcoat over SPF – 2-coat", unit: "SQ", replace: 152, tax: 11.62, qtyFn: "sq" },
      { code: "SPF-GRAN", description: "Granule surfacing (walk traffic)", unit: "SQ", replace: 35, tax: 2.68, qtyFn: "sq" },
      { code: "SPF-DET", description: "SPF detail spray – flashings", unit: "LF", replace: 12, tax: 0.92, qtyFn: "wallflash" },
    ],
  },
  "Coating (Butyl)": {
    label: "Butyl Rubber Coating – 2-coat system", category: "coating", tearOffRate: 0,
    items: [
      { code: "CTG-WASH", description: "Pressure wash / clean surface", unit: "SQ", replace: 18.50, qtyFn: "sq" },
      { code: "CTG-PRM", description: "Butyl primer / conditioner", unit: "SQ", replace: 38, tax: 2.91, qtyFn: "sq" },
      { code: "CTG-FAB", description: "Reinforcing polyester fabric", unit: "SQ", replace: 38, tax: 2.91, qtyFn: "sq" },
      { code: "CTG-MEM", description: "Butyl coating – 2-coat (50 mils)", unit: "SQ", replace: 225, tax: 17.21, qtyFn: "sq" },
      { code: "CTG-DET", description: "Detail coating – flashings", unit: "LF", replace: 8.50, tax: 0.65, qtyFn: "wallflash" },
    ],
  },
  "Coating (Aluminum)": {
    label: "Aluminum Fibrated Coating – 2-coat", category: "coating", tearOffRate: 0,
    items: [
      { code: "CTG-WASH", description: "Pressure wash / clean surface", unit: "SQ", replace: 18.50, qtyFn: "sq" },
      { code: "CTG-FAB", description: "Reinforcing fabric – seams", unit: "SQ", replace: 38, tax: 2.91, qtyFn: "sq" },
      { code: "CTG-MEM", description: "Aluminum fibrated – 2-coat (10 mils)", unit: "SQ", replace: 88, tax: 6.73, qtyFn: "sq" },
      { code: "CTG-DET", description: "Aluminum detail – flashings", unit: "LF", replace: 5.50, tax: 0.42, qtyFn: "wallflash" },
    ],
  },
  /** Intake dropdown values — must match <option> text exactly. */
  "Asphalt Shingle (Hip)": {
    ...SHINGLE_PROFILE,
    label: "Asphalt Shingle (hip)",
  },
  Metal: METAL_STANDING_SEAM_PROFILE,
  "Metal (Hip)": {
    ...METAL_STANDING_SEAM_PROFILE,
    label: "Metal roofing (hip — standing seam)",
  },
  Tile: TILE_PROFILE,
  "Ludowici Tile": LUDOWICI_TILE_PROFILE,
  Slate: SLATE_PROFILE,
  Mansard: MANSARD_PROFILE,
  /** Generic low-slope single-ply scope (aligned with TPO 60-mil MA $/SQ). */
  "Flat / Low Slope": {
    label: "Low-slope single-ply (TPO-class system)", category: "tpo", tearOffRate: 48.5,
    items: [
      { code: "FLAT-PREP", description: "Deck prep – clean & prime", unit: "SQ", replace: 18.50, tax: 1.25, qtyFn: "sq" },
      { code: "FLAT-INS2", description: "Polyiso insulation 2\" (R-12)", unit: "SQ", replace: 142, tax: 10.85, qtyFn: "sq" },
      { code: "FLAT-CVR", description: "Coverboard – ½\" HD polyiso", unit: "SQ", replace: 65, tax: 4.97, qtyFn: "sq" },
      { code: "FLAT-MEM", description: "TPO membrane 60-mil – MA (or equal)", unit: "SQ", replace: 345, tax: 26.37, qtyFn: "sq" },
      { code: "FLAT-BFL", description: "Base flashing – walls / curbs", unit: "LF", replace: 18.50, tax: 1.41, qtyFn: "wallflash" },
      { code: "FLAT-EDG", description: "Sheet metal edge metal 4\"", unit: "LF", replace: 12.50, tax: 0.96, qtyFn: "perim" },
      { code: "FLAT-PBT", description: "Pipe boot – standard", unit: "EA", replace: 95, tax: 7.26, qtyFn: "fixed1" },
    ],
  },
};

function classifyRoofType(roofType: string): string {
  const t = roofType.toLowerCase();
  if (t.includes("tpo")) return "tpo";
  if (t.includes("epdm")) return "epdm";
  if (t.includes("pvc")) return "pvc";
  if (t.includes("modified") || t.includes("mod bit")) return "modbit";
  if (t.includes("coating") || t.includes("silicone") || t.includes("acrylic") || t.includes("spf") || t.includes("butyl") || t.includes("aluminum fibr")) return "coating";
  if (t.includes("slate")) return "slate";
  if (t.includes("metal")) return "metal";
  if (t.includes("ludowici")) return "tile";
  if (t.includes("tile")) return "tile";
  if (t.includes("flat") || t.includes("low slope")) return "flat";
  return "asphalt";
}

function getMaterialProfile(roofType: string): MaterialProfile {
  if (MATERIAL_PROFILES[roofType]) return MATERIAL_PROFILES[roofType];
  const t = roofType.toLowerCase();
  if (t === "tpo") return MATERIAL_PROFILES["TPO 60-mil MA"];
  if (t.includes("tpo 45")) return MATERIAL_PROFILES["TPO 45-mil MA"];
  if (t.includes("tpo 80")) return MATERIAL_PROFILES["TPO 80-mil MA"];
  if (t.includes("tpo")) return MATERIAL_PROFILES["TPO 60-mil MA"];
  if (t.includes("pvc 80")) return MATERIAL_PROFILES["PVC 80-mil MA"];
  if (t.includes("pvc")) return MATERIAL_PROFILES["PVC 60-mil MA"];
  if (t.includes("epdm 90")) return MATERIAL_PROFILES["EPDM 90-mil FA"];
  if (t.includes("epdm")) return MATERIAL_PROFILES["EPDM 60-mil FA"];
  if (t.includes("sbs") || (t.includes("modified") && t.includes("sbs"))) return MATERIAL_PROFILES["Modified Bitumen (SBS)"];
  if (t.includes("modified") || t.includes("mod bit") || t.includes("app")) return MATERIAL_PROFILES["Modified Bitumen (APP)"];
  if (t.includes("spf") || t.includes("spray foam")) return MATERIAL_PROFILES["Coating (SPF)"];
  if (t.includes("acrylic")) return MATERIAL_PROFILES["Coating (Acrylic)"];
  if (t.includes("butyl")) return MATERIAL_PROFILES["Coating (Butyl)"];
  if (t.includes("aluminum fibr")) return MATERIAL_PROFILES["Coating (Aluminum)"];
  if (t.includes("silicone") || t.includes("coating")) return MATERIAL_PROFILES["Coating (Silicone)"];
  return SHINGLE_PROFILE;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildRoofStructureMeasurements(
  form: FormState,
  lengths: {
    ridges: number;
    eaves: number;
    rakes: number;
    valleys: number;
    hips: number;
  },
): DrawingMeasurement[] {
  const area = Number.parseFloat(form.areaSqFt);
  const perimeter = Number.parseFloat(form.perimeterFt);
  const pitchRise = parsePitchRise(form.roofPitch) ?? 6;
  const pitchFactor = Math.sqrt(1 + (pitchRise / 12) ** 2);
  const planArea = Number.isFinite(area) && area > 0 ? area : 0;
  const surfaceArea = planArea > 0 ? planArea * pitchFactor : 0;
  const floorPerim = Number.isFinite(perimeter) && perimeter > 0 ? perimeter : 0;
  const effH = effectiveWallHeightFt(form.stories, form.exteriorWallHeightFt);
  const wallSf = floorPerim > 0 ? floorPerim * effH : 0;
  const wallsAndCeiling = planArea > 0 ? wallSf + planArea : wallSf;
  const totalRoofEdge =
    lengths.ridges + lengths.eaves + lengths.rakes + lengths.valleys + lengths.hips;
  const squaresSurf = surfaceArea > 0 ? surfaceArea / 100 : 0;

  const fmtSf = (n: number) =>
    Number.isFinite(n) && n > 0 ? `${round2(n)} SF` : "N/A";
  const fmtLf = (n: number) =>
    Number.isFinite(n) && n > 0 ? `${round2(n)} LF` : "N/A";
  const fmtSq = (n: number) =>
    Number.isFinite(n) && n > 0 ? `${round2(n)} SQ` : "N/A";

  return [
    { code: "RFS-WALL", label: "SF Walls", value: fmtSf(wallSf) },
    { code: "RFS-EXWA", label: "Exterior wall area", value: fmtSf(wallSf) },
    { code: "RFS-EXPE", label: "Exterior perimeter of walls", value: fmtLf(floorPerim) },
    { code: "RFS-WC", label: "SF walls and ceiling", value: fmtSf(wallsAndCeiling) },
    { code: "RFS-FLR", label: "Floor perimeter", value: fmtLf(floorPerim) },
    { code: "RFS-SURF", label: "Surface area", value: fmtSf(surfaceArea) },
    { code: "RFS-RDG", label: "Total ridge length", value: fmtLf(lengths.ridges) },
    { code: "RFS-SQ", label: "Number of squares", value: fmtSq(squaresSurf) },
    { code: "RFS-HIP", label: "Total hip length", value: fmtLf(lengths.hips) },
    { code: "RFS-VLY", label: "Total valley length", value: fmtLf(lengths.valleys) },
    { code: "RFS-TOT", label: "Total perimeter length", value: fmtLf(totalRoofEdge) },
    { code: "RFS-EWH", label: "Effective wall height (auto)", value: `${round2(effH)} ft` },
  ];
}

function getReferenceMaterialSalesTaxRate(stateCode: string): number {
  const state = stateCode.toUpperCase();
  if (state === "MO") return 0.0308;
  if (state === "TX") return 0.028;
  if (state === "FL") return 0.025;
  return 0.03;
}

function buildDrawingMeasurements(
  area: number,
  perimeter: number,
  pitch: string,
  effectiveSquares: number,
  wastePct: number,
  lengths: {
    ridges: number;
    eaves: number;
    rakes: number;
    valleys: number;
    hips: number;
    wallFlashing: number;
    stepFlashing: number;
    others: number;
  },
  form: FormState,
): DrawingMeasurement[] {
  const roofStructureRows = buildRoofStructureMeasurements(form, {
    ridges: lengths.ridges,
    eaves: lengths.eaves,
    rakes: lengths.rakes,
    valleys: lengths.valleys,
    hips: lengths.hips,
  });

  const detailRows: DrawingMeasurement[] = [
    { code: "DRW-AREA", label: "Plan area", value: `${round2(area)} SF` },
    {
      code: "DRW-PERIM",
      label: "Roof perimeter",
      value: Number.isFinite(perimeter) && perimeter > 0 ? `${round2(perimeter)} LF` : "N/A",
    },
    { code: "DRW-PITCH", label: "Roof pitch", value: pitch || "N/A" },
    { code: "DRW-WSQ", label: "Waste factor", value: `${wastePct}%` },
    { code: "DRW-ESQ", label: "Effective area", value: `${round2(effectiveSquares)} SQ` },
    { code: "LEN-RDG", label: "Ridges", value: `${round2(lengths.ridges)} LF` },
    { code: "LEN-EAV", label: "Eaves", value: `${round2(lengths.eaves)} LF` },
    { code: "LEN-RAK", label: "Rakes", value: `${round2(lengths.rakes)} LF` },
    { code: "LEN-VLY", label: "Valleys", value: `${round2(lengths.valleys)} LF` },
    { code: "LEN-HIP", label: "Hips", value: `${round2(lengths.hips)} LF` },
    { code: "LEN-WFL", label: "Wall flashing", value: `${round2(lengths.wallFlashing)} LF` },
    { code: "LEN-SFL", label: "Step flashing", value: `${round2(lengths.stepFlashing)} LF` },
    { code: "LEN-OTH", label: "Others", value: `${round2(lengths.others)} LF` },
  ];

  return [...roofStructureRows, ...detailRows];
}

function buildScopeLines(
  scope: "repair" | "replace",
  _category: string,
  effectiveSquares: number,
  perimeter: number,
  severity: number,
  regional: number,
  lengths: {
    ridges: number;
    eaves: number;
    rakes: number;
    valleys: number;
    hips: number;
    wallFlashing: number;
    stepFlashing: number;
    others: number;
  },
  roofType?: string,
): ScopeLine[] {
  const profile = getMaterialProfile(roofType ?? "Asphalt Shingle");
  const lines: ScopeLine[] = [];

  /** Portion of roof in scope; repair uses a severity-based fraction so labor/GC match the repair line. */
  const repairPortion =
    scope === "repair" ? clamp(0.25 + severity * 0.05, 0.2, 0.55) : 1;
  const accessoryLaborSqBasis = effectiveSquares * repairPortion;

  const qtyFor = (fn: MaterialLineItem["qtyFn"], sqBasis: number): number => {
    switch (fn) {
      case "sq": return sqBasis;
      case "perim": return Number.isFinite(perimeter) && perimeter > 0 ? perimeter : 0;
      case "ridge": return lengths.ridges;
      case "ridgehip": return lengths.ridges + lengths.hips;
      case "eave": return lengths.eaves;
      case "rake": return lengths.rakes;
      case "valley": return lengths.valleys;
      case "hip": return lengths.hips;
      case "wallflash": return lengths.wallFlashing + lengths.stepFlashing;
      case "stepflash": return lengths.stepFlashing;
      case "fixed1": return sqBasis > 0 ? 1 : 0;
      case "dumpster":
        return sqBasis > 0 ? Math.max(1, Math.ceil(sqBasis / 25)) : 0;
    }
  };

  if (scope === "replace" && profile.tearOffRate > 0 && effectiveSquares > 0) {
    lines.push({
      code: `${profile.category.toUpperCase()}-RMV`,
      description: `Tear-off & disposal (${profile.category.toUpperCase()})`,
      quantity: round2(effectiveSquares),
      unit: "SQ",
      unitCost: round2(profile.tearOffRate * regional),
      total: 0,
    });
  }

  if (scope === "repair") {
    if (accessoryLaborSqBasis > 0) {
      const mainItem = profile.items.find((it) => it.qtyFn === "sq" && it.replace > 100);
      const repRate = mainItem ? mainItem.replace * 0.65 : 350;
      lines.push({
        code: `${profile.category.toUpperCase()}-REP`,
        description: `Targeted repair (${profile.label})`,
        quantity: round2(accessoryLaborSqBasis),
        unit: "SQ",
        unitCost: round2(repRate * regional),
        total: 0,
      });
    }
  } else {
    for (const item of profile.items) {
      const qty = qtyFor(item.qtyFn, effectiveSquares);
      if (qty <= 0) continue;
      lines.push({
        code: item.code,
        description: item.description,
        quantity: round2(qty),
        unit: item.unit,
        unitCost: round2(item.replace * regional),
        total: 0,
      });
    }
  }

  for (const gc of GENERAL_CONDITIONS) {
    const qty = qtyFor(gc.qtyFn, accessoryLaborSqBasis);
    if (qty <= 0) continue;
    lines.push({
      code: gc.code,
      description: gc.description,
      quantity: round2(qty),
      unit: gc.unit,
      unitCost: round2(gc.replace * regional),
      total: 0,
    });
  }

  void STEEP_SURCHARGE;
  void HEIGHT_SURCHARGE;

  const materialSubtotal = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  if (materialSubtotal > 0) {
    lines.push({
      code: "OH-PROFIT",
      description: "Overhead (10%) & Profit (11%)",
      quantity: 1,
      unit: "EA",
      unitCost: round2(materialSubtotal * 0.21),
      total: 0,
    });
  }

  if (accessoryLaborSqBasis > 0) {
    lines.push({
      code: "LAB-SQ",
      description: `Install labor (${LABOR_PER_SQUARE_USD}/SQ × regional)`,
      quantity: round2(accessoryLaborSqBasis),
      unit: "SQ",
      unitCost: round2(LABOR_PER_SQUARE_USD * regional),
      total: 0,
    });
  }

  return lines
    .map((line) => ({
      ...line,
      total: Math.round(line.quantity * line.unitCost),
    }))
    .filter((line) => line.quantity > 0);
}

function parseCarrierScope(text: string): CarrierParsed {
  if (!text.trim()) {
    return {
      valuationBasis: "line-total",
      total: 0,
      rcv: null,
      acv: null,
      dep: null,
      supplementAmounts: [],
      supplementLabeledTotal: null,
      deductibleFromCarrier: null,
      netClaimFromCarrier: null,
      parsedLineCount: 0,
      parserConfidence: "low",
      lineMathMismatchCount: 0,
      lineMathTotal: 0,
      lineCodes: [],
      likelyMissingItems: [],
    };
  }

  const lines = text.split("\n").map((x) => x.trim()).filter(Boolean);
  const getLabel = (rx: RegExp): number | null => {
    const hits = [...text.matchAll(rx)];
    if (!hits.length) return null;
    const raw = hits[hits.length - 1]?.[1];
    if (!raw) return null;
    const n = Number.parseFloat(raw.replace(/,/g, ""));
    return Number.isFinite(n) ? Math.round(n) : null;
  };

  const rcv = getLabel(/(?:\bRCV\b|Replacement\s+Cost(?:\s+Value)?)\D*([\d,]+(?:\.\d{1,2})?)/gi);
  const acv = getLabel(/(?:\bACV\b|Actual\s+Cash\s+Value)\D*([\d,]+(?:\.\d{1,2})?)/gi);
  const dep = getLabel(/(?:\bDep(?:reciation)?\b)\D*([\d,]+(?:\.\d{1,2})?)/gi);
  const deductibleFromCarrier = getLabel(
    /(?:\bDed(?:uctible)?\b|Policy\s+Ded(?:uctible)?)\D*([\d,]+(?:\.\d{1,2})?)/gi,
  );
  const netClaimFromCarrier = getLabel(
    /(?:Net\s+Claim|Claim\s+Payment|Payment\s+from\s+(?:Carrier|Insurance)|Insurance\s+Payment|Total\s+Paid\s+to\s+Insured)\D*([\d,]+(?:\.\d{1,2})?)/gi,
  );
  const supplementLabeledTotal = getLabel(
    /(?:\bSupplement\b|\bSuppl\.?\b)\s*(?:RCV|Gross|Total|Amount)\D*([\d,]+(?:\.\d{1,2})?)/gi,
  );

  const supplementAmounts: number[] = [];
  const seenSupp = new Set<number>();
  for (const m of text.matchAll(/\bSupplement\s*(?:#\s*\d+)?[^\d\n$]{0,48}\$?\s*([\d,]+(?:\.\d{1,2})?)/gi)) {
    const n = Number.parseFloat(m[1]!.replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 25) {
      const r = Math.round(n);
      if (!seenSupp.has(r)) {
        seenSupp.add(r);
        supplementAmounts.push(r);
      }
    }
  }

  let parsedLineCount = 0;
  let total = 0;
  let lineMathTotal = 0;
  let mismatch = 0;
  const codes = new Set<string>();
  let lineText = "";

  for (const line of lines) {
    lineText += ` ${line.toLowerCase()}`;
    const code = line.match(/\b([A-Z]{2,4}\s?[A-Z0-9]{2,6})\b/)?.[1];
    if (code) codes.add(code.replace(/\s+/g, ""));

    // Skip carrier summary / valuation lines so we do not double-count RCV/ACV into line-item totals.
    const hasXactimateQty = /\d+(?:\.\d+)?\s+(?:SQ|LF|SF|EA|HR|DA)\s+\d+(?:\.\d+)/i.test(line);
    if (!hasXactimateQty) {
      if (/(?:^|\s)(?:RCV|ACV|Depreciation|Deductible|Net\s+Claim)\s*[:#]?\s*\$?[\d,]/i.test(line)) {
        continue;
      }
      if (/\bSupplement\b/i.test(line) && /\$?[\d,]+(?:\.\d{1,2})?/.test(line)) {
        continue;
      }
      if (/\b(total|grand total|subtotal|replacement cost value|actual cash value)\b/i.test(line)) {
        continue;
      }
    } else if (/\b(total|grand total|subtotal)\b/i.test(line)) {
      continue;
    }

    const nums = line.replace(/,/g, "").match(/\$?\s*(\d+(?:\.\d{1,2})?)/g) || [];
    if (!nums.length) continue;
    const n = Number.parseFloat(nums[nums.length - 1]!.replace(/[$\s]/g, ""));
    if (!Number.isFinite(n)) continue;

    parsedLineCount += 1;
    total += n;

    const q = line.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(SQ|LF|SF|EA)\s+(\d+(?:\.\d{1,2})?)/i);
    if (q?.[1] && q[3]) {
      const qty = Number.parseFloat(q[1]);
      const unitPrice = Number.parseFloat(q[3]);
      if (Number.isFinite(qty) && Number.isFinite(unitPrice)) {
        const derived = qty * unitPrice;
        lineMathTotal += derived;
        if (Math.abs(derived - n) > Math.max(3, n * 0.04)) mismatch += 1;
      }
    } else {
      lineMathTotal += n;
    }
  }

  let parserConfidence: ParserConfidence = "low";
  if (parsedLineCount >= 3) parserConfidence = "medium";
  if (parsedLineCount >= 5 && mismatch <= Math.max(1, Math.floor(parsedLineCount * 0.2))) {
    parserConfidence = "high";
  }

  const valuationBasis: ValuationBasis = rcv != null ? "RCV" : acv != null ? "ACV" : "line-total";
  const parsedTotal = valuationBasis === "RCV" ? rcv! : valuationBasis === "ACV" ? acv! : Math.round(total);

  const missing: string[] = [];
  const addMissing = (rx: RegExp, label: string) => {
    if (!rx.test(lineText)) missing.push(label);
  };
  addMissing(/tear|remove|demo|disposal/, "Tear-off and disposal");
  addMissing(/drip edge|edge metal/, "Drip edge / edge metal");
  addMissing(/flashing|step flashing|counter flashing/, "Flashing upgrades");
  addMissing(/ridge vent|ventilation|soffit/, "Ventilation line items");
  addMissing(/ice|water shield|self-adhered/, "Ice and water shield");
  addMissing(/overhead|profit|o&p|supervision/, "Overhead and profit");

  return {
    valuationBasis,
    total: parsedTotal,
    rcv,
    acv,
    dep,
    supplementAmounts,
    supplementLabeledTotal,
    deductibleFromCarrier,
    netClaimFromCarrier,
    parsedLineCount,
    parserConfidence,
    lineMathMismatchCount: mismatch,
    lineMathTotal: Math.round(lineMathTotal),
    lineCodes: Array.from(codes).slice(0, 12),
    likelyMissingItems: missing.slice(0, 5),
  };
}

function buildInsuranceSupplementNotes(form: FormState, result: EstimateResult): string {
  const c = result.carrier;
  const linesOut: string[] = [];
  linesOut.push(
    `Carrier scope: ${c.parsedLineCount} priced line item(s) parsed. Valuation basis: ${c.valuationBasis}. Parser confidence: ${c.parserConfidence}.`,
  );
  if (c.rcv != null || c.acv != null) {
    linesOut.push(
      `Carrier document RCV / ACV: ${c.rcv != null ? money(c.rcv) : "—"} / ${c.acv != null ? money(c.acv) : "—"}${c.dep != null ? ` (depreciation ${money(c.dep)})` : ""}.`,
    );
  }
  if (c.supplementLabeledTotal != null) {
    linesOut.push(`Labeled supplement total in scope text: ${money(c.supplementLabeledTotal)}.`);
  } else if (c.supplementAmounts.length > 0) {
    linesOut.push(`Supplement figures found in scope: ${c.supplementAmounts.map((n) => money(n)).join(", ")}.`);
  }
  const deltaNote =
    result.deltaDirection === "under-scoped"
      ? "Estimator RCV is higher than the carrier total — review for potential supplement / line-item gaps."
      : result.deltaDirection === "over-scoped"
        ? "Estimator RCV is lower than the carrier total — verify takeoff and scope assumptions."
        : "Estimator and carrier totals are in the same ballpark.";
  linesOut.push(
    `${deltaNote} Delta: ${money(result.delta)} (estimator ${money(result.replacementCostValue)} vs carrier basis ${money(c.total)}).`,
  );
  if (c.likelyMissingItems.length > 0) {
    linesOut.push(`Common scope gaps to verify in the field: ${c.likelyMissingItems.join("; ")}.`);
  }
  linesOut.push(
    `Deductible in form: ${money(result.settlement.deductible)}. Non-recoverable depreciation (form): ${money(Math.max(0, Math.round(Number.parseFloat(form.nonRecDepUsd) || 0)))}.`,
  );
  if (c.deductibleFromCarrier != null) {
    linesOut.push(`Carrier document also references deductible ≈ ${money(c.deductibleFromCarrier)} — confirm against the policy.`);
  }
  return linesOut.join("\n");
}

function buildEstimatedInsurancePayoutSummary(result: EstimateResult): string {
  const s = result.settlement;
  const c = result.carrier;
  const parts = [
    `Initial ACV payment (after deductible in app): ${money(s.initialPayment)}.`,
    `Recoverable depreciation (modeled): ${money(s.recoverableDep)}.`,
    `Projected final insurance payment (initial + recoverable dep): ${money(s.finalProjected)}.`,
    `Estimated homeowner out-of-pocket vs full contractor RCV: ${money(s.outOfPocket)}.`,
  ];
  if (c.netClaimFromCarrier != null) {
    parts.push(`Reference: carrier/statement payment figure ≈ ${money(c.netClaimFromCarrier)} (compare to lines above).`);
  }
  if (c.acv != null) {
    parts.push(`Carrier ACV on file: ${money(c.acv)}.`);
  }
  return parts.join("\n");
}

function defaultFormState(): FormState {
  return {
    address: "7270 Hillsdale Court, Chanhassen, MN 55317",
    stateCode: "MN",
    latitude: "",
    longitude: "",
    roofType: "Asphalt Shingle",
    roofStructure: "auto",
    stories: "",
    exteriorWallHeightFt: "",
    areaSqFt: "3432.61",
    perimeterFt: "387.58",
    roofPitch: "6/12",
    wastePercent: "25",
    measuredSquares: "38.38",
    ridgesFt: "141ft 2in",
    eavesFt: "135ft 6in",
    rakesFt: "252ft 1in",
    valleysFt: "130ft 4in",
    hipsFt: "0ft 0in",
    wallFlashingFt: "19ft 2in",
    stepFlashingFt: "50ft 5in",
    othersFt: "2ft 3in",
    severity: 3,
    damageTypes: ["Wind", "Leaks"],
    carrierScopeText: "",
    deductibleUsd: "2500",
    nonRecDepUsd: "500",
    propertyRecordNotes: "",
  };
}

function defaultProposalState(profile: ProposalProfile = "residential"): ProposalState {
  if (profile === "commercial") {
    return {
      profile,
      companyName: "Repair King",
      companyAddress: "",
      companyWebsite: "",
      logoDataUrl: "",
      preparedBy: "Estimator",
      clientName: "",
      clientCompany: "",
      clientEmail: "",
      clientPhone: "",
      contactEmail: "estimating@repairking.com",
      contactPhone: "(000) 000-0000",
      proposalTitle: "Commercial Roof Repair/Replacement Proposal",
      inclusions:
        "Mobilization, safety setup, tear-off/disposal where applicable, membrane/roof installation, flashing details, and site cleanup.",
      exclusions:
        "Deck replacement beyond visible damage, latent structural defects, asbestos/lead abatement, permits/engineering unless listed.",
      paymentSchedule:
        "40% material deposit at contract signing, 40% progress payment at dry-in, 20% at substantial completion.",
      warranty:
        "2-year workmanship warranty. Manufacturer material warranty per selected system and registration.",
      alternates:
        "Alternate A: fully adhered system. Alternate B: mechanically attached system. Alternate C: coating restoration option.",
      financingNotes:
        "Commercial financing options available subject to underwriting and approved credit terms.",
      insuranceSupplementNotes: "",
      estimatedInsurancePayout: "",
    };
  }
  return {
    profile,
    companyName: "Repair King",
    companyAddress: "",
    companyWebsite: "",
    logoDataUrl: "",
    preparedBy: "Estimator",
    clientName: "",
    clientCompany: "",
    clientEmail: "",
    clientPhone: "",
    contactEmail: "estimating@repairking.com",
    contactPhone: "(000) 000-0000",
    proposalTitle: "Residential Roof Proposal",
    inclusions:
      "Tear-off/disposal, underlayment, ice/water protection at required areas, new roof system, flashing, ventilation tune-up, and cleanup.",
    exclusions:
      "Rotten decking beyond visible inspection, code upgrades not known at inspection, gutter replacement unless listed, interior repairs.",
    paymentSchedule:
      "35% deposit at signing, 35% at material delivery/start, 30% at substantial completion.",
    warranty:
      "5-year workmanship warranty. Manufacturer shingle/material warranty per selected product.",
    alternates:
      "Alternate A: upgraded impact-resistant shingle. Alternate B: premium vent package. Alternate C: gutter replacement add-on.",
    financingNotes:
      "Monthly payment options available for qualified homeowners through partner lenders.",
    insuranceSupplementNotes: "",
    estimatedInsurancePayout: "",
  };
}

function formStateWithContact(base: FormState, contact: ContactRecord): FormState {
  const fullAddress = [contact.address, contact.city, contact.state, contact.zip]
    .filter(Boolean)
    .join(", ");
  return {
    ...base,
    address: fullAddress || base.address,
    stateCode: (contact.state || base.stateCode).toUpperCase().slice(0, 2),
    latitude: contact.lat != null ? contact.lat.toFixed(6) : base.latitude,
    longitude: contact.lng != null ? contact.lng.toFixed(6) : base.longitude,
    areaSqFt: contact.areaSqFt?.trim() ? contact.areaSqFt.trim() : base.areaSqFt,
    measuredSquares: contact.measuredSquares?.trim()
      ? contact.measuredSquares.trim()
      : base.measuredSquares,
    roofType: contact.roofType?.trim() ? contact.roofType.trim() : base.roofType,
    roofPitch: contact.roofPitch?.trim() ? contact.roofPitch.trim() : base.roofPitch,
    perimeterFt: contact.perimeterFt?.trim() ? contact.perimeterFt.trim() : base.perimeterFt,
    wastePercent: contact.wastePercent?.trim() ? contact.wastePercent.trim() : base.wastePercent,
  };
}

function proposalStateWithContact(base: ProposalState, contact: ContactRecord): ProposalState {
  return {
    ...base,
    clientName: contact.name || base.clientName,
    clientCompany: contact.company || base.clientCompany,
    clientEmail: contact.email || base.clientEmail,
    clientPhone: contact.phone || base.clientPhone,
  };
}

function buildResult(form: FormState): EstimateResult | null {
  const derived = deriveRoofQuantities(form);
  if (!derived) return null;
  const area = derived.planAreaSqFt;
  const explicitArea = Number.parseFloat(form.areaSqFt);
  const measuredSquares = Number.parseFloat(form.measuredSquares);
  const perimeter = Number.parseFloat(form.perimeterFt);
  const lat = Number.parseFloat(form.latitude);
  const lng = Number.parseFloat(form.longitude);
  const regional = clamp(STATE_MULTIPLIER[form.stateCode.toUpperCase()] ?? 1, 0.75, 1.45);
  const category = classifyRoofType(form.roofType);
  const lengths = {
    ridges: parseLengthFeet(form.ridgesFt),
    eaves: parseLengthFeet(form.eavesFt),
    rakes: parseLengthFeet(form.rakesFt),
    valleys: parseLengthFeet(form.valleysFt),
    hips: parseLengthFeet(form.hipsFt),
    wallFlashing: parseLengthFeet(form.wallFlashingFt),
    stepFlashing: parseLengthFeet(form.stepFlashingFt),
    others: parseLengthFeet(form.othersFt),
  };
  const hasReplaceSignal = form.damageTypes.includes("Missing Shingles") || form.damageTypes.includes("Structural");
  const scope = form.severity >= 4 || hasReplaceSignal ? "replace" : "repair";
  const wastePct = clamp(Number.parseFloat(form.wastePercent) || 12, 0, 35);
  const baseSquares = derived.surfaceSquares;
  const effectiveSquares = baseSquares * (1 + wastePct / 100);
  const scopeLines = buildScopeLines(
    scope,
    category,
    effectiveSquares,
    perimeter,
    form.severity,
    regional,
    lengths,
    form.roofType,
  );
  const drawingMeasurements = buildDrawingMeasurements(
    area,
    perimeter,
    form.roofPitch,
    effectiveSquares,
    wastePct,
    lengths,
    form,
  );
  const lineItemTotal = scopeLines.reduce((sum, line) => sum + line.total, 0);
  const materialSalesTax = Math.round(
    lineItemTotal * getReferenceMaterialSalesTaxRate(form.stateCode),
  );
  const rcvSubtotalBeforeMarkup = lineItemTotal + materialSalesTax;
  const replacementCostValue = Math.round(rcvSubtotalBeforeMarkup * ESTIMATE_TOTAL_MARKUP_MULTIPLIER);
  const estimateMarkupAmount = replacementCostValue - rcvSubtotalBeforeMarkup;
  const depreciationRate = clamp(0.15 + form.severity * 0.05, 0.2, 0.45);
  const depreciation = Math.round(replacementCostValue * depreciationRate);
  const actualCashValue = Math.max(0, replacementCostValue - depreciation);
  const totalCost = replacementCostValue;
  const finalCost = replacementCostValue;

  let quality = 100;
  const warnings: string[] = [];
  if (area < 350 || area > 25000) {
    quality -= 18;
    warnings.push("Area outside typical single-structure range.");
  }
  if (Number.isFinite(measuredSquares) && measuredSquares > 0 && Number.isFinite(explicitArea) && explicitArea > 0) {
    const pitchRiseQ = parsePitchRise(form.roofPitch) ?? 6;
    const pitchFactorQ = Math.sqrt(1 + (pitchRiseQ / 12) ** 2);
    const expectedSurfaceSf = explicitArea * pitchFactorQ;
    const fromMeasuredSf = measuredSquares * 100;
    const deltaPct = Math.abs(fromMeasuredSf - expectedSurfaceSf) / Math.max(1, expectedSurfaceSf);
    if (deltaPct > 0.15) {
      quality -= 12;
      warnings.push("Measured squares (surface-based) and plan area × pitch differ by more than 15%; verify takeoff.");
    }
  }
  const criticalLengths = lengths.ridges + lengths.eaves + lengths.rakes + lengths.valleys;
  if (criticalLengths <= 0) {
    quality -= 12;
    warnings.push("No ridge/eave/rake/valley lengths entered; scope detail confidence reduced.");
  }
  if (!Number.isFinite(perimeter) || perimeter <= 0) {
    quality -= 10;
    warnings.push("Perimeter missing; accessory confidence reduced.");
  } else {
    const compactness = (perimeter * perimeter) / Math.max(1, area);
    if (compactness < 10 || compactness > 60) {
      quality -= 16;
      warnings.push("Area/perimeter ratio unusual; verify trace geometry.");
    }
  }
  const pitchRise = parsePitchRise(form.roofPitch);
  if (pitchRise == null) {
    quality -= 8;
    warnings.push("Pitch missing; slope assumptions may affect estimate.");
  } else if (pitchRise < 1 || pitchRise > 14) {
    quality -= 12;
    warnings.push("Pitch appears atypical.");
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    quality -= 8;
    warnings.push("Coordinates missing; map context reduced.");
  }
  quality = clamp(quality, 35, 100);

  const carrier = parseCarrierScope(form.carrierScopeText);
  const dep = Math.max(0, carrier.dep != null ? carrier.dep : carrier.rcv != null && carrier.acv != null ? carrier.rcv - carrier.acv : 0);
  const deductible = Math.max(0, Math.round(Number.parseFloat(form.deductibleUsd) || 0));
  const nonRec = Math.max(0, Math.min(Math.round(Number.parseFloat(form.nonRecDepUsd) || 0), Math.round(dep)));
  const recoverableDep = Math.max(0, Math.round(dep) - nonRec);
  const acvForPayment =
    carrier.acv != null
      ? carrier.acv
      : carrier.total > 0
        ? Math.max(0, carrier.total - Math.round(dep))
        : actualCashValue;
  const initialPayment = Math.max(0, Math.round(acvForPayment) - deductible);
  const finalProjected = initialPayment + recoverableDep;
  const outOfPocket = Math.max(0, finalCost - finalProjected);
  const delta = finalCost - carrier.total;
  const deltaDirection: DeltaDirection = delta > 1500 ? "under-scoped" : delta < -1500 ? "over-scoped" : "aligned";
  const confidence =
    form.damageTypes.length >= 2 && form.severity >= 4
      ? "high"
      : form.damageTypes.length <= 1 && form.severity <= 2
        ? "low"
        : "medium";

  return {
    scope,
    scopeLines,
    drawingMeasurements,
    lineItemTotal,
    materialSalesTax,
    rcvSubtotalBeforeMarkup,
    estimateMarkupAmount,
    replacementCostValue,
    depreciation,
    actualCashValue,
    totalCost,
    finalCost,
    confidence,
    surfaceSquares: Number(baseSquares.toFixed(2)),
    effectiveSquares: Number(effectiveSquares.toFixed(2)),
    wastePct,
    regional,
    quality,
    warnings,
    carrier,
    delta,
    deltaDirection,
    settlement: { deductible, recoverableDep, initialPayment, finalProjected, outOfPocket },
  };
}

function buildReportText(form: FormState, result: EstimateResult): string {
  const sep = "─".repeat(62);
  const baseSq = deriveRoofQuantities(form)?.surfaceSquares ?? 0;
  const wasteLines = [5, 10, 12, 15, 18, 20, 22, 25]
    .map((p) => `  ${String(p).padStart(2)}% waste ─ ${round2(baseSq * (1 + p / 100))} SQ`)
    .join("\n");

  const meas = result.drawingMeasurements
    .map((m) => `  ${m.code.padEnd(10)} ${m.label.padEnd(30)} ${m.value}`)
    .join("\n");

  const scope = result.scopeLines
    .map(
      (l) =>
        `  ${l.code.padEnd(10)} ${l.description.padEnd(28)} ${String(l.quantity + " " + l.unit).padEnd(12)} ${money(l.unitCost).padStart(9)} ${money(l.total).padStart(11)}`,
    )
    .join("\n");

  return [
    sep,
    "  ROOFING MEASUREMENT & ESTIMATE REPORT",
    `  Generated: ${new Date().toLocaleString()}`,
    sep,
    "",
    "▸ PROPERTY",
    `  Address .......... ${form.address || "N/A"}`,
    `  State ............ ${form.stateCode || "N/A"}`,
    `  Coordinates ...... ${form.latitude || "N/A"}, ${form.longitude || "N/A"}`,
    `  Roof material .... ${form.roofType}`,
    `  Pitch ............ ${form.roofPitch || "N/A"}`,
    "",
    "▸ ROOF MEASUREMENTS",
    "  RFS* = roof structure takeoff (walls, perimeter, surface, squares, ridge/hip/valley LF, roof-edge total). DRW/LEN = plan detail.",
    `  ${"Code".padEnd(10)} ${"Measurement".padEnd(30)} Value`,
    `  ${"─".repeat(10)} ${"─".repeat(30)} ${"─".repeat(18)}`,
    meas,
    "",
    "▸ WASTE FACTOR SCENARIOS",
    `  Base: ${round2(baseSq)} SQ`,
    wasteLines,
    "",
    "▸ SCOPE OF WORK",
    `  ${"Code".padEnd(10)} ${"Description".padEnd(28)} ${"Qty".padEnd(12)} ${"Unit Cost".padStart(9)} ${"Total".padStart(11)}`,
    `  ${"─".repeat(10)} ${"─".repeat(28)} ${"─".repeat(12)} ${"─".repeat(9)} ${"─".repeat(11)}`,
    scope,
    `  ${"".padEnd(50)} ${"─".repeat(9)} ${"─".repeat(11)}`,
    `  ${"Subtotal".padEnd(60)} ${money(result.lineItemTotal).padStart(11)}`,
    `  ${"Material Sales Tax".padEnd(60)} ${money(result.materialSalesTax).padStart(11)}`,
    `  ${"RCV subtotal (pre-markup)".padEnd(60)} ${money(result.rcvSubtotalBeforeMarkup).padStart(11)}`,
    `  ${"Estimate adjustment (+50%)".padEnd(60)} ${money(result.estimateMarkupAmount).padStart(11)}`,
    "",
    "▸ ESTIMATE SUMMARY",
    `  Scope ..................... ${result.scope.toUpperCase()}`,
    `  Total squares (takeoff) .. ${result.surfaceSquares} SQ (surface, before waste)`,
    `  Effective squares ........ ${result.effectiveSquares} SQ (incl. ${result.wastePct}% waste)`,
    `  Regional Multiplier ...... ×${result.regional.toFixed(2)} (${form.stateCode})`,
    `  RCV (after +50% adjustment) ${money(result.replacementCostValue)}`,
    `  Less Depreciation ........ (${money(result.depreciation)})`,
    `  ACV ...................... ${money(result.actualCashValue)}`,
    `  Confidence ............... ${result.confidence}`,
    `  Measurement Score ........ ${result.quality}/100`,
    "",
    `  ┌─────────────────────────────────────────┐`,
    `  │  FINAL COST: ${money(result.finalCost).padEnd(27)}│`,
    `  └─────────────────────────────────────────┘`,
    "",
    "▸ SETTLEMENT PROJECTION",
    `  Deductible ............... ${money(result.settlement.deductible)}`,
    `  Recoverable Dep. ......... ${money(result.settlement.recoverableDep)}`,
    `  Initial ACV Payment ...... ${money(result.settlement.initialPayment)}`,
    `  Projected Final Payment .. ${money(result.settlement.finalProjected)}`,
    `  Est. Out-of-Pocket ....... ${money(result.settlement.outOfPocket)}`,
    "",
    "▸ SCOPE VERIFICATION",
    "  Cross-check assemblies and quantities against manufacturer specs, carrier scope, and field conditions.",
    "",
    sep,
  ].join("\n");
}

function buildProposalText(form: FormState, result: EstimateResult, proposal: ProposalState): string {
  const sep = "─".repeat(62);

  const meas = result.drawingMeasurements
    .map((m) => `  ${m.code.padEnd(10)} ${m.label.padEnd(30)} ${m.value}`)
    .join("\n");

  const scope = result.scopeLines
    .map(
      (l) =>
        `  ${l.code.padEnd(10)} ${l.description.padEnd(28)} ${String(l.quantity + " " + l.unit).padEnd(12)} ${money(l.unitCost).padStart(9)} ${money(l.total).padStart(11)}`,
    )
    .join("\n");

  return [
    sep,
    `  ${proposal.proposalTitle.toUpperCase()}`,
    `  Prepared: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    sep,
    "",
    "▸ CONTRACTOR",
    `  Company .......... ${proposal.companyName}`,
    ...(proposal.companyAddress ? [`  Address .......... ${proposal.companyAddress.replace(/\n/g, " ")}`] : []),
    ...(proposal.companyWebsite ? [`  Website .......... ${proposal.companyWebsite}`] : []),
    `  Prepared By ...... ${proposal.preparedBy}`,
    `  Email ............ ${proposal.contactEmail}`,
    `  Phone ............ ${proposal.contactPhone}`,
    "",
    "▸ CLIENT",
    `  Name ............. ${proposal.clientName || "N/A"}`,
    `  Company .......... ${proposal.clientCompany || "N/A"}`,
    `  Email ............ ${proposal.clientEmail || "N/A"}`,
    `  Phone ............ ${proposal.clientPhone || "N/A"}`,
    "",
    "▸ PROPERTY",
    `  Address .......... ${form.address || "N/A"}`,
    `  State ............ ${form.stateCode || "N/A"}`,
    `  Roof material .... ${form.roofType}`,
    `  Pitch ............ ${form.roofPitch || "N/A"}`,
    `  Squares .......... ${form.measuredSquares || "N/A"}`,
    `  Waste Factor ..... ${form.wastePercent || "N/A"}%`,
    "",
    "▸ ROOF MEASUREMENTS",
    "  RFS* = roof structure takeoff (walls, perimeter, surface, squares, ridge/hip/valley LF, roof-edge total). DRW/LEN = plan detail.",
    `  ${"Code".padEnd(10)} ${"Measurement".padEnd(30)} Value`,
    `  ${"─".repeat(10)} ${"─".repeat(30)} ${"─".repeat(18)}`,
    meas,
    "",
    "▸ SCOPE OF WORK",
    `  ${"Code".padEnd(10)} ${"Description".padEnd(28)} ${"Qty".padEnd(12)} ${"Unit Cost".padStart(9)} ${"Total".padStart(11)}`,
    `  ${"─".repeat(10)} ${"─".repeat(28)} ${"─".repeat(12)} ${"─".repeat(9)} ${"─".repeat(11)}`,
    scope,
    `  ${"".padEnd(50)} ${"─".repeat(9)} ${"─".repeat(11)}`,
    `  ${"Subtotal".padEnd(60)} ${money(result.lineItemTotal).padStart(11)}`,
    `  ${"Material Sales Tax".padEnd(60)} ${money(result.materialSalesTax).padStart(11)}`,
    `  ${"RCV subtotal (pre-markup)".padEnd(60)} ${money(result.rcvSubtotalBeforeMarkup).padStart(11)}`,
    `  ${"Estimate adjustment (+50%)".padEnd(60)} ${money(result.estimateMarkupAmount).padStart(11)}`,
    "",
    "▸ PRICING SUMMARY",
    `  Total squares (takeoff) .. ${result.surfaceSquares} SQ (surface, before waste)`,
    `  Effective squares ........ ${result.effectiveSquares} SQ (incl. ${result.wastePct}% waste)`,
    `  RCV (after +50% adjustment) ${money(result.replacementCostValue)}`,
    `  Less Depreciation ........ (${money(result.depreciation)})`,
    `  ACV ...................... ${money(result.actualCashValue)}`,
    "",
    `  ┌─────────────────────────────────────────┐`,
    `  │  PROPOSAL TOTAL: ${money(result.finalCost).padEnd(23)}│`,
    `  └─────────────────────────────────────────┘`,
    "",
    "▸ INSURANCE SUPPLEMENT (AUTO-FILLED — EDIT AS NEEDED)",
    ...(proposal.insuranceSupplementNotes.trim()
      ? proposal.insuranceSupplementNotes.split("\n").map((ln) => `  ${ln}`)
      : ["  (Run Generate Estimate after pasting carrier scope to fill this block.)"]),
    "",
    "▸ ESTIMATED INSURANCE PAYOUT (AUTO-FILLED — EDIT AS NEEDED)",
    ...(proposal.estimatedInsurancePayout.trim()
      ? proposal.estimatedInsurancePayout.split("\n").map((ln) => `  ${ln}`)
      : ["  (Run Generate Estimate to populate from settlement model.)"]),
    "",
    "▸ INCLUSIONS",
    `  ${proposal.inclusions}`,
    "",
    "▸ EXCLUSIONS",
    `  ${proposal.exclusions}`,
    "",
    "▸ PAYMENT SCHEDULE",
    `  ${proposal.paymentSchedule}`,
    "",
    "▸ WARRANTY",
    `  ${proposal.warranty}`,
    "",
    "▸ ALTERNATES",
    `  ${proposal.alternates}`,
    "",
    "▸ FINANCING",
    `  ${proposal.financingNotes}`,
    "",
    "▸ IRC / IBC / ASTM COMPLIANCE REFERENCES",
    ...ROOFING_COMPLIANCE_REFERENCES.map((s) => `  - ${s}`),
    `  - ICC Digital Codes — 2024 IRC (reference): ${ICC_IRC2024_URL}`,
    `  - ICC Digital Codes — IBC 2018 Chapter 15 (reference): ${ICC_IBC2018_CHAPTER15_ROOF_URL}`,
    "",
    sep,
    `  ${proposal.companyName} | ${proposal.contactEmail} | ${proposal.contactPhone}`,
    sep,
  ].join("\n");
}

function buildRoofDiagramSvg(
  roofType: string,
  roofStructure: RoofStructureMode,
  lengths: {
    ridges: number; eaves: number; rakes: number;
    valleys: number; hips: number; wallFlashing: number; stepFlashing: number;
  },
  area: number,
  pitch: string,
  opts?: {
    width?: number;
    height?: number;
    dark?: boolean;
    /** Solved plan rectangle (long side horizontal in diagram). */
    footprint?: { lengthFt: number; widthFt: number } | null;
    /** Entered plan perimeter (LF) — used for flat roof label when set. */
    perimeterFt?: number;
  },
): string {
  const W = opts?.width ?? 520;
  const H = opts?.height ?? 340;
  const dark = opts?.dark ?? false;
  const bg = dark ? "#111827" : "#fff";
  const fg = dark ? "#e5e7eb" : "#1a1a1a";
  const muted = dark ? "#64748b" : "#999";
  const outline = dark ? "#334155" : "#bbb";

  const form = inferRoofFormType(roofType, roofStructure);
  const fmtFt = (v: number) => (v > 0 ? `${round2(v)} ft` : "—");

  const mx = 60, my = 50;
  const maxW = W - mx * 2;
  const maxH = H - my * 2;
  const cx = W / 2, cy = H / 2;
  let rw = maxW, rh = maxH;
  let L = mx, R = mx + rw, T = my, B = my + rh;

  const fp = opts?.footprint;
  const Lf = fp && fp.lengthFt > 0 ? fp.lengthFt : 0;
  const Wf = fp && fp.widthFt > 0 ? fp.widthFt : 0;
  const hasFp = Lf > 0 && Wf > 0;
  const Pplan = hasFp ? 2 * (Lf + Wf) : 0;

  /** Prefer plan area (+ perimeter) for footprint shape; else eave vs rake LF ratio. */
  if (hasFp) {
    const lr = Lf / Wf;
    if (lr >= maxW / maxH) {
      rw = maxW;
      rh = maxW / lr;
    } else {
      rh = maxH;
      rw = maxH * lr;
    }
    L = cx - rw / 2;
    R = cx + rw / 2;
    T = cy - rh / 2;
    B = cy + rh / 2;
  } else if (
    (form === "gable" || form === "hip" || form === "mansard") &&
    lengths.eaves > 0 &&
    lengths.rakes > 0
  ) {
    const er = lengths.eaves / lengths.rakes;
    if (er >= maxW / maxH) {
      rw = maxW;
      rh = maxW / er;
    } else {
      rh = maxH;
      rw = maxH * er;
    }
    L = cx - rw / 2;
    R = cx + rw / 2;
    T = cy - rh / 2;
    B = cy + rh / 2;
  }

  /** Gable: parallel pair totals ÷ 2. Hip/mansard per-edge eaves use `eaveAlongL` / `eaveAlongW` when footprint + total eaves are known. */
  const eaveParallelEach = lengths.eaves > 0 ? lengths.eaves / 2 : 0;
  const rakeParallelEach = lengths.rakes > 0 ? lengths.rakes / 2 : 0;
  const eaveAlongL =
    hasFp && Pplan > 0 && lengths.eaves > 0 ? (lengths.eaves * Lf) / Pplan : eaveParallelEach;
  const eaveAlongW =
    hasFp && Pplan > 0 && lengths.eaves > 0 ? (lengths.eaves * Wf) / Pplan : eaveParallelEach;

  const c = {
    ridge: "#ef4444", hip: "#f97316", valley: "#22c55e",
    eave: "#3b82f6", rake: "#a855f7", wflash: "#eab308", sflash: "#06b6d4",
  };

  let paths = "";
  let labels = "";

  const dashLine = (x1: number, y1: number, x2: number, y2: number, color: string) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2.5" stroke-dasharray="6,3"/>`;
  const solidLine = (x1: number, y1: number, x2: number, y2: number, color: string, w = 2) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}"/>`;
  const label = (x: number, y: number, text: string, color: string, anchor = "middle", size = 11) =>
    `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-family="Segoe UI,Arial,sans-serif" text-anchor="${anchor}" font-weight="600">${text}</text>`;

  if (form === "gable") {
    paths += solidLine(L, B, R, B, c.eave, 3);
    paths += solidLine(L, T, R, T, c.eave, 3);
    paths += solidLine(L, T, L, B, c.rake, 3);
    paths += solidLine(R, T, R, B, c.rake, 3);
    let ridgeHalfPx = rw / 2;
    if (hasFp && lengths.ridges > 0) {
      ridgeHalfPx = clamp((lengths.ridges / Lf) * (rw / 2), 4, rw / 2);
    }
    paths += dashLine(cx - ridgeHalfPx, cy, cx + ridgeHalfPx, cy, c.ridge);

    labels += label(cx, B + 16, `Eave (ea.): ${fmtFt(eaveParallelEach)}`, c.eave);
    labels += label(cx, T - 10, `Eave (ea.): ${fmtFt(eaveParallelEach)}`, c.eave);
    labels += label(L - 6, cy, `Rake (ea.): ${fmtFt(rakeParallelEach)}`, c.rake, "end");
    labels += label(R + 6, cy, `Rake (ea.): ${fmtFt(rakeParallelEach)}`, c.rake, "start");
    labels += label(cx, cy - 6, `Ridge: ${fmtFt(lengths.ridges)}`, c.ridge);

    if (lengths.wallFlashing > 0) labels += label(cx, B + 32, `Wall Flash: ${fmtFt(lengths.wallFlashing)}`, c.wflash);
    if (lengths.stepFlashing > 0) labels += label(cx, B + 44, `Step Flash: ${fmtFt(lengths.stepFlashing)}`, c.sflash);
  } else if (form === "hip") {
    paths += solidLine(L, B, R, B, c.eave, 3);
    paths += solidLine(L, T, R, T, c.eave, 3);
    paths += solidLine(L, T, L, B, c.eave, 3);
    paths += solidLine(R, T, R, B, c.eave, 3);

    const defaultRidgeSpan = hasFp ? Math.max(0, Lf - Wf) : 0;
    const ridgeSpanFt = lengths.ridges > 0 ? lengths.ridges : defaultRidgeSpan;
    const ridgeHalfPx = hasFp
      ? clamp((ridgeSpanFt / Lf) * (rw / 2), 6, rw / 2 - 2)
      : Math.min(rw / 2 - 2, rw * 0.18);
    const ridgeL = cx - ridgeHalfPx;
    const ridgeR = cx + ridgeHalfPx;
    paths += dashLine(ridgeL, cy, ridgeR, cy, c.ridge);

    paths += solidLine(L, T, ridgeL, cy, c.hip, 2.5);
    paths += solidLine(R, T, ridgeR, cy, c.hip, 2.5);
    paths += solidLine(L, B, ridgeL, cy, c.hip, 2.5);
    paths += solidLine(R, B, ridgeR, cy, c.hip, 2.5);

    labels += label(cx, B + 16, `Eave: ${fmtFt(eaveAlongL)}`, c.eave);
    labels += label(cx, T - 10, `Eave: ${fmtFt(eaveAlongL)}`, c.eave);
    labels += label(L - 6, cy, `Eave: ${fmtFt(eaveAlongW)}`, c.eave, "end");
    labels += label(R + 6, cy, `Eave: ${fmtFt(eaveAlongW)}`, c.eave, "start");
    labels += label(cx, cy - 8, `Ridge: ${fmtFt(lengths.ridges)}`, c.ridge);
    labels += label(L + 28, cy + 12, `Hip: ${fmtFt(lengths.hips)}`, c.hip, "start", 10);

    if (lengths.valleys > 0) labels += label(cx, B + 32, `Valley: ${fmtFt(lengths.valleys)}`, c.valley);
    if (lengths.wallFlashing > 0) labels += label(cx, B + 44, `Wall Flash: ${fmtFt(lengths.wallFlashing)}`, c.wflash);
  } else if (form === "mansard") {
    paths += solidLine(L, B, R, B, c.eave, 3);
    paths += solidLine(L, T, R, T, c.eave, 3);
    paths += solidLine(L, T, L, B, c.eave, 3);
    paths += solidLine(R, T, R, B, c.eave, 3);

    const inset = rw * 0.18;
    const insetY = rh * 0.22;
    const iL = L + inset, iR = R - inset, iT = T + insetY, iB = B - insetY;
    paths += solidLine(iL, iT, iR, iT, c.ridge, 2);
    paths += solidLine(iL, iB, iR, iB, c.ridge, 2);
    paths += solidLine(iL, iT, iL, iB, c.ridge, 2);
    paths += solidLine(iR, iT, iR, iB, c.ridge, 2);

    paths += solidLine(L, T, iL, iT, c.hip, 2);
    paths += solidLine(R, T, iR, iT, c.hip, 2);
    paths += solidLine(L, B, iL, iB, c.hip, 2);
    paths += solidLine(R, B, iR, iB, c.hip, 2);

    labels += label(cx, B + 16, `Eave: ${fmtFt(eaveAlongL)}`, c.eave);
    labels += label(cx, T - 10, `Eave: ${fmtFt(eaveAlongL)}`, c.eave);
    labels += label(L - 6, cy, `Eave: ${fmtFt(eaveAlongW)}`, c.eave, "end");
    labels += label(R + 6, cy, `Eave: ${fmtFt(eaveAlongW)}`, c.eave, "start");
    labels += label(cx, iT - 6, `Ridge: ${fmtFt(lengths.ridges)}`, c.ridge);
    labels += label(L + 18, cy - 10, `Hip: ${fmtFt(lengths.hips)}`, c.hip, "start", 10);
  } else if (form === "complex") {
    // Complex multi-facet diagram style inspired by EagleView length diagram references.
    const p1 = `${L + 10},${T + 40} ${L + 110},${T + 20} ${L + 160},${T + 65} ${L + 90},${T + 120} ${L + 20},${T + 90}`;
    const p2 = `${cx - 20},${T + 30} ${cx + 80},${T + 45} ${cx + 120},${T + 95} ${cx + 55},${T + 130} ${cx - 15},${T + 100}`;
    const p3 = `${cx - 80},${cy + 10} ${cx - 20},${cy - 30} ${cx + 35},${cy + 10} ${cx + 15},${B - 30} ${cx - 60},${B - 20}`;
    paths += `<polygon points="${p1}" fill="none" stroke="${outline}" stroke-width="1.4"/>`;
    paths += `<polygon points="${p2}" fill="none" stroke="${outline}" stroke-width="1.4"/>`;
    paths += `<polygon points="${p3}" fill="none" stroke="${outline}" stroke-width="1.4"/>`;
    paths += dashLine(L + 42, T + 55, L + 120, T + 65, c.ridge);
    paths += dashLine(cx - 4, T + 75, cx + 90, T + 82, c.ridge);
    paths += dashLine(cx - 48, cy + 8, cx + 18, cy + 2, c.ridge);
    paths += solidLine(L + 25, T + 45, L + 82, T + 95, c.hip, 2);
    paths += solidLine(L + 135, T + 66, L + 80, T + 96, c.valley, 2);
    paths += solidLine(cx + 5, T + 45, cx + 55, T + 120, c.hip, 2);
    paths += solidLine(cx + 85, T + 90, cx + 42, T + 120, c.valley, 2);
    paths += solidLine(cx - 65, cy + 10, cx - 15, cy - 18, c.hip, 2);
    paths += solidLine(cx + 5, cy + 9, cx - 5, B - 36, c.valley, 2);
    labels += label(L + 86, T + 18, `Ridges: ${fmtFt(lengths.ridges)}`, c.ridge, "middle", 10);
    labels += label(cx + 50, T + 18, `Valleys: ${fmtFt(lengths.valleys)}`, c.valley, "middle", 10);
    labels += label(L + 2, cy + 2, `Hips: ${fmtFt(lengths.hips)}`, c.hip, "start", 10);
    labels += label(cx, B + 16, `Eaves (total): ${fmtFt(lengths.eaves)} | Rakes (total): ${fmtFt(lengths.rakes)}`, c.eave, "middle", 10);
    labels += label(cx, B + 30, `Flashing: ${fmtFt(lengths.wallFlashing)} | Step: ${fmtFt(lengths.stepFlashing)}`, c.wflash, "middle", 10);
  } else {
    paths += solidLine(L, T, R, T, c.eave, 3);
    paths += solidLine(R, T, R, B, c.eave, 3);
    paths += solidLine(R, B, L, B, c.eave, 3);
    paths += solidLine(L, B, L, T, c.eave, 3);

    const perOpt = opts?.perimeterFt;
    const perimeterShown =
      perOpt != null && Number.isFinite(perOpt) && perOpt > 0
        ? perOpt
        : hasFp
          ? Pplan
          : lengths.eaves + lengths.rakes;
    labels += label(cx, cy - 6, `Perimeter: ${fmtFt(perimeterShown)}`, c.eave);
    if (lengths.wallFlashing > 0) labels += label(cx, cy + 10, `Wall Flash: ${fmtFt(lengths.wallFlashing)}`, c.wflash);
  }

  const areaLabel = area > 0 ? `${round2(area)} SF` : "—";
  const pitchLabel = pitch || "N/A";
  const footerY =
    form === "flat"
      ? Math.min(H - 14, B + 28)
      : Math.min(H - 12, B + (form === "hip" || form === "mansard" ? 52 : 40));
  labels += label(cx, footerY, `Area: ${areaLabel}  |  Pitch: ${pitchLabel}`, muted, "middle", 11);

  const legendItems = [
    { color: c.ridge, name: "Ridge" }, { color: c.hip, name: "Hip" },
    { color: c.valley, name: "Valley" }, { color: c.eave, name: "Eave" },
    { color: c.rake, name: "Rake" }, { color: c.wflash, name: "Wall Flash" },
    { color: c.sflash, name: "Step Flash" },
  ];
  let legendX = 10;
  let legend = "";
  for (const it of legendItems) {
    legend += `<line x1="${legendX}" y1="${H - 8}" x2="${legendX + 16}" y2="${H - 8}" stroke="${it.color}" stroke-width="3"/>`;
    legend += `<text x="${legendX + 20}" y="${H - 4}" fill="${fg}" font-size="9" font-family="Segoe UI,Arial,sans-serif">${it.name}</text>`;
    legendX += 65;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${bg}" rx="8"/>
  <text x="${cx}" y="20" fill="${fg}" font-size="13" font-family="Segoe UI,Arial,sans-serif" text-anchor="middle" font-weight="700">Roof Measurement Diagram — ${roofType}</text>
  <rect x="${L}" y="${T}" width="${rw}" height="${rh}" fill="none" stroke="${outline}" stroke-width="1" stroke-dasharray="4,4" rx="2"/>
  ${paths}
  ${labels}
  ${legend}
</svg>`;
}

function buildProposalHtml(
  form: FormState,
  result: EstimateResult,
  proposal: ProposalState,
  opts?: { diagramSvgOverride?: string | null },
): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const logoSrc =
    proposal.logoDataUrl?.startsWith("data:image/") ? proposal.logoDataUrl : "";
  const scopeRows = result.scopeLines
    .map(
      (l) =>
        `<tr><td>${esc(l.code)}</td><td>${esc(l.description)}</td><td class="r">${l.quantity} ${esc(l.unit)}</td><td class="r">${money(l.unitCost)}</td><td class="r">${money(l.total)}</td></tr>`,
    )
    .join("");

  const measureRows = result.drawingMeasurements
    .map((m) => `<tr><td>${esc(m.code)}</td><td>${esc(m.label)}</td><td class="r">${esc(m.value)}</td></tr>`)
    .join("");

  const diagramLengths = getLineLengthsFromForm(form);
  const areaNum = Number.parseFloat(form.areaSqFt) || 0;
  const diagramPerim = Number.parseFloat(form.perimeterFt);
  const diagramSvg =
    opts?.diagramSvgOverride?.includes("<svg")
      ? opts.diagramSvgOverride
      : buildRoofDiagramSvg(form.roofType, form.roofStructure, diagramLengths, areaNum, form.roofPitch, {
          footprint: diagramFootprintFromForm(form),
          perimeterFt:
            Number.isFinite(diagramPerim) && diagramPerim > 0 ? diagramPerim : undefined,
        });
  const pickMeas = (code: string) => result.drawingMeasurements.find((m) => m.code === code)?.value ?? "—";
  const structureRows = [
    ["Roof structure — surface area", pickMeas("RFS-SURF")],
    ["Roof structure — number of squares", pickMeas("RFS-SQ")],
    ["Roof structure — total perimeter length", pickMeas("RFS-TOT")],
    ["Roof structure — floor perimeter", pickMeas("RFS-FLR")],
    ["Roof structure — SF walls", pickMeas("RFS-WALL")],
    ["Roof structure — total ridge length", pickMeas("RFS-RDG")],
    ["Roof structure — total hip length", pickMeas("RFS-HIP")],
    ["Roof structure — total valley length", pickMeas("RFS-VLY")],
  ]
    .map(([k, v]) => `<tr><td>${k}</td><td class="r">${esc(v)}</td></tr>`)
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(proposal.proposalTitle)}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;padding:32px 40px;color:#1a1a1a;line-height:1.45;max-width:900px;margin:0 auto}
    h1{margin:0 0 4px;font-size:22px;color:#1e3a5f}
    h2{margin:24px 0 8px;font-size:15px;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:4px;text-transform:uppercase;letter-spacing:.04em}
    .subtitle{color:#666;font-size:13px;margin-bottom:16px}
    .row{display:flex;gap:32px;margin-top:12px}
    .col{flex:1}
    .col p{margin:2px 0;font-size:13px}
    .col strong{font-size:13px}
    .label{color:#777;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
    table{width:100%;border-collapse:collapse;margin-top:6px;font-size:12px}
    th,td{padding:5px 8px;border:1px solid #d0d0d0}
    th{background:#f0f4f8;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:#444}
    .r{text-align:right}
    .total-row td{font-weight:700;background:#f8fafc;border-top:2px solid #1e3a5f}
    .highlight{background:#fffde7;font-weight:700;font-size:14px;padding:10px;border:2px solid #d4af37;margin-top:12px;text-align:center}
    .terms{margin-top:8px;font-size:12px;line-height:1.5}
    .terms h2{font-size:13px}
    .footer{margin-top:24px;text-align:center;color:#999;font-size:11px;border-top:1px solid #ddd;padding-top:10px}
    @media print{body{padding:16px 20px}}
  </style>
</head>
<body>
  <h1>${esc(proposal.proposalTitle)}</h1>
  <div class="subtitle">Prepared ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>

  <div class="row">
    <div class="col">
      <div class="label">Contractor</div>
      ${logoSrc ? `<div style="margin-bottom:10px"><img src="${logoSrc}" alt="" style="max-height:64px;max-width:220px;object-fit:contain" /></div>` : ""}
      <p><strong>${esc(proposal.companyName)}</strong></p>
      ${proposal.companyAddress ? `<p style="white-space:pre-wrap">${esc(proposal.companyAddress)}</p>` : ""}
      ${proposal.companyWebsite ? `<p>${esc(proposal.companyWebsite)}</p>` : ""}
      <p>${esc(proposal.preparedBy)}</p>
      <p>${esc(proposal.contactEmail)}</p>
      <p>${esc(proposal.contactPhone)}</p>
    </div>
    <div class="col">
      <div class="label">Client</div>
      <p><strong>${esc(proposal.clientName || "—")}</strong></p>
      <p>${esc(proposal.clientCompany || "")}</p>
      <p>${esc(proposal.clientEmail || "—")}</p>
      <p>${esc(proposal.clientPhone || "—")}</p>
    </div>
    <div class="col">
      <div class="label">Property</div>
      <p><strong>${esc(form.address || "—")}</strong></p>
      <p>${esc(form.stateCode || "")} | ${esc(form.latitude || "")}, ${esc(form.longitude || "")}</p>
      <p>Roof material: ${esc(form.roofType)} | Pitch: ${esc(form.roofPitch || "N/A")} | Structure: ${esc(form.roofStructure.toUpperCase())}</p>
    </div>
  </div>

  <h2>Roof Measurements</h2>
  <p class="subtitle" style="margin:0 0 10px;font-size:11px;color:#666">RFS codes are takeoff-style roof structure (walls, perimeters, surface, squares, ridge/hip/valley lengths, roof-edge total). The table below includes RFS rows first, then DRW/LEN plan detail.</p>
  <div style="text-align:center;margin:12px 0">${diagramSvg}</div>
  <table>
    <thead><tr><th colspan="2">Dwelling Roof Structure</th></tr></thead>
    <tbody>${structureRows}</tbody>
  </table>
  <table>
    <thead><tr><th>Code</th><th>Measurement</th><th class="r">Value</th></tr></thead>
    <tbody>${measureRows}</tbody>
  </table>

  <h2>Scope of Work</h2>
  <table>
    <thead><tr><th>Code</th><th>Description</th><th class="r">Qty</th><th class="r">Unit Cost</th><th class="r">Total</th></tr></thead>
    <tbody>${scopeRows}
      <tr class="total-row"><td colspan="4">Line Item Subtotal</td><td class="r">${money(result.lineItemTotal)}</td></tr>
      <tr class="total-row"><td colspan="4">Material Sales Tax</td><td class="r">${money(result.materialSalesTax)}</td></tr>
      <tr class="total-row"><td colspan="4">RCV subtotal (pre-markup)</td><td class="r">${money(result.rcvSubtotalBeforeMarkup)}</td></tr>
      <tr class="total-row"><td colspan="4">Estimate adjustment (+50%)</td><td class="r">${money(result.estimateMarkupAmount)}</td></tr>
    </tbody>
  </table>

  <h2>Estimate Summary</h2>
  <table>
    <tbody>
      <tr><td>Scope</td><td class="r">${result.scope.toUpperCase()}</td></tr>
      <tr><td>Total squares (takeoff, before waste)</td><td class="r">${result.surfaceSquares} SQ</td></tr>
      <tr><td>Effective squares (incl. ${result.wastePct}% waste)</td><td class="r">${result.effectiveSquares} SQ</td></tr>
      <tr><td>Regional Multiplier (${form.stateCode})</td><td class="r">×${result.regional.toFixed(2)}</td></tr>
      <tr><td>Replacement Cost Value (RCV, after +50% adjustment)</td><td class="r">${money(result.replacementCostValue)}</td></tr>
      <tr><td>Less Depreciation</td><td class="r">(${money(result.depreciation)})</td></tr>
      <tr><td>Actual Cash Value (ACV)</td><td class="r">${money(result.actualCashValue)}</td></tr>
    </tbody>
  </table>

  <div class="highlight">PROPOSAL TOTAL: ${money(result.finalCost)}</div>

  <h2>Insurance supplement &amp; carrier comparison</h2>
  <p class="subtitle" style="white-space:pre-wrap;font-size:12px;color:#333;line-height:1.55">${esc(
    proposal.insuranceSupplementNotes.trim() ||
      "Run Generate Estimate after pasting carrier line items (RCV/ACV/Depreciation, supplement totals) to auto-fill this section.",
  )}</p>

  <h2>Estimated insurance payout</h2>
  <p class="subtitle" style="white-space:pre-wrap;font-size:12px;color:#333;line-height:1.55">${esc(
    proposal.estimatedInsurancePayout.trim() ||
      "Run Generate Estimate to populate initial ACV payment, projected final payment, and out-of-pocket from the settlement model.",
  )}</p>

  <div class="terms">
    <h2>Inclusions</h2><p style="white-space:pre-wrap">${esc(proposal.inclusions)}</p>
    <h2>Exclusions</h2><p style="white-space:pre-wrap">${esc(proposal.exclusions)}</p>
    <h2>Payment Schedule</h2><p style="white-space:pre-wrap">${esc(proposal.paymentSchedule)}</p>
    <h2>Warranty</h2><p style="white-space:pre-wrap">${esc(proposal.warranty)}</p>
    <h2>Alternates</h2><p style="white-space:pre-wrap">${esc(proposal.alternates)}</p>
    <h2>Financing</h2><p style="white-space:pre-wrap">${esc(proposal.financingNotes)}</p>
    <h2>Assembly notes</h2>
    <p class="subtitle" style="margin:0 0 10px;font-size:11px;color:#666;line-height:1.5">
      Verify full system layers (decking, ice &amp; water, underlayment, field covering, ridge/vent) against manufacturer data and the scope above. Proposal line items and totals use this application&apos;s material profiles, measurements, and regional multipliers.
    </p>
    <h2>IRC / IBC / ASTM References</h2>
    <p class="subtitle" style="margin:0 0 8px;font-size:11px;color:#666">Verify against the code edition adopted by your AHJ; section numbers follow the International Residential / Building Code family.</p>
    <p class="subtitle" style="margin:0 0 6px;font-size:11px"><a href="${ICC_IRC2024_URL}" target="_blank" rel="noreferrer">2024 International Residential Code (IRC) — ICC Digital Codes</a></p>
    <p class="subtitle" style="margin:0 0 10px;font-size:11px"><a href="${ICC_IBC2018_CHAPTER15_ROOF_URL}" target="_blank" rel="noreferrer">IBC Chapter 15 — Roof Assemblies and Rooftop Structures (ICC Digital Codes, 2018)</a></p>
    <ul>${ROOFING_COMPLIANCE_REFERENCES.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
  </div>

  <div class="footer">${esc(proposal.companyName)} | ${esc(proposal.contactEmail)} | ${esc(proposal.contactPhone)}</div>
</body>
</html>`;
}

function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mapboxContainerRef = useRef<HTMLDivElement | null>(null);
  const mapboxMapRef = useRef<any>(null);
  const mapboxDrawRef = useRef<any>(null);
  const refreshMapboxFromDrawRef = useRef<(() => void) | null>(null);
  const pendingAiFootprintRef = useRef<{ lat: number; lng: number; L: number; W: number } | null>(null);
  const [aiMapFootprintTick, setAiMapFootprintTick] = useState(0);
  /** Mapbox style `load` fired — Draw features are reliable after this. */
  const mapboxStyleLoadedRef = useRef(false);
  const mapboxglModuleRef = useRef<any>(null);
  const turfModuleRef = useRef<any>(null);
  const propertyMarkerRef = useRef<any>(null);
  const contactMarkersRef = useRef<any[]>([]);
  const mapClickHandlerRef = useRef<(lat: number, lng: number) => void>(() => {});
  const applyContactHandlerRef = useRef<(c: ContactRecord) => void>(() => {});
  const lineTypeRef = useRef<RoofLineType>("ridge");
  const addRoofLineRef = useRef<(line: DrawnRoofLine) => void>(() => {});
  const autoCalcRef = useRef<(polygons: any[]) => void>(() => {});
  const aiMeasureFileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(defaultFormState());
  const [proposal, setProposal] = useState<ProposalState>(defaultProposalState("residential"));
  const [contacts, setContacts] = useState<ContactRecord[]>(() => loadContactsFromStorage());
  const [selectedContactId, setSelectedContactId] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [contactsGeocodeBusy, setContactsGeocodeBusy] = useState(false);
  const [mapboxToken, setMapboxToken] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(MAPBOX_TOKEN_STORAGE_KEY);
      if (saved?.trim()) return saved;
    }
    return import.meta.env.VITE_MAPBOX_TOKEN ?? "";
  });
  const [mapboxAreaSqFt, setMapboxAreaSqFt] = useState(0);
  const [mapboxFeatures, setMapboxFeatures] = useState<any[]>([]);
  const [mapboxStatus, setMapboxStatus] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [msFootprintsVisible, setMsFootprintsVisible] = useState(true);
  const msFootprintsVisibleRef = useRef(true);
  const [importMsFootprintBusy, setImportMsFootprintBusy] = useState(false);
  const [raybevelDiagramSvg, setRaybevelDiagramSvg] = useState<string | null>(null);
  const [raybevelDiagramBusy, setRaybevelDiagramBusy] = useState(false);
  const [raybevelDiagramNote, setRaybevelDiagramNote] = useState("");
  const [currentLineType, setCurrentLineType] = useState<RoofLineType>("ridge");
  const [drawnRoofLines, setDrawnRoofLines] = useState<DrawnRoofLine[]>([]);
  const [autoCalcEnabled, setAutoCalcEnabled] = useState(true);
  const [autoCalcInfo, setAutoCalcInfo] = useState("");
  const flushPendingAiFootprint = useCallback(async () => {
    const p = pendingAiFootprintRef.current;
    if (!p) return;
    const draw = mapboxDrawRef.current;
    const refresh = refreshMapboxFromDrawRef.current;
    if (!draw || !refresh || !mapboxStyleLoadedRef.current) return;

    try {
      const data = draw.getAll() as { features?: { id: string; geometry?: { type?: string } }[] };
      for (const f of data.features ?? []) {
        if (f.geometry?.type === "Polygon") draw.delete(f.id);
      }
      const feat = await buildAiFootprintPolygonFeature(p.lng, p.lat, p.L, p.W);
      draw.add(feat as any);
      refresh();
      pendingAiFootprintRef.current = null;
      setAutoCalcInfo(
        "AI: footprint rectangle on map; ridge/eave/rake/hip/valley lengths filled from plan + pitch model.",
      );
    } catch {
      pendingAiFootprintRef.current = null;
      setMapboxStatus((s) => (s ? `${s} (AI map footprint skipped.)` : "AI map footprint skipped."));
    }
  }, []);

  const importMsBuildingFootprintAtPin = useCallback(async () => {
    const map = mapboxMapRef.current;
    const draw = mapboxDrawRef.current;
    const refresh = refreshMapboxFromDrawRef.current;
    if (!map || !draw || !refresh || !mapboxStyleLoadedRef.current) {
      window.alert("Map is still loading. Wait a moment and try again.");
      return;
    }
    if (!map.getLayer?.("ms-buildings-fill")) {
      window.alert(
        "Microsoft building footprints are not on the map. Wait for the map to finish loading or check the browser console for tile errors.",
      );
      return;
    }
    const lat = Number.parseFloat(form.latitude);
    const lng = Number.parseFloat(form.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      window.alert("Set property latitude and longitude in Property intake first.");
      return;
    }
    setImportMsFootprintBusy(true);
    try {
      const pt = map.project([lng, lat]);
      let feats = map.queryRenderedFeatures(pt, { layers: ["ms-buildings-fill"] });
      if (!feats.length) {
        const pad = 16;
        const bbox: [[number, number], [number, number]] = [
          [pt.x - pad, pt.y - pad],
          [pt.x + pad, pt.y + pad],
        ];
        feats = map.queryRenderedFeatures(bbox, { layers: ["ms-buildings-fill"] });
      }
      if (!feats.length) {
        window.alert(
          "No building footprint under this pin. Zoom to 17–19 so footprints render, center on the roof, then try again.",
        );
        return;
      }
      const drawFeat = await msFootprintFeatureForDraw(feats[0] as { geometry?: { type?: string; coordinates?: unknown } });
      if (!drawFeat) {
        window.alert("Could not use this footprint geometry.");
        return;
      }
      const data = draw.getAll() as { features?: { id: string; geometry?: { type?: string } }[] };
      for (const f of data.features ?? []) {
        const t = f.geometry?.type;
        if (t === "Polygon" || t === "MultiPolygon") draw.delete(f.id);
      }
      draw.add(drawFeat as any);
      refresh();
      setAutoCalcInfo(
        "Imported Microsoft US Building Footprint at property pin — plan area and edge lengths follow roof type, structure & pitch.",
      );
      setRunId((n) => n + 1);
    } finally {
      setImportMsFootprintBusy(false);
    }
  }, [form.latitude, form.longitude]);

  const [aiMeasureBusy, setAiMeasureBusy] = useState(false);
  const [aiMeasureNote, setAiMeasureNote] = useState("");
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [savedReports, setSavedReports] = useState<SavedApiReport[]>([]);
  const [reportsBusy, setReportsBusy] = useState(false);
  const [reportsStatus, setReportsStatus] = useState("");
  const [geoStatus, setGeoStatus] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);
  const [propertyEnrichBusy, setPropertyEnrichBusy] = useState(false);
  const [runId, setRunId] = useState(0);
  const [lastEstimateId, setLastEstimateId] = useState<string>("");
  const [propertyDb, setPropertyDb] = useState<PropertyOwnerRecord[]>([]);
  const [activeProperty, setActiveProperty] = useState<PropertyOwnerRecord | null>(null);
  const [propertyDbSearch, setPropertyDbSearch] = useState("");
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);
  const [stlIntel, setStlIntel] = useState<StlIntelData | null>(null);
  const [stlStorms, setStlStorms] = useState<StlStormData | null>(null);
  const [intelBusy, setIntelBusy] = useState(false);
  const [intelError, setIntelError] = useState("");
  const [permitFilter, setPermitFilter] = useState<"all" | "building" | "trades">("all");
  const [stormFilter, setStormFilter] = useState<"all" | "lsr" | "spc" | "nws">("all");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<"all" | "residential" | "commercial" | "other">("all");
  const [damagePhotos, setDamagePhotos] = useState<TaggedDamagePhoto[]>([]);
  const { addContract, addEstimate, addMeasurement } = useRoofing();

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as SavedJob[];
      if (Array.isArray(parsed)) setSavedJobs(parsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem(PROPERTY_DB_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PropertyOwnerRecord[];
      if (Array.isArray(parsed)) {
        setPropertyDb(
          parsed.map((p) => ({
            ...p,
            taxSummary: (p as Partial<PropertyOwnerRecord>).taxSummary ?? "",
          })),
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const r = saveContactsToStorageSafe(contacts);
    if (!r.ok && contacts.length > 0) {
      console.warn("[contacts]", r.message);
    }
  }, [contacts]);

  useEffect(() => {
    const org = loadOrgSettings();
    setProposal((curr) => ({
      ...curr,
      companyName: org.companyName || curr.companyName,
      companyAddress: org.companyAddress || curr.companyAddress,
      companyWebsite: org.companyWebsite || curr.companyWebsite,
      preparedBy: org.preparedBy || curr.preparedBy,
      contactEmail: org.contactEmail || curr.contactEmail,
      contactPhone: org.contactPhone || curr.contactPhone,
      logoDataUrl: org.logoDataUrl || curr.logoDataUrl,
      profile: org.defaultTemplateProfile,
    }));
  }, []);

  useEffect(() => {
    msFootprintsVisibleRef.current = msFootprintsVisible;
  }, [msFootprintsVisible]);

  useEffect(() => {
    fetchSavedReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!mapboxToken.trim()) {
      window.localStorage.removeItem(MAPBOX_TOKEN_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(MAPBOX_TOKEN_STORAGE_KEY, mapboxToken.trim());
  }, [mapboxToken]);

  useLayoutEffect(() => {
    if (!mapboxToken.trim()) {
      setMapboxStatus("Add Mapbox token to enable map.");
      return;
    }
    const container = mapboxContainerRef.current;
    if (!container) return;
    if (mapboxMapRef.current) return;

    let disposed = false;
    mapboxStyleLoadedRef.current = false;
    let resizeObserver: ResizeObserver | null = null;
    const init = async () => {
      try {
        const [{ default: mapboxgl }, { default: MapboxDraw }, turf] = await Promise.all([
          import("mapbox-gl"),
          import("@mapbox/mapbox-gl-draw"),
          import("@turf/turf"),
        ]);
        if (disposed || !mapboxContainerRef.current) return;

        applyMapboxCspWorker(mapboxgl);
        mapboxglModuleRef.current = mapboxgl;
        turfModuleRef.current = turf;
        const token = mapboxToken.trim();
        mapboxgl.accessToken = token;

        const lat = Number.parseFloat(form.latitude);
        const lng = Number.parseFloat(form.longitude);
        const center: [number, number] =
          Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : [-93.53, 44.86];

        const map = new mapboxgl.Map({
          container: mapboxContainerRef.current,
          style: "mapbox://styles/mapbox/satellite-streets-v12",
          center,
          zoom: 18,
        });

        const scheduleResize = () => {
          if (disposed) return;
          map.resize();
          requestAnimationFrame(() => {
            if (!disposed) map.resize();
          });
        };
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => scheduleResize());
          resizeObserver.observe(mapboxContainerRef.current);
        }

        map.on("error", (e: { error?: Error }) => {
          const msg = e?.error?.message ?? "Map error";
          setMapboxStatus((s) => (s ? `${s} (${msg})` : msg));
        });
        const draw = new MapboxDraw({
          displayControlsDefault: false,
          controls: { polygon: true, line_string: true, trash: true },
        });
        map.addControl(draw);
        map.addControl(new mapboxgl.NavigationControl(), "top-right");
        map.addControl(
          new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
            trackUserLocation: true,
            showUserLocation: true,
            showAccuracyCircle: true,
          }),
          "top-right",
        );
        mapboxMapRef.current = map;
        mapboxDrawRef.current = draw;

        const updateArea = () => {
          const data = draw.getAll() as any;
          const polygons = Array.isArray(data?.features)
            ? data.features.filter((f: any) => f.geometry?.type === "Polygon")
            : [];
          setMapboxFeatures(polygons);
          if (!polygons.length) {
            setMapboxAreaSqFt(0);
            setAutoCalcInfo("");
            return;
          }
          const totalSqM = polygons.reduce(
            (sum: number, f: any) => sum + turf.area(f as any),
            0,
          );
          setMapboxAreaSqFt(totalSqM * 10.7639);
          autoCalcRef.current(polygons);
        };
        refreshMapboxFromDrawRef.current = updateArea;

        const handleDrawCreate = (e: any) => {
          const features = Array.isArray(e?.features) ? e.features : [];
          for (const feature of features) {
            if (feature.geometry?.type === "LineString") {
              const lengthFt = turf.length(feature, { units: "feet" });
              addRoofLineRef.current({
                id: feature.id || `line_${Date.now()}`,
                type: lineTypeRef.current,
                lengthFt: Math.round(lengthFt * 100) / 100,
                geometry: feature.geometry,
              });
              draw.delete(feature.id);
            }
          }
          updateArea();
        };

        map.on("draw.create", handleDrawCreate);
        map.on("draw.update", updateArea);
        map.on("draw.delete", updateArea);

        map.on("click", (e: any) => {
          const mode = draw.getMode();
          if (mode === "draw_polygon" || mode === "draw_line_string" || mode === "draw_point") return;
          mapClickHandlerRef.current(e.lngLat.lat, e.lngLat.lng);
        });

        map.on("load", () => {
          if (disposed) return;
          scheduleResize();
          mapboxStyleLoadedRef.current = true;
          const msVis = msFootprintsVisibleRef.current ? "visible" : "none";
          try {
            if (!map.getSource("ms-building-footprints")) {
              map.addSource("ms-building-footprints", {
                type: "vector",
                tiles: [MS_BUILDING_FOOTPRINT_TILES],
                minzoom: 0,
                maxzoom: 16,
              });
            }
            if (!map.getLayer("ms-buildings-fill")) {
              map.addLayer({
                id: "ms-buildings-fill",
                type: "fill",
                source: "ms-building-footprints",
                "source-layer": MS_BUILDING_FOOTPRINT_SOURCE_LAYER,
                layout: { visibility: msVis },
                paint: {
                  "fill-color": "#fbbf24",
                  "fill-opacity": 0.14,
                },
              });
            }
            if (!map.getLayer("ms-buildings-outline")) {
              map.addLayer({
                id: "ms-buildings-outline",
                type: "line",
                source: "ms-building-footprints",
                "source-layer": MS_BUILDING_FOOTPRINT_SOURCE_LAYER,
                layout: { visibility: msVis },
                paint: {
                  "line-color": "#d97706",
                  "line-width": ["interpolate", ["linear"], ["zoom"], 14, 0.4, 19, 2],
                  "line-opacity": 0.85,
                },
              });
            }
          } catch {
            setMapboxStatus((s) =>
              s
                ? `${s} (Microsoft footprint tiles unavailable in this browser/session.)`
                : "Microsoft footprint tiles unavailable.",
            );
          }
          map.addSource("roof-lines", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: "roof-lines-layer",
            type: "line",
            source: "roof-lines",
            paint: {
              "line-color": [
                "match", ["get", "lineType"],
                "ridge", "#ef4444",
                "hip", "#f97316",
                "valley", "#22c55e",
                "eave", "#3b82f6",
                "rake", "#a855f7",
                "wall-flashing", "#eab308",
                "step-flashing", "#06b6d4",
                "#ffffff",
              ] as any,
              "line-width": 3,
              "line-opacity": 0.95,
            },
          });
          map.addLayer({
            id: "roof-lines-labels",
            type: "symbol",
            source: "roof-lines",
            layout: {
              "text-field": ["concat", ["get", "label"], "  ", ["get", "lengthFt"], " ft"] as any,
              "text-size": 11,
              "text-offset": [0, -0.8] as [number, number],
              "symbol-placement": "line-center" as const,
              "text-allow-overlap": true,
            },
            paint: {
              "text-color": "#ffffff",
              "text-halo-color": "#000000",
              "text-halo-width": 1.5,
            },
          });
          setMapReady(true);
          void flushPendingAiFootprint();
          map.once("idle", () => {
            if (!disposed) scheduleResize();
          });
        });

        setMapboxStatus("Click map to set property. Polygon = area. Line = measure ridges/hips/valleys/eaves.");
      } catch (error) {
        setMapboxStatus(
          error instanceof Error ? `Mapbox init failed: ${error.message}` : "Mapbox init failed.",
        );
      }
    };
    init();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      resizeObserver = null;
      mapboxStyleLoadedRef.current = false;
      setMapReady(false);
      propertyMarkerRef.current?.remove();
      propertyMarkerRef.current = null;
      contactMarkersRef.current.forEach((m: any) => m.remove());
      contactMarkersRef.current = [];
      mapboxglModuleRef.current = null;
      if (mapboxMapRef.current) {
        mapboxMapRef.current.remove();
        mapboxMapRef.current = null;
        mapboxDrawRef.current = null;
      }
      refreshMapboxFromDrawRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken, flushPendingAiFootprint]);

  useEffect(() => {
    if (aiMapFootprintTick === 0) return;
    void flushPendingAiFootprint();
  }, [aiMapFootprintTick, flushPendingAiFootprint]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapboxMapRef.current;
    if (!map?.getLayer?.("ms-buildings-fill")) return;
    const v = msFootprintsVisible ? "visible" : "none";
    try {
      map.setLayoutProperty("ms-buildings-fill", "visibility", v);
      map.setLayoutProperty("ms-buildings-outline", "visibility", v);
    } catch {
      /* layers may be missing during map rebuild */
    }
  }, [msFootprintsVisible, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapboxMapRef.current;
    const mapboxgl = mapboxglModuleRef.current;
    if (!map || !mapboxgl) return;

    if (propertyMarkerRef.current) {
      propertyMarkerRef.current.remove();
      propertyMarkerRef.current = null;
    }
    contactMarkersRef.current.forEach((m: any) => m.remove());
    contactMarkersRef.current = [];

    const lat = Number.parseFloat(form.latitude);
    const lng = Number.parseFloat(form.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:18px;height:18px;background:#ef4444;border:2px solid #fff;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,.4);cursor:pointer;";
      propertyMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML("<strong>Selected Property</strong>"))
        .addTo(map);
    }

    contacts
      .filter((c) => c.lat != null && c.lng != null)
      .slice(0, 200)
      .forEach((c) => {
        const el = document.createElement("div");
        el.style.cssText =
          "width:14px;height:14px;background:#3b82f6;border:2px solid #fff;border-radius:50%;cursor:pointer;box-shadow:0 0 3px rgba(0,0,0,.3);";
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([c.lng!, c.lat!])
          .setPopup(
            new mapboxgl.Popup({ offset: 10 }).setHTML(
              `<strong>${c.name || "Contact"}</strong><br/>${c.address || "No address"}`,
            ),
          )
          .addTo(map);
        marker.getElement().addEventListener("click", () => {
          setSelectedContactId(c.id);
          applyContactHandlerRef.current(c);
        });
        contactMarkersRef.current.push(marker);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, form.latitude, form.longitude, contacts]);

  useEffect(() => {
    const map = mapboxMapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource("roof-lines") as any;
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: drawnRoofLines.map((line) => ({
        type: "Feature" as const,
        properties: {
          lineType: line.type,
          label: ROOF_LINE_TYPES.find((t) => t.type === line.type)?.label || line.type,
          lengthFt: line.lengthFt.toFixed(1),
        },
        geometry: line.geometry,
      })),
    });
  }, [drawnRoofLines, mapReady]);

  useEffect(() => {
    const lat = Number.parseFloat(form.latitude);
    const lng = Number.parseFloat(form.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const inMo =
      lng >= MISSOURI_BBOX.west &&
      lng <= MISSOURI_BBOX.east &&
      lat >= MISSOURI_BBOX.south &&
      lat <= MISSOURI_BBOX.north;
    if (!inMo) return;
    const timer = window.setTimeout(() => {
      fetchStlIntelAtPoint(lat, lng);
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.latitude, form.longitude]);

  useEffect(() => {
    if (!autoCalcEnabled || !mapboxFeatures.length) return;
    const polygons = mapboxFeatures.filter((f: any) => f.geometry?.type === "Polygon");
    if (polygons.length) autoCalcRef.current(polygons);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.roofType, form.roofPitch, autoCalcEnabled]);

  const persistJobs = (jobs: SavedJob[]) => {
    setSavedJobs(jobs);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  };

  const result = useMemo(() => {
    if (!runId) return null;
    return buildResult(form);
  }, [runId, form]);

  const roofDiagramPreviewHtml = useMemo(() => {
    if (!result) return "";
    if (raybevelDiagramSvg?.includes("<svg")) {
      return `<div style="max-width:100%;overflow:auto;border-radius:8px;background:#fff;padding:4px">${raybevelDiagramSvg}</div>`;
    }
    const previewPerim = Number.parseFloat(form.perimeterFt);
    return buildRoofDiagramSvg(
      form.roofType,
      form.roofStructure,
      getLineLengthsFromForm(form),
      Number.parseFloat(form.areaSqFt) || 0,
      form.roofPitch,
      {
        width: 560,
        height: 360,
        dark: true,
        footprint: diagramFootprintFromForm(form),
        perimeterFt:
          Number.isFinite(previewPerim) && previewPerim > 0 ? previewPerim : undefined,
      },
    );
  }, [
    raybevelDiagramSvg,
    result,
    form.roofType,
    form.roofStructure,
    form.areaSqFt,
    form.perimeterFt,
    form.roofPitch,
    form.ridgesFt,
    form.eavesFt,
    form.rakesFt,
    form.valleysFt,
    form.hipsFt,
    form.wallFlashingFt,
    form.stepFlashingFt,
  ]);

  const generateRaybevelDiagramFromMap = async () => {
    const poly = mapboxFeatures.find((f: any) => f.geometry?.type === "Polygon");
    if (!poly) {
      window.alert("Draw or import a roof polygon on the map first.");
      return;
    }
    const ring = exteriorRingLngLatFromPolygonFeature(poly);
    if (!ring || ring.length < 4) {
      window.alert("Could not read polygon exterior ring.");
      return;
    }
    setRaybevelDiagramBusy(true);
    setRaybevelDiagramNote("");
    const res = await fetchRaybevelSkeletonSvg(ring);
    setRaybevelDiagramBusy(false);
    if ("error" in res) {
      setRaybevelDiagramNote(res.error);
      return;
    }
    setRaybevelDiagramSvg(res.svg);
    setRaybevelDiagramNote(
      "Proposal preview and Print/PDF use this raybevel straight-skeleton diagram. Clear to restore the schematic diagram.",
    );
  };

  const wasteScenarioBaseSq = useMemo(
    () => deriveRoofQuantities(form)?.surfaceSquares ?? 0,
    [form.areaSqFt, form.measuredSquares, form.roofPitch],
  );

  const toggleDamage = (type: DamageType) => {
    setForm((curr) => ({
      ...curr,
      damageTypes: curr.damageTypes.includes(type)
        ? curr.damageTypes.filter((x) => x !== type)
        : [...curr.damageTypes, type],
    }));
  };

  const geocodeAddress = async () => {
    if (!form.address.trim()) {
      window.alert("Enter an address first.");
      return;
    }
    setGeoBusy(true);
    setGeoStatus("Looking up address...");
    try {
      const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + encodeURIComponent(form.address);
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Address lookup failed");
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      const hit = data[0];
      if (!hit) {
        setGeoStatus("No match found.");
        return;
      }
      setForm((curr) => ({ ...curr, address: hit.display_name || curr.address, latitude: Number.parseFloat(hit.lat).toFixed(6), longitude: Number.parseFloat(hit.lon).toFixed(6) }));
      flyMapTo(Number.parseFloat(hit.lat), Number.parseFloat(hit.lon));
      setGeoStatus("Address resolved.");
    } catch (e) {
      setGeoStatus(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setGeoBusy(false);
    }
  };

  const reverseFromCoords = async () => {
    const lat = Number.parseFloat(form.latitude);
    const lng = Number.parseFloat(form.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      window.alert("Enter valid latitude and longitude first.");
      return;
    }
    setGeoBusy(true);
    setGeoStatus("Reverse geocoding coordinates...");
    try {
      const url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + encodeURIComponent(String(lat)) + "&lon=" + encodeURIComponent(String(lng));
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Reverse lookup failed");
      const data = (await res.json()) as { display_name?: string };
      setForm((curr) => ({ ...curr, address: data.display_name?.trim() || curr.address }));
      setGeoStatus("Coordinates resolved.");
    } catch (e) {
      setGeoStatus(e instanceof Error ? e.message : "Reverse lookup failed");
    } finally {
      setGeoBusy(false);
    }
  };

  const fetchStlIntelAtPoint = async (lat: number, lng: number) => {
    setIntelBusy(true);
    setIntelError("");
    try {
      const [intelRes, stormsRes] = await Promise.all([
        fetch(`${INTEL_API_BASE}/api/stl/intel?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`),
        fetch(`${INTEL_API_BASE}/api/stl/storm-reports?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}&days=14`),
      ]);
      if (!intelRes.ok) throw new Error(`STL intel request failed (${intelRes.status})`);
      if (!stormsRes.ok) throw new Error(`Storm report request failed (${stormsRes.status})`);
      const intelJson = (await intelRes.json()) as { data?: StlIntelData };
      const stormJson = (await stormsRes.json()) as { data?: StlStormData };
      setStlIntel(intelJson.data ?? null);
      setStlStorms(stormJson.data ?? null);
    } catch (e) {
      setIntelError(e instanceof Error ? e.message : "Failed to load STL intel data");
    } finally {
      setIntelBusy(false);
    }
  };

  const resolveBatchDataKey = (): string => {
    const fromStorage = window.localStorage.getItem(PROPERTY_SCRAPER_BATCHDATA_KEY_STORAGE)?.trim() || "";
    if (fromStorage) return fromStorage;
    return String(import.meta.env.VITE_BATCHDATA_API_KEY ?? "").trim();
  };

  const mergeBatchPayloadIntoProperty = (
    base: PropertyOwnerRecord,
    payload: PropertyImportPayload,
    taxSummary: string,
  ): PropertyOwnerRecord => {
    const taxLine = taxSummary.trim();
    const nextNotes = [base.notes.trim(), payload.notes.trim()].filter(Boolean).join("\n");
    return {
      ...base,
      address: payload.address.trim() || base.address,
      ownerName: payload.ownerName.trim() || base.ownerName,
      ownerPhone: payload.ownerPhone.trim() || payload.contactPersonPhone.trim() || base.ownerPhone,
      ownerEmail: payload.ownerEmail.trim() || base.ownerEmail,
      propertyType: payload.propertyType || base.propertyType,
      yearBuilt: payload.yearBuilt.trim() || base.yearBuilt,
      lotSizeSqFt: payload.lotSizeSqFt.trim() || base.lotSizeSqFt,
      taxSummary: taxLine || base.taxSummary,
      notes: nextNotes,
      updatedAt: new Date().toISOString(),
    };
  };

  const enrichPropertyFromBatchData = async (
    base: PropertyOwnerRecord,
    criteria: { street_address: string; city: string; state: string; zip_code: string } | null,
  ): Promise<PropertyOwnerRecord> => {
    if (!criteria) return base;
    const key = resolveBatchDataKey();
    if (!key) return base;
    const r = await fetchBatchDataPropertyByAddress(key, criteria);
    if (!r.ok) {
      setGeoStatus((curr) => (curr ? `${curr} | BatchData: ${r.message}` : `BatchData: ${r.message}`));
      return base;
    }
    const taxSummary = formatTaxSummaryFromBatchDataRecord(r.rawRecord);
    return mergeBatchPayloadIntoProperty(base, r.payload, taxSummary);
  };

  const addDamagePhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const next: TaggedDamagePhoto[] = [];
    for (const file of Array.from(files)) {
      const previewUrl = URL.createObjectURL(file);
      next.push({
        id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        previewUrl,
        tags: [],
      });
    }
    setDamagePhotos((curr) => [...next, ...curr].slice(0, 40));
  };

  const toggleDamagePhotoTag = (photoId: string, tag: string) => {
    setDamagePhotos((curr) =>
      curr.map((p) => {
        if (p.id !== photoId) return p;
        const exists = p.tags.includes(tag);
        return { ...p, tags: exists ? p.tags.filter((t) => t !== tag) : [...p.tags, tag] };
      }),
    );
  };

  const mapClickSetProperty = async (lat: number, lng: number) => {
    setForm((curr) => ({
      ...curr,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));

    const existing = findNearbyProperty(lat, lng);
    fetchStlIntelAtPoint(lat, lng);
    if (existing) {
      setActiveProperty(existing);
      setShowPropertyPanel(true);
      applyPropertyToForm(existing);
      setGeoStatus(`Loaded saved property: ${existing.ownerName || existing.address}`);
      return;
    }

    setGeoBusy(true);
    setPropertyEnrichBusy(true);
    setGeoStatus("Reading clicked property address...");
    try {
      const url =
        "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" +
        encodeURIComponent(String(lat)) +
        "&lon=" +
        encodeURIComponent(String(lng));
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Map reverse lookup failed");
      const data = (await res.json()) as { display_name?: string; address?: { state?: string; house_number?: string; road?: string; city?: string; town?: string; village?: string; postcode?: string } };
      const resolvedAddress = data.display_name?.trim() || "";
      const stateCode = (data.address?.state?.slice(0, 2) || form.stateCode).toUpperCase();
      setForm((curr) => ({
        ...curr,
        address: resolvedAddress || curr.address,
        stateCode,
      }));
      const blank = newBlankProperty(resolvedAddress, lat, lng);
      const criteria =
        nominatimReverseToBatchDataCriteria({
          display_name: data.display_name,
          address: data.address as Record<string, string | undefined> | undefined,
        }) ?? parseUsAddressLineForBatchData(resolvedAddress);
      const enriched = await enrichPropertyFromBatchData(blank, criteria);
      setActiveProperty(enriched);
      setShowPropertyPanel(true);
      const hasTax = enriched.taxSummary.trim().length > 0;
      const hasContact = Boolean(enriched.ownerName || enriched.ownerPhone || enriched.ownerEmail);
      if (hasTax || hasContact) {
        setGeoStatus("Property loaded with assessor/tax and owner contact details.");
      } else {
        setGeoStatus("Property loaded. Add owner details and save.");
      }
    } catch (e) {
      const blank = newBlankProperty("", lat, lng);
      setActiveProperty(blank);
      setShowPropertyPanel(true);
      setGeoStatus(e instanceof Error ? e.message : "Map lookup failed");
    } finally {
      setPropertyEnrichBusy(false);
      setGeoBusy(false);
    }
  };

  const uploadContactsCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseContactsCsv(text);
      setContacts(parsed);
      if (parsed.length) setSelectedContactId(parsed[0]?.id ?? "");
      window.alert(`Imported ${parsed.length} contacts.`);
    };
    reader.readAsText(file);
  };

  const flyMapTo = (lat: number, lng: number) => {
    const map = mapboxMapRef.current;
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.flyTo({ center: [lng, lat], zoom: 18, duration: 1200 });
  };

  const applyContactToProposal = (contact: ContactRecord) => {
    setProposal((curr) => proposalStateWithContact(curr, contact));
    setForm((curr) => formStateWithContact(curr, contact));
    if (contact.lat != null && contact.lng != null) {
      flyMapTo(contact.lat, contact.lng);
    }
  };

  const applyContactAndEnrichProperty = async (contact: ContactRecord) => {
    applyContactToProposal(contact);
    if (contact.lat == null || contact.lng == null) return;
    const addressLine = [contact.address, contact.city, contact.state, contact.zip].filter(Boolean).join(", ");
    const criteria = parseUsAddressLineForBatchData(addressLine);
    const base = newBlankProperty(addressLine, contact.lat, contact.lng);
    setShowPropertyPanel(true);
    setActiveProperty(base);
    setPropertyEnrichBusy(true);
    setGeoStatus("Loading property + tax/contact details for selected contact...");
    try {
      const enriched = await enrichPropertyFromBatchData(base, criteria);
      setActiveProperty(enriched);
      const hasTax = enriched.taxSummary.trim().length > 0;
      const hasContact = Boolean(enriched.ownerName || enriched.ownerPhone || enriched.ownerEmail);
      if (hasTax || hasContact) {
        setGeoStatus("Contact property loaded with assessor/tax and owner details.");
      } else {
        setGeoStatus("Contact applied. No additional assessor fields returned.");
      }
    } finally {
      setPropertyEnrichBusy(false);
    }
  };

  const handleAiRoofPitchFromImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const looksImage =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif)$/i.test(file.name);
    if (!looksImage) {
      setAiMeasureNote("Choose an image file.");
      return;
    }
    const maxBytes = 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      setAiMeasureNote("Image too large (max 4 MB).");
      return;
    }
    setAiMeasureBusy(true);
    setAiMeasureNote("");
    try {
      const { imageBase64, mimeType } = await prepareImageForRoofPitchAi(file);
      if (imageBase64.length > 5_500_000) {
        setAiMeasureNote("Image is still too large after compression; try a smaller photo.");
        return;
      }
      const contextParts: string[] = [];
      if (form.address.trim()) contextParts.push(`Job address: ${form.address.trim()}`);
      const res = await fetch(`${INTEL_API_BASE}/api/ai/roof-pitch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          ...(contextParts.length ? { context: contextParts.join("\n") } : {}),
        }),
      });
      const rawText = await res.text();
      let json: {
        success?: boolean;
        error?: string;
        rationale?: string;
        detail?: string;
        data?: {
          estimatePitch: string;
          confidence?: string;
          rationale?: string;
          estimateRoofAreaSqFt: number | null;
          estimateRoofPerimeterFt: number | null;
          measurementConfidence?: string | null;
          measurementRationale?: string;
        };
      };
      try {
        json = JSON.parse(rawText) as typeof json;
      } catch {
        setAiMeasureNote(
          res.ok
            ? "Invalid response from intel server."
            : `Intel server error (${res.status}). Is the Worker running on port 8787?`,
        );
        return;
      }
      const rawPitch = json.data?.estimatePitch;
      const hasPitch =
        rawPitch != null && String(rawPitch).trim() !== "" && String(rawPitch).trim().toLowerCase() !== "unknown";
      if (!json.success || !hasPitch) {
        const extra =
          typeof json.detail === "string" && json.detail.trim()
            ? ` — ${json.detail.trim().slice(0, 200)}`
            : "";
        setAiMeasureNote(
          (json.error || json.rationale || "Could not estimate from this image.") + extra,
        );
        return;
      }
      const d = json.data!;
      const pitchForForm = canonicalPitchRiseOver12(rawPitch as string | number);
      const pitchRise = parsePitchRise(pitchForForm) ?? 6;
      const pitchFactor = Math.sqrt(1 + (pitchRise / 12) ** 2);
      const areaN =
        typeof d.estimateRoofAreaSqFt === "number" && d.estimateRoofAreaSqFt > 0
          ? d.estimateRoofAreaSqFt
          : null;
      const perimN =
        typeof d.estimateRoofPerimeterFt === "number" && d.estimateRoofPerimeterFt > 0
          ? d.estimateRoofPerimeterFt
          : null;

      let planForGeo =
        areaN != null ? areaN / pitchFactor : null;
      if (planForGeo == null || planForGeo <= 0) {
        const fp = parseFloat(form.areaSqFt);
        if (Number.isFinite(fp) && fp > 0) planForGeo = fp;
      }
      const geo =
        planForGeo != null && planForGeo > 0
          ? computeRoofGeometryFromPlanInputs(
              planForGeo,
              perimN,
              form.roofType,
              form.roofStructure,
              pitchForForm,
            )
          : null;

      setForm((curr) => {
        const next = { ...curr, roofPitch: pitchForForm };
        if (areaN !== null) {
          next.measuredSquares = (areaN / 100).toFixed(2);
          next.areaSqFt = (areaN / pitchFactor).toFixed(2);
        }
        if (perimN !== null) {
          next.perimeterFt = perimN.toFixed(2);
        } else if (geo) {
          next.perimeterFt = geo.floorPerimeterFt.toFixed(2);
        }
        if (geo) {
          if (areaN == null) {
            next.areaSqFt = geo.planAreaSqFt.toFixed(2);
            next.measuredSquares = (geo.surfaceAreaSqFt / 100).toFixed(2);
          }
          const f = fmtLengthFeetInches;
          next.ridgesFt = f(geo.ridgeFt);
          next.eavesFt = f(geo.eaveFt);
          next.rakesFt = f(geo.rakeFt);
          next.valleysFt = f(geo.valleyFt);
          next.hipsFt = f(geo.hipFt);
          next.wallFlashingFt = f(geo.wallFlashFt);
          next.stepFlashingFt = f(geo.stepFlashFt);
        }
        return next;
      });

      const lat = parseFloat(form.latitude);
      const lng = parseFloat(form.longitude);
      if (geo && Number.isFinite(lat) && Number.isFinite(lng)) {
        pendingAiFootprintRef.current = { lat, lng, L: geo.buildingL, W: geo.buildingW };
        setAiMapFootprintTick((t) => t + 1);
      }
      const bits = [`Pitch ${pitchForForm} (${d.confidence || "low"})`];
      if (d.rationale) bits.push(d.rationale);
      if (d.estimateRoofAreaSqFt != null && d.estimateRoofAreaSqFt > 0) {
        bits.push(`~${d.estimateRoofAreaSqFt} SF surface → plan & squares filled`);
        if (d.measurementConfidence) bits.push(`meas. ${d.measurementConfidence}`);
      } else if (d.measurementRationale) {
        bits.push(d.measurementRationale);
      }
      if (d.estimateRoofPerimeterFt != null && d.estimateRoofPerimeterFt > 0) {
        bits.push(`perimeter ~${d.estimateRoofPerimeterFt} LF`);
      }
      setAiMeasureNote(bits.join(" · "));
      // Refresh estimate panel (result is gated on runId until first run)
      setRunId((n) => n + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setAiMeasureNote(
        /failed to fetch|networkerror|load failed/i.test(msg)
          ? `${msg} — Start the Intel Worker (e.g. wrangler dev on port 8787) or set VITE_INTEL_API_BASE.`
          : msg,
      );
    } finally {
      setAiMeasureBusy(false);
    }
  };

  mapClickHandlerRef.current = mapClickSetProperty;
  applyContactHandlerRef.current = (c) => {
    void applyContactAndEnrichProperty(c);
  };
  lineTypeRef.current = currentLineType;
  addRoofLineRef.current = (line) => setDrawnRoofLines((prev) => [...prev, line]);

  autoCalcRef.current = (polygons: any[]) => {
    if (!autoCalcEnabled) return;
    if (!polygons.length) return;

    const geo = computePolygonRoofGeometry(polygons, form.roofType, form.roofStructure, form.roofPitch);
    if (!geo) return;

    const fmt = (ft: number) => {
      if (ft <= 0) return "0ft 0in";
      const w = Math.floor(ft);
      const inches = Math.round((ft - w) * 12);
      return `${w}ft ${inches}in`;
    };

    const manualSums: Record<string, number> = {};
    for (const line of drawnRoofLines) manualSums[line.type] = (manualSums[line.type] || 0) + line.lengthFt;

    const squares = geo.surfaceAreaSqFt / 100;

    setForm((curr) => ({
      ...curr,
      areaSqFt: geo.planAreaSqFt.toFixed(2),
      measuredSquares: squares.toFixed(2),
      perimeterFt: geo.floorPerimeterFt.toFixed(2),
      ridgesFt: (manualSums["ridge"] ?? 0) > 0 ? fmt(manualSums["ridge"] ?? 0) : fmt(geo.ridgeFt),
      eavesFt: (manualSums["eave"] ?? 0) > 0 ? fmt(manualSums["eave"] ?? 0) : fmt(geo.eaveFt),
      rakesFt: (manualSums["rake"] ?? 0) > 0 ? fmt(manualSums["rake"] ?? 0) : fmt(geo.rakeFt),
      valleysFt: (manualSums["valley"] ?? 0) > 0 ? fmt(manualSums["valley"] ?? 0) : fmt(geo.valleyFt),
      hipsFt: (manualSums["hip"] ?? 0) > 0 ? fmt(manualSums["hip"] ?? 0) : fmt(geo.hipFt),
      wallFlashingFt:
        (manualSums["wall-flashing"] ?? 0) > 0
          ? fmt(manualSums["wall-flashing"] ?? 0)
          : fmt(geo.wallFlashFt),
      stepFlashingFt:
        (manualSums["step-flashing"] ?? 0) > 0
          ? fmt(manualSums["step-flashing"] ?? 0)
          : fmt(geo.stepFlashFt),
    }));

    setAutoCalcInfo(
      `Auto: ${geo.roofForm} roof | ${geo.buildingL.toFixed(0)}×${geo.buildingW.toFixed(0)} ft | ` +
      `Plan ${geo.planAreaSqFt.toFixed(0)} SF → ${squares.toFixed(2)} SQ surface (pitch ×${geo.pitchFactor.toFixed(2)}) | ` +
      `Ridge ${fmt(geo.ridgeFt)} | Eaves ${fmt(geo.eaveFt)}` +
      (geo.rakeFt > 0 ? ` | Rakes ${fmt(geo.rakeFt)}` : "") +
      (geo.hipFt > 0 ? ` | Hips ${fmt(geo.hipFt)}` : "") +
      (geo.valleyFt > 0 ? ` | Valleys ${fmt(geo.valleyFt)}` : "") +
      ` | Roof edge total ${geo.totalRoofEdgeLf.toFixed(1)} LF`,
    );
  };

  const persistPropertyDb = (records: PropertyOwnerRecord[]) => {
    setPropertyDb(records);
    window.localStorage.setItem(PROPERTY_DB_KEY, JSON.stringify(records));
  };

  const findNearbyProperty = (lat: number, lng: number, thresholdFt = 150): PropertyOwnerRecord | null => {
    const degPerFt = 1 / 364000;
    const threshold = thresholdFt * degPerFt;
    let best: PropertyOwnerRecord | null = null;
    let bestDist = Infinity;
    for (const p of propertyDb) {
      const d = Math.sqrt((p.lat - lat) ** 2 + (p.lng - lng) ** 2);
      if (d < threshold && d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  };

  const newBlankProperty = (address: string, lat: number, lng: number): PropertyOwnerRecord => ({
    id: `prop_${Date.now()}`,
    address,
    lat,
    lng,
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    propertyType: "residential",
    yearBuilt: "",
    lotSizeSqFt: "",
    roofType: form.roofType || "Asphalt Shingle",
    stories: "",
    taxSummary: "",
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const saveActiveProperty = () => {
    if (!activeProperty) return;
    const updated = { ...activeProperty, updatedAt: new Date().toISOString() };
    const idx = propertyDb.findIndex((p) => p.id === updated.id);
    if (idx >= 0) {
      const next = [...propertyDb];
      next[idx] = updated;
      persistPropertyDb(next);
    } else {
      persistPropertyDb([updated, ...propertyDb]);
    }
    setActiveProperty(updated);
  };

  const deletePropertyRecord = (id: string) => {
    persistPropertyDb(propertyDb.filter((p) => p.id !== id));
    if (activeProperty?.id === id) {
      setActiveProperty(null);
      setShowPropertyPanel(false);
    }
  };

  const applyPropertyToForm = (prop: PropertyOwnerRecord) => {
    setForm((curr) => ({
      ...curr,
      address: prop.address || curr.address,
      latitude: prop.lat.toFixed(6),
      longitude: prop.lng.toFixed(6),
      roofType: prop.roofType || curr.roofType,
    }));
    setProposal((curr) => ({
      ...curr,
      clientName: prop.ownerName || curr.clientName,
      clientEmail: prop.ownerEmail || curr.clientEmail,
      clientPhone: prop.ownerPhone || curr.clientPhone,
    }));
  };

  const loadPropertyIntoPanel = (prop: PropertyOwnerRecord) => {
    setActiveProperty(prop);
    setShowPropertyPanel(true);
    flyMapTo(prop.lat, prop.lng);
  };

  const filteredPropertyDb = useMemo(() => {
    const q = propertyDbSearch.trim().toLowerCase();
    if (!q) return propertyDb;
    return propertyDb.filter((p) =>
      [p.address, p.ownerName, p.ownerEmail, p.ownerPhone, p.propertyType, p.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [propertyDb, propertyDbSearch]);

  const bulkGeocodeContacts = async () => {
    if (!contacts.length) {
      window.alert("Import contacts first.");
      return;
    }
    setContactsGeocodeBusy(true);
    let updatedCount = 0;
    const next = [...contacts];
    for (let i = 0; i < next.length; i += 1) {
      const c = next[i];
      if (!c || c.lat != null || c.lng != null) continue;
      const query = [c.address, c.city, c.state, c.zip].filter(Boolean).join(", ");
      if (!query) continue;
      try {
        const url =
          "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" +
          encodeURIComponent(query);
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) continue;
        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        const hit = data[0];
        if (hit) {
          const lat = Number.parseFloat(hit.lat);
          const lng = Number.parseFloat(hit.lon);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            next[i] = { ...c, lat, lng };
            updatedCount += 1;
          }
        }
      } catch {
        // Ignore individual geocode failures
      }
      // Light throttle for geocoding service fairness.
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
    setContacts(next);
    setContactsGeocodeBusy(false);
    window.alert(`Geocoded ${updatedCount} contact(s).`);
  };

  const createProposalFromContact = (contact: ContactRecord) => {
    applyContactToProposal(contact);
    setRunId((id) => id + 1);
  };

  const saveJob = () => {
    const name = window.prompt("Name this saved job:", form.address || "Roof estimate");
    if (!name?.trim()) return;
    const job: SavedJob = { id: `job_${Date.now()}`, name: name.trim(), createdAtIso: new Date().toISOString(), form };
    persistJobs([job, ...savedJobs].slice(0, 30));
  };

  const loadJob = (id: string) => {
    const job = savedJobs.find((x) => x.id === id);
    if (!job) return;
    setForm({ ...defaultFormState(), ...job.form });
  };

  const deleteJob = (id: string) => {
    persistJobs(savedJobs.filter((x) => x.id !== id));
  };

  const exportTxt = () => {
    if (!result) {
      window.alert("Run estimate first.");
      return;
    }
    const text = buildReportText(form, result);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `roof-estimate-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportProposalTxt = () => {
    if (!result) {
      window.alert("Run estimate first.");
      return;
    }
    const text = buildProposalText(form, result, proposal);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `roof-proposal-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const printReport = () => {
    if (!result) {
      window.alert("Run estimate first.");
      return;
    }
    const html = buildReportText(form, result).replace(/\n/g, "<br/>");
    const win = window.open("", "_blank", "width=900,height=800");
    if (!win) return;
    win.document.write(`<html><head><title>Roof Estimate Report</title><style>body{font-family:Arial,sans-serif;padding:24px;line-height:1.4}</style></head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  const printProposal = () => {
    if (!result) {
      window.alert("Run estimate first.");
      return;
    }
    if (lastEstimateId) {
      const id = `contract_${Date.now()}`;
      addContract({
        id,
        estimateId: lastEstimateId,
        projectName: form.address || "Roof Project",
        clientName: proposal.clientName || "Client",
        clientAddress: form.address || "",
        clientPhone: proposal.clientPhone || "",
        clientEmail: proposal.clientEmail || "",
        date: new Date().toLocaleDateString(),
        startDate: "",
        completionDate: "",
        terms: [proposal.inclusions, proposal.exclusions, proposal.paymentSchedule, proposal.warranty]
          .filter(Boolean)
          .join("\n\n"),
        totalAmount: result.finalCost,
        depositAmount: Math.round(result.finalCost * 0.35),
        status: "draft",
      });
    }
    const html = buildProposalHtml(form, result, proposal, { diagramSvgOverride: raybevelDiagramSvg });
    const win = window.open("", "_blank", "width=980,height=900");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  const toFtIn = (ft: number) => {
    if (!Number.isFinite(ft) || ft <= 0) return "0ft 0in";
    const wholeFt = Math.floor(ft);
    const inches = Math.round((ft - wholeFt) * 12);
    return `${wholeFt}ft ${inches}in`;
  };

  const prepareFormFromMapMeasurements = (base: FormState): FormState => {
    const next = { ...base };

    const manualSums: Record<RoofLineType, number> = {
      ridge: 0,
      hip: 0,
      valley: 0,
      eave: 0,
      rake: 0,
      "wall-flashing": 0,
      "step-flashing": 0,
    };
    for (const line of drawnRoofLines) manualSums[line.type] += line.lengthFt;

    // Always apply explicit map area when available.
    if (mapboxAreaSqFt > 0) {
      next.areaSqFt = mapboxAreaSqFt.toFixed(2);
      next.measuredSquares = (mapboxAreaSqFt / 100).toFixed(2);
    }

    // Apply manual line measurements first (they should override auto-calc dimensions).
    if (manualSums.ridge > 0) next.ridgesFt = toFtIn(manualSums.ridge);
    if (manualSums.eave > 0) next.eavesFt = toFtIn(manualSums.eave);
    if (manualSums.rake > 0) next.rakesFt = toFtIn(manualSums.rake);
    if (manualSums.valley > 0) next.valleysFt = toFtIn(manualSums.valley);
    if (manualSums.hip > 0) next.hipsFt = toFtIn(manualSums.hip);
    if (manualSums["wall-flashing"] > 0) next.wallFlashingFt = toFtIn(manualSums["wall-flashing"]);
    if (manualSums["step-flashing"] > 0) next.stepFlashingFt = toFtIn(manualSums["step-flashing"]);
    const manualPerim = manualSums.eave + manualSums.rake;
    if (manualPerim > 0) next.perimeterFt = manualPerim.toFixed(2);

    // Auto-calculate from polygons when available (shared geometry module).
    const polygons = mapboxFeatures.filter((f: any) => f.geometry?.type === "Polygon");
    if (!autoCalcEnabled || polygons.length === 0) return next;

    const geo = computePolygonRoofGeometry(polygons, next.roofType, next.roofStructure, next.roofPitch);
    if (!geo) return next;

    next.areaSqFt = geo.planAreaSqFt.toFixed(2);
    if (geo.floorPerimeterFt > 0 && manualPerim <= 0) next.perimeterFt = geo.floorPerimeterFt.toFixed(2);
    next.measuredSquares = (geo.surfaceAreaSqFt / 100).toFixed(2);

    if (manualSums.ridge <= 0 && geo.ridgeFt > 0) next.ridgesFt = toFtIn(geo.ridgeFt);
    if (manualSums.eave <= 0 && geo.eaveFt > 0) next.eavesFt = toFtIn(geo.eaveFt);
    if (manualSums.rake <= 0 && geo.rakeFt > 0) next.rakesFt = toFtIn(geo.rakeFt);
    if (manualSums.valley <= 0 && geo.valleyFt > 0) next.valleysFt = toFtIn(geo.valleyFt);
    if (manualSums.hip <= 0 && geo.hipFt > 0) next.hipsFt = toFtIn(geo.hipFt);
    if (manualSums["wall-flashing"] <= 0 && geo.wallFlashFt > 0) next.wallFlashingFt = toFtIn(geo.wallFlashFt);
    if (manualSums["step-flashing"] <= 0 && geo.stepFlashFt > 0) next.stepFlashingFt = toFtIn(geo.stepFlashFt);

    return next;
  };

  const runEstimatePipeline = (preparedForm: FormState) => {
    const area = Number.parseFloat(preparedForm.areaSqFt);
    const sq = Number.parseFloat(preparedForm.measuredSquares);
    if ((!Number.isFinite(area) || area <= 0) && (!Number.isFinite(sq) || sq <= 0)) {
      window.alert("Enter plan area or measured squares before generating.");
      return;
    }

    const computed = buildResult(preparedForm);
    if (computed) {
      const measurementId = `m_${Date.now()}`;
      const roofForm = inferRoofFormType(preparedForm.roofType, preparedForm.roofStructure);
      const pitchRise = parsePitchRise(preparedForm.roofPitch) ?? 6;
      const waste = Number.parseFloat(preparedForm.wastePercent) || computed.wastePct;
      const adjustedArea = computed.effectiveSquares * 100;
      const approxSide = Math.sqrt(adjustedArea);

      addMeasurement({
        id: measurementId,
        projectName: preparedForm.address || "Roof Project",
        date: new Date().toLocaleDateString(),
        roofMaterial: preparedForm.roofType,
        roofForm,
        length: Number.isFinite(approxSide) ? round2(approxSide) : 0,
        width: Number.isFinite(approxSide) ? round2(approxSide) : 0,
        pitch: pitchRise,
        totalArea: adjustedArea,
        wastePercentage: waste,
        adjustedArea,
      });

      const estimateId = `e_${Date.now()}`;
      setLastEstimateId(estimateId);
      const materials = computed.scopeLines
        .filter((l) => !isLaborScopeLine(l.code))
        .map((l) => ({
          name: `${l.code} ${l.description}`,
          quantity: l.quantity,
          unit: l.unit,
          unitCost: l.unitCost,
          totalCost: l.total,
        }));
      const labor = computed.scopeLines
        .filter((l) => isLaborScopeLine(l.code))
        .map((l) => ({
          description: `${l.code} ${l.description}`,
          hours: 1,
          hourlyRate: l.total,
          totalCost: l.total,
        }));

      addEstimate({
        id: estimateId,
        measurementId,
        projectName: preparedForm.address || "Roof Project",
        date: new Date().toLocaleDateString(),
        materials,
        labor,
        subtotal: computed.lineItemTotal,
        tax: computed.materialSalesTax,
        rcvBeforeMarkup: computed.rcvSubtotalBeforeMarkup,
        estimateMarkup: computed.estimateMarkupAmount,
        total: computed.finalCost,
      });

      setProposal((curr) => ({
        ...curr,
        insuranceSupplementNotes: buildInsuranceSupplementNotes(preparedForm, computed),
        estimatedInsurancePayout: buildEstimatedInsurancePayoutSummary(computed),
      }));
    }

    setRunId((id) => id + 1);
  };

  const runEstimateAndRecord = () => {
    const preparedForm = prepareFormFromMapMeasurements(form);
    setForm(preparedForm);
    runEstimatePipeline(preparedForm);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- deep link; one-shot query handling
  useEffect(() => {
    const contactId = searchParams.get("contactId");
    if (!contactId) return;
    const auto = searchParams.get("auto") === "1";
    setSearchParams({}, { replace: true });
    const list = loadContactsFromStorage();
    const c = list.find((x) => x.id === contactId);
    if (!c) return;
    setContacts(list);
    setSelectedContactId(c.id);
    setProposal((curr) => proposalStateWithContact(curr, c));
    setForm((curr) => {
      const next = formStateWithContact(curr, c);
      if (auto) {
        const pf = prepareFormFromMapMeasurements(next);
        queueMicrotask(() => runEstimatePipeline(pf));
        return pf;
      }
      return next;
    });
    if (c.lat != null && c.lng != null) {
      const clat = c.lat;
      const clng = c.lng;
      queueMicrotask(() => flyMapTo(clat, clng));
    }
  }, [searchParams]);

  // One-shot import from Property records page (localStorage handoff).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; flyMapTo is stable enough for map fly
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(PENDING_PROPERTY_IMPORT_KEY);
      if (!raw) return;
      window.localStorage.removeItem(PENDING_PROPERTY_IMPORT_KEY);
      const payload = JSON.parse(raw) as PropertyImportPayload;
      if (!payload?.address) return;

      setForm((curr) => {
        const plan = Number.parseFloat(payload.areaSqFt || "");
        const rise = parsePitchRise(curr.roofPitch) ?? 6;
        const pitchFactor = Math.sqrt(1 + (rise / 12) ** 2);
        const measSq =
          Number.isFinite(plan) && plan > 0 ? ((plan * pitchFactor) / 100).toFixed(2) : curr.measuredSquares;

        const metaBits: string[] = [];
        if (payload.yearBuilt) metaBits.push(`Year built: ${payload.yearBuilt}`);
        if (payload.lotSizeSqFt) metaBits.push(`Lot: ${payload.lotSizeSqFt} SF`);
        metaBits.push(`Property type: ${payload.propertyType}`);
        if (payload.ownerEntityType) metaBits.push(`Owner entity: ${payload.ownerEntityType}`);
        if (payload.ownerMailingAddress) metaBits.push(`Owner mailing: ${payload.ownerMailingAddress}`);
        if (payload.notes) metaBits.push(payload.notes);

        const st = (payload.stateCode || curr.stateCode).toUpperCase().slice(0, 2);

        return {
          ...curr,
          address: payload.address,
          stateCode: st || curr.stateCode,
          latitude: payload.latitude || curr.latitude,
          longitude: payload.longitude || curr.longitude,
          areaSqFt: payload.areaSqFt || curr.areaSqFt,
          measuredSquares: payload.areaSqFt ? measSq : curr.measuredSquares,
          propertyRecordNotes: metaBits.join("\n"),
        };
      });

      setProposal((curr) => {
        const org = (payload.ownerEntityType ?? "").toLowerCase() === "organization";
        const person = (payload.contactPersonName ?? "").trim();
        const company = (payload.ownerName ?? "").trim();
        const phone =
          (payload.contactPersonPhone ?? "").trim() || (payload.ownerPhone ?? "").trim() || curr.clientPhone;
        return {
          ...curr,
          ...(org && company
            ? { clientCompany: company, clientName: person || curr.clientName }
            : { clientName: person || company || curr.clientName }),
          clientPhone: phone,
          clientEmail: payload.ownerEmail || curr.clientEmail,
        };
      });

      const lat = Number.parseFloat(payload.latitude);
      const lng = Number.parseFloat(payload.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        queueMicrotask(() => flyMapTo(lat, lng));
      }

      setMapboxStatus(`Imported property record (${payload.source}).`);
    } catch {
      /* ignore */
    }
  }, []);

  const applyDrawnAreaToEstimate = () => {
    if (mapboxAreaSqFt <= 0 && drawnRoofLines.length === 0) {
      window.alert(
        "Draw a roof polygon on the map, import a Microsoft footprint at the property pin, or add measurement lines first.",
      );
      return;
    }
    setForm((curr) => prepareFormFromMapMeasurements(curr));
  };

  const deleteRoofLine = (id: string) => {
    setDrawnRoofLines((prev) => prev.filter((l) => l.id !== id));
  };

  const clearAllRoofLines = () => {
    setDrawnRoofLines([]);
  };

  const roofLineSummary = useMemo(() => {
    const sums: Record<RoofLineType, number> = {
      ridge: 0, hip: 0, valley: 0, eave: 0, rake: 0,
      "wall-flashing": 0, "step-flashing": 0,
    };
    for (const line of drawnRoofLines) sums[line.type] += line.lengthFt;
    return sums;
  }, [drawnRoofLines]);

  const saveMapboxReport = async () => {
    if (!mapboxFeatures.length || mapboxAreaSqFt <= 0) {
      window.alert("Draw roof polygons before saving.");
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features: mapboxFeatures,
          area: mapboxAreaSqFt,
          address: form.address,
          state: form.stateCode,
          pitch: form.roofPitch,
        }),
      });
      if (!res.ok) throw new Error("Report save failed");
      window.alert("Map report saved.");
      await fetchSavedReports();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Report save failed");
    }
  };

  const fetchSavedReports = async () => {
    setReportsBusy(true);
    setReportsStatus("Loading saved reports...");
    try {
      const res = await fetch("http://localhost:5000/api/reports");
      if (!res.ok) throw new Error("Unable to load reports");
      const data = (await res.json()) as SavedApiReport[];
      setSavedReports(Array.isArray(data) ? data : []);
      setReportsStatus(`Loaded ${Array.isArray(data) ? data.length : 0} report(s).`);
    } catch (error) {
      setReportsStatus(
        error instanceof Error ? `Report load failed: ${error.message}` : "Report load failed.",
      );
    } finally {
      setReportsBusy(false);
    }
  };

  const loadSavedReportToForm = (report: SavedApiReport) => {
    const area = Number(report.total_area_sqft || 0);
    setForm((curr) => ({
      ...curr,
      areaSqFt: area > 0 ? area.toFixed(2) : curr.areaSqFt,
      measuredSquares: area > 0 ? (area / 100).toFixed(2) : curr.measuredSquares,
      address: report.address || curr.address,
      stateCode: (report.state || curr.stateCode).toUpperCase().slice(0, 2),
      roofPitch: report.pitch || curr.roofPitch,
    }));
    setMapboxFeatures(report.features ?? []);
    setMapboxAreaSqFt(area > 0 ? area : 0);
    setRunId((id) => id + 1);
  };

  const applyProposalProfile = (profile: ProposalProfile) => {
    setProposal((curr) => {
      const next = defaultProposalState(profile);
      return {
        ...next,
        companyName: curr.companyName,
        companyAddress: curr.companyAddress,
        companyWebsite: curr.companyWebsite,
        logoDataUrl: curr.logoDataUrl,
        preparedBy: curr.preparedBy,
        contactEmail: curr.contactEmail,
        contactPhone: curr.contactPhone,
      };
    });
    setForm((curr) => ({
      ...curr,
      roofType: profile === "commercial" ? "TPO" : "Asphalt Shingle",
      wastePercent: profile === "commercial" ? "12" : curr.wastePercent,
    }));
  };

  const selectedContact = contacts.find((c) => c.id === selectedContactId) ?? null;
  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [
        c.name,
        c.company,
        c.email,
        c.phone,
        c.address,
        c.city,
        c.state,
        c.zip,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [contacts, contactSearch]);

  const roofStructureSuggestion = useMemo(
    () => suggestRoofStructureFromInputs(form),
    [
      form.roofType,
      form.roofPitch,
      form.ridgesFt,
      form.hipsFt,
      form.valleysFt,
      form.eavesFt,
      form.rakesFt,
      form.perimeterFt,
      form.areaSqFt,
      form.measuredSquares,
    ],
  );

  const filteredBuildingPermits = useMemo(() => {
    if (!stlIntel?.buildingPermits?.length) return [];
    if (permitFilter === "trades") return [];
    return stlIntel.buildingPermits;
  }, [stlIntel, permitFilter]);

  const filteredTradesPermits = useMemo(() => {
    if (!stlIntel?.tradesPermits?.length) return [];
    if (permitFilter === "building") return [];
    return stlIntel.tradesPermits;
  }, [stlIntel, permitFilter]);

  const filteredStormFeatures = useMemo(() => {
    if (!stlStorms) return { lsr: [], spc: [], nws: [] };
    const lsr = Array.isArray(stlStorms.iemLocalStormReports?.features)
      ? stlStorms.iemLocalStormReports!.features!
      : [];
    const spc = Array.isArray(stlStorms.spcDay1Outlook?.features)
      ? stlStorms.spcDay1Outlook!.features!
      : [];
    const nws = Array.isArray(stlStorms.nwsActiveAlerts?.features)
      ? stlStorms.nwsActiveAlerts!.features!
      : [];
    if (stormFilter === "lsr") return { lsr, spc: [], nws: [] };
    if (stormFilter === "spc") return { lsr: [], spc, nws: [] };
    if (stormFilter === "nws") return { lsr: [], spc: [], nws };
    return { lsr, spc, nws };
  }, [stlStorms, stormFilter]);

  const parcelPropertyType = useMemo(
    () => inferPropertyTypeFromParcel(stlIntel?.parcel ?? null),
    [stlIntel],
  );

  const intelVisible = propertyTypeFilter === "all" || parcelPropertyType === propertyTypeFilter;

  const applySuggestedRoofStructure = () => {
    setForm((curr) => ({ ...curr, roofStructure: roofStructureSuggestion.mode }));
  };
  return (
    <div className="min-w-0 flex-1 p-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="top">
          <h1>Roofing Measurement & Estimate Pro</h1>
          <p>
            Professional measurement, estimate, and proposal workflow for residential and commercial roofing.
          </p>
        </header>
        <main className="grid2">
        <section className="panel" id="section-intake">
          <h2>Property & Measurement Intake</h2>
          <div className="form-grid">
            <label>Address<input value={form.address} onChange={(e) => setForm((curr) => ({ ...curr, address: e.target.value }))} placeholder="123 Main St, City, ST" /></label>
            <label>State<input value={form.stateCode} onChange={(e) => setForm((curr) => ({ ...curr, stateCode: e.target.value.toUpperCase() }))} maxLength={2} placeholder="TX" /></label>
            <label>Latitude<input type="number" step="0.000001" value={form.latitude} onChange={(e) => setForm((curr) => ({ ...curr, latitude: e.target.value }))} placeholder="32.7767" /></label>
            <label>Longitude<input type="number" step="0.000001" value={form.longitude} onChange={(e) => setForm((curr) => ({ ...curr, longitude: e.target.value }))} placeholder="-96.7970" /></label>
            <p className="muted" style={{ gridColumn: "1 / -1", fontSize: 12, margin: 0 }}>
              <Link to="/property-lookup">Property records</Link> — import CSV / JSON (Parallel-enriched or assessor), then open
              here.
            </p>
            {form.propertyRecordNotes ? (
              <div style={{ gridColumn: "1 / -1" }}>
                <label>
                  Imported record notes
                  <textarea
                    rows={3}
                    value={form.propertyRecordNotes}
                    onChange={(e) => setForm((curr) => ({ ...curr, propertyRecordNotes: e.target.value }))}
                    style={{ width: "100%", marginTop: 4 }}
                  />
                </label>
              </div>
            ) : null}
            <label>Roof material / system<select value={form.roofType} onChange={(e) => setForm((curr) => ({ ...curr, roofType: e.target.value }))}>
                <optgroup label="Residential – Steep Slope">
                  <option>Asphalt Shingle</option>
                  <option>Asphalt Shingle (Hip)</option>
                  <option>Metal</option>
                  <option>Metal (Hip)</option>
                  <option>Tile</option>
                  <option>Ludowici Tile</option>
                  <option>Slate</option>
                  <option>Mansard</option>
                </optgroup>
                <optgroup label="TPO (Single-Ply)">
                  <option>TPO 45-mil MA</option>
                  <option>TPO 60-mil MA</option>
                  <option>TPO 60-mil FA</option>
                  <option>TPO 80-mil MA</option>
                </optgroup>
                <optgroup label="PVC (Single-Ply)">
                  <option>PVC 60-mil MA</option>
                  <option>PVC 60-mil FA</option>
                  <option>PVC 80-mil MA</option>
                </optgroup>
                <optgroup label="EPDM (Rubber)">
                  <option>EPDM 60-mil FA</option>
                  <option>EPDM 60-mil MA</option>
                  <option>EPDM 90-mil FA</option>
                </optgroup>
                <optgroup label="Modified Bitumen">
                  <option>Modified Bitumen (APP)</option>
                  <option>Modified Bitumen (SBS)</option>
                </optgroup>
                <optgroup label="Roof Coatings">
                  <option>Coating (Silicone)</option>
                  <option>Coating (Acrylic)</option>
                  <option>Coating (SPF)</option>
                  <option>Coating (Butyl)</option>
                  <option>Coating (Aluminum)</option>
                </optgroup>
                <optgroup label="Other">
                  <option>Flat / Low Slope</option>
                </optgroup>
              </select></label>
            <label>Roof Structure (Diagram Model)
              <select
                value={form.roofStructure}
                onChange={(e) => setForm((curr) => ({ ...curr, roofStructure: e.target.value as RoofStructureMode }))}
              >
                <option value="auto">Auto Detect</option>
                <option value="gable">Gable</option>
                <option value="hip">Hip</option>
                <option value="flat">Flat / Low Slope</option>
                <option value="mansard">Mansard</option>
                <option value="complex">Complex Multi-Facet</option>
              </select>
            </label>
            <p className="muted" style={{ gridColumn: "1 / -1", fontSize: 12, marginTop: 4 }}>
              Diagram footprint uses <strong>plan area</strong> and, when entered, <strong>perimeter</strong> to match a rectangular plan; ridge lines scale to your ridge LF. Gable eaves/rakes show <strong>ea.</strong> (each of two parallel sides). Hip/mansard eaves are split by edge length along the long vs short plan sides. Without perimeter, outline proportions fall back to your eave vs rake LF ratio.
            </p>
            <label>Plan Area (sq ft)<input type="number" min={1} value={form.areaSqFt} onChange={(e) => setForm((curr) => ({ ...curr, areaSqFt: e.target.value }))} placeholder="2500" /></label>
            <label>Perimeter (ft)<input type="number" min={1} value={form.perimeterFt} onChange={(e) => setForm((curr) => ({ ...curr, perimeterFt: e.target.value }))} placeholder="220" /></label>
            <label>Pitch (rise/12)<input value={form.roofPitch} onChange={(e) => setForm((curr) => ({ ...curr, roofPitch: e.target.value }))} placeholder="6/12" /></label>
            <label>Measured Squares (surface SQ ÷ 100 when auto)<input value={form.measuredSquares} onChange={(e) => setForm((curr) => ({ ...curr, measuredSquares: e.target.value }))} placeholder="38.38" /></label>
            <label>Waste %<input value={form.wastePercent} onChange={(e) => setForm((curr) => ({ ...curr, wastePercent: e.target.value }))} placeholder="12" /></label>
            <label>Stories (optional, wall SF auto)<input type="number" min={1} step={1} value={form.stories} onChange={(e) => setForm((curr) => ({ ...curr, stories: e.target.value }))} placeholder="2" /></label>
            <label>Wall height override (ft)<input type="number" min={0.5} step={0.5} value={form.exteriorWallHeightFt} onChange={(e) => setForm((curr) => ({ ...curr, exteriorWallHeightFt: e.target.value }))} placeholder="empty = auto" /></label>
            <p className="muted" style={{ gridColumn: "1 / -1", fontSize: 12, margin: 0 }}>
              Wall SF (RFS rows) = floor perimeter × effective height: override ft if set; else stories × 9.5 ft; else 10 ft default.
            </p>
            <label>Ridges (LF)<input value={form.ridgesFt} onChange={(e) => setForm((curr) => ({ ...curr, ridgesFt: e.target.value }))} placeholder="141ft 2in" /></label>
            <label>Eaves (LF)<input value={form.eavesFt} onChange={(e) => setForm((curr) => ({ ...curr, eavesFt: e.target.value }))} placeholder="135ft 6in" /></label>
            <label>Rakes (LF)<input value={form.rakesFt} onChange={(e) => setForm((curr) => ({ ...curr, rakesFt: e.target.value }))} placeholder="252ft 1in" /></label>
            <label>Valleys (LF)<input value={form.valleysFt} onChange={(e) => setForm((curr) => ({ ...curr, valleysFt: e.target.value }))} placeholder="130ft 4in" /></label>
            <label>Hips (LF)<input value={form.hipsFt} onChange={(e) => setForm((curr) => ({ ...curr, hipsFt: e.target.value }))} placeholder="0ft 0in" /></label>
            <label>Wall Flashing (LF)<input value={form.wallFlashingFt} onChange={(e) => setForm((curr) => ({ ...curr, wallFlashingFt: e.target.value }))} placeholder="19ft 2in" /></label>
            <label>Step Flashing (LF)<input value={form.stepFlashingFt} onChange={(e) => setForm((curr) => ({ ...curr, stepFlashingFt: e.target.value }))} placeholder="50ft 5in" /></label>
            <label>Others (LF)<input value={form.othersFt} onChange={(e) => setForm((curr) => ({ ...curr, othersFt: e.target.value }))} placeholder="2ft 3in" /></label>
          </div>
          <div className="actions-row">
            <button className="secondary-btn" onClick={geocodeAddress} disabled={geoBusy}>Lookup Address</button>
            <button className="secondary-btn" onClick={reverseFromCoords} disabled={geoBusy}>Reverse from Coordinates</button>
            <button className="secondary-btn" onClick={applySuggestedRoofStructure}>
              Use Suggested Roof Structure: {roofStructureSuggestion.mode.toUpperCase()}
            </button>
            {form.latitude && form.longitude ? (
              <a
                href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(form.latitude)}&mlon=${encodeURIComponent(form.longitude)}#map=18/${encodeURIComponent(form.latitude)}/${encodeURIComponent(form.longitude)}`}
                target="_blank"
                rel="noreferrer"
                className="map-link"
              >
                Open Map
              </a>
            ) : null}
          </div>
          <p className="muted" style={{ marginTop: 6, fontSize: 12 }}>
            Structure suggestion ({roofStructureSuggestion.confidence}, {roofStructureSuggestion.score}/100): {roofStructureSuggestion.reason}
          </p>
          <p className="muted" style={{ marginTop: 4, fontSize: 11 }}>
            Rules fired: {roofStructureSuggestion.rules.join(", ")}
          </p>
          {geoStatus ? <p className="muted">{geoStatus}</p> : null}
          <div className="damage-wrap">
            <p>Damage Types</p>
            <div className="damage-grid">
              {DAMAGE_TYPES.map((d) => (
                <label key={d} className="check">
                  <input type="checkbox" checked={form.damageTypes.includes(d)} onChange={() => toggleDamage(d)} />
                  {d}
                </label>
              ))}
            </div>
          </div>
          <label className="severity">
            Severity (1-5)
            <input type="range" min={1} max={5} value={form.severity} onChange={(e) => setForm((curr) => ({ ...curr, severity: Number(e.target.value) }))} />
            <strong>{form.severity}</strong>
          </label>
          <div style={{ marginTop: 10 }}>
            <label className="file-label">
              Damage Photo Upload
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => addDamagePhotos(e.target.files)}
              />
            </label>
            {damagePhotos.length ? (
              <div className="tiles" style={{ marginTop: 8 }}>
                {damagePhotos.slice(0, 8).map((photo) => (
                  <div key={photo.id} className="tile">
                    <span>{photo.name}</span>
                    <img src={photo.previewUrl} alt={photo.name} style={{ width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 6 }} />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {DAMAGE_PHOTO_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className="secondary-btn"
                          style={{
                            padding: "2px 6px",
                            fontSize: 10,
                            borderColor: photo.tags.includes(tag) ? "#d4af37" : "#334155",
                            color: photo.tags.includes(tag) ? "#fcd34d" : undefined,
                          }}
                          onClick={() => toggleDamagePhotoTag(photo.id, tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Upload damage photos and tag with 10+ categories for supplement evidence.
              </p>
            )}
          </div>
        </section>
        <section className="panel full" id="section-map-contacts">
          <h2>Property Map & Roof Measurement</h2>
          <div className="form-grid">
            <label>
              Mapbox Token
              <input
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
                placeholder="pk.eyJ..."
              />
            </label>
            <label>
              Line Measurement Type
              <select
                value={currentLineType}
                onChange={(e) => setCurrentLineType(e.target.value as RoofLineType)}
              >
                {ROOF_LINE_TYPES.map((lt) => (
                  <option key={lt.type} value={lt.type}>
                    {lt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="auto-calc-row">
            <label className="check">
              <input type="checkbox" checked={autoCalcEnabled} onChange={(e) => setAutoCalcEnabled(e.target.checked)} />
              Auto-calculate measurements from polygon
            </label>
            <span className="muted" style={{ fontSize: 11 }}>
              Draw a polygon around the roof outline — ridges, hips, valleys, eaves, rakes, and area are computed automatically based on roof type and pitch.
            </span>
          </div>
          <div className="auto-calc-row" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <label className="check" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={msFootprintsVisible}
                onChange={(e) => setMsFootprintsVisible(e.target.checked)}
              />
              Show Microsoft US building footprints
            </label>
            <button
              type="button"
              className="secondary-btn"
              disabled={importMsFootprintBusy || !mapReady}
              onClick={() => void importMsBuildingFootprintAtPin()}
            >
              {importMsFootprintBusy ? "Importing…" : "Import footprint at property pin"}
            </button>
            <input
              ref={aiMeasureFileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAiRoofPitchFromImage}
            />
            <button
              type="button"
              className="secondary-btn"
              disabled={aiMeasureBusy}
              onClick={() => aiMeasureFileRef.current?.click()}
            >
              {aiMeasureBusy ? "AI analyzing…" : "AI auto measure (optional photo)"}
            </button>
            <span className="muted" style={{ fontSize: 11 }}>
              <strong>No photo required:</strong> draw a roof polygon on the map, or import an open-data footprint at your
              lat/lng pin, then use <strong>Apply All Measurements To Estimate</strong>. AI photo upload is optional —
              it can fill pitch and surface area when the model sees scale. Footprint data:{" "}
              <a href="https://github.com/microsoft/USBuildingFootprints" target="_blank" rel="noreferrer">
                Microsoft US Building Footprints
              </a>{" "}
              (ODbL) via Esri vector tiles.
            </span>
          </div>
          {aiMeasureNote ? (
            <p className="muted" style={{ marginTop: 4, fontSize: 12 }}>
              {aiMeasureNote}
            </p>
          ) : null}
          <div className="line-legend">
            {ROOF_LINE_TYPES.map((lt) => (
              <span key={lt.type} className={`legend-item${currentLineType === lt.type ? " legend-active" : ""}`} onClick={() => setCurrentLineType(lt.type)}>
                <span className="legend-swatch" style={{ background: lt.color }} />
                {lt.label}
                {roofLineSummary[lt.type] > 0 ? (
                  <strong>{roofLineSummary[lt.type].toFixed(1)} ft</strong>
                ) : null}
              </span>
            ))}
          </div>
          <div className="map-wrap mapbox-wrap" style={{ minHeight: 520 }}>
            <div ref={mapboxContainerRef} className="mapbox-canvas" style={{ height: 520 }} />
          </div>
          {mapboxStatus ? <p className="muted">{mapboxStatus}</p> : null}
          <div className="actions-row">
            <label>
              Property Type Filter
              <select value={propertyTypeFilter} onChange={(e) => setPropertyTypeFilter(e.target.value as "all" | "residential" | "commercial" | "other")}>
                <option value="all">All</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Permit Filter
              <select value={permitFilter} onChange={(e) => setPermitFilter(e.target.value as "all" | "building" | "trades")}>
                <option value="all">All Permits</option>
                <option value="building">Building Permits</option>
                <option value="trades">Trades Permits</option>
              </select>
            </label>
            <label>
              Storm Filter
              <select value={stormFilter} onChange={(e) => setStormFilter(e.target.value as "all" | "lsr" | "spc" | "nws")}>
                <option value="all">All Storm Data</option>
                <option value="lsr">NOAA/IEM LSR</option>
                <option value="spc">SPC Day 1</option>
                <option value="nws">NWS Alerts</option>
              </select>
            </label>
            <button
              className="secondary-btn"
              onClick={() => {
                const lat = Number.parseFloat(form.latitude);
                const lng = Number.parseFloat(form.longitude);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                  window.alert("Set property coordinates first.");
                  return;
                }
                fetchStlIntelAtPoint(lat, lng);
              }}
              disabled={intelBusy}
            >
              {intelBusy ? "Loading Intel..." : "Refresh Parcel/Permit/Storm Intel"}
            </button>
          </div>
          {intelError ? <p className="muted" style={{ color: "#fca5a5" }}>{intelError}</p> : null}
          {stlIntel ? (
            <div className="line-measurements-table" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Intel Source</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {intelVisible ? (
                    <>
                      <tr>
                        <td>Assessor Parcel</td>
                        <td>
                          {stlIntel.parcel
                            ? `Property type: ${parcelPropertyType.toUpperCase()} | Fields: ${Object.keys(stlIntel.parcel).length}`
                            : "No parcel intersecting selected point"}
                        </td>
                      </tr>
                      {stlIntel.parcel ? (
                        <tr>
                          <td>Owner/Tax Data</td>
                          <td>
                            {Object.entries(stlIntel.parcel)
                              .filter(([, v]) => v != null && String(v).trim() !== "")
                              .slice(0, 10)
                              .map(([k, v]) => `${k}: ${String(v)}`)
                              .join(" | ")}
                          </td>
                        </tr>
                      ) : null}
                      <tr>
                        <td>Building Permits</td>
                        <td>{filteredBuildingPermits.length} nearby record(s)</td>
                      </tr>
                      <tr>
                        <td>Trades Permits</td>
                        <td>{filteredTradesPermits.length} nearby record(s)</td>
                      </tr>
                      <tr>
                        <td>LRA Properties</td>
                        <td>{stlIntel.lraParcel ? "In/near LRA path" : "No LRA hit at point"}</td>
                      </tr>
                      <tr>
                        <td>Tax Sales Records</td>
                        <td>{stlIntel.taxSaleParcel ? "Tax sale parcel record found" : "No tax sale record at point"}</td>
                      </tr>
                      <tr>
                        <td>Demolition Records</td>
                        <td>{stlIntel.demolitionParcel ? "Demolition-related parcel found" : "No demolition record at point"}</td>
                      </tr>
                      <tr>
                        <td>NOAA/NWS/SPC Storms</td>
                        <td>
                          LSR: {filteredStormFeatures.lsr.length} | SPC: {filteredStormFeatures.spc.length} | NWS Alerts: {filteredStormFeatures.nws.length}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={2}>Current parcel filtered out by selected property type filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
          {autoCalcInfo ? (
            <div className="auto-calc-banner">
              <strong>Auto-Calculated:</strong> {autoCalcInfo}
            </div>
          ) : null}

          {showPropertyPanel && activeProperty ? (
            <div className="property-panel">
              <div className="property-panel-header">
                <h3>Property Owner Details</h3>
                <button className="secondary-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setShowPropertyPanel(false)}>Close</button>
              </div>
              {propertyEnrichBusy ? (
                <div className="muted" style={{ marginBottom: 8 }}>
                  Fetching assessor tax + contact info...
                </div>
              ) : null}
              <div className="form-grid">
                <label>
                  Address
                  <input value={activeProperty.address} onChange={(e) => setActiveProperty((p) => p ? { ...p, address: e.target.value } : p)} />
                </label>
                <label>
                  Owner Name
                  <input value={activeProperty.ownerName} onChange={(e) => setActiveProperty((p) => p ? { ...p, ownerName: e.target.value } : p)} placeholder="John Smith" />
                </label>
                <label>
                  Owner Phone
                  <input value={activeProperty.ownerPhone} onChange={(e) => setActiveProperty((p) => p ? { ...p, ownerPhone: e.target.value } : p)} placeholder="(555) 123-4567" />
                </label>
                <label>
                  Owner Email
                  <input value={activeProperty.ownerEmail} onChange={(e) => setActiveProperty((p) => p ? { ...p, ownerEmail: e.target.value } : p)} placeholder="owner@email.com" />
                </label>
                <label>
                  Property Type
                  <select value={activeProperty.propertyType} onChange={(e) => setActiveProperty((p) => p ? { ...p, propertyType: e.target.value as PropertyOwnerRecord["propertyType"] } : p)}>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="multi-family">Multi-Family</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  Year Built
                  <input value={activeProperty.yearBuilt} onChange={(e) => setActiveProperty((p) => p ? { ...p, yearBuilt: e.target.value } : p)} placeholder="1995" />
                </label>
                <label>
                  Lot Size (sq ft)
                  <input value={activeProperty.lotSizeSqFt} onChange={(e) => setActiveProperty((p) => p ? { ...p, lotSizeSqFt: e.target.value } : p)} placeholder="8500" />
                </label>
                <label>
                  Roof material
                  <input value={activeProperty.roofType} onChange={(e) => setActiveProperty((p) => p ? { ...p, roofType: e.target.value } : p)} placeholder="Asphalt Shingle" />
                </label>
                <label>
                  Stories
                  <input value={activeProperty.stories} onChange={(e) => setActiveProperty((p) => p ? { ...p, stories: e.target.value } : p)} placeholder="2" />
                </label>
                <label>
                  Coordinates
                  <input value={`${activeProperty.lat.toFixed(6)}, ${activeProperty.lng.toFixed(6)}`} readOnly className="muted" />
                </label>
              </div>
              <label>
                Tax / Assessor Summary
                <textarea
                  rows={3}
                  value={activeProperty.taxSummary || ""}
                  onChange={(e) => setActiveProperty((p) => p ? { ...p, taxSummary: e.target.value } : p)}
                  placeholder="APN, assessed value, tax amount, county..."
                />
              </label>
              <label>
                Notes
                <textarea rows={2} value={activeProperty.notes} onChange={(e) => setActiveProperty((p) => p ? { ...p, notes: e.target.value } : p)} placeholder="Inspection notes, damage observations, access info..." />
              </label>
              <div className="actions-row">
                <button className="run-btn" onClick={saveActiveProperty}>
                  {propertyDb.some((p) => p.id === activeProperty.id) ? "Update Property" : "Save to Database"}
                </button>
                <button className="secondary-btn" onClick={() => applyPropertyToForm(activeProperty)}>
                  Apply to Estimate & Proposal
                </button>
                {propertyDb.some((p) => p.id === activeProperty.id) ? (
                  <button className="secondary-btn danger" onClick={() => deletePropertyRecord(activeProperty.id)}>
                    Delete Record
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="actions-row">
            <span className="muted">Drawn Roof Area: {mapboxAreaSqFt.toFixed(2)} sq ft</span>
            <button className="secondary-btn" onClick={applyDrawnAreaToEstimate}>
              Apply All Measurements To Estimate
            </button>
            <button className="secondary-btn" onClick={saveMapboxReport}>
              Save Draw Report (API)
            </button>
            {drawnRoofLines.length > 0 ? (
              <button className="secondary-btn danger" onClick={clearAllRoofLines}>
                Clear All Lines
              </button>
            ) : null}
          </div>

          {drawnRoofLines.length > 0 ? (
            <>
              <h3>Drawn Measurements ({drawnRoofLines.length} line{drawnRoofLines.length !== 1 ? "s" : ""})</h3>
              <div className="line-measurements-table">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Length</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {drawnRoofLines.map((line) => {
                      const meta = ROOF_LINE_TYPES.find((t) => t.type === line.type);
                      return (
                        <tr key={line.id}>
                          <td>
                            <span className="legend-swatch" style={{ background: meta?.color || "#fff" }} />
                            {meta?.label || line.type}
                          </td>
                          <td>{line.lengthFt.toFixed(2)} ft</td>
                          <td>
                            <button className="secondary-btn danger" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => deleteRoofLine(line.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {ROOF_LINE_TYPES.filter((lt) => roofLineSummary[lt.type] > 0).map((lt) => (
                      <tr key={lt.type}>
                        <td>
                          <span className="legend-swatch" style={{ background: lt.color }} />
                          <strong>{lt.label} Total</strong>
                        </td>
                        <td><strong>{roofLineSummary[lt.type].toFixed(2)} ft</strong></td>
                        <td />
                      </tr>
                    ))}
                  </tfoot>
                </table>
              </div>
            </>
          ) : null}

          <h3>Saved Draw Reports</h3>
          <div className="actions-row">
            <button
              className="secondary-btn"
              onClick={fetchSavedReports}
              disabled={reportsBusy}
            >
              {reportsBusy ? "Refreshing..." : "Refresh Reports"}
            </button>
            {reportsStatus ? <span className="muted">{reportsStatus}</span> : null}
          </div>
          {savedReports.length > 0 ? (
            <div className="tiles">
              {savedReports.slice(0, 24).map((report) => (
                <div key={report.id} className="tile">
                  <span>{new Date(report.created_at).toLocaleString()}</span>
                  <strong>{report.address || "Unknown property"}</strong>
                  <span>
                    {Number(report.total_area_sqft || 0).toFixed(2)} sq ft | Sections:{" "}
                    {report.roof_sections}
                  </span>
                  <button
                    className="secondary-btn"
                    onClick={() => loadSavedReportToForm(report)}
                  >
                    Load Into Estimate
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No saved draw reports yet.</p>
          )}

          <h3>Contacts</h3>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            For logo, company defaults, and bulk CSV with estimate columns, use{" "}
            <Link to="/contacts">Contacts &amp; settings</Link>.
          </p>
          <div className="actions-row">
            <label className="file-label">
              Upload Contacts CSV
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadContactsCsv(file);
                }}
              />
            </label>
            <span className="muted">{contacts.length} contact(s) loaded</span>
            <button
              className="secondary-btn"
              onClick={bulkGeocodeContacts}
              disabled={contactsGeocodeBusy}
            >
              {contactsGeocodeBusy ? "Geocoding..." : "Bulk Geocode Contacts"}
            </button>
          </div>
          {contacts.length > 0 ? (
            <>
              <div className="form-grid">
                <label>
                  Search Contacts
                  <input
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Search by name, company, email, phone, address"
                  />
                </label>
                <label>
                  Select Contact
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                  >
                    {filteredContacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.company || c.email || c.address || c.id}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="actions-row">
                <button
                  className="secondary-btn"
                  onClick={() => {
                    if (!selectedContact) return;
                    applyContactToProposal(selectedContact);
                  }}
                >
                  Apply Contact To Proposal
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => {
                    if (!selectedContact) return;
                    createProposalFromContact(selectedContact);
                  }}
                >
                  Create Proposal From Contact
                </button>
              </div>
              {selectedContact ? (
                <div className="tiles">
                  <div className="tile"><span>Name</span><strong>{selectedContact.name || "N/A"}</strong></div>
                  <div className="tile"><span>Company</span><strong>{selectedContact.company || "N/A"}</strong></div>
                  <div className="tile"><span>Email</span><strong>{selectedContact.email || "N/A"}</strong></div>
                  <div className="tile"><span>Phone</span><strong>{selectedContact.phone || "N/A"}</strong></div>
                  <div className="tile"><span>Address</span><strong>{selectedContact.address || "N/A"}</strong></div>
                  <div className="tile"><span>Coordinates</span><strong>{selectedContact.lat != null && selectedContact.lng != null ? `${selectedContact.lat}, ${selectedContact.lng}` : "N/A"}</strong></div>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
        <section className="panel full" id="section-property-db">
          <h2>Property Owner Database ({propertyDb.length})</h2>
          <div className="form-grid">
            <label>
              Search Properties
              <input
                value={propertyDbSearch}
                onChange={(e) => setPropertyDbSearch(e.target.value)}
                placeholder="Search by address, owner, email, phone..."
              />
            </label>
          </div>
          {filteredPropertyDb.length > 0 ? (
            <div className="line-measurements-table" style={{ marginTop: 8 }}>
              <table>
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Owner</th>
                    <th>Phone</th>
                    <th>Type</th>
                    <th>Roof</th>
                    <th>Saved</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredPropertyDb.slice(0, 50).map((prop) => (
                    <tr key={prop.id} className={activeProperty?.id === prop.id ? "row-active" : ""}>
                      <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prop.address || "No address"}</td>
                      <td>{prop.ownerName || "—"}</td>
                      <td>{prop.ownerPhone || "—"}</td>
                      <td>{prop.propertyType}</td>
                      <td>{prop.roofType || "—"}</td>
                      <td style={{ fontSize: 11 }}>{new Date(prop.updatedAt).toLocaleDateString()}</td>
                      <td>
                        <div className="job-actions">
                          <button className="secondary-btn" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => loadPropertyIntoPanel(prop)}>
                            Open
                          </button>
                          <button className="secondary-btn" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => { applyPropertyToForm(prop); flyMapTo(prop.lat, prop.lng); }}>
                            Use
                          </button>
                          <button className="secondary-btn danger" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => deletePropertyRecord(prop.id)}>
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">
              {propertyDb.length === 0
                ? "No saved properties yet. Click a property on the map to start building your database."
                : "No properties match your search."}
            </p>
          )}
        </section>
        <section className="panel" id="section-estimate-inputs">
          <h2>Carrier Scope & Settlement Inputs</h2>
          <label>Carrier Line Items (Xactimate style)<textarea rows={10} value={form.carrierScopeText} onChange={(e) => setForm((curr) => ({ ...curr, carrierScopeText: e.target.value }))} placeholder={"RFG250 Tear Off 42.00 SQ 100.00 4200.00\nRFGDRP Drip Edge 220.00 LF 3.09 679.80\nRCV: 16480  ACV: 13900  Depreciation: 2580\nSupplement RCV: 4200  Deductible: 2500\nNet Claim: 11800"} /></label>
          <div className="form-grid">
            <label>Deductible ($)<input type="number" min={0} value={form.deductibleUsd} onChange={(e) => setForm((curr) => ({ ...curr, deductibleUsd: e.target.value }))} /></label>
            <label>Non-recoverable Depreciation ($)<input type="number" min={0} value={form.nonRecDepUsd} onChange={(e) => setForm((curr) => ({ ...curr, nonRecDepUsd: e.target.value }))} /></label>
          </div>
          <div className="actions-row">
            <button className="run-btn" onClick={runEstimateAndRecord}>Generate Estimate & Comparison</button>
            <button className="secondary-btn" onClick={() => setForm(defaultFormState())}>Load Hillsdale Template</button>
            <button className="secondary-btn" onClick={saveJob}>Save Job</button>
            <button className="secondary-btn" onClick={exportTxt}>Export TXT</button>
            <button className="secondary-btn" onClick={printReport}>Print / PDF</button>
          </div>
          <div className="saved-jobs">
            <h3>Saved Jobs</h3>
            {savedJobs.length === 0 ? (
              <p className="muted">No saved jobs yet.</p>
            ) : (
              <ul>
                {savedJobs.map((job) => (
                  <li key={job.id} className="job-row">
                    <div>
                      <strong>{job.name}</strong>
                      <span className="muted"> ({new Date(job.createdAtIso).toLocaleString()})</span>
                    </div>
                    <div className="job-actions">
                      <button className="secondary-btn" onClick={() => loadJob(job.id)}>Load</button>
                      <button className="secondary-btn danger" onClick={() => deleteJob(job.id)}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        <section className="panel" id="section-proposals">
          <h2>Proposal Builder</h2>
          <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
            Upload contacts CSV, company logo, and default templates on{" "}
            <Link to="/contacts">Contacts &amp; settings</Link> (saved in this browser).
          </p>
          <div className="form-grid">
            <label>
              Profile
              <select
                value={proposal.profile}
                onChange={(e) => applyProposalProfile(e.target.value as ProposalProfile)}
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </label>
            <label>
              Company Name
              <input
                value={proposal.companyName}
                onChange={(e) =>
                  setProposal((curr) => ({ ...curr, companyName: e.target.value }))
                }
              />
            </label>
            <label>
              Prepared By
              <input
                value={proposal.preparedBy}
                onChange={(e) =>
                  setProposal((curr) => ({ ...curr, preparedBy: e.target.value }))
                }
              />
            </label>
            <label>
              Contact Email
              <input
                value={proposal.contactEmail}
                onChange={(e) =>
                  setProposal((curr) => ({ ...curr, contactEmail: e.target.value }))
                }
              />
            </label>
            <label>
              Contact Phone
              <input
                value={proposal.contactPhone}
                onChange={(e) =>
                  setProposal((curr) => ({ ...curr, contactPhone: e.target.value }))
                }
              />
            </label>
            <label>
              Company address (reports)
              <input
                placeholder="Street, City, ST ZIP"
                value={proposal.companyAddress}
                onChange={(e) =>
                  setProposal((curr) => ({ ...curr, companyAddress: e.target.value }))
                }
              />
            </label>
            <label>
              Company website
              <input
                placeholder="https://"
                value={proposal.companyWebsite}
                onChange={(e) =>
                  setProposal((curr) => ({ ...curr, companyWebsite: e.target.value }))
                }
              />
            </label>
            {proposal.logoDataUrl ? (
              <div style={{ gridColumn: "1 / -1" }}>
                <span className="muted" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                  Proposal logo (from Contacts &amp; settings)
                </span>
                <img
                  src={proposal.logoDataUrl}
                  alt=""
                  style={{ maxHeight: 56, maxWidth: 200, objectFit: "contain" }}
                />
              </div>
            ) : null}
            <label>
              Client Name
              <input
                value={proposal.clientName}
                onChange={(e) =>
                  setProposal((curr) => ({ ...curr, clientName: e.target.value }))
                }
              />
            </label>
            <label>
              Client Company
              <input
                value={proposal.clientCompany}
                onChange={(e) =>
                  setProposal((curr) => ({ ...curr, clientCompany: e.target.value }))
                }
              />
            </label>
            <label>
              Client Email
              <input
                value={proposal.clientEmail}
                onChange={(e) =>
                  setProposal((curr) => ({ ...curr, clientEmail: e.target.value }))
                }
              />
            </label>
            <label>
              Client Phone
              <input
                value={proposal.clientPhone}
                onChange={(e) =>
                  setProposal((curr) => ({ ...curr, clientPhone: e.target.value }))
                }
              />
            </label>
            <label>
              Proposal Title
              <input
                value={proposal.proposalTitle}
                onChange={(e) =>
                  setProposal((curr) => ({ ...curr, proposalTitle: e.target.value }))
                }
              />
            </label>
          </div>

          <label>
            Inclusions
            <textarea
              rows={4}
              value={proposal.inclusions}
              onChange={(e) =>
                setProposal((curr) => ({ ...curr, inclusions: e.target.value }))
              }
            />
          </label>
          <label>
            Exclusions
            <textarea
              rows={4}
              value={proposal.exclusions}
              onChange={(e) =>
                setProposal((curr) => ({ ...curr, exclusions: e.target.value }))
              }
            />
          </label>
          <label>
            Payment Schedule
            <textarea
              rows={3}
              value={proposal.paymentSchedule}
              onChange={(e) =>
                setProposal((curr) => ({ ...curr, paymentSchedule: e.target.value }))
              }
            />
          </label>
          <label>
            Warranty
            <textarea
              rows={3}
              value={proposal.warranty}
              onChange={(e) =>
                setProposal((curr) => ({ ...curr, warranty: e.target.value }))
              }
            />
          </label>
          <label>
            Alternates
            <textarea
              rows={3}
              value={proposal.alternates}
              onChange={(e) =>
                setProposal((curr) => ({ ...curr, alternates: e.target.value }))
              }
            />
          </label>
          <label>
            Financing Notes
            <textarea
              rows={3}
              value={proposal.financingNotes}
              onChange={(e) =>
                setProposal((curr) => ({ ...curr, financingNotes: e.target.value }))
              }
            />
          </label>
          <p className="muted" style={{ fontSize: 12, margin: "-4px 0 8px" }}>
            <strong>Insurance:</strong> Paste RCV, ACV, depreciation, supplement totals, deductible, and net claim in{" "}
            <strong>Carrier Line Items</strong> above, then run <strong>Generate Estimate &amp; Comparison</strong> — the
            two fields below refresh from the comparison and settlement math (you can edit after).
          </p>
          <label>
            Insurance supplement (auto-filled)
            <textarea
              rows={6}
              value={proposal.insuranceSupplementNotes}
              onChange={(e) =>
                setProposal((curr) => ({ ...curr, insuranceSupplementNotes: e.target.value }))
              }
            />
          </label>
          <label>
            Estimated insurance payout (auto-filled)
            <textarea
              rows={5}
              value={proposal.estimatedInsurancePayout}
              onChange={(e) =>
                setProposal((curr) => ({ ...curr, estimatedInsurancePayout: e.target.value }))
              }
            />
          </label>

          <div className="actions-row">
            <button className="secondary-btn" onClick={exportProposalTxt}>
              Export Proposal TXT
            </button>
            <button className="secondary-btn" onClick={printProposal}>
              Print Proposal / PDF
            </button>
          </div>
        </section>
        <section className="panel full" id="section-results">
          <h2>Estimate Results</h2>
          {!result ? (
            <p className="muted">Run estimate to view output.</p>
          ) : (
            <>
              {/* Final cost hero */}
              <div className="result-hero">
                <div className="result-hero-main">
                  <span className="result-hero-label">Final Cost (RCV)</span>
                  <span className="result-hero-value">{money(result.finalCost)}</span>
                </div>
                <div className="result-hero-meta">
                  <span>
                    {result.scope.toUpperCase()} &bull; {result.surfaceSquares} SQ takeoff → {result.effectiveSquares} SQ eff. ({result.wastePct}% waste) &bull; ×{result.regional.toFixed(2)} ({form.stateCode}) &bull; Confidence: {result.confidence} &bull; Score: {result.quality}/100
                  </span>
                </div>
              </div>

              {/* Property & Proposal summary */}
              <div className="result-grid-2">
                <div className="result-card">
                  <div className="result-card-title">Property</div>
                  <div className="result-card-row"><span>Address</span><strong>{form.address || "N/A"}</strong></div>
                  <div className="result-card-row"><span>State</span><strong>{form.stateCode || "N/A"}</strong></div>
                  <div className="result-card-row"><span>Roof material</span><strong>{form.roofType}</strong></div>
                  <div className="result-card-row"><span>Pitch</span><strong>{form.roofPitch || "N/A"}</strong></div>
                  <div className="result-card-row"><span>Coordinates</span><strong>{form.latitude || "—"}, {form.longitude || "—"}</strong></div>
                </div>
                <div className="result-card">
                  <div className="result-card-title">Proposal</div>
                  <div className="result-card-row"><span>Profile</span><strong>{proposal.profile}</strong></div>
                  <div className="result-card-row"><span>Company</span><strong>{proposal.companyName || "N/A"}</strong></div>
                  <div className="result-card-row"><span>Prepared By</span><strong>{proposal.preparedBy || "N/A"}</strong></div>
                  <div className="result-card-row"><span>Client</span><strong>{proposal.clientName || "N/A"}</strong></div>
                  <div className="result-card-row"><span>Warranty</span><strong>{proposal.warranty || "N/A"}</strong></div>
                </div>
              </div>

              <h3>Roof Structure Intelligence</h3>
              <div className="result-grid-2">
                <div className="result-card">
                  <div className="result-card-title">Suggested Structure</div>
                  <div className="result-card-row"><span>Mode</span><strong>{roofStructureSuggestion.mode.toUpperCase()}</strong></div>
                  <div className="result-card-row"><span>Confidence</span><strong>{roofStructureSuggestion.confidence.toUpperCase()}</strong></div>
                  <div className="result-card-row"><span>Score</span><strong>{roofStructureSuggestion.score}/100</strong></div>
                  <div className="result-card-row"><span>Applied Mode</span><strong>{form.roofStructure.toUpperCase()}</strong></div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#cbd5e1", lineHeight: 1.4 }}>
                    <strong style={{ color: "#e5e7eb" }}>Reason:</strong> {roofStructureSuggestion.reason}
                  </div>
                </div>
                <div className="result-card">
                  <div className="result-card-title">Rules Fired</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {roofStructureSuggestion.rules.map((rule) => (
                      <li key={rule} style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 4 }}>{rule}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Roof Diagram */}
              <h3>Roof Measurement Diagram</h3>
              <div className="actions-row" style={{ flexWrap: "wrap", marginBottom: 8 }}>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={raybevelDiagramBusy || !import.meta.env.DEV}
                  onClick={() => void generateRaybevelDiagramFromMap()}
                >
                  {raybevelDiagramBusy ? "Running R / raybevel…" : "Straight skeleton (raybevel)"}
                </button>
                {raybevelDiagramSvg ? (
                  <button type="button" className="secondary-btn" onClick={() => { setRaybevelDiagramSvg(null); setRaybevelDiagramNote(""); }}>
                    Clear raybevel diagram
                  </button>
                ) : null}
                <span className="muted" style={{ fontSize: 11, flex: "1 1 220px" }}>
                  Uses{" "}
                  <a href="https://github.com/tylermorganwall/raybevel" target="_blank" rel="noreferrer">
                    tylermorganwall/raybevel
                  </a>{" "}
                  via local <code style={{ fontSize: 10 }}>Rscript</code> (dev only). Install R + raybevel per{" "}
                  <code style={{ fontSize: 10 }}>roof-diagram-raybevel/README.md</code>.
                </span>
              </div>
              {raybevelDiagramNote ? (
                <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                  {raybevelDiagramNote}
                </p>
              ) : null}
              <div className="result-diagram-wrap" dangerouslySetInnerHTML={{ __html: roofDiagramPreviewHtml }} />

              {/* Roof Measurements table */}
              <h3>Roof Measurements</h3>
              <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                Takeoff-style <strong>RFS</strong> rows (walls, floor perimeter, surface area, squares, ridge/hip/valley LF, roof-edge total) are listed first; plan detail follows as <strong>DRW</strong> / <strong>LEN</strong>.
              </p>
              <div className="result-table-wrap">
                <table className="result-table">
                  <thead>
                    <tr><th>Code</th><th>Measurement</th><th className="r">Value</th></tr>
                  </thead>
                  <tbody>
                    {result.drawingMeasurements.map((m) => (
                      <tr key={m.code}><td className="code-cell">{m.code}</td><td>{m.label}</td><td className="r">{m.value}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Waste scenarios compact */}
              <h3>Waste Factor Scenarios</h3>
              <div className="result-table-wrap">
                <table className="result-table compact">
                  <thead>
                    <tr>{[5, 10, 12, 15, 18, 20, 22, 25].map((p) => <th key={p} className="r">{p}%</th>)}</tr>
                  </thead>
                  <tbody>
                    <tr>
                      {[5, 10, 12, 15, 18, 20, 22, 25].map((pct) => (
                        <td key={pct} className="r">
                          {round2(wasteScenarioBaseSq * (1 + pct / 100))} SQ
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Scope of Work table */}
              <h3>Scope of Work</h3>
              <div className="result-table-wrap">
                <table className="result-table">
                  <thead>
                    <tr><th>Code</th><th>Description</th><th className="r">Qty</th><th className="r">Unit Cost</th><th className="r">Total</th></tr>
                  </thead>
                  <tbody>
                    {result.scopeLines.map((line) => (
                      <tr key={line.code}>
                        <td className="code-cell">{line.code}</td>
                        <td>{line.description}</td>
                        <td className="r">{line.quantity} {line.unit}</td>
                        <td className="r">{money(line.unitCost)}</td>
                        <td className="r">{money(line.total)}</td>
                      </tr>
                    ))}
                    <tr className="subtotal-row">
                      <td colSpan={4}>Line Item Subtotal</td>
                      <td className="r">{money(result.lineItemTotal)}</td>
                    </tr>
                    <tr className="subtotal-row">
                      <td colSpan={4}>Material Sales Tax</td>
                      <td className="r">{money(result.materialSalesTax)}</td>
                    </tr>
                    <tr className="subtotal-row">
                      <td colSpan={4}>RCV subtotal (pre-markup)</td>
                      <td className="r">{money(result.rcvSubtotalBeforeMarkup)}</td>
                    </tr>
                    <tr className="subtotal-row">
                      <td colSpan={4}>Estimate adjustment (+50%)</td>
                      <td className="r">{money(result.estimateMarkupAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Estimate Summary */}
              <h3>Estimate Summary</h3>
              <div className="result-table-wrap">
                <table className="result-table summary">
                  <tbody>
                    <tr><td>Scope</td><td className="r">{result.scope.toUpperCase()}</td></tr>
                    <tr><td>Total squares (takeoff, before waste)</td><td className="r">{result.surfaceSquares} SQ</td></tr>
                    <tr><td>Effective squares (incl. {result.wastePct}% waste)</td><td className="r">{result.effectiveSquares} SQ</td></tr>
                    <tr><td>Regional multiplier ({form.stateCode})</td><td className="r">×{result.regional.toFixed(2)}</td></tr>
                    <tr><td>Replacement Cost Value (RCV, after +50% adjustment)</td><td className="r">{money(result.replacementCostValue)}</td></tr>
                    <tr><td>Less Depreciation</td><td className="r">({money(result.depreciation)})</td></tr>
                    <tr><td>Actual Cash Value (ACV)</td><td className="r">{money(result.actualCashValue)}</td></tr>
                    <tr className="grand-total-row"><td>Final Cost</td><td className="r">{money(result.finalCost)}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Carrier Comparison */}
              <h3>Carrier Comparison</h3>
              <div className="result-table-wrap">
                <table className="result-table summary">
                  <tbody>
                    <tr><td>Valuation Basis</td><td className="r">{result.carrier.valuationBasis}</td></tr>
                    <tr><td>Carrier Total</td><td className="r">{money(result.carrier.total)}</td></tr>
                    <tr><td>Our Final Cost</td><td className="r">{money(result.finalCost)}</td></tr>
                    <tr><td>Delta</td><td className="r">{money(result.delta)} ({result.deltaDirection})</td></tr>
                    <tr><td>Parser Confidence</td><td className="r">{result.carrier.parserConfidence}</td></tr>
                    <tr><td>Line Math Mismatches</td><td className="r">{result.carrier.lineMathMismatchCount}</td></tr>
                    <tr><td>RCV / ACV / Dep (Carrier)</td><td className="r">{result.carrier.rcv != null ? money(result.carrier.rcv) : "N/A"} / {result.carrier.acv != null ? money(result.carrier.acv) : "N/A"} / {result.carrier.dep != null ? money(result.carrier.dep) : "N/A"}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Settlement Projection */}
              <h3>Settlement Projection</h3>
              <div className="result-table-wrap">
                <table className="result-table summary">
                  <tbody>
                    <tr><td>Deductible</td><td className="r">{money(result.settlement.deductible)}</td></tr>
                    <tr><td>Recoverable Depreciation</td><td className="r">{money(result.settlement.recoverableDep)}</td></tr>
                    <tr><td>Initial ACV Payment</td><td className="r">{money(result.settlement.initialPayment)}</td></tr>
                    <tr><td>Projected Final Payment</td><td className="r">{money(result.settlement.finalProjected)}</td></tr>
                    <tr className="grand-total-row"><td>Estimated Out-of-Pocket</td><td className="r">{money(result.settlement.outOfPocket)}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Warnings */}
              {(result.warnings.length > 0 || result.carrier.likelyMissingItems.length > 0) ? (
                <>
                  <h3>Warnings &amp; Missing Scope</h3>
                  <ul className="warning-list">
                    {result.warnings.map((w) => <li key={`w-${w}`}>{w}</li>)}
                    {result.carrier.likelyMissingItems.map((m) => <li key={`m-${m}`}>{m}</li>)}
                  </ul>
                </>
              ) : (
                <>
                  <h3>Warnings &amp; Missing Scope</h3>
                  <p className="muted" style={{ fontSize: 13 }}>No warnings or missing-scope flags.</p>
                </>
              )}
            </>
          )}
        </section>
        </main>
      </div>
    </div>
  );
}

export default App;
