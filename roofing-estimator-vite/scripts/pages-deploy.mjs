/**
 * Deploy `dist/` to Cloudflare Pages project `hd2d-closers`.
 * Ensures the Pages project exists (creates once if needed), then deploys.
 * Run after `npm run build`. Requires `npx wrangler login`.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { sanitizeEnvForWrangler } from "../../backend/scripts/wranglerEnv.mjs";

const PAGES_PROJECT = "hd2d-closers";
const PRODUCTION_BRANCH = "main";

const dir = dirname(fileURLToPath(import.meta.url));
const appRoot = join(dir, "..");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function runCapture(cmd, args) {
  return spawnSync(cmd, args, {
    cwd: appRoot,
    encoding: "utf-8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
    env: sanitizeEnvForWrangler(process.env),
  });
}

function runInherit(cmd, args) {
  return spawnSync(cmd, args, {
    cwd: appRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: sanitizeEnvForWrangler(process.env),
  });
}

function ensureProjectExists() {
  const r = runCapture(npx, [
    "wrangler",
    "pages",
    "project",
    "create",
    PAGES_PROJECT,
    "--production-branch",
    PRODUCTION_BRANCH,
  ]);
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  if (r.status === 0) {
    console.log(`[pages-deploy] Created Pages project "${PAGES_PROJECT}".`);
    return;
  }
  if (
    /already exists|already been created|409|duplicate name|Duplicate project|name is already taken|project.*already/i.test(
      out,
    )
  ) {
    console.log(`[pages-deploy] Pages project "${PAGES_PROJECT}" already exists.`);
    return;
  }
  console.error(out.trim() || `[pages-deploy] wrangler pages project create failed (exit ${r.status}).`);
  process.exit(r.status ?? 1);
}

function deploy() {
  const r = runInherit(npx, [
    "wrangler",
    "pages",
    "deploy",
    "dist",
    "--project-name",
    PAGES_PROJECT,
    "--commit-dirty",
    "true",
  ]);
  return r.status ?? 1;
}

ensureProjectExists();
const exitCode = deploy();
process.exit(exitCode);
