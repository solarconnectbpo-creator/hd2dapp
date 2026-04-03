/**
 * Copies EAGLEVIEW_* lines from `.env.local` into `../backend/.dev.vars` for `wrangler dev`.
 * Keeps non-EAGLEVIEW keys that were already in `.dev.vars`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envLocal = path.join(root, ".env.local");
const devVarsPath = path.join(root, "..", "backend", ".dev.vars");

function parseEnvFile(file) {
  const out = new Map();
  if (!fs.existsSync(file)) return out;
  let text = fs.readFileSync(file, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (const line of text.split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const eq = s.indexOf("=");
    if (eq <= 0) continue;
    const k = s.slice(0, eq).trim();
    let v = s.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out.set(k, v);
  }
  return out;
}

function serializeDevVars(map) {
  const lines = [
    "# Synced from roofing-estimator-vite/.env.local — do not commit.",
    "# Run: npm run sync:eagleview-dev",
    "",
  ];
  const keys = [...map.keys()].sort();
  for (const k of keys) {
    lines.push(`${k}=${map.get(k)}`);
  }
  lines.push("");
  return lines.join("\n");
}

const fromLocal = parseEnvFile(envLocal);
const eagleKeys = [...fromLocal.keys()].filter((k) => k.startsWith("EAGLEVIEW_"));
if (eagleKeys.length === 0) {
  console.error("No EAGLEVIEW_* keys in .env.local — nothing to sync.");
  process.exit(1);
}

const merged = new Map();
for (const [k, v] of parseEnvFile(devVarsPath)) {
  if (!k.startsWith("EAGLEVIEW_")) merged.set(k, v);
}
for (const k of eagleKeys) {
  merged.set(k, fromLocal.get(k));
}

fs.mkdirSync(path.dirname(devVarsPath), { recursive: true });
fs.writeFileSync(devVarsPath, serializeDevVars(merged), "utf8");
console.log("Wrote", devVarsPath, "with EagleView keys:", eagleKeys.join(", "));
