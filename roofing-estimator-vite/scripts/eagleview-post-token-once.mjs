/**
 * POST client_credentials to EagleView token URL; prints status + JSON body.
 * Uses same auth rules as eagleview-get-token.mjs (see eagleviewEnv.mjs).
 */
import {
  loadEagleViewDotEnv,
  projectRootFromHere,
  resolveTokenAuthMode,
} from "./eagleviewEnv.mjs";

loadEagleViewDotEnv(projectRootFromHere());

const tokenUrl = (
  process.env.EAGLEVIEW_TOKEN_URL || "https://apicenter.eagleview.com/oauth2/v1/token"
).trim();
const clientId = (
  process.env.EAGLEVIEW_OAUTH_CLIENT_ID ||
  process.env.EAGLEVIEW_CLIENT_ID ||
  ""
).trim();
const clientSecret = (process.env.EAGLEVIEW_CLIENT_SECRET || "").trim();
const scope = (process.env.EAGLEVIEW_SCOPE || "").trim();
const authMode = resolveTokenAuthMode(tokenUrl, process.env.EAGLEVIEW_TOKEN_STYLE || "auto");

if (!clientId || !clientSecret) {
  console.error("Missing EAGLEVIEW_CLIENT_ID or EAGLEVIEW_CLIENT_SECRET in .env.local");
  process.exit(1);
}

console.log("POST", tokenUrl);
console.log("authMode:", authMode);

let res;
if (authMode === "basic") {
  const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
  res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
} else if (authMode === "client_secret_basic") {
  const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  if (scope) body.set("scope", scope);
  res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
} else {
  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  if (scope) body.set("scope", scope);
  res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
}

const raw = await res.text();
let json;
try {
  json = raw ? JSON.parse(raw) : {};
} catch {
  json = { _parseError: true, raw: raw.slice(0, 2000) };
}

if (typeof json.access_token === "string") {
  json.access_token = `[redacted, length ${json.access_token.length}]`;
}

console.log("HTTP", res.status);
console.log(JSON.stringify(json, null, 2));
