/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  BuildingCodeInfo,
  DamageType,
  RecommendedAction,
  Severity,
} from "./roofReportTypes";

export type CompanyCamPdfExtraction = {
  homeownerName?: string;
  email?: string;
  phone?: string;
  roofType?: string;

  // Roof measurements
  roofAreaSqFt?: number;
  roofPerimeterFt?: number;

  // General info
  inspectionDateYmd?: string; // YYYY-MM-DD
  propertyAddress?: string;

  // Optional notes scraped from the OCR text.
  notes?: string;

  // Optional non-roof item quantities (from estimate line items).
  hvacUnits?: number;
  finCombUnits?: number;
  fenceCleanSqFt?: number;
  fenceStainSqFt?: number;
  windowWrapSmallQty?: number;
  windowWrapStandardQty?: number;
  houseWrapSqFt?: number;
  fanfoldSqFt?: number;

  // Extended estimate metadata
  roofSquares?: number;
  wasteFactorPct?: number;
  pitch?: string;
  stories?: number;
  lineItemsCount?: number;
  totalEstimateUsd?: number;
  measurementSource?: string;
  damageTypes?: DamageType[];
  severity?: Severity;
  recommendedAction?: RecommendedAction;

  // We typically compute building codes from lat/lng, but we keep this
  // placeholder for cases where OCR finds code snippets.
  buildingCodeFromPdf?: BuildingCodeInfo;
};

function normalizeWhitespace(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function tryExtractEmail(text: string): string | undefined {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m?.[0]?.trim();
}

function tryExtractPhone(text: string): string | undefined {
  // Simple phone heuristic; works best when OCR preserves digits/formatting.
  const m = text.match(/(\+?1[\s.-]?)?(\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/);
  return m?.[0]?.trim();
}

function tryExtractRoofType(text: string): string | undefined {
  const lower = text.toLowerCase();

  // TPO: try to capture mil + attachment method (if the PDF OCR includes them).
  if (lower.includes("tpo")) {
    const milMatch = lower.match(/\b(45|60|80|90)\s*-?\s*mil\b/);
    const mil = milMatch?.[1] ? `${milMatch[1]}-mil` : undefined;

    let attachment: string | undefined;
    if (
      lower.includes("mechanically attached") ||
      lower.includes("mechanically-attached")
    )
      attachment = "mechanically attached";
    else if (lower.includes("fully adhered") || lower.includes("fully-adhered"))
      attachment = "fully adhered";
    else if (
      lower.includes("induction welded") ||
      lower.includes("induction-welded") ||
      lower.includes("rhino") ||
      lower.includes("rhinobond")
    )
      attachment = "induction welded";
    else if (lower.includes("ballasted")) attachment = "ballasted";

    const parts = ["TPO"];
    if (mil) parts.push(mil);
    if (attachment) parts.push(attachment);
    return parts.join(" ");
  }

  // EPDM: capture mil + attachment (fully adhered / mechanically attached / ballasted)
  if (lower.includes("epdm")) {
    const milMatch = lower.match(/\b(45|60|90)\s*-?\s*mil\b/);
    const mil = milMatch?.[1] ? `${milMatch[1]}-mil` : undefined;

    let attachment: string | undefined;
    if (
      lower.includes("fully adhered") ||
      lower.includes("fully-adhered") ||
      lower.includes("bonded adhesive")
    )
      attachment = "fully adhered";
    else if (
      lower.includes("mechanically attached") ||
      lower.includes("mechanically-attached") ||
      lower.includes("fasteners")
    )
      attachment = "mechanically attached";
    else if (lower.includes("ballasted")) attachment = "ballasted";

    const parts = ["EPDM"];
    if (mil) parts.push(mil);
    if (attachment) parts.push(attachment);
    return parts.join(" ");
  }

  // PVC: capture mil + attachment (mechanically attached / fully adhered / heat-welded seams)
  if (lower.includes("pvc")) {
    const milMatch = lower.match(/\b(40|50|60|80)\s*-?\s*mil\b/);
    const mil = milMatch?.[1] ? `${milMatch[1]}-mil` : undefined;

    let attachment: string | undefined;
    if (
      lower.includes("fully adhered") ||
      lower.includes("fully-adhered") ||
      lower.includes("fa")
    )
      attachment = "fully adhered";
    else if (
      lower.includes("heat-welded") ||
      lower.includes("heat welded") ||
      lower.includes("hot-air") ||
      lower.includes("heat-welded seams")
    )
      attachment = "heat-welded seams";
    else if (
      lower.includes("mechanically attached") ||
      lower.includes("mechanically-attached") ||
      lower.includes("ma")
    )
      attachment = "mechanically attached";

    const parts = ["PVC"];
    if (mil) parts.push(mil);
    if (attachment) parts.push(attachment);
    return parts.join(" ");
  }

  // Modified Bitumen: infer APP vs SBS and torch vs self-adhered vs heat-welded
  if (
    lower.includes("modified bitumen") ||
    lower.includes("mod bit") ||
    lower.includes("modbit") ||
    lower.includes("sbs") ||
    lower.includes("app")
  ) {
    const parts: string[] = [];
    const isApp = lower.includes("app");
    const hasTorch = lower.includes("torch");
    const hasSbs = lower.includes("sbs");
    const isHeatWelded =
      lower.includes("heat-welded") || lower.includes("heat welded");
    const isSelfAdhered =
      lower.includes("self-adhered") ||
      lower.includes("self adhered") ||
      lower.includes("cold applied") ||
      lower.includes("cold-applied");

    parts.push("Modified Bitumen");
    if (hasTorch || isApp) parts.push("APP");
    else if (hasSbs) parts.push("SBS");

    if (hasTorch) parts.push("torch-applied");
    else if (isSelfAdhered) parts.push("self-adhered");
    else if (isHeatWelded) parts.push("heat-welded");

    return parts.join(" ");
  }

  // Roof coatings: silicone / acrylic / spf / butyl / aluminum fibrated
  if (
    lower.includes("coating") ||
    lower.includes("silicone") ||
    lower.includes("acrylic") ||
    lower.includes("spf") ||
    lower.includes("spray foam") ||
    lower.includes("butyl") ||
    lower.includes("aluminum")
  ) {
    const parts: string[] = ["Coating"];
    if (lower.includes("silicone")) parts.push("silicone");
    else if (lower.includes("acrylic")) parts.push("acrylic");
    else if (lower.includes("spf") || lower.includes("spray foam"))
      parts.push("spf");
    else if (lower.includes("butyl")) parts.push("butyl");
    else if (lower.includes("aluminum")) parts.push("aluminum");

    if (lower.includes("3-coat") || lower.includes("3 coat"))
      parts.push("3-coat");
    return parts.join(" ");
  }

  // Composition shingle: 3-tab (from your "3-Tab Comp Shingle" sheet)
  if (
    lower.includes("3-tab") ||
    lower.includes("3 tab") ||
    (lower.includes("comp") && lower.includes("shingle"))
  ) {
    return "3-Tab 25yr Comp. Shingle";
  }

  const candidates = ["Shingle", "Metal", "Tile", "Asphalt", "Flat"];
  const found = candidates.find((c) => lower.includes(c.toLowerCase()));
  return found;
}

function tryExtractNumberFromSqFt(text: string): number | undefined {
  // Captures: 1,234 sq ft / 1234 sqft / 1234 square feet
  const m = text.match(
    /(\d{1,3}(?:,\d{3})+|\d+)\s*(?:sq\s*ft|sqft|square\s*feet)\b/i,
  );
  if (!m) return undefined;
  const raw = m[1].replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function tryExtractPerimeterFt(text: string): number | undefined {
  const m = text.match(
    /(\d{1,3}(?:,\d{3})+|\d+)\s*(?:ft|feet)\b.*\b(perimeter)\b/i,
  );
  if (!m) return undefined;
  const raw = m[1].replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function clampNonNegativeInt(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function tryExtractQtyByKeywords(
  text: string,
  keywords: string[],
  units: string[],
): number | undefined {
  const lower = text.toLowerCase();
  const unitPattern = units
    .map((u) => u.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
    .join("|");

  for (const keyword of keywords) {
    const key = keyword.toLowerCase();
    const escapedKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    if (!lower.includes(key)) continue;

    // Pattern A: "... keyword ... 2 EA"
    const a = new RegExp(
      `${escapedKey}[\\s\\S]{0,120}?(\\d{1,4}(?:\\.\\d+)?)\\s*(?:${unitPattern})\\b`,
      "i",
    ).exec(text);
    if (a?.[1]) {
      return clampNonNegativeInt(Number(a[1]));
    }

    // Pattern B: "2 EA ... keyword ..."
    const b = new RegExp(
      `(\\d{1,4}(?:\\.\\d+)?)\\s*(?:${unitPattern})\\b[\\s\\S]{0,120}?${escapedKey}`,
      "i",
    ).exec(text);
    if (b?.[1]) {
      return clampNonNegativeInt(Number(b[1]));
    }

    // Pattern C: "... keyword ... qty: 2"
    const c = new RegExp(
      `${escapedKey}[\\s\\S]{0,120}?qty\\s*[:=]?\\s*(\\d{1,4}(?:\\.\\d+)?)`,
      "i",
    ).exec(text);
    if (c?.[1]) {
      return clampNonNegativeInt(Number(c[1]));
    }
  }

  return undefined;
}

function tryExtractCurrency(text: string): number | undefined {
  const m = text.match(/\$ ?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
  if (!m?.[1]) return undefined;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function tryExtractPropertyAddress(text: string): string | undefined {
  const m = text.match(
    /property\s+address\s+([a-z0-9 ,.\-#]{6,120}?)(?:parcel\s*id|roof\s*system|total\s*area|line\s*items|measurement\s*source|total\s*estimate)/i,
  );
  if (!m?.[1]) return undefined;
  return normalizeWhitespace(m[1]).toUpperCase();
}

function tryExtractRoofSquares(text: string): number | undefined {
  const m = text.match(/(\d+(?:\.\d+)?)\s*(?:sq|squares)\b/i);
  if (!m?.[1]) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

function tryExtractWastePct(text: string): number | undefined {
  const m =
    text.match(/waste(?:\s*factor)?\s*\(?\s*(\d{1,2}(?:\.\d+)?)\s*%/i) ??
    text.match(/(\d{1,2}(?:\.\d+)?)\s*%\s*(?:with\s*waste|waste)/i);
  if (!m?.[1]) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

function tryExtractPitch(text: string): string | undefined {
  const m =
    text.match(/pitch\s*(\d{1,2}\s*\/\s*\d{1,2})/i) ??
    text.match(/(\d{1,2}\s*\/\s*\d{1,2})\s*pitch/i);
  if (!m?.[1]) return undefined;
  return m[1].replace(/\s+/g, "");
}

function tryExtractStories(text: string): number | undefined {
  const m = text.match(/stories?\s*(\d{1,2})/i);
  if (!m?.[1]) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

function tryExtractLineItemsCount(text: string): number | undefined {
  const m =
    text.match(/line\s*items\s*(\d{1,3})/i) ??
    text.match(/(\d{1,3})\s*xactimate\s*line\s*items/i);
  if (!m?.[1]) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

function tryExtractMeasurementSource(text: string): string | undefined {
  const m = text.match(
    /measurement\s*source\s*[:\-]?\s*([a-z0-9 (),.%\-]{6,140}?)(?:total\s*estimate|line\s*items|roof\s*diagrams|weather\s*data|building\s*codes)/i,
  );
  if (!m?.[1]) return undefined;
  return normalizeWhitespace(m[1]);
}

function tryExtractDamageTypes(text: string): DamageType[] | undefined {
  const lower = text.toLowerCase();
  const out: DamageType[] = [];

  if (lower.includes("hail")) out.push("Hail");
  if (lower.includes("wind")) out.push("Wind");
  if (lower.includes("missing shingle") || lower.includes("missing shingles"))
    out.push("Missing Shingles");
  if (lower.includes("leak") || lower.includes("water intrusion"))
    out.push("Leaks");
  if (lower.includes("flashing")) out.push("Flashing");
  if (lower.includes("structural") || lower.includes("decking damage"))
    out.push("Structural");

  return out.length ? out : undefined;
}

function tryExtractSeverity(text: string): Severity | undefined {
  const lower = text.toLowerCase();
  if (/\b(severe|extensive|major|total loss)\b/.test(lower)) return 5;
  if (/\b(high|heavy|significant)\b/.test(lower)) return 4;
  if (/\b(moderate|medium)\b/.test(lower)) return 3;
  if (/\b(light|minor)\b/.test(lower)) return 2;
  if (/\b(cosmetic|minimal)\b/.test(lower)) return 1;
  return undefined;
}

function recommendActionFromText(text: string): RecommendedAction | undefined {
  const lower = text.toLowerCase();
  if (/\b(replace|replacement|r&r|full tear[- ]?off)\b/.test(lower))
    return "Replace";
  if (/\b(repair|patch|seal)\b/.test(lower)) return "Repair";
  if (/\b(insurance|claim)\b/.test(lower)) return "Insurance Claim Help";
  if (/\b(further inspection|re-inspect|engineering review)\b/.test(lower))
    return "Further Inspection";
  return undefined;
}

function tryExtractBuildingCodeFromPdf(
  text: string,
): BuildingCodeInfo | undefined {
  const jurisdictionMatch = text.match(
    /jurisdiction\s*[:\-]?\s*([a-z0-9 ,/.\-]{6,120}?)(?:building\s*code|permit\s*cost|irc\/ibc)/i,
  );
  const codeRefMatch = text.match(
    /building\s*code\s*[:\-]?\s*([a-z0-9 /.\-]{4,60})/i,
  );

  const codeMatches = Array.from(
    new Set(
      (
        text.match(/\b(?:IRC|IBC)\s*[A-Z]?\d{3,4}(?:\.\d+(?:\.\d+)?)?/gi) ?? []
      ).map((x) => x.toUpperCase()),
    ),
  );
  if (!jurisdictionMatch && !codeRefMatch && !codeMatches.length)
    return undefined;

  return {
    jurisdiction: jurisdictionMatch?.[1]
      ? normalizeWhitespace(jurisdictionMatch[1])
      : undefined,
    codeReference: codeRefMatch?.[1]
      ? normalizeWhitespace(codeRefMatch[1])
      : "IRC/IBC references from imported PDF",
    checks: codeMatches.slice(0, 8).map((code) => ({
      id: `pdf_code_${code.replace(/[^A-Z0-9]/g, "_")}`,
      label: code,
      details: "Imported from CompanyCam/PDF reference.",
    })),
  };
}

function parseInspectionDateYmd(text: string): string | undefined {
  // Example seen in PDF: "Mar 17, 2026"
  const m = text.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),\s+(\d{4})\b/i,
  );
  if (!m) return undefined;

  const monthStr = m[1].toLowerCase().slice(0, 3);
  const day = Number(m[2]);
  const year = Number(m[3]);

  const monthMap: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };

  const month = monthMap[monthStr];
  if (!month || !Number.isFinite(day) || !Number.isFinite(year))
    return undefined;

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function tryExtractProjectName(text: string): string | undefined {
  // Example seen: "Cover Page ... Kaydrie Groenke" and "Project: Kaydrie Groenke"
  const m = text.match(/\bProject:\s*([^\n\r]+?)\s*(?:Date:|Creator:|$)/i);
  if (m?.[1]) return normalizeWhitespace(m[1]);

  const m2 = text.match(/Cover Page.*?\b-\s*([^\n\r]+?)\s*(?:\||\n|$)/i);
  return m2?.[1] ? normalizeWhitespace(m2[1]) : undefined;
}

function extractCompanyCamFieldsFromText(
  text: string,
): CompanyCamPdfExtraction {
  const normalized = normalizeWhitespace(text);

  const roofAreaSqFt = tryExtractNumberFromSqFt(normalized);
  const roofPerimeterFt = tryExtractPerimeterFt(normalized);
  const roofSquares = tryExtractRoofSquares(normalized);
  const wasteFactorPct = tryExtractWastePct(normalized);
  const pitch = tryExtractPitch(normalized);
  const stories = tryExtractStories(normalized);
  const lineItemsCount = tryExtractLineItemsCount(normalized);
  const totalEstimateUsd = tryExtractCurrency(normalized);
  const propertyAddress = tryExtractPropertyAddress(normalized);
  const measurementSource = tryExtractMeasurementSource(normalized);
  const damageTypes = tryExtractDamageTypes(normalized);
  const severity = tryExtractSeverity(normalized);
  const recommendedAction = recommendActionFromText(normalized);
  const buildingCodeFromPdf = tryExtractBuildingCodeFromPdf(normalized);

  const hvacUnits = tryExtractQtyByKeywords(
    normalized,
    [
      "r&r ac unit",
      "through-wall",
      "through wall",
      "window - 8,000 btu",
      "window - 8000 btu",
      "ac unit with sleeve",
    ],
    ["ea", "each"],
  );
  const finCombUnits = tryExtractQtyByKeywords(
    normalized,
    [
      "comb and straighten",
      "condenser fins",
      "fin comb",
      "straighten a/c condenser fins",
    ],
    ["ea", "each"],
  );
  const fenceCleanSqFt = tryExtractQtyByKeywords(
    normalized,
    ["clean with pressure", "chemical spray", "pressure / chemical spray"],
    ["sf", "sqft", "sq ft"],
  );
  const fenceStainSqFt = tryExtractQtyByKeywords(
    normalized,
    [
      "stain – wood fence",
      "stain - wood fence",
      "stain wood fence",
      "wood fence / gate",
    ],
    ["sf", "sqft", "sq ft"],
  );
  const windowWrapSmallQty = tryExtractQtyByKeywords(
    normalized,
    [
      "wrap wood window frame",
      "window frame & trim with aluminum – small",
      "window frame and trim small",
      "window trim small",
    ],
    ["ea", "each"],
  );
  const windowWrapStandardQty = tryExtractQtyByKeywords(
    normalized,
    [
      "window frame & trim with aluminum – standard",
      "window frame and trim standard",
      "window trim standard",
      "wrap wood window frame standard",
    ],
    ["ea", "each"],
  );
  const houseWrapSqFt = tryExtractQtyByKeywords(
    normalized,
    ["house wrap", "air/moisture barrier", "air moisture barrier"],
    ["sf", "sqft", "sq ft"],
  );
  const fanfoldSqFt = tryExtractQtyByKeywords(
    normalized,
    ["fanfold foam insulation board", "fanfold foam"],
    ["sf", "sqft", "sq ft"],
  );

  const extraNotes: string[] = [];
  if (roofSquares) extraNotes.push(`Roof Squares: ${roofSquares}`);
  if (wasteFactorPct) extraNotes.push(`Waste Factor: ${wasteFactorPct}%`);
  if (pitch) extraNotes.push(`Pitch: ${pitch}`);
  if (stories) extraNotes.push(`Stories: ${stories}`);
  if (lineItemsCount) extraNotes.push(`Line Items: ${lineItemsCount}`);
  if (typeof totalEstimateUsd === "number")
    extraNotes.push(
      `PDF Total Estimate: $${totalEstimateUsd.toLocaleString()}`,
    );
  if (measurementSource)
    extraNotes.push(`Measurement Source: ${measurementSource}`);
  if (propertyAddress)
    extraNotes.push(`PDF Property Address: ${propertyAddress}`);

  return {
    homeownerName: tryExtractProjectName(normalized),
    email: tryExtractEmail(normalized),
    phone: tryExtractPhone(normalized),
    roofType: tryExtractRoofType(normalized),
    roofAreaSqFt,
    roofPerimeterFt,
    hvacUnits,
    finCombUnits,
    fenceCleanSqFt,
    fenceStainSqFt,
    windowWrapSmallQty,
    windowWrapStandardQty,
    houseWrapSqFt,
    fanfoldSqFt,
    roofSquares,
    wasteFactorPct,
    pitch,
    stories,
    lineItemsCount,
    totalEstimateUsd,
    propertyAddress,
    measurementSource,
    damageTypes,
    severity,
    recommendedAction,
    notes: extraNotes.length ? extraNotes.join(" | ") : undefined,
    buildingCodeFromPdf,
    inspectionDateYmd: parseInspectionDateYmd(normalized),
  };
}

export async function extractCompanyCamDataFromPdfFile(
  file: File,
  onProgress?: (p: {
    page: number;
    totalPages: number;
    status?: string;
  }) => void,
): Promise<CompanyCamPdfExtraction> {
  if (typeof document === "undefined") {
    throw new Error(
      "CompanyCam PDF import is only supported in the web build.",
    );
  }

  // Dynamic imports so native builds won't break.
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const tesseract = await import("tesseract.js");

  // Use a matching worker from the same pdfjs-dist package version.
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://unpkg.com/pdfjs-dist@5.5.207/build/pdf.worker.min.js";
  } catch {
    // If the workerSrc assignment fails, PDF rendering may still work in some environments.
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const totalPages = pdf.numPages || 0;
  if (!totalPages) {
    throw new Error("Could not read PDF pages.");
  }

  // Create a single worker for OCR across pages (much faster than recreating).
  const worker = await tesseract.createWorker("eng");

  let aggregatedText = "";
  let extracted: CompanyCamPdfExtraction | null = null;

  // Rendering scale: higher = more accurate OCR, lower = faster.
  const scale = 2.0;

  try {
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.({ page: pageNum, totalPages, status: "rendering" });

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas context unavailable.");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport, canvas }).promise;

      onProgress?.({ page: pageNum, totalPages, status: "ocr" });

      const result = await worker.recognize(canvas);
      const pageText = result?.data?.text ?? "";
      aggregatedText += `\n\n${pageText}`;

      // Try early extraction to allow faster completion.
      extracted = extractCompanyCamFieldsFromText(aggregatedText);
      const hasCore =
        !!extracted.homeownerName &&
        (!!extracted.email || !!extracted.phone) &&
        !!extracted.roofType &&
        !!extracted.roofAreaSqFt;

      if (hasCore) {
        // We can stop early; building codes per-checks are not reliably extracted yet.
        // Users can still edit remaining fields manually.
        break;
      }
    }

    return extracted ?? extractCompanyCamFieldsFromText(aggregatedText);
  } finally {
    await worker.terminate();
  }
}
