#!/usr/bin/env node
/**
 * Run `wrangler` with env sanitized so invalid CLOUDFLARE_API_TOKEN does not block OAuth.
 * Omit `--env` for default/top-level config (Wrangler may warn if multiple envs exist; that is OK).
 */
import { spawnSync } from "node:child_process";
import { sanitizeEnvForWrangler } from "./wranglerEnv.mjs";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/wrangler-run.mjs <wrangler-args...>");
  process.exit(1);
}

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const r = spawnSync(npx, ["wrangler", ...args], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: sanitizeEnvForWrangler(process.env),
});

process.exit(r.status ?? 1);
