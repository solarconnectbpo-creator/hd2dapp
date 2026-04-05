#!/usr/bin/env node
/**
 * Smoke test: GET {WORKER}/api/health
 *
 * Usage:
 *   WORKER_SMOKE_URL=https://your-worker.workers.dev node scripts/health-smoke.mjs
 *   node scripts/health-smoke.mjs https://your-worker.workers.dev
 */

const base = (process.env.WORKER_SMOKE_URL || process.argv[2] || "").replace(/\/$/, "");
if (!base) {
  console.error("Set WORKER_SMOKE_URL or pass origin as first argument.");
  process.exit(1);
}

const url = `${base}/api/health`;
const res = await fetch(url, { headers: { Accept: "application/json" } });
const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  console.error(`Non-JSON response (${res.status}):`, text.slice(0, 200));
  process.exit(1);
}

if (!res.ok || json.ok !== true) {
  console.error("Health check failed:", res.status, json);
  process.exit(1);
}

console.log("OK", url, json.status || "");
