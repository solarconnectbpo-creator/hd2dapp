/**
 * Cloudflare Workers Builds runs: `npx wrangler versions upload`
 * That only uploads a version — it does NOT shift production traffic.
 *
 * This prepare hook wraps the local wrangler CLI so a successful
 * `versions upload` is followed by:
 *   1) `wrangler deploy --keep-vars true` (API to 100% traffic)
 *   2) Vite build + `wrangler pages deploy` (SPA → hd2d-closers)
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
if (current.includes("WRANGLER_CI_SHIM_V2")) {
  process.exit(0);
}

if (!existsSync(backupJs)) {
  copyFileSync(realJs, backupJs);
} else if (!current.includes("WRANGLER_CI_SHIM")) {
  // Real binary was restored by a fresh install; refresh backup.
  copyFileSync(realJs, backupJs);
}

const shim = `#!/usr/bin/env node
/* WRANGLER_CI_SHIM_V2 */
const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join } = require("node:path");
const real = join(__dirname, "wrangler.real.js");
const args = process.argv.slice(2);

function run(cmd, cmdArgs, opts) {
  const r = spawnSync(cmd, cmdArgs, { stdio: "inherit", shell: process.platform === "win32", ...opts });
  return r.status ?? 1;
}

const status = run(process.execPath, [real, ...args], {});
if (status !== 0) process.exit(status);

const isVersionsUpload = args[0] === "versions" && args[1] === "upload";
if (!isVersionsUpload || process.env.WRANGLER_CI_SKIP_DEPLOY === "1") process.exit(0);

console.log("[wrangler-ci-shim] versions upload ok — deploying Worker to 100% production…");
const dep = run(process.execPath, [real, "deploy", "--keep-vars", "true"], {});
if (dep !== 0) process.exit(dep);

if (process.env.WRANGLER_CI_SKIP_PAGES === "1") process.exit(0);

const repoRoot = process.cwd();
const viteDir = join(repoRoot, "roofing-estimator-vite");
const pkg = join(viteDir, "package.json");
if (!existsSync(pkg)) {
  console.warn("[wrangler-ci-shim] roofing-estimator-vite missing; skip Pages deploy");
  process.exit(0);
}

console.log("[wrangler-ci-shim] building SPA for Cloudflare Pages…");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
if (run(npm, ["ci", "--no-audit", "--no-fund"], { cwd: viteDir }) !== 0) process.exit(1);
if (run(npm, ["run", "build"], { cwd: viteDir }) !== 0) process.exit(1);

console.log("[wrangler-ci-shim] deploying SPA to Pages project hd2d-closers…");
const pages = run(
  process.execPath,
  [real, "pages", "deploy", "dist", "--project-name", "hd2d-closers", "--commit-dirty", "true"],
  { cwd: viteDir },
);
if (pages !== 0) process.exit(pages);

// Best-effort: point apex DNS at Pages when the build token can edit DNS.
const dnsScript = join(viteDir, "scripts", "fix-apex-dns-for-pages.mjs");
if (existsSync(dnsScript)) {
  console.log("[wrangler-ci-shim] attempting apex DNS → Pages…");
  run(process.execPath, [dnsScript], { cwd: viteDir });
}
process.exit(0);
`;

writeFileSync(realJs, shim, "utf8");
try {
  chmodSync(realJs, 0o755);
} catch {
  /* ignore */
}
console.log("[wrangler-ci-shim] installed v2 (versions upload → worker deploy → pages deploy)");
