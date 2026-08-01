/**
 * Cloudflare Workers Builds runs: `npx wrangler versions upload`
 * That only uploads a version — it does NOT shift production traffic.
 *
 * This prepare hook wraps the local wrangler CLI so a successful
 * `versions upload` is followed by `wrangler deploy --keep-vars true`
 * (100% production), which is what we need for api.hardcoredoortodoorclosers.com.
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

// Already shimmed?
const current = readFileSync(realJs, "utf8");
if (current.includes("WRANGLER_CI_SHIM")) {
  process.exit(0);
}

if (!existsSync(backupJs)) {
  copyFileSync(realJs, backupJs);
}

const shim = `#!/usr/bin/env node
/* WRANGLER_CI_SHIM */
const { spawnSync } = require("node:child_process");
const { join } = require("node:path");
const real = join(__dirname, "wrangler.real.js");
const args = process.argv.slice(2);
const run = spawnSync(process.execPath, [real, ...args], { stdio: "inherit" });
if (run.status !== 0) process.exit(run.status ?? 1);
const isVersionsUpload = args[0] === "versions" && args[1] === "upload";
if (isVersionsUpload && process.env.WRANGLER_CI_SKIP_DEPLOY !== "1") {
  console.log("[wrangler-ci-shim] versions upload ok — deploying to 100% production traffic…");
  const dep = spawnSync(
    process.execPath,
    [real, "deploy", "--keep-vars", "true"],
    { stdio: "inherit" },
  );
  process.exit(dep.status ?? 1);
}
`;

writeFileSync(realJs, shim, "utf8");
try {
  chmodSync(realJs, 0o755);
} catch {
  /* windows / restricted fs */
}
console.log("[wrangler-ci-shim] installed (versions upload → deploy)");
