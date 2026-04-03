/**
 * Exchange EagleView client_credentials for an access token (stdout = token only).
 * Loads `.env.local` then `.env` from the project root (does not override existing process.env).
 *
 * API Center (`…apicenter…/oauth2/…/token`) uses Okta **client_secret_basic**: Basic auth + body
 * `grant_type=client_credentials` (not client_id in form). Set `EAGLEVIEW_TOKEN_STYLE=form` to force form body.
 *
 * Usage:
 *   npm run eagleview:token
 * Then add `EAGLEVIEW_ACCESS_TOKEN=<stdout>` to `.env.local` and restart Vite.
 */
import {
  defaultTokenUrlForClientId,
  loadEagleViewDotEnv,
  projectRootFromHere,
  resolveTokenAuthMode,
} from "./eagleviewEnv.mjs";

loadEagleViewDotEnv(projectRootFromHere());

/** OAuth **Client ID** from app Credentials (may differ from the `0oa…` id in the browser path). */
const clientId = (
  process.env.EAGLEVIEW_OAUTH_CLIENT_ID ||
  process.env.EAGLEVIEW_CLIENT_ID ||
  ""
).trim();
const clientSecret = (process.env.EAGLEVIEW_CLIENT_SECRET || "").trim();
const apiBase = (process.env.EAGLEVIEW_API_BASE || "https://apicenter.eagleview.com")
  .trim()
  .replace(/\/$/, "");
const scope = (process.env.EAGLEVIEW_SCOPE || "").trim();
const styleRaw = process.env.EAGLEVIEW_TOKEN_STYLE || "auto";

const defaultUrl = defaultTokenUrlForClientId(clientId, apiBase);
const tokenUrl = (process.env.EAGLEVIEW_TOKEN_URL || defaultUrl).trim();
const authMode = resolveTokenAuthMode(tokenUrl, styleRaw);

if (!clientId || !clientSecret) {
  console.error(
    "Missing EAGLEVIEW_CLIENT_ID or EAGLEVIEW_CLIENT_SECRET. Set them in .env.local (not committed).",
  );
  process.exit(1);
}

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
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
}

let raw = await res.text();
let json;
try {
  json = raw ? JSON.parse(raw) : {};
} catch {
  console.error("Non-JSON response:", res.status, raw.slice(0, 500));
  process.exit(1);
}

const invalidClient =
  !res.ok &&
  json &&
  (json.errorCode === "invalid_client" || json.error === "invalid_client");

/** Sandbox apps often use the same path on sandbox.apicenter.eagleview.com. */
const sandboxFallbackUrl = tokenUrl.replace(
  /:\/\/apicenter\.eagleview\.com/i,
  "://sandbox.apicenter.eagleview.com",
);
const trySandbox =
  invalidClient &&
  sandboxFallbackUrl !== tokenUrl &&
  (process.env.EAGLEVIEW_TRY_SANDBOX_TOKEN === "1" ||
    process.env.EAGLEVIEW_TRY_SANDBOX_TOKEN === "true");

if (!res.ok && trySandbox) {
  console.error(
    `Token failed against production host; retrying sandbox: ${sandboxFallbackUrl}`,
  );
  res = await (async () => {
    if (authMode === "basic") {
      const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
      return fetch(sandboxFallbackUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
    }
    if (authMode === "client_secret_basic") {
      const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
      const body = new URLSearchParams();
      body.set("grant_type", "client_credentials");
      if (scope) body.set("scope", scope);
      return fetch(sandboxFallbackUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
    }
    const body = new URLSearchParams();
    body.set("grant_type", "client_credentials");
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
    if (scope) body.set("scope", scope);
    return fetch(sandboxFallbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });
  })();
  raw = await res.text();
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    console.error("Non-JSON response (sandbox):", res.status, raw.slice(0, 500));
    process.exit(1);
  }
}

if (!res.ok) {
  console.error("Token request failed:", res.status, json);
  console.error(
    `(authMode=${authMode}, url=${trySandbox ? sandboxFallbackUrl : tokenUrl}). invalid_client usually means the **Client ID** / secret pair does not match this token server. On developer.eagleview.com open your app → **Credentials** and copy **Client ID** and **Client secret** exactly (the ID in the address bar is often the app resource id, not the OAuth client_id). For sandbox-only apps, set EAGLEVIEW_TOKEN_URL=https://sandbox.apicenter.eagleview.com/oauth2/v1/token`,
  );
  process.exit(1);
}

const access = json.access_token;
if (typeof access !== "string" || !access) {
  console.error("Response missing access_token:", json);
  process.exit(1);
}

process.stdout.write(access);
