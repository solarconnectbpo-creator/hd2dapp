/**
 * Read Wrangler CLI OAuth access token from local config (no network).
 * Used when CLOUDFLARE_API_TOKEN is unset so `npm run pages:deploy` users can run domain/purge helpers.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function readWranglerOAuthToken() {
  const candidates = [];
  if (process.platform === "win32" && process.env.APPDATA) {
    candidates.push(join(process.env.APPDATA, "xdg.config", ".wrangler", "config", "default.toml"));
  }
  if (process.env.USERPROFILE) {
    candidates.push(join(process.env.USERPROFILE, ".wrangler", "config", "default.toml"));
  }
  if (process.env.HOME) {
    candidates.push(join(process.env.HOME, ".wrangler", "config", "default.toml"));
  }
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      const text = readFileSync(p, "utf8");
      const m = text.match(/^oauth_token\s*=\s*"([^"]+)"/m);
      if (m?.[1]?.length > 20) return m[1].trim();
    } catch {
      /* ignore */
    }
  }
  return null;
}
