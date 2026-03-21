import Papa from "papaparse";

import type { PropertySelection } from "./roofReportTypes";

type ParsedCsvResult = {
  leads: PropertySelection[];
  warnings: string[];
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/\s+/g, "");
}

function pickFirstHeaderKey(
  headers: Record<string, unknown>,
  candidates: string[],
): string | null {
  const keys = Object.keys(headers);
  const normKeys = keys.map((k) => ({ raw: k, norm: normalizeHeader(k) }));
  for (const c of candidates) {
    const found = normKeys.find((k) => k.norm === normalizeHeader(c));
    if (found) return found.raw;
  }
  return null;
}

function pickCombinedName(
  row: Record<string, unknown>,
  firstNameKey: string | null,
  lastNameKey: string | null,
): string {
  const first =
    firstNameKey && row[firstNameKey] != null
      ? String(row[firstNameKey]).trim()
      : "";
  const last =
    lastNameKey && row[lastNameKey] != null
      ? String(row[lastNameKey]).trim()
      : "";
  return [first, last].filter(Boolean).join(" ").trim();
}

export function parsePropertyLeadsCsvText(csvText: string): ParsedCsvResult {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data as Record<string, unknown>[];
  const warnings: string[] = [];

  if (!rows.length) {
    return { leads: [], warnings: ["CSV appears empty."] };
  }

  const first = rows[0] || {};

  const latKey = pickFirstHeaderKey(first, ["lat", "latitude", "y"]);
  const lngKey = pickFirstHeaderKey(first, ["lng", "lon", "longitude", "x"]);
  const addressKey = pickFirstHeaderKey(first, [
    "address",
    "addr",
    "property",
    "fulladdress",
    "streetaddress",
  ]);
  const idKey = pickFirstHeaderKey(first, ["id", "lead_id", "property_id"]);

  const nameKey = pickFirstHeaderKey(first, [
    "name",
    "homeowner",
    "owner",
    "ownername",
    "owner_name",
    "contactname",
    "contact_name",
    "full_name",
    "full name",
    "customer",
    "customername",
    "customer_name",
  ]);
  const firstNameKey = pickFirstHeaderKey(first, [
    "firstname",
    "first_name",
    "first name",
    "fname",
    "ownerfirst",
    "owner_first",
  ]);
  const lastNameKey = pickFirstHeaderKey(first, [
    "lastname",
    "last_name",
    "last name",
    "lname",
    "ownerlast",
    "owner_last",
  ]);
  const emailKey = pickFirstHeaderKey(first, [
    "email",
    "e-mail",
    "contactemail",
    "contact_email",
    "owneremail",
    "owner_email",
    "customeremail",
    "customer_email",
  ]);
  const phoneKey = pickFirstHeaderKey(first, [
    "phone",
    "mobile",
    "cell",
    "cellphone",
    "cell_phone",
    "tel",
    "telephone",
    "contactphone",
    "contact_phone",
    "ownerphone",
    "owner_phone",
    "customerphone",
    "customer_phone",
  ]);
  const roofSqFtKey = pickFirstHeaderKey(first, [
    "roof_sqft",
    "roofarea_sqft",
    "roofarea",
    "roof_area",
    "roofsize",
    "roof_sqft_size",
    "roof sq ft",
  ]);
  const roofTypeKey = pickFirstHeaderKey(first, [
    "roof_type",
    "roofmaterial",
    "roof_material",
    "material",
  ]);
  const companyKey = pickFirstHeaderKey(first, [
    "company",
    "companyname",
    "company_name",
    "business",
    "businessname",
    "business_name",
    "organization",
    "org",
    "contractor",
    "account",
  ]);

  if (!latKey || !lngKey) {
    return {
      leads: [],
      warnings: [
        "CSV must include columns for latitude and longitude. Expected headers like `lat/lng` or `latitude/longitude`.",
      ],
    };
  }

  const nowIso = new Date().toISOString();

  const leads: PropertySelection[] = [];
  rows.forEach((row, idx) => {
    const latRaw = row[latKey];
    const lngRaw = row[lngKey];

    const lat =
      typeof latRaw === "number" ? latRaw : parseFloat(String(latRaw ?? ""));
    const lng =
      typeof lngRaw === "number" ? lngRaw : parseFloat(String(lngRaw ?? ""));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      warnings.push(`Row ${idx + 2}: invalid lat/lng values, skipped.`);
      return;
    }

    const addressFromCsv =
      addressKey && row[addressKey] != null ? String(row[addressKey]) : "";

    const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    const homeownerNameDirect =
      nameKey && row[nameKey] != null ? String(row[nameKey]).trim() : "";
    const homeownerNameCombined = pickCombinedName(
      row,
      firstNameKey,
      lastNameKey,
    );
    const homeownerName = homeownerNameDirect || homeownerNameCombined;
    const email =
      emailKey && row[emailKey] != null ? String(row[emailKey]).trim() : "";
    const phone =
      phoneKey && row[phoneKey] != null ? String(row[phoneKey]).trim() : "";

    const roofSqFt =
      roofSqFtKey && row[roofSqFtKey] != null
        ? parseFloat(String(row[roofSqFtKey] ?? "").replace(/,/g, ""))
        : undefined;

    const normalizedRoofSqFt =
      typeof roofSqFt === "number" && Number.isFinite(roofSqFt)
        ? roofSqFt
        : undefined;

    const roofType =
      roofTypeKey && row[roofTypeKey] != null
        ? String(row[roofTypeKey]).trim()
        : "";

    const companyName =
      companyKey && row[companyKey] != null
        ? String(row[companyKey]).trim()
        : "";

    leads.push({
      id: idKey && row[idKey] != null ? String(row[idKey]) : undefined,
      address: addressFromCsv.trim() ? addressFromCsv.trim() : fallbackAddress,
      lat,
      lng,
      clickedAtIso: nowIso,
      homeownerName: homeownerName || undefined,
      companyName: companyName || undefined,
      email: email || undefined,
      phone: phone || undefined,
      roofSqFt: normalizedRoofSqFt,
      roofType: roofType || undefined,
    } as any);
  });

  if (leads.length === 0) {
    warnings.push("No valid rows found (all rows were skipped).");
  }

  return { leads, warnings };
}
