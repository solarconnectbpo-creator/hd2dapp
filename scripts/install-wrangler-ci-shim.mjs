/**
 * Workers Builds can deploy Workers (+ assets) but not Pages.
 * Build SPA into assets, deploy Worker, then orange-cloud apex/www DNS
 * so Worker routes serve /measurement/new instead of stale Vercel HTML.
 */
import { chmodSync, copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const binDir = join(root, "node_modules", "wrangler", "bin");
const realJs = join(binDir, "wrangler.js");
const backupJs = join(binDir, "wrangler.real.js");

if (!existsSync(realJs)) {
  console.warn("[wrangler-ci-shim] wrangler bin not found; skip");
  process.exit(0);
}

const current = readFileSync(realJs, "utf8");
if (current.includes("WRANGLER_CI_SHIM_V4")) {
  process.exit(0);
}

if (!existsSync(backupJs) || !current.includes("WRANGLER_CI_SHIM")) {
  copyFileSync(realJs, backupJs);
}

const shim = `#!/usr/bin/env node
/* WRANGLER_CI_SHIM_V4 */
const { spawnSync } = require("node:child_process");
const { existsSync, mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const real = join(__dirname, "wrangler.real.js");
const args = process.argv.slice(2);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { stdio: "inherit", shell: process.platform === "win32", ...opts });
  return r.status ?? 1;
}

const isDeploy = args[0] === "deploy";
const isVersionsUpload = args[0] === "versions" && args[1] === "upload";
const repoRoot = process.cwd();
const viteDir = join(repoRoot, "roofing-estimator-vite");
const distDir = join(viteDir, "dist");

function ensureSpaBuilt() {
  if (process.env.WRANGLER_CI_SKIP_SPA === "1") return 0;
  if (!existsSync(join(viteDir, "package.json"))) {
    mkdirSync(distDir, { recursive: true });
    writeFileSync(join(distDir, "index.html"), "<!doctype html><title>HD2D</title>");
    return 0;
  }
  console.log("[wrangler-ci-shim] building SPA for Worker static assets…");
  if (run(npm, ["ci", "--no-audit", "--no-fund"], { cwd: viteDir }) !== 0) return 1;
  if (run(npm, ["run", "build"], { cwd: viteDir }) !== 0) return 1;
  // Workers Assets rejects SPA /* redirects — strip if any slipped into dist.
  const redirects = join(distDir, "_redirects");
  if (existsSync(redirects)) {
    writeFileSync(redirects, "# managed by Worker assets SPA fallback\\n");
  }
  return 0;
}

if (isDeploy || isVersionsUpload) {
  const b = ensureSpaBuilt();
  if (b !== 0) process.exit(b);
}

const status = run(process.execPath, [real, ...args], {});
if (status !== 0) process.exit(status);

if (isVersionsUpload && process.env.WRANGLER_CI_SKIP_DEPLOY !== "1") {
  console.log("[wrangler-ci-shim] versions upload ok — deploying Worker (+ SPA assets)…");
  const dep = run(process.execPath, [real, "deploy", "--keep-vars", "true"], {});
  if (dep !== 0) process.exit(dep);
}

if ((isDeploy || isVersionsUpload) && process.env.WRANGLER_CI_SKIP_DNS !== "1") {
  const dns = join(repoRoot, "scripts", "cf-proxy-apex-for-worker.mjs");
  if (existsSync(dns)) {
    console.log("[wrangler-ci-shim] orange-clouding apex/www for Worker routes…");
    run(process.execPath, [dns], { cwd: repoRoot });
  }
}
process.exit(0);
`;

writeFileSync(realJs, shim, "utf8");
try {
  chmodSync(realJs, 0o755);
} catch {
  /* ignore */
}
console.log("[wrangler-ci-shim] installed v4 (SPA assets + proxy DNS)");
