/**
 * Attach custom domain(s) to Cloudflare Pages project `hd2d-closers` via API.
 *
 * Auth (first match):
 *   - CLOUDFLARE_API_TOKEN — 40+ chars; Account → Cloudflare Pages → Edit
 *   - Else: Wrangler OAuth token from ~/.wrangler/config (after `npx wrangler login`)
 *
 * DNS: if the API reports "CNAME record not set", add CNAME @ → hd2d-closers.pages.dev in the zone (or use Dashboard DNS wizard).
 *
 * CLOUDFLARE_ACCOUNT_ID — optional; defaults to the account used in repo docs for this zone
 *
 * Usage (PowerShell):
 *   $env:CLOUDFLARE_API_TOKEN = "your_token"
 *   node scripts/cloudflare-pages-add-domain.mjs
 *
 * Docs: https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/domains/methods/create/
 */
import process from "node:process";
import { readWranglerOAuthToken } from "./cloudflare-wrangler-oauth.mjs";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "2b2f31d4f2fd46db5be5d72e772ecac5";
const PROJECT_NAME = "hd2d-closers";
const DOMAINS = ["hardcoredoortodoorclosers.com", "www.hardcoredoortodoorclosers.com"];

/** Prefer a real API token (40+ chars); short env values are ignored so Wrangler OAuth is used. */
const envToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
const oauth = readWranglerOAuthToken();
const TOKEN = envToken && envToken.length >= 40 ? envToken : oauth;

const BASE = "https://api.cloudflare.com/client/v4";

if (!TOKEN) {
  console.error(
    "Set CLOUDFLARE_API_TOKEN (40+ chars), or run `npx wrangler login` so this script can use your Wrangler OAuth token.\n" +
      "Dashboard tokens: My Profile → API Tokens → Account → Cloudflare Pages → Edit.\n",
  );
  process.exit(1);
}

async function addDomain(name) {
  const url = `${BASE}/accounts/${ACCOUNT_ID}/pages/projects/${encodeURIComponent(PROJECT_NAME)}/domains`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  let failed = false;
  for (const name of DOMAINS) {
    console.log(`Adding domain ${name} to Pages project ${PROJECT_NAME}...`);
    const { status, data } = await addDomain(name);
    if (data.success) {
      console.log(`  OK: ${name} — status: ${data.result?.status ?? "?"}`);
      if (data.result?.validation_data) {
        console.log(`  Validation: ${JSON.stringify(data.result.validation_data, null, 2)}`);
      }
    } else {
      failed = true;
      console.error(`  HTTP ${status}:`, JSON.stringify(data.errors ?? data, null, 2));
      const msg = JSON.stringify(data.errors ?? []);
      if (/already|duplicate|exists/i.test(msg)) {
        console.log(`  (If the domain is already on this project, you can ignore this error.)`);
        failed = false;
      }
    }
  }

  console.log(
    "\nNext steps:\n" +
      "• If custom domains stay \"Pending\" with \"CNAME record not set\": Dashboard → DNS → Records → add CNAME\n" +
      "  @ → hd2d-closers.pages.dev and www → hd2d-closers.pages.dev (proxy on). Remove conflicting A/CNAME rows first.\n" +
      "• After DNS is active: Caching → Configuration → Purge Everything if the browser still shows old HTML.\n" +
      "• Remove duplicate custom domains from other Pages projects or Vercel if the same hostname is claimed twice.\n",
  );
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
