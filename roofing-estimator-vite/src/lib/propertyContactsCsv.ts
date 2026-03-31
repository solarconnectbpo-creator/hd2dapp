/**
 * Parse contact / property CSV exports (BatchData, spreadsheets, etc.) into PropertyImportPayload rows.
 * No API keys — runs entirely in the browser.
 */

import Papa from "papaparse";
import {
  emptyPropertyImportPayload,
  inferStateCodeFromAddressLine,
  mapPropertyType,
  type PropertyImportPayload,
} from "./propertyScraper";

function normHeader(h: string): string {
  return h.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function rowToNormMap(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    out[normHeader(String(k))] = String(v ?? "").trim();
  }
  return out;
}

function pick(norm: Record<string, string>, candidates: string[]): string {
  for (const c of candidates) {
    const v = norm[normHeader(c)];
    if (v) return v;
  }
  return "";
}

const ADDR = [
  "address",
  "property_address",
  "street",
  "street address",
  "property address",
  "formatted address",
  "formattedaddress",
  "location",
  "site address",
  "mailing address",
  "full address",
];

const OWNER = [
  "owner",
  "owner name",
  "owner_name",
  "owner_name_tax_deed",
  "contact name",
  "contact",
  "company",
  "company name",
  "taxpayer",
  "taxpayer name",
  "name",
  "contact_name_lookup",
  "rep name",
  "deed owner",
];

const SOS_AGENT = ["sos registered agent", "registered agent", "registered_agent", "sos agent"];
const BROKERAGE = [
  "brokerage",
  "real estate company",
  "real_estate_company",
  "listing broker",
  "broker company",
  "contact_company_lookup",
];
const REP = ["agent name", "listing agent", "broker rep"];

const CONTACT_PERSON = [
  "contact_person_name",
  "contact person",
  "contact person name",
  "decision maker",
  "individual contact",
  "personal contact",
  "contact owner name",
];

const CONTACT_PHONE = [
  "contact_person_phone",
  "contact phone",
  "direct phone",
  "direct line",
  "personal phone",
  "contact mobile",
  "mobile",
  "cell",
  "mobile phone",
];

/** Main / office / assessor line — use CONTACT_PHONE for personal or direct mobile columns */
const PHONE = ["phone", "phone number", "phone_number", "tel", "telephone", "owner phone", "main phone", "office phone"];

const EMAIL = ["email", "e-mail", "email address", "owner email", "contact email"];

const STATE = ["state", "st", "state code", "state_code"];

const MAIL = ["owner_mailing_address", "mailing address", "owner mailing", "mailing", "mail address"];

const CITY = ["city"];

const ZIP = ["zip", "zip code", "zipcode", "postal", "postal code"];

const LAT = ["latitude", "lat"];
const LNG = ["longitude", "lng", "lon", "long"];

const SQFT = ["square feet", "sqft", "square footage", "living area", "building sf", "building_sqft"];
const LOT = ["lot size", "lot sf", "lot square feet"];
const YEAR = ["year built", "year"];
const ENTITY = ["entity type", "entity", "owner type", "owner entity"];

/** One CSV data row → payload, or skip (no address). */
export function propertyRowFromCsvRecord(raw: Record<string, unknown>): PropertyImportPayload | null {
  if (!Object.values(raw).some((v) => String(v ?? "").trim())) return null;

  const n = rowToNormMap(raw);
  let address = pick(n, ADDR);
  if (!address) {
    const line = pick(n, ["line1", "address line 1", "street line 1"]);
    const city = pick(n, CITY);
    const st = pick(n, STATE);
    const zip = pick(n, ZIP);
    address = [line, city, st, zip].filter(Boolean).join(", ").trim();
  }
  if (!address) return null;

  const stateCode = pick(n, STATE) || inferStateCodeFromAddressLine(address);
  let ownerName = pick(n, OWNER);
  const companyCol = pick(n, ["company name", "company", "contact_company_lookup"]);
  const personCol = pick(n, ["contact name", "contact_name_lookup", "rep name", "contact"]);
  if (!ownerName) {
    ownerName = [personCol, companyCol].filter(Boolean).join(" | ");
  } else {
    const o = ownerName.toLowerCase();
    if (personCol && !o.includes(personCol.toLowerCase())) {
      ownerName = `${personCol} | ${ownerName}`;
    }
    if (companyCol && !ownerName.toLowerCase().includes(companyCol.toLowerCase())) {
      ownerName = `${ownerName} | ${companyCol}`;
    }
  }

  const contactPersonName = pick(n, CONTACT_PERSON);
  const contactPersonPhone = pick(n, CONTACT_PHONE);
  const ownerPhone = pick(n, PHONE);
  const ownerEmail = pick(n, EMAIL);
  const ownerMailingAddress = pick(n, ["owner_mailing_address", ...MAIL]);
  const ownerEntityType = pick(n, ["owner_entity_type", ...ENTITY]);

  const sosLine = pick(n, SOS_AGENT);
  const brokerLine = pick(n, BROKERAGE);
  const repLine = pick(n, REP);
  const freeNotes = pick(n, ["notes", "notes_free_sources", "research notes", "notes_source"]);
  const noteParts = [
    freeNotes,
    sosLine ? `SOS / registered agent: ${sosLine}` : "",
    brokerLine ? `Brokerage: ${brokerLine}` : "",
    repLine ? `Rep: ${repLine}` : "",
  ].filter(Boolean);
  const mergedNotes = noteParts.join("\n");

  const lat = pick(n, LAT);
  const lng = pick(n, LNG);
  const areaSqFt = pick(n, SQFT);
  const lotSizeSqFt = pick(n, LOT);
  const yearBuilt = pick(n, YEAR);
  const ptRaw = pick(n, ["property type", "type", "use"]);

  return emptyPropertyImportPayload("csv-upload", {
    address,
    stateCode,
    latitude: lat,
    longitude: lng,
    areaSqFt,
    lotSizeSqFt,
    yearBuilt,
    propertyType: ptRaw ? mapPropertyType(ptRaw) : "other",
    ownerName,
    ownerPhone,
    ownerEmail,
    contactPersonName,
    contactPersonPhone,
    ownerEntityType,
    ownerMailingAddress,
    notes: mergedNotes,
  });
}

/**
 * Parse CSV text into property/contact rows. Requires a recognizable address column per row.
 * For very large files (50k+ rows), prefer {@link parsePropertyContactsCsvAsync} so the UI stays responsive.
 */
export function parsePropertyContactsCsv(
  fileText: string,
): { ok: true; rows: PropertyImportPayload[] } | { ok: false; message: string } {
  const parsed = Papa.parse<Record<string, unknown>>(fileText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
  });

  const fatal = parsed.errors.find((e) => e.type === "Quotes" || e.type === "Delimiter");
  if (fatal) {
    return { ok: false, message: `CSV parse error: ${fatal.message} (row ${fatal.row ?? "?"})` };
  }

  const data = parsed.data.filter((r) => Object.values(r).some((v) => String(v ?? "").trim()));
  if (!data.length) {
    return { ok: false, message: "CSV has no data rows. Use a header row plus at least one contact row." };
  }

  const rows: PropertyImportPayload[] = [];
  for (const raw of data) {
    const row = propertyRowFromCsvRecord(raw);
    if (row) rows.push(row);
  }

  if (!rows.length) {
    return {
      ok: false,
      message:
        "No importable rows. Add a column such as Address, Street, Property Address, or line1+city+state.",
    };
  }

  return { ok: true, rows };
}

export type PropertyCsvParseProgress = {
  /** Rows converted to payloads so far (parsing) or total before ranking (ranking). */
  rows: number;
  phase: "parsing" | "ranking";
};

/**
 * Streaming parse with periodic `parser.pause()` so the main thread can paint progress UI.
 * Suitable for 100k+ row files (still loads full file text into memory once).
 */
export function parsePropertyContactsCsvAsync(
  fileText: string,
  options?: {
    /** Pause parser every N data rows (default 2500). */
    yieldEvery?: number;
    onProgress?: (parsedRows: number) => void;
  },
): Promise<{ ok: true; rows: PropertyImportPayload[] } | { ok: false; message: string }> {
  const yieldEvery = options?.yieldEvery ?? 2500;

  return new Promise((resolve) => {
    const rows: PropertyImportPayload[] = [];
    let aborted = false;

    Papa.parse<Record<string, unknown>>(fileText, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
      step: (results, parser) => {
        if (aborted) return;
        for (const err of results.errors ?? []) {
          if (err.type === "Quotes" || err.type === "Delimiter") {
            aborted = true;
            parser.abort();
            resolve({ ok: false, message: `CSV parse error: ${err.message} (row ${err.row ?? "?"})` });
            return;
          }
        }

        const raw = results.data;
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;

        const row = propertyRowFromCsvRecord(raw as Record<string, unknown>);
        if (row) rows.push(row);

        if (yieldEvery > 0 && rows.length % yieldEvery === 0) {
          parser.pause();
          options?.onProgress?.(rows.length);
          globalThis.setTimeout(() => parser.resume(), 0);
        }
      },
      complete: () => {
        if (aborted) return;
        if (!rows.length) {
          resolve({
            ok: false,
            message:
              "No importable rows. Add a column such as Address, Street, Property Address, or line1+city+state.",
          });
          return;
        }
        resolve({ ok: true, rows });
      },
      error: (err: Error) => {
        resolve({ ok: false, message: err.message || "CSV parse failed." });
      },
    });
  });
}
