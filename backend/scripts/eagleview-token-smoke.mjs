/**
 * Smoke-test EagleView OAuth using `backend/.dev.vars`.
 * Checks both API Center and Embedded token endpoints.
 * Usage: node scripts/eagleview-token-smoke.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const devVars = path.join(root, ".dev.vars");

function loadDevVars() {
  const env = {};
  if (!fs.existsSync(devVars)) {
    console.error("Missing .dev.vars");
    process.exit(1);
  }
  let text = fs.readFileSync(devVars, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (const line of text.split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const eq = s.indexOf("=");
    if (eq <= 0) continue;
    const k = s.slice(0, eq).trim();
    let v = s.slice(eq + 1).trim();
    env[k] = v;
  }
  return env;
}

function trim(v) {
  return typeof v === "string" ? v.trim() : "";
}

async function runTokenTest(label, tokenUrl, id, secret, scope = "") {
  if (!id || !secret) {
    return {
      ok: false,
      status: 0,
      message: `${label}: missing credentials in .dev.vars`,
    };
  }
  const basic = Buffer.from(`${id}:${secret}`, "utf8").toString("base64");
  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  if (scope) body.set("scope", scope);
  let res;
  let text = "";
  try {
    res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    text = await res.text();
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: `${label}: network error ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (res.ok) {
    return {
      ok: true,
      status: res.status,
      message: `${label}: ${res.status} OK (token received, hidden)`,
    };
  }
  let err = text.slice(0, 220);
  try {
    const data = JSON.parse(text);
    err = JSON.stringify(data);
  } catch {
    /* keep raw */
  }
  return {
    ok: false,
    status: res.status,
    message: `${label}: ${res.status} FAIL ${err}`,
  };
}

const env = loadDevVars();
const sharedId = trim(env.EAGLEVIEW_OAUTH_CLIENT_ID || env.EAGLEVIEW_CLIENT_ID);
const sharedSecret = trim(env.EAGLEVIEW_CLIENT_SECRET);
const apiCenterUrl = trim(env.EAGLEVIEW_TOKEN_URL || "https://apicenter.eagleview.com/oauth2/v1/token");
const apiCenterScope = trim(env.EAGLEVIEW_SCOPE);

const embeddedId = trim(env.EAGLEVIEW_EMBEDDED_CLIENT_ID || sharedId);
const embeddedSecret = trim(env.EAGLEVIEW_EMBEDDED_CLIENT_SECRET || sharedSecret);
const embeddedUrl = trim(env.EAGLEVIEW_EMBEDDED_TOKEN_URL || "https://api.eagleview.com/auth-service/v1/token");
const embeddedScope = trim(env.EAGLEVIEW_EMBEDDED_SCOPE || env.EAGLEVIEW_SCOPE);

const checks = [
  await runTokenTest("API Center token", apiCenterUrl, sharedId, sharedSecret, apiCenterScope),
  await runTokenTest("Embedded token", embeddedUrl, embeddedId, embeddedSecret, embeddedScope),
];

for (const c of checks) {
  console.log(c.ok ? "PASS" : "FAIL", "-", c.message);
}
if (checks.every((c) => c.ok)) {
  process.exit(0);
}
process.exit(1);
