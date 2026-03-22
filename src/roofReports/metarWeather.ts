/**
 * METAR (aviation surface observation) for storm / weather context near a property.
 *
 * In this Expo app we use the U.S. **Aviation Weather Center** JSON API (decoded fields + raw METAR string).
 * This provides a human-friendly snapshot suitable for “storm / weather context” in the report.
 */

import * as turf from "@turf/turf";
import { Platform } from "react-native";

import type { MetarWeatherSnapshot } from "./roofReportTypes";
import { US_METAR_REFERENCE_STATIONS } from "./metarStationsUs";

const AWC_METAR_URL = "https://aviationweather.gov/api/data/metar";

/** NOAA weather.gov allows browser CORS; AWC often blocks `fetch` from web apps. */
const NOAA_USER_AGENT = "hd2dapp/1.0 (roof reports; https://github.com/)";

function noaaObservationsLatestUrl(icao: string): string {
  return `https://api.weather.gov/stations/${encodeURIComponent(icao)}/observations/latest`;
}

export interface NearestMetarStation {
  icao: string;
  name: string;
  distanceMilesApprox: number;
}

/** Pick nearest reference METAR station to the property (US-centric list). */
export function findNearestMetarStation(
  lat: number,
  lng: number,
): NearestMetarStation | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!US_METAR_REFERENCE_STATIONS.length) return null;

  const from = turf.point([lng, lat]);
  const fc = turf.featureCollection(
    US_METAR_REFERENCE_STATIONS.map((s) =>
      turf.point([s.lng, s.lat], { icao: s.icao, name: s.name }),
    ),
  );
  const nearest = turf.nearestPoint(from, fc);
  const distMi = turf.distance(from, nearest, { units: "miles" });
  return {
    icao: String(nearest.properties.icao),
    name: String(nearest.properties.name ?? ""),
    distanceMilesApprox: Math.round(distMi * 10) / 10,
  };
}

function normalizeIcao(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, "");
}

/** US stations often typed as 3 letters (e.g. DFW) — prepend K when appropriate. */
export function normalizeUsMetarIcaoInput(input: string): string {
  const c = normalizeIcao(input);
  if (!c) return "";
  if (c.length === 4) return c;
  if (c.length === 3 && /^[A-Z]{3}$/.test(c)) return `K${c}`;
  return c;
}

interface AwcMetarRow {
  icaoId?: string;
  rawOb?: string;
  reportTime?: string;
  receiptTime?: string;
  temp?: number;
  dewp?: number;
  wdir?: number | string;
  wspd?: number;
  wgst?: number;
  visib?: string | number;
  altim?: number;
  fltCat?: string;
  cover?: string;
  clouds?: Array<{ cover?: string; base?: number }>;
  name?: string;
  lat?: number;
  lon?: number;
}

function extractStormIndicators(raw: string): string[] {
  const u = raw.toUpperCase();
  const out: string[] = [];
  const add = (s: string) => {
    if (!out.includes(s)) out.push(s);
  };

  if (
    /\bVCTS\b/.test(u) ||
    /\bTSRA\b/.test(u) ||
    /\b-TSRA\b/.test(u) ||
    /\b\+TSRA\b/.test(u)
  ) {
    add("Thunderstorm / TS precipitation in observation");
  }
  if (/\bTSTM\b/.test(u)) add("Thunderstorm (TSTM) in remarks");
  if (/\bLTG\b|LIGHTNING/i.test(raw)) add("Lightning mentioned (remarks)");
  if (/\bGR\b|\bSHGR\b/.test(u)) add("Hail (GR)");
  if (/\bSQ\b/.test(u)) add("Squall (SQ)");
  if (/\bFC\b/.test(u)) add("Funnel cloud (FC)");
  if (/\b\+RA\b/.test(u) || /\bRA\b/.test(u)) add("Rain (RA)");
  if (/\b\+SN\b|\bSN\b|\bBLSN\b/.test(u)) add("Snow / blowing snow");
  if (/\bFZRA\b|\bFZDZ\b|\bPL\b/.test(u)) add("Freezing precip / ice pellets");
  if (/\bDS\b|\bSS\b|\bPO\b/.test(u)) add("Dust / sand / dust devils");
  if (/\bCB\b/.test(u)) add("Cumulonimbus (CB) in sky groups");
  if (/\bWS\d{3}\/\d{3}/.test(u) || /\bLLWS\b/.test(u)) add("Wind shear noted");
  if (/\bVC\s+TS\b/.test(u)) add("Vicinity thunderstorm (VC TS)");

  return out;
}

function buildHumanSummary(
  row: AwcMetarRow,
  raw: string,
  stationLabel: string,
): string[] {
  const lines: string[] = [];
  lines.push(`Station: ${stationLabel}`);
  if (row.reportTime) lines.push(`Observation time (UTC): ${row.reportTime}`);
  if (typeof row.temp === "number" && Number.isFinite(row.temp)) {
    const f = (row.temp * 9) / 5 + 32;
    lines.push(`Temperature: ${row.temp.toFixed(1)}°C (${f.toFixed(1)}°F)`);
  }
  if (typeof row.dewp === "number" && Number.isFinite(row.dewp)) {
    lines.push(`Dew point: ${row.dewp.toFixed(1)}°C`);
  }
  const wdir = row.wdir;
  const dirStr =
    wdir === "VRB" || wdir === undefined ? String(wdir ?? "—") : `${wdir}°`;
  if (typeof row.wspd === "number") {
    const gust = typeof row.wgst === "number" ? ` gusting ${row.wgst} kt` : "";
    lines.push(`Wind: ${dirStr} at ${row.wspd} kt${gust}`);
  }
  if (row.visib !== undefined && row.visib !== null)
    lines.push(`Visibility: ${String(row.visib)}`);
  if (row.fltCat) lines.push(`Flight category: ${row.fltCat}`);
  if (row.cover) lines.push(`Sky cover (summary): ${row.cover}`);
  if (Array.isArray(row.clouds) && row.clouds.length) {
    const bits = row.clouds
      .map((c) =>
        [c.cover, c.base != null ? `${c.base} ft` : ""]
          .filter(Boolean)
          .join(" "),
      )
      .filter(Boolean);
    if (bits.length) lines.push(`Cloud layers: ${bits.join("; ")}`);
  }
  if (typeof row.altim === "number")
    lines.push(`Altimeter (decoded): ~${row.altim} hPa class value from AWC`);

  const storm = extractStormIndicators(raw);
  if (storm.length) {
    lines.push("Storm / significant weather indicators:");
    storm.forEach((s) => lines.push(`  • ${s}`));
  } else {
    lines.push(
      "Storm indicators: none flagged from this METAR (still review raw text).",
    );
  }

  lines.push(`Raw METAR: ${raw.trim()}`);
  return lines;
}

function kmhToKt(kmh: number): number {
  return Math.round(kmh * 0.539957 * 10) / 10;
}

interface NoaaLatestObservation {
  properties?: {
    rawMessage?: string;
    stationId?: string;
    stationName?: string;
    timestamp?: string;
    textDescription?: string;
    temperature?: { value?: number | null };
    dewpoint?: { value?: number | null };
    windDirection?: { value?: number | null };
    windSpeed?: { value?: number | null };
    windGust?: { value?: number | null };
    visibility?: { value?: number | null };
    cloudLayers?: Array<{
      amount?: string;
      base?: { value?: number | null };
    }>;
  };
}

/**
 * Decoded observation from NOAA (CORS-friendly in browsers). Raw METAR text is
 * often empty in this API — we synthesize a line for display / storm heuristics.
 */
async function fetchMetarFromNoaa(
  icao: string,
  nearest?: NearestMetarStation,
): Promise<MetarWeatherSnapshot> {
  const res = await fetch(noaaObservationsLatestUrl(icao), {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": NOAA_USER_AGENT,
    },
  });
  if (!res.ok) {
    throw new Error(`NOAA observation failed (${res.status}).`);
  }

  const json = (await res.json()) as NoaaLatestObservation;
  const p = json.properties;
  if (!p?.stationId) {
    throw new Error("Invalid NOAA observation response.");
  }

  const rawFromApi = (p.rawMessage && p.rawMessage.trim()) || "";
  const stationLabel = [p.stationId, p.stationName].filter(Boolean).join(" — ");
  const synthRaw =
    rawFromApi ||
    `METAR ${p.stationId} — ${p.textDescription ?? "observation"} (NOAA weather.gov; raw METAR string not included in API response)`;

  const wspdKt =
    typeof p.windSpeed?.value === "number" && Number.isFinite(p.windSpeed.value)
      ? kmhToKt(p.windSpeed.value)
      : undefined;
  const wgstKt =
    typeof p.windGust?.value === "number" &&
    Number.isFinite(p.windGust.value) &&
    p.windGust.value > 0
      ? kmhToKt(p.windGust.value)
      : undefined;

  const visMi =
    typeof p.visibility?.value === "number" &&
    Number.isFinite(p.visibility.value)
      ? `${Math.round((p.visibility.value / 1609.34) * 10) / 10} mi`
      : undefined;

  const row: AwcMetarRow = {
    icaoId: p.stationId,
    rawOb: synthRaw,
    reportTime: p.timestamp,
    temp: p.temperature?.value ?? undefined,
    dewp: p.dewpoint?.value ?? undefined,
    wdir: p.windDirection?.value ?? undefined,
    wspd: wspdKt,
    wgst: wgstKt,
    visib: visMi,
    fltCat: undefined,
    cover: p.cloudLayers?.[0]?.amount,
    clouds: (p.cloudLayers ?? []).map((c) => ({
      cover: c.amount,
      base:
        c.base?.value != null && Number.isFinite(c.base.value)
          ? Math.round(c.base.value * 3.28084)
          : undefined,
    })),
    name: p.stationName,
  };

  const summaryLines = buildHumanSummary(row, synthRaw, stationLabel);
  if (!rawFromApi) {
    summaryLines.unshift(
      "Source: NOAA weather.gov (browser-safe). Aviation Weather Center API is often blocked by CORS in web builds.",
    );
  }

  const rawForStorm = `${synthRaw} ${p.textDescription ?? ""}`;

  return {
    fetchedAtIso: new Date().toISOString(),
    stationIcao: p.stationId,
    stationName: p.stationName,
    distanceMilesApprox:
      nearest?.icao === p.stationId ? nearest.distanceMilesApprox : undefined,
    rawMetar: rawFromApi || synthRaw,
    summaryLines,
    tempC:
      typeof p.temperature?.value === "number"
        ? p.temperature.value
        : undefined,
    dewpC: typeof p.dewpoint?.value === "number" ? p.dewpoint.value : undefined,
    windDir:
      typeof p.windDirection?.value === "number"
        ? p.windDirection.value
        : undefined,
    windSpdKt: wspdKt,
    windGustKt: wgstKt,
    visibility: visMi,
    flightCategory: undefined,
    cloudsSummary: p.cloudLayers?.[0]?.amount,
    stormIndicators: extractStormIndicators(rawForStorm),
  };
}

async function fetchMetarFromAwc(
  icao: string,
  opts?: { nearest?: NearestMetarStation },
): Promise<MetarWeatherSnapshot> {
  const url = `${AWC_METAR_URL}?ids=${encodeURIComponent(icao)}&format=json&taf=false`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`METAR request failed (${res.status}). Try again later.`);
  }

  const data = (await res.json()) as AwcMetarRow[];
  if (!Array.isArray(data) || data.length === 0 || !data[0]?.rawOb) {
    throw new Error(
      `No METAR returned for ${icao}. Station may be inactive or ID incorrect.`,
    );
  }

  const row = data[0];
  const raw = String(row.rawOb);
  const stationLabel = [row.icaoId || icao, row.name]
    .filter(Boolean)
    .join(" — ");
  const summaryLines = buildHumanSummary(row, raw, stationLabel);

  return {
    fetchedAtIso: new Date().toISOString(),
    stationIcao: row.icaoId || icao,
    stationName: row.name,
    distanceMilesApprox:
      opts?.nearest?.icao === (row.icaoId || icao)
        ? opts.nearest.distanceMilesApprox
        : undefined,
    rawMetar: raw.trim(),
    summaryLines,
    tempC: typeof row.temp === "number" ? row.temp : undefined,
    dewpC: typeof row.dewp === "number" ? row.dewp : undefined,
    windDir:
      row.wdir === "VRB"
        ? undefined
        : typeof row.wdir === "number"
          ? row.wdir
          : undefined,
    windSpdKt: typeof row.wspd === "number" ? row.wspd : undefined,
    windGustKt: typeof row.wgst === "number" ? row.wgst : undefined,
    visibility:
      row.visib !== undefined && row.visib !== null
        ? String(row.visib)
        : undefined,
    flightCategory: row.fltCat,
    cloudsSummary: row.cover,
    stormIndicators: extractStormIndicators(raw),
  };
}

/**
 * Nearest US reference METAR to lat/lng (airport observation — not rooftop).
 * Returns null if no station or fetch fails (network / inactive ICAO).
 */
export async function fetchMetarSnapshotForLatLng(
  lat: number,
  lng: number,
): Promise<MetarWeatherSnapshot | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const nearest = findNearestMetarStation(lat, lng);
  if (!nearest) return null;
  try {
    return await fetchMetarSnapshotForIcao(nearest.icao, { nearest });
  } catch {
    return null;
  }
}

export async function fetchMetarSnapshotForIcao(
  icaoInput: string,
  opts?: { nearest?: NearestMetarStation },
): Promise<MetarWeatherSnapshot> {
  const icao = normalizeUsMetarIcaoInput(icaoInput);
  if (!icao || icao.length < 4) {
    throw new Error("Enter a valid 4-letter ICAO station (e.g. KDFW or DFW).");
  }

  const tryNoaaFirst = Platform.OS === "web";

  const tryAwcThenNoaa = async (): Promise<MetarWeatherSnapshot> => {
    let awcErr: unknown;
    try {
      return await fetchMetarFromAwc(icao, opts);
    } catch (e) {
      awcErr = e;
    }
    try {
      return await fetchMetarFromNoaa(icao, opts?.nearest);
    } catch (noaaErr) {
      const a = awcErr instanceof Error ? awcErr.message : String(awcErr);
      const b = noaaErr instanceof Error ? noaaErr.message : String(noaaErr);
      throw new Error(`METAR unavailable (AWC: ${a}; NOAA: ${b})`);
    }
  };

  const tryNoaaThenAwc = async (): Promise<MetarWeatherSnapshot> => {
    let noaaErr: unknown;
    try {
      return await fetchMetarFromNoaa(icao, opts?.nearest);
    } catch (e) {
      noaaErr = e;
    }
    try {
      return await fetchMetarFromAwc(icao, opts);
    } catch (awcErr) {
      const a = noaaErr instanceof Error ? noaaErr.message : String(noaaErr);
      const b = awcErr instanceof Error ? awcErr.message : String(awcErr);
      throw new Error(`METAR unavailable (NOAA: ${a}; AWC: ${b})`);
    }
  };

  return tryNoaaFirst ? tryNoaaThenAwc() : tryAwcThenNoaa();
}
