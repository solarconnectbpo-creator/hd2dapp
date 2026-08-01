/**
 * Ensure apex + www DNS records on the Cloudflare zone are proxied (orange cloud)
 * so Worker routes can intercept traffic currently aimed at Vercel.
 *
 * Uses CLOUDFLARE_API_TOKEN from Workers Builds.
 */
const ZONE_NAME = process.env.CLOUDFLARE_ZONE_NAME || "hardcoredoortodoorclosers.com";
const HOSTS = new Set([ZONE_NAME, `www.${ZONE_NAME}`]);
const token = (process.env.CLOUDFLARE_API_TOKEN || "").trim();
if (!token) {
  console.warn("[cf-proxy-apex] CLOUDFLARE_API_TOKEN missing; skip");
  process.exit(0);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function api(path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  const json = await res.json();
  if (!json.success) {
    const err = JSON.stringify(json.errors || json);
    // Workers Builds tokens often lack Zone DNS Edit — do not fail the deploy.
    console.warn(`[cf-proxy-apex] API error (non-fatal): ${err}`);
    process.exit(0);
  }
  return json;
}

try {
  const zones = await api(`/zones?name=${encodeURIComponent(ZONE_NAME)}`);
  const zone = zones.result?.[0];
  if (!zone) {
    console.warn("[cf-proxy-apex] zone not found");
    process.exit(0);
  }

  const recs = await api(`/zones/${zone.id}/dns_records?per_page=100`);
  let updated = 0;
  for (const rec of recs.result || []) {
    const name = (rec.name || "").replace(/\.$/, "").toLowerCase();
    if (!HOSTS.has(name)) continue;
    if (rec.proxied === true) {
      console.log(`[cf-proxy-apex] already proxied: ${name} (${rec.type})`);
      continue;
    }
    if (rec.type !== "A" && rec.type !== "AAAA" && rec.type !== "CNAME") continue;
    await api(`/zones/${zone.id}/dns_records/${rec.id}`, {
      method: "PUT",
      body: JSON.stringify({
        type: rec.type,
        name: rec.name,
        content: rec.content,
        ttl: 1,
        proxied: true,
      }),
    });
    console.log(`[cf-proxy-apex] proxied ${name} (${rec.type} → ${rec.content})`);
    updated += 1;
  }
  console.log(`[cf-proxy-apex] done; updated=${updated}`);
} catch (e) {
  console.warn(`[cf-proxy-apex] skipped: ${e?.message || e}`);
  process.exit(0);
}
