/**
 * Base URL for the HD2D Cloudflare Worker (intel, BatchData proxy, AI routes, etc.).
 * Mirrors historical App.tsx / canvassingIntel rules: env override, then dev proxy, then local wrangler.
 */

const RAW = import.meta.env.VITE_INTEL_API_BASE;

export function getHd2dApiBase(): string {
  return (
    typeof RAW === "string" && RAW.trim()
      ? RAW.trim()
      : import.meta.env.DEV
        ? "/intel-proxy"
        : "http://localhost:8787"
  ).replace(/\/$/, "");
}
