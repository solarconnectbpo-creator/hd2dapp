/**
 * Optional phone enrichment for property records using Google Places API (Text Search).
 * Uses official API + Vite dev proxy — not listing-site scraping.
 * Enable "Places API (New)" in Google Cloud and billing as required by Google.
 */

import { isLikelyPropertyManagerOrCommercialOwner, type PropertyImportPayload } from "./propertyScraper";
import { isViteDevProxyOrigin } from "./viteApiProxy";

export const PROPERTY_SCRAPER_GOOGLE_PLACES_KEY_STORAGE = "roofing-estimator-vite-google-places-key";

function placesBaseUrl(): string {
  return isViteDevProxyOrigin() ? "/google-places-api" : "https://places.googleapis.com";
}

/** Best-effort city segment from "Street, City, ST ZIP". */
export function extractCityFromPropertyAddress(address: string): string {
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 2] ?? "";
  if (parts.length === 2) return parts[0] ?? "";
  return "";
}

export function buildPlacesTextQuery(p: PropertyImportPayload): string | null {
  const primaryName = p.ownerName.split("|")[0]?.trim() ?? "";
  if (!primaryName) return null;
  const city = extractCityFromPropertyAddress(p.address);
  const st = p.stateCode.trim().toUpperCase().slice(0, 2);
  const bits = [primaryName, city, st].filter(Boolean);
  return bits.length >= 2 ? bits.join(" ") : bits.join(" ");
}

export type EnrichOptions = {
  /** Only rows that look like org / PM / LLC (default true). */
  businessLikeOnly?: boolean;
  /** Skip if ownerPhone already has digits. */
  skipIfPhonePresent?: boolean;
};

function hasDigitPhone(s: string): boolean {
  return /\d{3}/.test(s.replace(/\D/g, ""));
}

function shouldTryEnrich(p: PropertyImportPayload, opts: EnrichOptions): boolean {
  if (opts.skipIfPhonePresent !== false && hasDigitPhone(p.ownerPhone)) return false;
  if (opts.businessLikeOnly === false) return true;
  const org = p.ownerEntityType.trim().toLowerCase() === "organization";
  return org || isLikelyPropertyManagerOrCommercialOwner(p.ownerName, p.ownerEntityType);
}

type PlacesSearchResponse = {
  places?: Array<{
    displayName?: { text?: string };
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    formattedAddress?: string;
  }>;
};

export async function fetchBusinessPhoneFromPlaces(
  textQuery: string,
  apiKey: string,
): Promise<{ ok: true; phone: string; placeName?: string } | { ok: false; message: string }> {
  const key = apiKey.trim();
  if (!key) return { ok: false, message: "Add a Google Places API key." };
  if (!textQuery.trim()) return { ok: false, message: "No search text (owner name + location)." };

  const url = `${placesBaseUrl()}/v1/places:searchText`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.formattedAddress",
      },
      body: JSON.stringify({
        textQuery: textQuery.trim(),
        includedRegionCodes: ["us"],
        maxResultCount: 3,
      }),
    });
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof Error
          ? `${e.message} — use npm run dev so Places requests use the Vite proxy (CORS).`
          : "Network error calling Google Places.",
    };
  }

  const raw = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      message: `Google Places ${res.status}: ${raw.slice(0, 280)}`,
    };
  }

  let data: PlacesSearchResponse;
  try {
    data = JSON.parse(raw) as PlacesSearchResponse;
  } catch {
    return { ok: false, message: "Invalid JSON from Google Places." };
  }

  const places = data.places ?? [];
  for (const pl of places) {
    const phone = String(pl.nationalPhoneNumber ?? pl.internationalPhoneNumber ?? "").trim();
    if (phone) {
      return {
        ok: true,
        phone,
        placeName: pl.displayName?.text?.trim(),
      };
    }
  }

  return { ok: false, message: "No phone on the first Places results for that query." };
}

function mergePhone(existing: string, found: string, placeName?: string): string {
  const note = placeName ? `Google Places (${placeName})` : "Google Places";
  if (!existing.trim()) return `${found} [${note}]`;
  if (existing.includes(found)) return existing;
  return `${existing} | ${found} [${note}]`;
}

function mergeNotes(existing: string, line: string): string {
  if (existing.includes(line)) return existing;
  return existing ? `${existing}\n${line}` : line;
}

/**
 * Enrich one record; returns a shallow copy with ownerPhone / notes updated when a match is found.
 */
export async function enrichPropertyRecordWithPlaces(
  p: PropertyImportPayload,
  placesApiKey: string,
  opts: EnrichOptions = {},
): Promise<PropertyImportPayload> {
  if (!shouldTryEnrich(p, opts)) return p;
  const q = buildPlacesTextQuery(p);
  if (!q) return p;

  const r = await fetchBusinessPhoneFromPlaces(q, placesApiKey);
  if (!r.ok) return p;

  return {
    ...p,
    ownerPhone: mergePhone(p.ownerPhone, r.phone, r.placeName),
    notes: mergeNotes(
      p.notes,
      `Places-enriched phone for query "${q}": ${r.phone}${r.placeName ? ` (${r.placeName})` : ""}.`,
    ),
  };
}

export type BatchEnrichResult = {
  results: PropertyImportPayload[];
  filled: number;
  skipped: number;
  failed: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sequentially enriches up to `limit` rows (rate-friendly). Each attempt waits `delayMs` after the request.
 */
export async function enrichPropertyRecordsWithPlaces(
  rows: PropertyImportPayload[],
  placesApiKey: string,
  options: EnrichOptions & { limit?: number; delayMs?: number } = {},
): Promise<BatchEnrichResult> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));
  const delayMs = Math.max(100, options.delayMs ?? 280);
  const out = [...rows];
  let filled = 0;
  let skipped = 0;
  let failed = 0;
  let attempts = 0;

  for (let i = 0; i < out.length && attempts < limit; i++) {
    const row = out[i]!;
    if (!shouldTryEnrich(row, options)) {
      skipped++;
      continue;
    }
    const q = buildPlacesTextQuery(row);
    if (!q) {
      skipped++;
      continue;
    }

    attempts++;
    const r = await fetchBusinessPhoneFromPlaces(q, placesApiKey);
    await sleep(delayMs);

    if (!r.ok) {
      failed++;
      continue;
    }

    out[i] = {
      ...row,
      ownerPhone: mergePhone(row.ownerPhone, r.phone, r.placeName),
      notes: mergeNotes(
        row.notes,
        `Places-enriched phone for query "${q}": ${r.phone}${r.placeName ? ` (${r.placeName})` : ""}.`,
      ),
    };
    filled++;
  }

  return { results: out, filled, skipped, failed };
}
