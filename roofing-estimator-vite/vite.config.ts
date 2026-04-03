import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** POST /api/raybevel-diagram — runs roof-diagram-raybevel/generate_diagram.R (requires R + raybevel). */
function raybevelDiagramPlugin(): Plugin {
  const scriptPath = path.join(__dirname, "roof-diagram-raybevel", "generate_diagram.R");
  return {
    name: "vite-plugin-raybevel-diagram",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (url !== "/api/raybevel-diagram") {
          next();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("Use POST with JSON body { \"ring\": [[x,y], ...] }");
          return;
        }
        if (!fs.existsSync(scriptPath)) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("generate_diagram.R not found");
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => {
          const body = Buffer.concat(chunks);
          const rscript = process.env.RSCRIPT_PATH || "Rscript";
          const child = spawn(rscript, ["--vanilla", scriptPath], {
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true,
          });
          child.stdin.write(body);
          child.stdin.end();
          const out: Buffer[] = [];
          const err: Buffer[] = [];
          let settled = false;
          const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            fn();
          };
          child.stdout.on("data", (d: Buffer) => out.push(d));
          child.stderr.on("data", (d: Buffer) => err.push(d));
          child.on("error", (e: NodeJS.ErrnoException) => {
            finish(() => {
              res.statusCode = 502;
              res.setHeader("Content-Type", "text/plain; charset=utf-8");
              res.end(
                e.code === "ENOENT"
                  ? `Rscript not found (set RSCRIPT_PATH or install R). ${e.message}`
                  : e.message,
              );
            });
          });
          child.on("close", (code) => {
            finish(() => {
              if (code !== 0) {
                res.statusCode = 502;
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                res.end(Buffer.concat(err).toString("utf8") || `Rscript exited with code ${code}`);
                return;
              }
              const svg = Buffer.concat(out).toString("utf8");
              res.statusCode = 200;
              res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
              res.end(svg);
            });
          });
        });
      });
    },
  };
}

/** HTTP proxies: same-origin to HD2D Worker (intel + EagleView API Center) and third-party APIs. EagleView TrueDesign uses `/intel-proxy` → Worker `/api/eagleview/apicenter/*`. */
const allowGeolocationHeader = {
  /** Lets the browser prompt for Geolocation API (Mapbox Geolocate control). */
  "Permissions-Policy": "geolocation=(self)",
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const intelProxyTarget = (env.INTEL_PROXY_TARGET || "http://127.0.0.1:8787").replace(/\/$/, "");
  const intelProxy = {
    target: intelProxyTarget,
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/intel-proxy/, ""),
    timeout: 120_000,
    proxyTimeout: 120_000,
  } as const;

  return {
  plugins: [react(), tailwindcss(), raybevelDiagramPlugin()],
  server: {
    headers: allowGeolocationHeader,
    proxy: {
      // Same-origin in dev → avoids CORS / mixed-content when the SPA is https or another host.
      "/intel-proxy": intelProxy,
      /** Google Places API (New) — browser sends X-Goog-Api-Key; dev-only CORS workaround. */
      "/google-places-api": {
        target: "https://places.googleapis.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/google-places-api/, ""),
        secure: true,
      },
      /** People Data Labs — browser sends X-Api-Key; dev CORS workaround. */
      "/pdl-api": {
        target: "https://api.peopledatalabs.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/pdl-api/, ""),
        secure: true,
      },
      /** BatchData — browser sends Authorization: Bearer; dev CORS workaround. */
      "/batchdata-api": {
        target: "https://api.batchdata.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/batchdata-api/, ""),
        secure: true,
      },
    },
  },
  preview: {
    headers: allowGeolocationHeader,
    proxy: {
      "/intel-proxy": intelProxy,
      "/google-places-api": {
        target: "https://places.googleapis.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/google-places-api/, ""),
        secure: true,
      },
      "/pdl-api": {
        target: "https://api.peopledatalabs.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/pdl-api/, ""),
        secure: true,
      },
      "/batchdata-api": {
        target: "https://api.batchdata.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/batchdata-api/, ""),
        secure: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.join(__dirname, "./src"),
    },
  },
  assetsInclude: ["**/*.svg", "**/*.csv"],
  };
});
