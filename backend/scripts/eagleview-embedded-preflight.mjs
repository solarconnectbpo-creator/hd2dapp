/**
 * Preflight guard for deployments/CI:
 * - requires embedded EagleView credentials to be present in backend/.dev.vars
 * - does not print secret values
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const devVarsPath = path.join(root, ".dev.vars");

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
    out.set(s.slice(0, eq).trim(), s.slice(eq + 1).trim());
  }
  return out;
}

const env = parseEnvFile(devVarsPath);
const embeddedId = env.get("EAGLEVIEW_EMBEDDED_CLIENT_ID") || env.get("EAGLEVIEW_CLIENT_ID");
const embeddedSecret =
  env.get("EAGLEVIEW_EMBEDDED_CLIENT_SECRET") || env.get("EAGLEVIEW_CLIENT_SECRET");
const tokenUrl = env.get("EAGLEVIEW_EMBEDDED_TOKEN_URL") || "https://api.eagleview.com/auth-service/v1/token";

const missing = [];
if (!embeddedId) missing.push("EAGLEVIEW_EMBEDDED_CLIENT_ID (or EAGLEVIEW_CLIENT_ID)");
if (!embeddedSecret) missing.push("EAGLEVIEW_EMBEDDED_CLIENT_SECRET (or EAGLEVIEW_CLIENT_SECRET)");

if (missing.length > 0) {
  console.error("EagleView embedded preflight failed.");
  console.error("Missing:", missing.join(", "));
  process.exit(1);
}

console.log("EagleView embedded preflight passed.");
console.log("Token URL:", tokenUrl);
