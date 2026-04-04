/**
 * Purge all cached content for a Cloudflare zone (fixes stale HTML at edge after domain moves).
 *
 * Requires CLOUDFLARE_API_TOKEN with Zone → Cache Purge → Purge (or zone read + cache purge).
 *
 * Usage (PowerShell):
 *   $env:CLOUDFLARE_API_TOKEN = "your_token"
 *   npm run pages:purge-cache
 */
import process from "node:process";
import { readWranglerOAuthToken } from "./cloudflare-wrangler-oauth.mjs";

const envToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
const oauth = readWranglerOAuthToken();
const TOKEN = envToken && envToken.length >= 40 ? envToken : oauth;
const ZONE_NAME = process.env.CLOUDFLARE_ZONE_NAME || "hardcoredoortodoorclosers.com";
const BASE = "https://api.cloudflare.com/client/v4";

if (!TOKEN) {
  console.error(
    "Set CLOUDFLARE_API_TOKEN, or run `npx wrangler login` so this script can use your Wrangler OAuth token.\n",
  );
  process.exit(1);
}

async function getZoneId() {
  const res = await fetch(`${BASE}/zones?name=${encodeURIComponent(ZONE_NAME)}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const data = await res.json();
  if (!data.success || !data.result?.[0]?.id) {
    console.error(JSON.stringify(data.errors ?? data, null, 2));
    process.exit(1);
  }
  return data.result[0].id;
}

async function main() {
  const zoneId = await getZoneId();
  console.log(`Purging cache for zone ${zoneId} (${ZONE_NAME})...`);
  const res = await fetch(`${BASE}/zones/${zoneId}/purge_cache`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ purge_everything: true }),
  });
  const data = await res.json();
  if (data.success) {
    console.log("OK: purge_everything");
    return;
  }
  if (res.status === 401) {
    console.warn(
      "OAuth cannot purge zone cache (needs Zone → Cache Purge). Do one of:\n" +
        "  • Cloudflare Dashboard → your zone → Caching → Configuration → Purge Everything\n" +
        "  • Set CLOUDFLARE_API_TOKEN with Cache Purge permission and re-run this script.\n",
    );
    process.exit(0);
  }
  console.error(`HTTP ${res.status}:`, JSON.stringify(data.errors ?? data, null, 2));
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
