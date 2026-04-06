/**
 * Shallow-clone https://github.com/gohugoio/hugoDocs into vendor/hugo-docs (gitignored).
 * Run from repo root: node scripts/clone-hugo-docs.mjs
 * Options: --pull  (git pull in existing clone), --force  (delete folder and re-clone)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const target = path.join(root, "vendor", "hugo-docs");
const repo = "https://github.com/gohugoio/hugoDocs.git";

const pull = process.argv.includes("--pull");
const force = process.argv.includes("--force");

function runGit(args) {
  const r = spawnSync("git", args, { stdio: "inherit", cwd: root });
  if (r.error) {
    console.error(r.error.message);
    console.error("Install Git and ensure it is on PATH.");
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (force && fs.existsSync(target)) {
  console.log("Removing:", target);
  fs.rmSync(target, { recursive: true, force: true });
}

if (fs.existsSync(target)) {
  const gitDir = path.join(target, ".git");
  if (pull && fs.existsSync(gitDir)) {
    console.log("Updating hugoDocs (git pull --ff-only)…");
    runGit(["-C", target, "pull", "--ff-only"]);
    console.log("Done. Preview with: cd vendor/hugo-docs && hugo server -D");
    process.exit(0);
  }
  console.log("Already present:", target);
  console.log("  npm run hugo:docs:sync -- --pull   # update");
  console.log("  npm run hugo:docs:sync -- --force  # delete and re-clone");
  process.exit(0);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
console.log("Cloning hugoDocs (shallow) to:\n ", target);
runGit(["clone", "--depth", "1", repo, target]);
console.log("\nNext:");
console.log("  • Dev: restart Vite — browse http://localhost:5173/hugo-docs/");
console.log("  • Or:  cd vendor/hugo-docs && hugo server -D");
