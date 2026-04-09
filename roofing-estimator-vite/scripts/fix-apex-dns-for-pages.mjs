/**
 * Point apex (and optionally www) at Cloudflare Pages project hd2d-closers.
 *
 * Auth (first match):
 * 1. Legacy Global API Key: CLOUDFLARE_EMAIL + CLOUDFLARE_GLOBAL_API_KEY (or CLOUDFLARE_API_KEY)
 * 2. API Token: CLOUDFLARE_API_TOKEN (Bearer, Zone DNS Edit)
 * 3. Wrangler OAuth (Bearer — often cannot edit DNS)
 *
 * Optional: CLOUDFLARE_ZONE_NAME (default hardcoredoortodoorclosers.com)
 * Loads CLOUDFLARE_* from .env / .env.local in app root (gitignored).
 *
 * Usage: npm run pages:fix-dns
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { readWranglerOAuthToken } from "./cloudflare-wrangler-oauth.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, "..");

const ZONE_NAME = process.env.CLOUDFLARE_ZONE_NAME || "hardcoredoortodoorclosers.com";
const PAGES_CNAME_TARGET = (process.env.HD2D_PAGES_CNAME_TARGET || "hd2d-closers.pages.dev").replace(/\.$/, "");
const BASE = "https://api.cloudflare.com/client/v4";

const VERCEL_A = "76.76.21.21";

function tryLoadEnv() {
  for (const f of [join(appRoot, ".env.local"), join(appRoot, ".env")]) {
    if (!existsSync(f)) continue;
    try {
      const text = readFileSync(f, "utf8");
      for (const line of text.split("\n")) {
        const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
        if (!m) continue;
        const key = m[1];
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (
          key === "CLOUDFLARE_API_TOKEN" ||
          key === "CLOUDFLARE_EMAIL" ||
          key === "CLOUDFLARE_GLOBAL_API_KEY" ||
          key === "CLOUDFLARE_API_KEY"
        ) {
          if (v) process.env[key] = v;
        }
      }
    } catch {
      /* ignore */
    }
  }
}

tryLoadEnv();

function getAuth() {
  const email = process.env.CLOUDFLARE_EMAIL?.trim();
  const globalKey =
    process.env.CLOUDFLARE_GLOBAL_API_KEY?.trim() || process.env.CLOUDFLARE_API_KEY?.trim();
  if (email && globalKey) {
    return { kind: "legacy", email, key: globalKey };
  }
  const envToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const bearer = envToken && envToken.length >= 20 ? envToken : readWranglerOAuthToken();
  if (bearer) {
    return { kind: "bearer", token: bearer };
  }
  return null;
}

function vercelish(record) {
  const c = (record.content || "").toLowerCase();
  if (record.type === "A" && c === VERCEL_A) return true;
  if (record.type === "AAAA" && /vercel|76\.76\.21/i.test(c)) return true;
  if (record.type === "CNAME" && /vercel-dns\.com|vercel\.com/i.test(c)) return true;
  return false;
}

function normalizeName(name, zoneName) {
  const n = (name || "").toLowerCase().replace(/\.$/, "");
  if (n === "@") return zoneName;
  return n;
}

function isApexName(name, zoneName) {
  const n = normalizeName(name, zoneName);
  return n === zoneName;
}

function isWwwName(name, zoneName) {
  return normalizeName(name, zoneName) === `www.${zoneName}`;
}

/** @param {{ kind: 'legacy', email: string, key: string } | { kind: 'bearer', token: string }} auth */
async function api(method, path, body, auth) {
  /** @type {Record<string, string>} */
  const headers = { "Content-Type": "application/json" };
  if (auth.kind === "legacy") {
    headers["X-Auth-Email"] = auth.email;
    headers["X-Auth-Key"] = auth.key;
  } else {
    headers.Authorization = `Bearer ${auth.token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

function pagesCname(record, zoneName) {
  if (record.type !== "CNAME") return false;
  if (!isApexName(record.name, zoneName)) return false;
  const c = (record.content || "").toLowerCase().replace(/\.$/, "");
  return c === PAGES_CNAME_TARGET || c.endsWith(".pages.dev");
}

async function main() {
  const auth = getAuth();
  if (!auth) {
    console.error(
      "Set credentials in roofing-estimator-vite/.env.local (gitignored), e.g.:\n" +
        "  CLOUDFLARE_EMAIL=your@cloudflare-login-email\n" +
        "  CLOUDFLARE_GLOBAL_API_KEY=…   (Global API Key from dashboard)\n" +
        "or use a scoped API token:\n" +
        "  CLOUDFLARE_API_TOKEN=…\n",
    );
    process.exit(1);
  }

  const z = await api("GET", `/zones?name=${encodeURIComponent(ZONE_NAME)}`, undefined, auth);
  if (!z.data.success || !z.data.result?.[0]?.id) {
    console.error("Zone not found:", JSON.stringify(z.data.errors ?? z.data, null, 2));
    process.exit(1);
  }
  const zoneId = z.data.result[0].id;
  console.log(`Zone ${zoneId} (${ZONE_NAME}) [auth: ${auth.kind === "legacy" ? "Global API Key" : "Bearer"}]\n`);

  const list = await api("GET", `/zones/${zoneId}/dns_records?per_page=500`, undefined, auth);
  if (!list.data.success) {
    const err = list.data.errors?.[0];
    if (err?.code === 10000 || list.status === 401 || list.status === 403) {
      console.error(
        "Cannot read DNS (auth failed or insufficient scope).\n" +
          "For Global API Key use CLOUDFLARE_EMAIL + CLOUDFLARE_GLOBAL_API_KEY.\n" +
          "For API Token use Zone → DNS → Edit + Zone → Zone → Read.\n",
      );
    } else {
      console.error(JSON.stringify(list.data.errors ?? list.data, null, 2));
    }
    process.exit(1);
  }

  const records = list.data.result || [];

  const apexVercel = records.filter((r) => isApexName(r.name, ZONE_NAME) && vercelish(r));
  const wwwVercel = records.filter((r) => isWwwName(r.name, ZONE_NAME) && vercelish(r));
  const toDelete = [...apexVercel, ...wwwVercel];

  for (const r of toDelete) {
    const del = await api("DELETE", `/zones/${zoneId}/dns_records/${r.id}`, undefined, auth);
    if (del.data.success) {
      console.log(`Deleted ${r.type} ${r.name} → ${r.content}`);
    } else {
      console.error(`Failed to delete ${r.id}:`, JSON.stringify(del.data.errors ?? del.data, null, 2));
      process.exit(1);
    }
  }

  if (toDelete.length === 0) {
    console.log("No Vercel apex/www DNS rows found.");
  }

  const list2 = await api("GET", `/zones/${zoneId}/dns_records?per_page=500`, undefined, auth);
  const rec2 = list2.data.result || [];
  const apexHasPages = rec2.some((r) => pagesCname(r, ZONE_NAME));

  if (!apexHasPages) {
    const conflicting = rec2.filter((r) => isApexName(r.name, ZONE_NAME) && (r.type === "A" || r.type === "AAAA"));
    const nonVercel = conflicting.filter((r) => !vercelish(r));
    if (nonVercel.length > 0) {
      console.log(
        "\nApex has non-Vercel A/AAAA records; not auto-adding CNAME (resolve manually):\n" +
          nonVercel.map((r) => `  ${r.type} ${r.name} → ${r.content}`).join("\n"),
      );
    } else {
      const create = await api(
        "POST",
        `/zones/${zoneId}/dns_records`,
        {
          type: "CNAME",
          name: ZONE_NAME,
          content: PAGES_CNAME_TARGET,
          proxied: true,
          ttl: 1,
        },
        auth,
      );
      if (create.data.success) {
        console.log(`\nCreated CNAME ${ZONE_NAME} → ${PAGES_CNAME_TARGET} (proxied)`);
      } else {
        console.error("Could not create apex CNAME:", JSON.stringify(create.data.errors ?? create.data, null, 2));
        process.exit(1);
      }
    }
  } else {
    console.log(`\nApex already has a CNAME to Pages (*.pages.dev).`);
  }

  console.log(
    "\nNext:\n" +
      "• Workers & Pages → hd2d-closers → Custom domains — hardcoredoortodoorclosers.com should be Active.\n" +
      "• Caching → Purge Everything.\n" +
      "• npm run pages:check-origin (from your machine)\n" +
      "• Rotate this API key in Cloudflare — never commit keys or paste them in chat.\n",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

