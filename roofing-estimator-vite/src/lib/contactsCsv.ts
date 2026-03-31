export interface ContactRecord {
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
  /** Plan area (SF) when provided in CSV — used to prefill / auto-run estimates */
  areaSqFt?: string;
  measuredSquares?: string;
  roofType?: string;
  roofPitch?: string;
  perimeterFt?: string;
  wastePercent?: string;
  notes?: string;
}

export function splitCsvLine(line: string): string[] {
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

export function parseContactsCsv(text: string): ContactRecord[] {
  const lines = text
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0] ?? "").map((h) => h.toLowerCase());
  const results: ContactRecord[] = [];
  const batchId = Date.now();
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
    const areaSqFt = valByHeader(row, headers, ["area_sqft", "plan_area_sqft", "areasqft", "footprint_sqft"]);
    const measuredSquares = valByHeader(row, headers, ["measured_squares", "squares", "roof_squares"]);
    const roofType = valByHeader(row, headers, ["roof_type", "rooftype", "material"]);
    const roofPitch = valByHeader(row, headers, ["roof_pitch", "pitch"]);
    const perimeterFt = valByHeader(row, headers, ["perimeter_ft", "perimeter", "roof_perimeter_ft"]);
    const wastePercent = valByHeader(row, headers, ["waste_percent", "waste", "waste_pct"]);
    const notes = valByHeader(row, headers, ["notes", "note", "comments"]);

    results.push({
      id: `contact_${batchId}_${i}`,
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
      ...(areaSqFt ? { areaSqFt } : {}),
      ...(measuredSquares ? { measuredSquares } : {}),
      ...(roofType ? { roofType } : {}),
      ...(roofPitch ? { roofPitch } : {}),
      ...(perimeterFt ? { perimeterFt } : {}),
      ...(wastePercent ? { wastePercent } : {}),
      ...(notes ? { notes } : {}),
    });
  }
  return results.filter((x) => x.name || x.address || x.email || x.phone);
}

export const CONTACTS_CSV_TEMPLATE_HEADERS = [
  "name",
  "company",
  "email",
  "phone",
  "address",
  "city",
  "state",
  "zip",
  "lat",
  "lng",
  "area_sqft",
  "measured_squares",
  "roof_type",
  "roof_pitch",
  "perimeter_ft",
  "waste_percent",
  "notes",
].join(",");
