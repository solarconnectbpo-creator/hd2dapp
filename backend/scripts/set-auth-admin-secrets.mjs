#!/usr/bin/env node
/**
 * Reads AUTH_ADMIN_EMAIL, AUTH_ADMIN_PASSWORD, AUTH_ADMIN_NAME from backend/.dev.vars
 * and runs `wrangler secret put` for each (top-level Worker, --env "").
 *
 * Prerequisites: `npx wrangler login` (or a valid CLOUDFLARE_API_TOKEN with Workers edit).
 *
 * Usage: npm run secret:auth-admin   (from backend/)
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { sanitizeEnvForWrangler } from "./wranglerEnv.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const devVarsPath = join(root, ".dev.vars");

if (!existsSync(devVarsPath)) {
  console.error("Missing .dev.vars — copy .dev.vars.example and set AUTH_ADMIN_*.");
  process.exit(1);
}

const text = readFileSync(devVarsPath, "utf8");
function getVar(key) {
  const re = new RegExp(`^${key}=(.*)$`, "m");
  const m = text.match(re);
  return m ? m[1].trim() : "";
}

const keys = [
  ["AUTH_ADMIN_EMAIL", getVar("AUTH_ADMIN_EMAIL")],
  ["AUTH_ADMIN_PASSWORD", getVar("AUTH_ADMIN_PASSWORD")],
  ["AUTH_ADMIN_NAME", getVar("AUTH_ADMIN_NAME")],
];

for (const [key, value] of keys) {
  if (!value) {
    console.error(`Missing ${key} in .dev.vars`);
    process.exit(1);
  }
}

for (const [key, value] of keys) {
  console.log(`Setting secret ${key}...`);
  // Single shell line so `--env=""` survives on Windows (empty argv after `--env` breaks wrangler).
  const cmd = `npx wrangler secret put ${key} --env=""`;
  const r = spawnSync(cmd, {
    cwd: root,
    input: value,
    encoding: "utf8",
    shell: true,
    stdio: ["pipe", "inherit", "inherit"],
    env: sanitizeEnvForWrangler(process.env),
  });
  if (r.status !== 0) {
    console.error(`Failed to set ${key} (exit ${r.status}). Run: npx wrangler login`);
    process.exit(r.status ?? 1);
  }
}

console.log("Done. Redeploy the Worker if you want this deployment to pick up new bindings: npm run deploy");
