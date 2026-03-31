/**
 * Writes data/leads-sample-10000.csv — synthetic Twin Cities–style addresses for load-testing the Property records table.
 * Run: node scripts/generate-leads-sample-10000.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "data", "leads-sample-10000.csv");

const N = 10_000;
const cities = [
  ["Minneapolis", "554"],
  ["St Paul", "551"],
  ["Bloomington", "554"],
  ["Brooklyn Park", "554"],
  ["Plymouth", "554"],
  ["Eden Prairie", "553"],
  ["Maple Grove", "553"],
];

const FIRST = ["Alex", "Jordan", "Sam", "Riley", "Casey", "Morgan", "Taylor", "Jamie"];
const LAST = ["Rivera", "Nguyen", "Patel", "Olsen", "Berg", "Hassan", "Kim", "Vaughn"];

/** Fake but plausible MN-style numbers for UI testing only (not real lines). */
function synthContactPhone(i) {
  const mid = 200 + (i % 700);
  const last4 = String(1000 + (i % 9000)).slice(-4);
  return `(612) ${mid}-${last4}`;
}

function synthMainPhone(i) {
  const mid = 310 + (i % 600);
  const last4 = String(2000 + (i % 8000)).slice(-4);
  return `(651) ${mid}-${last4}`;
}

function contactPersonName(i) {
  return `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
}

function esc(s) {
  const t = String(s);
  if (/[",\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

const header =
  "property_address,owner_name,owner_mailing_address,state_code,latitude,longitude,building_sqft,property_type,phone,contact_person_name,contact_person_phone,notes\n";

const rows = [header];
for (let i = 0; i < N; i++) {
  const [city, zipPrefix] = cities[i % cities.length];
  const zip = `${zipPrefix}${String(10 + (i % 89)).padStart(2, "0")}`;
  const num = 100 + (i % 9900);
  const addr = `${num} SAMPLE AVE, ${city}, MN ${zip}`;
  const owner =
    i % 4 === 0
      ? `SAMPLE PORTFOLIO ${Math.floor(i / 50)} LLC`
      : i % 3 === 0
        ? `SMITH, PAT & JAMIE ${i}`
        : `DEMO PROPERTY TRUST ${i}`;
  const mail = `${num} MAILING LN, ${city}, MN, ${zip}`;
  const sq = 1800 + ((i * 17) % 12000);
  const contactName = contactPersonName(i);
  const contactDirect = synthContactPhone(i);
  const mainLine = i % 7 === 0 ? "" : synthMainPhone(i);
  rows.push(
    [
      esc(addr),
      esc(owner),
      esc(mail),
      "MN",
      "",
      "",
      String(sq),
      i % 5 === 0 ? "commercial" : "other",
      esc(mainLine),
      esc(contactName),
      esc(contactDirect),
      esc(`Synthetic lead ${i + 1} of ${N} — for UI/load testing only.`),
    ].join(",") + "\n",
  );
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, rows.join(""), "utf8");
const bytes = fs.statSync(outPath).size;
console.log(`Wrote ${outPath}`);
console.log(`Rows: ${N} (+ header)  |  Size: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
