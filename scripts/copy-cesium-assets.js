/**
 * Copy Cesium Build/Cesium into public/cesium so the web app can load Workers/Assets.
 * Run via npm postinstall or: node scripts/copy-cesium-assets.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "node_modules", "cesium", "Build", "Cesium");
const dest = path.join(root, "public", "cesium");

if (!fs.existsSync(src)) {
  console.warn("copy-cesium-assets: Cesium not installed (skip).");
  process.exit(0);
}

try {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log("copy-cesium-assets: copied to public/cesium");
} catch (e) {
  console.warn("copy-cesium-assets failed:", e?.message || e);
  process.exit(0);
}
