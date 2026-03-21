/**
 * METAR (aviation surface observation) for storm / weather context near a property.
 *
 * In this Expo app we use the U.S. **Aviation Weather Center** JSON API (decoded fields + raw METAR string).
 * This provides a human-friendly snapshot suitable for “storm / weather context” in the report.
 */

import * as turf from "@turf/turf";

import type { MetarWeatherSnapshot } from "./roofReportTypes";
import { US_METAR_REFERENCE_STATIONS } from "./metarStationsUs";

const AWC_METAR_URL = "https://aviationweather.gov/api/data/metar";

export interface NearestMetarStation {
  icao: string;
  name: string;
  distanceMilesApprox: number;
}

/** Pick nearest reference METAR station to the property (US-centric list). */
export function findNearestMetarStation(lat: number, lng: number): NearestMetarStation | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!US_METAR_REFERENCE_STATIONS.length) return null;

  const from = turf.point([lng, lat]);
  const fc = turf.featureCollection(
    US_METAR_REFERENCE_STATIONS.map((s) => turf.point([s.lng, s.lat], { icao: s.icao, name: s.name })),
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
  return raw.trim().toUpperCase().replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, "");
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

  if (/\bVCTS\b/.test(u) || /\bTSRA\b/.test(u) || /\b-TSRA\b/.test(u) || /\b\+TSRA\b/.test(u)) {
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

function buildHumanSummary(row: AwcMetarRow, raw: string, stationLabel: string): string[] {
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
  const dirStr = wdir === "VRB" || wdir === undefined ? String(wdir ?? "—") : `${wdir}°`;
  if (typeof row.wspd === "number") {
    const gust = typeof row.wgst === "number" ? ` gusting ${row.wgst} kt` : "";
    lines.push(`Wind: ${dirStr} at ${row.wspd} kt${gust}`);
  }
  if (row.visib !== undefined && row.visib !== null) lines.push(`Visibility: ${String(row.visib)}`);
  if (row.fltCat) lines.push(`Flight category: ${row.fltCat}`);
  if (row.cover) lines.push(`Sky cover (summary): ${row.cover}`);
  if (Array.isArray(row.clouds) && row.clouds.length) {
    const bits = row.clouds
      .map((c) => [c.cover, c.base != null ? `${c.base} ft` : ""].filter(Boolean).join(" "))
      .filter(Boolean);
    if (bits.length) lines.push(`Cloud layers: ${bits.join("; ")}`);
  }
  if (typeof row.altim === "number") lines.push(`Altimeter (decoded): ~${row.altim} hPa class value from AWC`);

  const storm = extractStormIndicators(raw);
  if (storm.length) {
    lines.push("Storm / significant weather indicators:");
    storm.forEach((s) => lines.push(`  • ${s}`));
  } else {
    lines.push("Storm indicators: none flagged from this METAR (still review raw text).");
  }

  lines.push(`Raw METAR: ${raw.trim()}`);
  return lines;
}

export async function fetchMetarSnapshotForIcao(
  icaoInput: string,
  opts?: { nearest?: NearestMetarStation },
): Promise<MetarWeatherSnapshot> {
  const icao = normalizeUsMetarIcaoInput(icaoInput);
  if (!icao || icao.length < 4) {
    throw new Error("Enter a valid 4-letter ICAO station (e.g. KDFW or DFW).");
  }

  const url = `${AWC_METAR_URL}?ids=${encodeURIComponent(icao)}&format=json&taf=false`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`METAR request failed (${res.status}). Try again later.`);
  }

  const data = (await res.json()) as AwcMetarRow[];
  if (!Array.isArray(data) || data.length === 0 || !data[0]?.rawOb) {
    throw new Error(`No METAR returned for ${icao}. Station may be inactive or ID incorrect.`);
  }

  const row = data[0];
  const raw = String(row.rawOb);
  const stationLabel = [row.icaoId || icao, row.name].filter(Boolean).join(" — ");
  const summaryLines = buildHumanSummary(row, raw, stationLabel);

  return {
    fetchedAtIso: new Date().toISOString(),
    stationIcao: row.icaoId || icao,
    stationName: row.name,
    distanceMilesApprox: opts?.nearest?.icao === (row.icaoId || icao) ? opts.nearest.distanceMilesApprox : undefined,
    rawMetar: raw.trim(),
    summaryLines,
    tempC: typeof row.temp === "number" ? row.temp : undefined,
    dewpC: typeof row.dewp === "number" ? row.dewp : undefined,
    windDir: row.wdir === "VRB" ? undefined : typeof row.wdir === "number" ? row.wdir : undefined,
    windSpdKt: typeof row.wspd === "number" ? row.wspd : undefined,
    windGustKt: typeof row.wgst === "number" ? row.wgst : undefined,
    visibility: row.visib !== undefined && row.visib !== null ? String(row.visib) : undefined,
    flightCategory: row.fltCat,
    cloudsSummary: row.cover,
    stormIndicators: extractStormIndicators(raw),
  };
}
