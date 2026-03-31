/**
 * From MO open-data parcel CSV (no phones in source), keep rows that look like
 * commercial / property-manager / large-building / multifamily-style leads — max 50,000.
 *
 * Output includes empty phone / contact / email columns for you to fill from licensed lists
 * or manual research. This script does not invent numbers.
 *
 * Prereq: npm run data:mo-parcels
 * Run:    npm run data:mo-commercial-50k
 *
 * Input:  data/mo-stl-kc-open-data-import.csv
 * Output: data/mo-commercial-pm-candidates-50k.csv (gitignored)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_IN = path.join(ROOT, "data", "mo-stl-kc-open-data-import.csv");
const DEFAULT_OUT = path.join(ROOT, "data", "mo-commercial-pm-candidates-50k.csv");
const MAX_ROWS = 50_000;

const PM_RX =
  /\b(management|properties|holdings|realty|partners|investments|llc|l\.l\.c\.|lp|inc\.?|corp\.?|trust)\b/i;
const MULTI_RX = /\b(apartment|multi-?family|condo|villas|plaza|tower|center|centre|office|retail|commercial|storage)\b/i;

function escCell(v) {
  const t = v == null ? "" : String(v);
  if (/[",\r\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function line(cols) {
  return cols.map(escCell).join(",") + "\n";
}

const OUT_HEADERS = [
  "property_address",
  "owner_name",
  "owner_mailing_address",
  "state_code",
  "latitude",
  "longitude",
  "building_sqft",
  "property_type",
  "phone",
  "contact_person_name",
  "contact_person_phone",
  "email",
  "notes",
];

function inferPropertyType(owner, notes, sqft) {
  const blob = `${owner} ${notes}`.toLowerCase();
  if (MULTI_RX.test(blob) || /\bapartment\b/i.test(blob)) return "multi-family";
  if (PM_RX.test(owner) || sqft >= 12_000) return "commercial";
  if (sqft >= 6_000) return "commercial";
  return "other";
}

function keepRow(row) {
  const owner = (row.owner_name ?? "").toString();
  const notes = (row.notes ?? "").toString();
  const sqft = Number.parseFloat(String(row.building_sqft ?? "").replace(/,/g, "")) || 0;
  if (PM_RX.test(owner)) return true;
  if (MULTI_RX.test(owner) || MULTI_RX.test(notes)) return true;
  if (sqft >= 6_000) return true;
  return false;
}

function augmentNotes(row) {
  const base = (row.notes ?? "").toString().trim();
  const tag =
    "Lead filter: commercial / PM / large-sqft / multifamily keyword heuristic (open data — no phone in source).";
  return base ? `${base} | ${tag}` : tag;
}

async function main() {
  const input = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_IN;
  const output = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_OUT;

  if (!fs.existsSync(input)) {
    console.error(`Missing input CSV: ${input}\nRun: npm run data:mo-parcels`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(output), { recursive: true });
  const ws = fs.createWriteStream(output, { encoding: "utf8" });
  ws.write(line(OUT_HEADERS));

  const parser = fs.createReadStream(input).pipe(
    parse({
      columns: true,
      relax_quotes: true,
      relax_column_count: true,
      trim: true,
    }),
  );

  let scanned = 0;
  let kept = 0;

  for await (const row of parser) {
    scanned++;
    if (!keepRow(row)) continue;

    const pt = inferPropertyType(
      (row.owner_name ?? "").toString(),
      (row.notes ?? "").toString(),
      Number.parseFloat(String(row.building_sqft ?? "").replace(/,/g, "")) || 0,
    );

    const outRow = [
      row.property_address ?? "",
      row.owner_name ?? "",
      row.owner_mailing_address ?? "",
      row.state_code ?? "MO",
      row.latitude ?? "",
      row.longitude ?? "",
      row.building_sqft ?? "",
      pt,
      "", // phone — fill from your licensed source
      "", // contact_person_name
      "", // contact_person_phone
      "", // email
      augmentNotes(row),
    ];
    ws.write(line(outRow));
    kept++;
    if (kept >= MAX_ROWS) break;
    if (kept % 10_000 === 0) console.log(`  … kept ${kept.toLocaleString()} / scanned ${scanned.toLocaleString()}`);
  }

  await new Promise((res, rej) => ws.end((e) => (e ? rej(e) : res())));

  console.log(`Scanned ${scanned.toLocaleString()} input rows; wrote ${kept.toLocaleString()} rows → ${path.relative(ROOT, output)}`);
  if (kept < MAX_ROWS) {
    console.warn(`Note: fewer than ${MAX_ROWS.toLocaleString()} rows matched the heuristic. Loosen filters in this script if needed.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
