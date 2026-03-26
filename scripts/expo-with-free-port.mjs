/**
 * Starts Expo on a free TCP port when none is specified, so non-interactive
 * terminals (CI, IDE) don't exit with "port in use" prompts.
 *
 * Port checks mirror @expo/cli/src/utils/freeport.ts (null + localhost), not
 * a single 0.0.0.0 bind — otherwise we can pick a port Metro/Expo still treats
 * as busy on Windows.
 */
import { execFile, spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const expoCli = path.join(root, "node_modules", "expo", "bin", "cli");

const PORT_MAX = 65535;
/** Same host list as Expo `freePortAsync(..., [null, 'localhost'])`. */
const TEST_HOSTS = [null, "localhost"];

async function testHostPortAsync(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    const opts = host == null ? { port } : { port, host };
    server.listen(opts, () => {
      server.once("close", () => {
        setTimeout(() => resolve(true), 0);
      });
      server.close();
    });
    server.once("error", () => {
      setTimeout(() => resolve(false), 0);
    });
  });
}

async function testPortAsync(port) {
  for (const host of TEST_HOSTS) {
    if (!(await testHostPortAsync(port, host))) return false;
  }
  return true;
}

async function findFreePort(from, to = PORT_MAX) {
  for (let p = from; p <= to; p++) {
    if (await testPortAsync(p)) return p;
  }
  throw new Error(`No free TCP port in range ${from}-${to}`);
}

function parseArgs(argv) {
  const out = [];
  let i = 0;
  let explicitPort = null;
  while (i < argv.length) {
    const a = argv[i];
    if (a === "--port" || a === "-p") {
      const v = argv[i + 1];
      if (v !== undefined && !v.startsWith("-")) {
        const n = Number(v);
        if (Number.isFinite(n) && n >= 1 && n <= PORT_MAX) explicitPort = n;
        i += 2;
        continue;
      }
    }
    out.push(a);
    i++;
  }
  return { userArgs: out, explicitPort };
}

function attachExit(child) {
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
}

const raw = process.argv.slice(2);
const { userArgs, explicitPort } = parseArgs(raw);
const isHelp = userArgs.includes("--help") || userArgs.includes("-h");
const wantsWeb = userArgs.includes("--web");

if (isHelp) {
  const child = spawn(process.execPath, [expoCli, "start", ...userArgs], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  attachExit(child);
} else {
  (async () => {
    const port =
      explicitPort != null
        ? (await testPortAsync(explicitPort)
            ? explicitPort
            : await findFreePort(explicitPort + 1))
        : await findFreePort(8081);

    const p = String(port);
    const env = {
      ...process.env,
      RCT_METRO_PORT: p,
      PORT: p,
      WEB_PORT: p,
    };

    console.error(
      `\n[expo-with-free-port] Dev server port ${p} → http://localhost:${p}\n`,
    );

    const child = spawn(
      process.execPath,
      [expoCli, "start", "--port", p, ...userArgs],
      { cwd: root, stdio: "inherit", env },
    );

    if (
      wantsWeb &&
      !process.env.CI &&
      process.env.BROWSER !== "none" &&
      process.env.EXPO_NO_OPEN !== "1"
    ) {
      const url = `http://localhost:${port}`;
      const delayMs = 9000;
      setTimeout(() => {
        if (process.platform === "win32") {
          execFile(
            "cmd",
            ["/c", "start", "", url],
            { windowsHide: true },
            () => {},
          );
        } else if (process.platform === "darwin") {
          execFile("open", [url], () => {});
        } else {
          execFile("xdg-open", [url], () => {});
        }
      }, delayMs);
    }

    attachExit(child);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
