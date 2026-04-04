#!/usr/bin/env node
/**
 * Puts a Worker secret from process.env[ENV_VAR] via stdin (Wrangler 4+ dropped --from-env).
 *
 * Usage:
 *   node scripts/wrangler-secret-put-from-env.mjs <SECRET_NAME> [ENV_VAR] [-- wrangler args...]
 *
 * If no `--` section is given, targets the top-level worker with `--env ""` (required when
 * wrangler.toml defines multiple environments).
 *
 * Examples:
 *   DEALMACHINE_API_KEY=... node scripts/wrangler-secret-put-from-env.mjs DEALMACHINE_API_KEY
 *   OPENAI_API_KEY=... node scripts/wrangler-secret-put-from-env.mjs OPENAI_API_KEY OPENAI_API_KEY -- --config wrangler.toml --env production
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeEnvForWrangler } from "./wranglerEnv.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wranglerCli = path.join(__dirname, "..", "node_modules", "wrangler", "bin", "wrangler.js");

const argv = process.argv.slice(2);
const dashIdx = argv.indexOf("--");

let secretName;
let envVar;
let wranglerExtra;

if (dashIdx >= 0) {
  const before = argv.slice(0, dashIdx);
  secretName = before[0];
  envVar = before[1] ?? secretName;
  wranglerExtra = argv.slice(dashIdx + 1);
} else {
  secretName = argv[0];
  envVar = argv[1] ?? secretName;
  wranglerExtra = argv.slice(2);
}

if (!secretName) {
  console.error(
    "Usage: node scripts/wrangler-secret-put-from-env.mjs <SECRET_NAME> [ENV_VAR] [-- wrangler args...]",
  );
  process.exit(1);
}

if (wranglerExtra.length === 0) {
  wranglerExtra = ["--env", ""];
}

const value = process.env[envVar];
if (value == null || String(value).length === 0) {
  console.error(`Missing or empty environment variable: ${envVar}`);
  process.exit(1);
}

const args = [wranglerCli, "secret", "put", secretName, ...wranglerExtra];

// Invoke via node so `--env ""` keeps an empty argv segment on Windows (no shell quoting issues).
const r = spawnSync(process.execPath, args, {
  cwd: path.join(__dirname, ".."),
  input: `${value}\n`,
  stdio: ["pipe", "inherit", "inherit"],
  shell: false,
  env: sanitizeEnvForWrangler(process.env),
  windowsHide: true,
});

if (r.error) {
  console.error(r.error);
  process.exit(1);
}

process.exit(r.status ?? 1);
