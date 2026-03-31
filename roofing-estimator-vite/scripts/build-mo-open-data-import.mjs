/**
 * Build a Property records CSV from **public open data**:
 * - St. Louis City: https://static.stlouis-mo.gov/open-data/ASSESSOR/PARCELS.zip (assessor parcels)
 * - Kansas City MO: https://data.kcmo.org/ (Socrata dataset vrys-qgrz)
 *
 * Usage:
 *   node scripts/build-mo-open-data-import.mjs              → data/mo-stl-kc-open-data-import.csv
 *   node scripts/build-mo-open-data-import.mjs --sample     → public/mo-parcels-open-data-sample.csv (200 rows)
 *
 * Comply with each portal’s terms; data is for outreach prep — verify owners before contact.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import * as shapefile from "shapefile";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CACHE = path.join(ROOT, "scripts", ".cache");
const STL_ZIP_URL = "https://static.stlouis-mo.gov/open-data/ASSESSOR/PARCELS.zip";
const KC_RESOURCE = "https://data.kcmo.org/resource/vrys-qgrz.json";

const HEADERS = [
  "property_address",
  "owner_name",
  "owner_mailing_address",
  "state_code",
  "latitude",
  "longitude",
  "building_sqft",
  "property_type",
  "notes",
];

function escCell(v) {
  const t = v == null ? "" : String(v);
  if (/[",\r\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function line(cols) {
  return cols.map(escCell).join(",") + "\n";
}

function stlSiteAddress(p) {
  const site = (p.SITEADDR ?? "").toString().replace(/\s+/g, " ").trim();
  const zip = p.ZIP != null ? String(p.ZIP) : "";
  if (site) return `${site}, St Louis, MO ${zip}`.trim();
  const num = p.LowAddrNum != null ? String(p.LowAddrNum) : "";
  const st = [p.StPreDir, p.StName, p.StType, p.StSufDir].filter(Boolean).join(" ");
  const base = [num, st].filter(Boolean).join(" ").trim();
  return base ? `${base}, St Louis, MO ${zip}`.trim() : "";
}

function stlOwnerName(p) {
  const a = (p.OWNERNAME ?? "").toString().trim();
  const b = (p.OWNERNAME2 ?? "").toString().trim();
  return [a, b].filter(Boolean).join(" | ");
}

function stlMailing(p) {
  const parts = [
    (p.OWNERADDR ?? "").toString().trim(),
    (p.OWNERCITY ?? "").toString().trim(),
    (p.OWNERSTATE ?? "").toString().trim(),
    (p.OWNERZIP ?? "").toString().trim(),
  ].filter(Boolean);
  return parts.join(", ");
}

function stlNotes(p) {
  return [
    "Source: City of St. Louis open assessor parcel data (PARCELS.zip). Lat/lng omitted (State Plane geometry).",
    p.LegalDesc1 ? `Legal: ${p.LegalDesc1}` : "",
    p.ParcelId ? `ParcelId: ${p.ParcelId}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function kcAddress(r) {
  const a = (r.address ?? "").toString().trim();
  const z = (r.own_zip ?? "").toString().trim();
  return a ? `${a}, Kansas City, MO ${z}`.trim() : "";
}

function kcMailing(r) {
  const parts = [
    (r.own_addr ?? "").toString().trim(),
    (r.own_city ?? "").toString().trim(),
    (r.own_state ?? "").toString().trim(),
    (r.own_zip ?? "").toString().trim(),
  ].filter(Boolean);
  return parts.join(", ");
}

function kcNotes(r) {
  return [
    "Source: Open Data KC parcel dataset (data.kcmo.org, vrys-qgrz).",
    r.parcelid ? `parcelid: ${r.parcelid}` : "",
    r.apn ? `apn: ${r.apn}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

async function ensureStlZip() {
  fs.mkdirSync(CACHE, { recursive: true });
  const zipPath = path.join(CACHE, "stl-parcels.zip");
  if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size < 1_000_000) {
    console.log("Downloading St. Louis PARCELS.zip …");
    const res = await fetch(STL_ZIP_URL);
    if (!res.ok) throw new Error(`STL download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(zipPath, buf);
  }
  const extractDir = path.join(CACHE, "stl-extract");
  if (!fs.existsSync(path.join(extractDir, "PARCELS", "PARCELS.shp"))) {
    console.log("Extracting STL shapefile …");
    fs.mkdirSync(extractDir, { recursive: true });
    new AdmZip(zipPath).extractAllTo(extractDir, true);
  }
  return path.join(extractDir, "PARCELS", "PARCELS.shp");
}

async function* iterateStlRows() {
  const shpPath = await ensureStlZip();
  const src = await shapefile.open(shpPath);
  for (;;) {
    const r = await src.read();
    if (r.done) break;
    const p = r.value?.properties;
    if (!p) continue;
    const property_address = stlSiteAddress(p);
    if (!property_address) continue;
    const owner_name = stlOwnerName(p);
    // Geometry is NAD83 Missouri State Plane (feet), not WGS84 — leave blank; geocode from address if needed.
    yield {
      property_address,
      owner_name,
      owner_mailing_address: stlMailing(p),
      state_code: "MO",
      latitude: "",
      longitude: "",
      building_sqft: p.SQFT != null ? String(p.SQFT) : "",
      property_type: "other",
      notes: stlNotes(p),
    };
  }
}

async function* iterateKcRows() {
  const limit = 50_000;
  let offset = 0;
  for (;;) {
    const u = new URL(KC_RESOURCE);
    u.searchParams.set("$limit", String(limit));
    u.searchParams.set("$offset", String(offset));
    const rows = await fetch(u).then((r) => {
      if (!r.ok) throw new Error(`KC API ${r.status}`);
      return r.json();
    });
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const r of rows) {
      const property_address = kcAddress(r);
      if (!property_address) continue;
      yield {
        property_address,
        owner_name: (r.own_name ?? "").toString().trim(),
        owner_mailing_address: kcMailing(r),
        state_code: "MO",
        latitude: (r.latitude ?? "").toString(),
        longitude: (r.longitude ?? "").toString(),
        building_sqft: "",
        property_type: "other",
        notes: kcNotes(r),
      };
    }
    offset += rows.length;
    console.log(`KC rows fetched: ${offset}`);
    if (rows.length < limit) break;
  }
}

function rowToCols(r) {
  return HEADERS.map((h) => r[h]);
}

async function main() {
  const sample = process.argv.includes("--sample");
  const outPath = sample
    ? path.join(ROOT, "public", "mo-parcels-open-data-sample.csv")
    : path.join(ROOT, "data", "mo-stl-kc-open-data-import.csv");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const ws = fs.createWriteStream(outPath, { encoding: "utf8" });
  ws.write(line(HEADERS));

  let count = 0;

  if (sample) {
    let stlN = 0;
    console.log("Writing St. Louis rows (sample 100) …");
    for await (const row of iterateStlRows()) {
      ws.write(line(rowToCols(row)));
      count++;
      stlN++;
      if (stlN >= 100) break;
    }
    let kcN = 0;
    console.log("Writing Kansas City rows (sample 100) …");
    for await (const row of iterateKcRows()) {
      ws.write(line(rowToCols(row)));
      count++;
      kcN++;
      if (kcN >= 100) break;
    }
  } else {
    console.log("Writing St. Louis rows …");
    for await (const row of iterateStlRows()) {
      ws.write(line(rowToCols(row)));
      count++;
      if (count % 25_000 === 0) console.log(`  … ${count.toLocaleString()} rows so far (STL+KC combined)`);
    }
    console.log("Writing Kansas City rows …");
    for await (const row of iterateKcRows()) {
      ws.write(line(rowToCols(row)));
      count++;
      if (count % 25_000 === 0) console.log(`  … ${count.toLocaleString()} rows so far`);
    }
  }

  await new Promise((res, rej) => {
    ws.end((e) => (e ? rej(e) : res()));
  });

  console.log(`Wrote ${count.toLocaleString()} rows → ${path.relative(ROOT, outPath)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
