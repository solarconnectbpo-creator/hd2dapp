#!/usr/bin/env node
/**
 * Cross-platform `uvicorn` for local dev — prefers `.venv` Python if present.
 *
 * Port: `VISION_DEV_PORT` or `PORT` (default 18090 — avoids 8090 often taken on Windows). Match `ROOF_VISION_SERVICE_URL` in backend/.dev.vars.
 * Windows: `--reload` is off by default (uvicorn reloader often hits WinError 10013 on bind).
 *   Enable with `VISION_DEV_RELOAD=1` if it works on your machine.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const portRaw =
  process.env.VISION_DEV_PORT || process.env.PORT || "18090";
const port = Number.parseInt(String(portRaw), 10);
if (!Number.isFinite(port) || port < 1 || port > 65535) {
  console.error(`Invalid port: ${portRaw}`);
  process.exit(1);
}

const win = process.platform === "win32";
const reloadExplicit = /^1|true|yes$/i.test(
  String(process.env.VISION_DEV_RELOAD || "").trim(),
);
/** On Windows, default reload off to avoid WSAEACCES / WinError 10013 on the reloader socket. */
const useReload = win ? reloadExplicit : !/^0|false|no$/i.test(String(process.env.VISION_DEV_RELOAD || "").trim()) || reloadExplicit;

function pickPython() {
  const candidates = win
    ? [path.join(root, ".venv", "Scripts", "python.exe")]
    : [
        path.join(root, ".venv", "bin", "python3"),
        path.join(root, ".venv", "bin", "python"),
      ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return process.env.PYTHON || "python";
}

const py = pickPython();
const uvicornArgs = [
  "-m",
  "uvicorn",
  "app.main:app",
  "--host",
  "127.0.0.1",
  "--port",
  String(port),
];
if (useReload) uvicornArgs.push("--reload");

if (win && !useReload) {
  console.log(
    `[ml-vision-service] http://127.0.0.1:${port} (reload off on Windows — set VISION_DEV_RELOAD=1 to enable)`,
  );
}

const child = spawn(py, uvicornArgs, {
  cwd: root,
  stdio: "inherit",
  shell: false,
  windowsHide: true,
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
