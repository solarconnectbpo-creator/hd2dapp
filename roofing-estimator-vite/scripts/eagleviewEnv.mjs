/**
 * Shared env loading + OAuth mode for EagleView token scripts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function projectRootFromHere() {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
}

/**
 * Load `.env.local` then `.env` from `root` without overriding `process.env`.
 * Strips UTF-8 BOM and trims values (avoids subtle invalid_client issues).
 */
export function loadEagleViewDotEnv(root = projectRootFromHere()) {
  for (const rel of [".env.local", ".env"]) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) continue;
    let text = fs.readFileSync(p, "utf8");
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    for (const line of text.split("\n")) {
      const s = line.trim();
      if (!s || s.startsWith("#")) continue;
      const eq = s.indexOf("=");
      if (eq <= 0) continue;
      const key = s.slice(0, eq).trim();
      let val = s.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      val = val.trim();
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

/**
 * @returns {"basic" | "client_secret_basic" | "form"}
 * - `basic` — Embedded Explorer: POST api.eagleview.com/auth-service/v1/token
 * - `client_secret_basic` — API Center (Okta): POST …/oauth2/…/token with Basic + grant_type (+ optional scope)
 * - `form` — OAuth2 body client_id + client_secret (only if explicitly forced)
 */
export function resolveTokenAuthMode(tokenUrl, styleRaw) {
  const raw = (styleRaw || "auto").trim().toLowerCase();
  let host = "";
  let pathname = "";
  try {
    const u = new URL(tokenUrl);
    host = u.hostname.toLowerCase();
    pathname = u.pathname;
  } catch {
    return raw === "basic" ? "basic" : "form";
  }

  const isApicenterOauth2 =
    (host === "apicenter.eagleview.com" || host === "sandbox.apicenter.eagleview.com") &&
    pathname.includes("/oauth2/");

  if (raw === "form") return "form";
  if (raw === "basic") {
    if (isApicenterOauth2) return "client_secret_basic";
    return "basic";
  }
  // auto
  if (isApicenterOauth2) return "client_secret_basic";
  if (host === "api.eagleview.com" && pathname.includes("auth-service")) return "basic";
  return "form";
}

export function defaultTokenUrlForClientId(clientId, apiBase) {
  const base = apiBase.trim().replace(/\/$/, "");
  const looksLikeOktaApp = /^0oa[a-z0-9]+$/i.test(clientId.trim());
  if (looksLikeOktaApp) return "https://apicenter.eagleview.com/oauth2/v1/token";
  return `${base}/oauth/token`;
}
