import { useEffect, useMemo, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useRoofing } from "./context/RoofingContext";

type DamageType = "Hail" | "Wind" | "Missing Shingles" | "Leaks" | "Flashing" | "Structural";
type ParserConfidence = "low" | "medium" | "high";
type ValuationBasis = "RCV" | "ACV" | "line-total";
type DeltaDirection = "under-scoped" | "over-scoped" | "aligned";
type RoofLineType = "ridge" | "hip" | "valley" | "eave" | "rake" | "wall-flashing" | "step-flashing";

const DAMAGE_TYPES: DamageType[] = ["Hail", "Wind", "Missing Shingles", "Leaks", "Flashing", "Structural"];
const STORAGE_KEY = "roofing-estimator-vite-jobs-v1";
const MAPBOX_TOKEN_STORAGE_KEY = "roofing-estimator-vite-mapbox-token-v1";
const PROPERTY_DB_KEY = "roofing-estimator-vite-property-db-v1";

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
}

interface CarrierParsed {
  valuationBasis: ValuationBasis;
  total: number;
  rcv: number | null;
  acv: number | null;
  dep: number | null;
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
  unit: "SQ" | "LF" | "EA";
  unitCost: number;
  total: number;
}

interface EstimateResult {
  scope: "repair" | "replace";
  scopeLines: ScopeLine[];
  drawingMeasurements: DrawingMeasurement[];
  lineItemTotal: number;
  materialSalesTax: number;
  replacementCostValue: number;
  depreciation: number;
  actualCashValue: number;
  totalCost: number;
  finalCost: number;
  confidence: "low" | "medium" | "high";
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

interface ContactRecord {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
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
  notes: string;
  createdAt: string;
  updatedAt: string;
}

type ProposalProfile = "residential" | "commercial";

interface ProposalState {
  profile: ProposalProfile;
  companyName: string;
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
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function parsePitchRise(pitch?: string): number | null {
  if (!pitch?.trim()) return null;
  const m = pitch.trim().replace(":", "/").match(/^(\d+(?:\.\d+)?)\s*\/\s*12$/);
  if (!m?.[1]) return null;
  const n = Number.parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

function inferRoofFormType(roofType: string): "gable" | "hip" | "flat" | "mansard" {
  const t = roofType.toLowerCase();
  if (t.includes("tpo") || t.includes("epdm") || t.includes("pvc") || t.includes("flat") || t.includes("low slope")) return "flat";
  if (t.includes("hip")) return "hip";
  if (t.includes("mansard")) return "mansard";
  return "gable";
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

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out.map((x) => x.replace(/^"|"$/g, "").trim());
}

function valByHeader(row: string[], headers: string[], names: string[]): string {
  for (const name of names) {
    const idx = headers.findIndex((h) => h === name.toLowerCase());
    if (idx >= 0 && row[idx]) return row[idx];
  }
  return "";
}

function parseContactsCsv(text: string): ContactRecord[] {
  const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0] ?? "").map((h) => h.toLowerCase());
  const results: ContactRecord[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const row = splitCsvLine(lines[i] ?? "");
    const name = valByHeader(row, headers, ["name", "contact", "full_name"]);
    const company = valByHeader(row, headers, ["company", "organization"]);
    const email = valByHeader(row, headers, ["email", "email_address"]);
    const phone = valByHeader(row, headers, ["phone", "phone_number", "mobile"]);
    const address = valByHeader(row, headers, ["address", "street", "street_address"]);
    const city = valByHeader(row, headers, ["city"]);
    const state = valByHeader(row, headers, ["state", "state_code"]);
    const zip = valByHeader(row, headers, ["zip", "zipcode", "postal", "postal_code"]);
    const latRaw = valByHeader(row, headers, ["lat", "latitude"]);
    const lngRaw = valByHeader(row, headers, ["lng", "lon", "longitude"]);
    const lat = Number.parseFloat(latRaw);
    const lng = Number.parseFloat(lngRaw);
    results.push({
      id: `contact_${i}_${Date.now()}`,
      name,
      company,
      email,
      phone,
      address,
      city,
      state,
      zip,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    });
  }
  return results.filter((x) => x.name || x.address || x.email || x.phone);
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function classifyRoofType(roofType: string): string {
  const t = roofType.toLowerCase();
  if (t.includes("slate")) return "slate";
  if (t.includes("metal")) return "metal";
  if (t.includes("tile")) return "tile";
  if (t.includes("tpo")) return "tpo";
  if (t.includes("epdm")) return "epdm";
  if (t.includes("pvc")) return "pvc";
  if (t.includes("modified")) return "modbit";
  if (t.includes("coating")) return "coating";
  if (t.includes("flat")) return "flat";
  return "asphalt";
}

function getRateBands(category: string): [number, number, number, number] {
  const bands: Record<string, [number, number, number, number]> = {
    slate: [1700, 2600, 2800, 3100],
    metal: [1600, 2500, 2600, 3400],
    tile: [1500, 2400, 2500, 3400],
    tpo: [350, 520, 520, 760],
    epdm: [340, 500, 500, 730],
    pvc: [360, 530, 530, 770],
    modbit: [390, 570, 570, 820],
    coating: [240, 360, 360, 520],
    flat: [1300, 2200, 2200, 3000],
    asphalt: [1200, 2000, 2100, 2900],
  };
  return bands[category] ?? bands.asphalt;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function installCodeForCategory(category: string): string {
  const codeByCategory: Record<string, string> = {
    asphalt: "RFG300",
    metal: "MTL300",
    tile: "TIL300",
    slate: "SLT300",
    tpo: "TPO300",
    epdm: "EPD300",
    pvc: "PVC300",
    modbit: "MOD300",
    coating: "CTG300",
    flat: "FLT300",
  };
  return codeByCategory[category] ?? "RFG300";
}

function getReferenceMaterialSalesTaxRate(stateCode: string): number {
  // Calibrated from insurance scope references (MO example approx 3.08% on line items).
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
): DrawingMeasurement[] {
  return [
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
}

function buildScopeLines(
  scope: "repair" | "replace",
  category: string,
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
): ScopeLine[] {
  const lines: ScopeLine[] = [];
  const installCode = installCodeForCategory(category);
  const installBaseUnit = getRateBands(category)[2];
  if (scope === "replace") {
    lines.push({
      code: "RFG220",
      description: "Tear-off and disposal",
      quantity: round2(effectiveSquares),
      unit: "SQ",
      unitCost: round2(140 * regional),
      total: 0,
    });
    lines.push({
      code: installCode,
      description: "Roof replacement install",
      quantity: round2(effectiveSquares),
      unit: "SQ",
      unitCost: round2((installBaseUnit * (0.94 + severity * 0.03)) * regional),
      total: 0,
    });
  } else {
    lines.push({
      code: "RFGREP",
      description: "Targeted roofing repair",
      quantity: round2(effectiveSquares * 0.35),
      unit: "SQ",
      unitCost: round2((getRateBands(category)[0] * (0.84 + severity * 0.03)) * regional),
      total: 0,
    });
  }

  if (Number.isFinite(perimeter) && perimeter > 0) {
    lines.push({
      code: "RFGDRP",
      description: "Drip edge / edge metal",
      quantity: round2(perimeter),
      unit: "LF",
      unitCost: round2(4.25 * regional),
      total: 0,
    });
    lines.push({
      code: "RFGFLS",
      description: "Flashing and seal updates",
      quantity: round2(Math.max(1, perimeter / 45)),
      unit: "EA",
      unitCost: round2(55 * regional),
      total: 0,
    });
  }

  if (lengths.ridges > 0) {
    lines.push({
      code: "RFGCAP",
      description: "Ridge cap shingles / vent cap",
      quantity: round2(lengths.ridges),
      unit: "LF",
      unitCost: round2(8.4 * regional),
      total: 0,
    });
  }
  if (lengths.valleys > 0) {
    lines.push({
      code: "RFGVLY",
      description: "Valley metal / membrane reinforcement",
      quantity: round2(lengths.valleys),
      unit: "LF",
      unitCost: round2(11.5 * regional),
      total: 0,
    });
  }
  if (lengths.wallFlashing > 0 || lengths.stepFlashing > 0) {
    lines.push({
      code: "RFGSFL",
      description: "Step/wall flashing installation",
      quantity: round2(lengths.wallFlashing + lengths.stepFlashing),
      unit: "LF",
      unitCost: round2(9.25 * regional),
      total: 0,
    });
  }

  lines.push({
    code: "RFGOP",
    description: "Job supervision / O&P",
    quantity: 1,
    unit: "EA",
    unitCost: round2((scope === "replace" ? 950 : 450) * regional),
    total: 0,
  });

  // Insurance scope references commonly include labor minimum charges.
  lines.push({
    code: "LABMIN-RFG",
    description: "Roofing labor minimum",
    quantity: 1,
    unit: "EA",
    unitCost: round2(303.76 * regional),
    total: 0,
  });
  lines.push({
    code: "LABMIN-GEN",
    description: "General labor minimum",
    quantity: 1,
    unit: "EA",
    unitCost: round2(30.06 * regional),
    total: 0,
  });

  return lines.map((line) => ({
    ...line,
    total: Math.round(line.quantity * line.unitCost),
  }));
}

function parseCarrierScope(text: string): CarrierParsed {
  if (!text.trim()) {
    return {
      valuationBasis: "line-total",
      total: 0,
      rcv: null,
      acv: null,
      dep: null,
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

    if (/\b(total|grand total|subtotal|replacement cost|actual cash value|depreciation)\b/i.test(line)) {
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
    parsedLineCount,
    parserConfidence,
    lineMathMismatchCount: mismatch,
    lineMathTotal: Math.round(lineMathTotal),
    lineCodes: Array.from(codes).slice(0, 12),
    likelyMissingItems: missing.slice(0, 5),
  };
}

function defaultFormState(): FormState {
  return {
    address: "7270 Hillsdale Court, Chanhassen, MN 55317",
    stateCode: "MN",
    latitude: "",
    longitude: "",
    roofType: "Asphalt Shingle",
    areaSqFt: "3432.61",
    perimeterFt: "387.58",
    roofPitch: "6/12",
    wastePercent: "25",
    measuredSquares: "34.33",
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
  };
}

function defaultProposalState(profile: ProposalProfile = "residential"): ProposalState {
  if (profile === "commercial") {
    return {
      profile,
      companyName: "Repair King",
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
    };
  }
  return {
    profile,
    companyName: "Repair King",
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
  };
}

function buildResult(form: FormState): EstimateResult | null {
  const explicitArea = Number.parseFloat(form.areaSqFt);
  const measuredSquares = Number.parseFloat(form.measuredSquares);
  const areaFromSquares = Number.isFinite(measuredSquares) && measuredSquares > 0 ? measuredSquares * 100 : NaN;
  const area = Number.isFinite(explicitArea) && explicitArea > 0 ? explicitArea : areaFromSquares;
  if (!Number.isFinite(area) || area <= 0) return null;
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
  const baseSquares = Number.isFinite(measuredSquares) && measuredSquares > 0 ? measuredSquares : area / 100;
  const effectiveSquares = baseSquares * (1 + wastePct / 100);
  const scopeLines = buildScopeLines(
    scope,
    category,
    effectiveSquares,
    perimeter,
    form.severity,
    regional,
    lengths,
  );
  const drawingMeasurements = buildDrawingMeasurements(
    area,
    perimeter,
    form.roofPitch,
    effectiveSquares,
    wastePct,
    lengths,
  );
  const lineItemTotal = scopeLines.reduce((sum, line) => sum + line.total, 0);
  const materialSalesTax = Math.round(
    lineItemTotal * getReferenceMaterialSalesTaxRate(form.stateCode),
  );
  const replacementCostValue = lineItemTotal + materialSalesTax;
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
    const fromSqFt = measuredSquares * 100;
    const deltaPct = Math.abs(fromSqFt - explicitArea) / Math.max(1, explicitArea);
    if (deltaPct > 0.15) {
      quality -= 12;
      warnings.push("Measured squares and plan area differ by more than 15%; verify report takeoff.");
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
    replacementCostValue,
    depreciation,
    actualCashValue,
    totalCost,
    finalCost,
    confidence,
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
  const baseSq =
    Number.isFinite(Number.parseFloat(form.measuredSquares)) &&
    Number.parseFloat(form.measuredSquares) > 0
      ? Number.parseFloat(form.measuredSquares)
      : Number.parseFloat(form.areaSqFt) > 0
        ? Number.parseFloat(form.areaSqFt) / 100
        : 0;
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
    `  Roof Type ........ ${form.roofType}`,
    `  Pitch ............ ${form.roofPitch || "N/A"}`,
    "",
    "▸ ROOF MEASUREMENTS",
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
    "",
    "▸ ESTIMATE SUMMARY",
    `  Scope ..................... ${result.scope.toUpperCase()}`,
    `  Effective Squares ........ ${result.effectiveSquares} SQ (incl. ${result.wastePct}% waste)`,
    `  Regional Multiplier ...... ×${result.regional.toFixed(2)} (${form.stateCode})`,
    `  RCV ...................... ${money(result.replacementCostValue)}`,
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
    `  Roof Type ........ ${form.roofType}`,
    `  Pitch ............ ${form.roofPitch || "N/A"}`,
    `  Squares .......... ${form.measuredSquares || "N/A"}`,
    `  Waste Factor ..... ${form.wastePercent || "N/A"}%`,
    "",
    "▸ ROOF MEASUREMENTS",
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
    "",
    "▸ PRICING SUMMARY",
    `  RCV ...................... ${money(result.replacementCostValue)}`,
    `  Less Depreciation ........ (${money(result.depreciation)})`,
    `  ACV ...................... ${money(result.actualCashValue)}`,
    "",
    `  ┌─────────────────────────────────────────┐`,
    `  │  PROPOSAL TOTAL: ${money(result.finalCost).padEnd(23)}│`,
    `  └─────────────────────────────────────────┘`,
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
    sep,
    `  ${proposal.companyName} | ${proposal.contactEmail} | ${proposal.contactPhone}`,
    sep,
  ].join("\n");
}

function buildProposalHtml(form: FormState, result: EstimateResult, proposal: ProposalState): string {
  const scopeRows = result.scopeLines
    .map(
      (l) =>
        `<tr><td>${l.code}</td><td>${l.description}</td><td class="r">${l.quantity} ${l.unit}</td><td class="r">${money(l.unitCost)}</td><td class="r">${money(l.total)}</td></tr>`,
    )
    .join("");

  const measureRows = result.drawingMeasurements
    .map((m) => `<tr><td>${m.code}</td><td>${m.label}</td><td class="r">${m.value}</td></tr>`)
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${proposal.proposalTitle}</title>
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
  <h1>${proposal.proposalTitle}</h1>
  <div class="subtitle">Prepared ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>

  <div class="row">
    <div class="col">
      <div class="label">Contractor</div>
      <p><strong>${proposal.companyName}</strong></p>
      <p>${proposal.preparedBy}</p>
      <p>${proposal.contactEmail}</p>
      <p>${proposal.contactPhone}</p>
    </div>
    <div class="col">
      <div class="label">Client</div>
      <p><strong>${proposal.clientName || "—"}</strong></p>
      <p>${proposal.clientCompany || ""}</p>
      <p>${proposal.clientEmail || "—"}</p>
      <p>${proposal.clientPhone || "—"}</p>
    </div>
    <div class="col">
      <div class="label">Property</div>
      <p><strong>${form.address || "—"}</strong></p>
      <p>${form.stateCode || ""} | ${form.latitude || ""}, ${form.longitude || ""}</p>
      <p>Roof: ${form.roofType} | Pitch: ${form.roofPitch || "N/A"}</p>
    </div>
  </div>

  <h2>Roof Measurements</h2>
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
    </tbody>
  </table>

  <h2>Estimate Summary</h2>
  <table>
    <tbody>
      <tr><td>Scope</td><td class="r">${result.scope.toUpperCase()}</td></tr>
      <tr><td>Effective Squares (incl. ${result.wastePct}% waste)</td><td class="r">${result.effectiveSquares} SQ</td></tr>
      <tr><td>Regional Multiplier (${form.stateCode})</td><td class="r">×${result.regional.toFixed(2)}</td></tr>
      <tr><td>Replacement Cost Value (RCV)</td><td class="r">${money(result.replacementCostValue)}</td></tr>
      <tr><td>Less Depreciation</td><td class="r">(${money(result.depreciation)})</td></tr>
      <tr><td>Actual Cash Value (ACV)</td><td class="r">${money(result.actualCashValue)}</td></tr>
    </tbody>
  </table>

  <div class="highlight">PROPOSAL TOTAL: ${money(result.finalCost)}</div>

  <div class="terms">
    <h2>Inclusions</h2><p>${proposal.inclusions}</p>
    <h2>Exclusions</h2><p>${proposal.exclusions}</p>
    <h2>Payment Schedule</h2><p>${proposal.paymentSchedule}</p>
    <h2>Warranty</h2><p>${proposal.warranty}</p>
    <h2>Alternates</h2><p>${proposal.alternates}</p>
    <h2>Financing</h2><p>${proposal.financingNotes}</p>
  </div>

  <div class="footer">${proposal.companyName} | ${proposal.contactEmail} | ${proposal.contactPhone}</div>
</body>
</html>`;
}

function App() {
  const mapboxContainerRef = useRef<HTMLDivElement | null>(null);
  const mapboxMapRef = useRef<any>(null);
  const mapboxDrawRef = useRef<any>(null);
  const mapboxglModuleRef = useRef<any>(null);
  const turfModuleRef = useRef<any>(null);
  const propertyMarkerRef = useRef<any>(null);
  const contactMarkersRef = useRef<any[]>([]);
  const mapClickHandlerRef = useRef<(lat: number, lng: number) => void>(() => {});
  const applyContactHandlerRef = useRef<(c: ContactRecord) => void>(() => {});
  const lineTypeRef = useRef<RoofLineType>("ridge");
  const addRoofLineRef = useRef<(line: DrawnRoofLine) => void>(() => {});
  const autoCalcRef = useRef<(polygons: any[]) => void>(() => {});
  const [form, setForm] = useState<FormState>(defaultFormState());
  const [proposal, setProposal] = useState<ProposalState>(defaultProposalState("residential"));
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
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
  const [currentLineType, setCurrentLineType] = useState<RoofLineType>("ridge");
  const [drawnRoofLines, setDrawnRoofLines] = useState<DrawnRoofLine[]>([]);
  const [autoCalcEnabled, setAutoCalcEnabled] = useState(true);
  const [autoCalcInfo, setAutoCalcInfo] = useState("");
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [savedReports, setSavedReports] = useState<SavedApiReport[]>([]);
  const [reportsBusy, setReportsBusy] = useState(false);
  const [reportsStatus, setReportsStatus] = useState("");
  const [geoStatus, setGeoStatus] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);
  const [runId, setRunId] = useState(0);
  const [lastEstimateId, setLastEstimateId] = useState<string>("");
  const [propertyDb, setPropertyDb] = useState<PropertyOwnerRecord[]>([]);
  const [activeProperty, setActiveProperty] = useState<PropertyOwnerRecord | null>(null);
  const [propertyDbSearch, setPropertyDbSearch] = useState("");
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);
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
      if (Array.isArray(parsed)) setPropertyDb(parsed);
    } catch {
      // ignore
    }
  }, []);

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

  useEffect(() => {
    if (!mapboxToken.trim()) {
      setMapboxStatus("Add Mapbox token to enable map.");
      return;
    }
    if (!mapboxContainerRef.current) return;
    if (mapboxMapRef.current) return;

    let disposed = false;
    const init = async () => {
      try {
        const [{ default: mapboxgl }, { default: MapboxDraw }, turf] = await Promise.all([
          import("mapbox-gl"),
          import("@mapbox/mapbox-gl-draw"),
          import("@turf/turf"),
        ]);
        if (disposed || !mapboxContainerRef.current) return;

        mapboxglModuleRef.current = mapboxgl;
        turfModuleRef.current = turf;
        mapboxgl.accessToken = mapboxToken;

        const lat = Number.parseFloat(form.latitude);
        const lng = Number.parseFloat(form.longitude);
        const center: [number, number] =
          Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : [-93.53, 44.86];

        const map = new mapboxgl.Map({
          container: mapboxContainerRef.current,
          style: "mapbox://styles/mapbox/satellite-v9",
          center,
          zoom: 18,
        });
        const draw = new MapboxDraw({
          displayControlsDefault: false,
          controls: { polygon: true, line_string: true, trash: true },
        });
        map.addControl(draw);
        map.addControl(new mapboxgl.NavigationControl(), "top-right");
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
          if (!disposed) setMapReady(true);
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

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

  const mapClickSetProperty = async (lat: number, lng: number) => {
    setForm((curr) => ({
      ...curr,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));

    const existing = findNearbyProperty(lat, lng);
    if (existing) {
      setActiveProperty(existing);
      setShowPropertyPanel(true);
      applyPropertyToForm(existing);
      setGeoStatus(`Loaded saved property: ${existing.ownerName || existing.address}`);
      return;
    }

    setGeoBusy(true);
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
      setActiveProperty(blank);
      setShowPropertyPanel(true);
      setGeoStatus("New property — add owner details and save.");
    } catch (e) {
      const blank = newBlankProperty("", lat, lng);
      setActiveProperty(blank);
      setShowPropertyPanel(true);
      setGeoStatus(e instanceof Error ? e.message : "Map lookup failed");
    } finally {
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
    const fullAddress = [contact.address, contact.city, contact.state, contact.zip]
      .filter(Boolean)
      .join(", ");
    setProposal((curr) => ({
      ...curr,
      clientName: contact.name || curr.clientName,
      clientCompany: contact.company || curr.clientCompany,
      clientEmail: contact.email || curr.clientEmail,
      clientPhone: contact.phone || curr.clientPhone,
    }));
    setForm((curr) => ({
      ...curr,
      address: fullAddress || curr.address,
      stateCode: (contact.state || curr.stateCode).toUpperCase().slice(0, 2),
      latitude: contact.lat != null ? contact.lat.toFixed(6) : curr.latitude,
      longitude: contact.lng != null ? contact.lng.toFixed(6) : curr.longitude,
    }));
    if (contact.lat != null && contact.lng != null) {
      flyMapTo(contact.lat, contact.lng);
    }
  };

  mapClickHandlerRef.current = mapClickSetProperty;
  applyContactHandlerRef.current = applyContactToProposal;
  lineTypeRef.current = currentLineType;
  addRoofLineRef.current = (line) => setDrawnRoofLines((prev) => [...prev, line]);

  autoCalcRef.current = (polygons: any[]) => {
    if (!autoCalcEnabled) return;
    const turf = turfModuleRef.current;
    if (!turf || !polygons.length) return;

    const totalAreaSqM = polygons.reduce(
      (s: number, f: any) => s + (turf.area(f) || 0), 0,
    );
    const planAreaSqFt = totalAreaSqM * 10.7639;
    if (planAreaSqFt <= 0) return;

    let totalPerimFt = 0;
    for (const poly of polygons) {
      try {
        const line = turf.polygonToLine(poly);
        totalPerimFt += turf.length(line, { units: "feet" });
      } catch {
        /* skip malformed polygons */
      }
    }

    const largest = polygons.reduce((best: any, f: any) =>
      turf.area(f) > turf.area(best) ? f : best, polygons[0],
    );
    const bbox = turf.bbox(largest);
    const sw = turf.point([bbox[0], bbox[1]]);
    const se = turf.point([bbox[2], bbox[1]]);
    const ne = turf.point([bbox[2], bbox[3]]);
    const dimA = turf.distance(sw, se, { units: "feet" });
    const dimB = turf.distance(se, ne, { units: "feet" });
    const buildingL = Math.max(dimA, dimB);
    const buildingW = Math.min(dimA, dimB);

    const pitchRise = parsePitchRise(form.roofPitch) ?? 6;
    const pitchFactor = Math.sqrt(1 + (pitchRise / 12) ** 2);
    const roofForm = inferRoofFormType(form.roofType);

    let ridgeFt = 0;
    let eavesFt = 0;
    let rakesFt = 0;
    let valleysFt = 0;
    let hipsFt = 0;
    let stepFlashFt = 0;
    let wallFlashFt = 0;

    if (roofForm === "flat") {
      eavesFt = totalPerimFt;
    } else if (roofForm === "hip") {
      ridgeFt = Math.max(0, buildingL - buildingW);
      eavesFt = totalPerimFt;
      hipsFt = 4 * (buildingW / 2) * Math.sqrt(2 + (pitchRise / 12) ** 2);
    } else {
      ridgeFt = buildingL;
      eavesFt = 2 * buildingL;
      rakesFt = 4 * (buildingW / 2) * pitchFactor;
    }

    const vertexCount = (largest.geometry?.coordinates?.[0]?.length ?? 5) - 1;
    if (vertexCount > 5) {
      const extraEdges = vertexCount - 4;
      valleysFt = extraEdges * (buildingW / 2) * Math.sqrt(2 + (pitchRise / 12) ** 2);
      ridgeFt *= 1 + extraEdges * 0.1;
    }

    stepFlashFt = totalPerimFt * 0.13;
    wallFlashFt = totalPerimFt * 0.05;

    const actualArea = planAreaSqFt * pitchFactor;
    const squares = actualArea / 100;

    const fmt = (ft: number) => {
      if (ft <= 0) return "0ft 0in";
      const w = Math.floor(ft);
      const inches = Math.round((ft - w) * 12);
      return `${w}ft ${inches}in`;
    };

    const manualSums: Record<string, number> = {};
    for (const line of drawnRoofLines) manualSums[line.type] = (manualSums[line.type] || 0) + line.lengthFt;

    setForm((curr) => ({
      ...curr,
      areaSqFt: planAreaSqFt.toFixed(2),
      measuredSquares: squares.toFixed(2),
      perimeterFt: totalPerimFt.toFixed(2),
      ridgesFt: manualSums["ridge"] ? curr.ridgesFt : fmt(ridgeFt),
      eavesFt: manualSums["eave"] ? curr.eavesFt : fmt(eavesFt),
      rakesFt: manualSums["rake"] ? curr.rakesFt : fmt(rakesFt),
      valleysFt: manualSums["valley"] ? curr.valleysFt : fmt(valleysFt),
      hipsFt: manualSums["hip"] ? curr.hipsFt : fmt(hipsFt),
      wallFlashingFt: manualSums["wall-flashing"] ? curr.wallFlashingFt : fmt(wallFlashFt),
      stepFlashingFt: manualSums["step-flashing"] ? curr.stepFlashingFt : fmt(stepFlashFt),
    }));

    setAutoCalcInfo(
      `Auto: ${roofForm} roof | ${buildingL.toFixed(0)}×${buildingW.toFixed(0)} ft | ` +
      `Plan ${planAreaSqFt.toFixed(0)} SF → ${squares.toFixed(1)} SQ (pitch ×${pitchFactor.toFixed(2)}) | ` +
      `Ridge ${fmt(ridgeFt)} | Eaves ${fmt(eavesFt)}` +
      (rakesFt > 0 ? ` | Rakes ${fmt(rakesFt)}` : "") +
      (hipsFt > 0 ? ` | Hips ${fmt(hipsFt)}` : "") +
      (valleysFt > 0 ? ` | Valleys ${fmt(valleysFt)}` : ""),
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
    setForm(job.form);
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
    const html = buildProposalHtml(form, result, proposal);
    const win = window.open("", "_blank", "width=980,height=900");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  const runEstimateAndRecord = () => {
    const area = Number.parseFloat(form.areaSqFt);
    const sq = Number.parseFloat(form.measuredSquares);
    if ((!Number.isFinite(area) || area <= 0) && (!Number.isFinite(sq) || sq <= 0)) {
      window.alert("Enter plan area or measured squares before generating.");
      return;
    }

    const computed = buildResult(form);
    if (computed) {
      const measurementId = `m_${Date.now()}`;
      const roofForm = inferRoofFormType(form.roofType);
      const pitchRise = parsePitchRise(form.roofPitch) ?? 6;
      const waste = Number.parseFloat(form.wastePercent) || computed.wastePct;
      const adjustedArea = (computed.effectiveSquares * 100);
      const approxSide = Math.sqrt(adjustedArea);

      addMeasurement({
        id: measurementId,
        projectName: form.address || "Roof Project",
        date: new Date().toLocaleDateString(),
        roofType: roofForm,
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
        .filter((l) => !l.code.startsWith("LABMIN"))
        .map((l) => ({
          name: `${l.code} ${l.description}`,
          quantity: l.quantity,
          unit: l.unit,
          unitCost: l.unitCost,
          totalCost: l.total,
        }));
      const labor = computed.scopeLines
        .filter((l) => l.code.startsWith("LABMIN"))
        .map((l) => ({
          description: `${l.code} ${l.description}`,
          hours: 1,
          hourlyRate: l.total,
          totalCost: l.total,
        }));

      addEstimate({
        id: estimateId,
        measurementId,
        projectName: form.address || "Roof Project",
        date: new Date().toLocaleDateString(),
        materials,
        labor,
        subtotal: computed.lineItemTotal,
        tax: computed.materialSalesTax,
        total: computed.finalCost,
      });
    }

    setRunId((id) => id + 1);
  };

  const applyDrawnAreaToEstimate = () => {
    if (mapboxAreaSqFt <= 0 && drawnRoofLines.length === 0) {
      window.alert("Draw at least one roof polygon or measurement line first.");
      return;
    }
    setForm((curr) => {
      const next = { ...curr };
      if (mapboxAreaSqFt > 0) {
        next.areaSqFt = mapboxAreaSqFt.toFixed(2);
        next.measuredSquares = (mapboxAreaSqFt / 100).toFixed(2);
      }
      if (drawnRoofLines.length > 0) {
        const sums: Record<RoofLineType, number> = {
          ridge: 0, hip: 0, valley: 0, eave: 0, rake: 0,
          "wall-flashing": 0, "step-flashing": 0,
        };
        for (const line of drawnRoofLines) sums[line.type] += line.lengthFt;
        const fmt = (ft: number) => {
          const wholeFt = Math.floor(ft);
          const inches = Math.round((ft - wholeFt) * 12);
          return `${wholeFt}ft ${inches}in`;
        };
        if (sums.ridge > 0) next.ridgesFt = fmt(sums.ridge);
        if (sums.eave > 0) next.eavesFt = fmt(sums.eave);
        if (sums.rake > 0) next.rakesFt = fmt(sums.rake);
        if (sums.valley > 0) next.valleysFt = fmt(sums.valley);
        if (sums.hip > 0) next.hipsFt = fmt(sums.hip);
        if (sums["wall-flashing"] > 0) next.wallFlashingFt = fmt(sums["wall-flashing"]);
        if (sums["step-flashing"] > 0) next.stepFlashingFt = fmt(sums["step-flashing"]);
        const totalPerim = sums.eave + sums.rake;
        if (totalPerim > 0) next.perimeterFt = totalPerim.toFixed(2);
      }
      return next;
    });
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
    setProposal(defaultProposalState(profile));
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
  return (
    <div className="p-8">
      <div className="max-w-[1400px] mx-auto">
        <header className="top">
          <h1>Roofing Measurement & Estimate Pro</h1>
          <p>Professional measurement, estimate, and proposal workflow for residential and commercial roofing.</p>
        </header>
        <main className="grid2">
        <section className="panel" id="section-intake">
          <h2>Property & Measurement Intake</h2>
          <div className="form-grid">
            <label>Address<input value={form.address} onChange={(e) => setForm((curr) => ({ ...curr, address: e.target.value }))} placeholder="123 Main St, City, ST" /></label>
            <label>State<input value={form.stateCode} onChange={(e) => setForm((curr) => ({ ...curr, stateCode: e.target.value.toUpperCase() }))} maxLength={2} placeholder="TX" /></label>
            <label>Latitude<input type="number" step="0.000001" value={form.latitude} onChange={(e) => setForm((curr) => ({ ...curr, latitude: e.target.value }))} placeholder="32.7767" /></label>
            <label>Longitude<input type="number" step="0.000001" value={form.longitude} onChange={(e) => setForm((curr) => ({ ...curr, longitude: e.target.value }))} placeholder="-96.7970" /></label>
            <label>Roof Type<select value={form.roofType} onChange={(e) => setForm((curr) => ({ ...curr, roofType: e.target.value }))}><option>Asphalt Shingle</option><option>Asphalt Shingle (Hip)</option><option>Metal</option><option>Metal (Hip)</option><option>Tile</option><option>Slate</option><option>TPO</option><option>EPDM</option><option>PVC</option><option>Modified Bitumen</option><option>Coating</option><option>Flat / Low Slope</option><option>Mansard</option></select></label>
            <label>Plan Area (sq ft)<input type="number" min={1} value={form.areaSqFt} onChange={(e) => setForm((curr) => ({ ...curr, areaSqFt: e.target.value }))} placeholder="2500" /></label>
            <label>Perimeter (ft)<input type="number" min={1} value={form.perimeterFt} onChange={(e) => setForm((curr) => ({ ...curr, perimeterFt: e.target.value }))} placeholder="220" /></label>
            <label>Pitch (rise/12)<input value={form.roofPitch} onChange={(e) => setForm((curr) => ({ ...curr, roofPitch: e.target.value }))} placeholder="6/12" /></label>
            <label>Measured Squares (from report)<input value={form.measuredSquares} onChange={(e) => setForm((curr) => ({ ...curr, measuredSquares: e.target.value }))} placeholder="34.33" /></label>
            <label>Waste %<input value={form.wastePercent} onChange={(e) => setForm((curr) => ({ ...curr, wastePercent: e.target.value }))} placeholder="12" /></label>
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
                  Roof Type
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
          <label>Carrier Line Items (Xactimate style)<textarea rows={10} value={form.carrierScopeText} onChange={(e) => setForm((curr) => ({ ...curr, carrierScopeText: e.target.value }))} placeholder={"RFG250 Tear Off 42.00 SQ 100.00 4200.00\nRFGDRP Drip Edge 220.00 LF 3.09 679.80\nRCV: 16480  ACV: 13900  Depreciation: 2580"} /></label>
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
                  <span>{result.scope.toUpperCase()} &bull; {result.effectiveSquares} SQ ({result.wastePct}% waste) &bull; ×{result.regional.toFixed(2)} ({form.stateCode}) &bull; Confidence: {result.confidence} &bull; Score: {result.quality}/100</span>
                </div>
              </div>

              {/* Property & Proposal summary */}
              <div className="result-grid-2">
                <div className="result-card">
                  <div className="result-card-title">Property</div>
                  <div className="result-card-row"><span>Address</span><strong>{form.address || "N/A"}</strong></div>
                  <div className="result-card-row"><span>State</span><strong>{form.stateCode || "N/A"}</strong></div>
                  <div className="result-card-row"><span>Roof Type</span><strong>{form.roofType}</strong></div>
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

              {/* Roof Measurements table */}
              <h3>Roof Measurements</h3>
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
                      {[5, 10, 12, 15, 18, 20, 22, 25].map((pct) => {
                        const bSq = Number.parseFloat(form.measuredSquares) > 0
                          ? Number.parseFloat(form.measuredSquares)
                          : Number.parseFloat(form.areaSqFt) > 0
                            ? Number.parseFloat(form.areaSqFt) / 100
                            : 0;
                        return <td key={pct} className="r">{round2(bSq * (1 + pct / 100))} SQ</td>;
                      })}
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
                  </tbody>
                </table>
              </div>

              {/* Estimate Summary */}
              <h3>Estimate Summary</h3>
              <div className="result-table-wrap">
                <table className="result-table summary">
                  <tbody>
                    <tr><td>Replacement Cost Value (RCV)</td><td className="r">{money(result.replacementCostValue)}</td></tr>
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
