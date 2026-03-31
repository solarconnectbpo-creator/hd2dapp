/**
 * `import.meta.env.DEV` is false for `vite preview` and production builds, even on localhost.
 * Dev and preview register `/google-places-api`, `/pdl-api`, `/batchdata-api` — use them whenever
 * the app is served from this machine so the browser stays same-origin (avoids CORS "Failed to fetch").
 */
function isPrivateLanHostname(hostname: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!m) return false;
  const a = Number(m[1]),
    b = Number(m[2]);
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

/** Not a React hook — avoids `use*` name so eslint `react-hooks/rules-of-hooks` stays quiet in plain modules. */
export function isViteDevProxyOrigin(): boolean {
  if (import.meta.env.VITE_USE_API_PROXY === "true") return true;
  if (import.meta.env.VITE_USE_API_PROXY === "false") return false;
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") return true;
  /** `vite preview --host` — same-origin proxy still works on LAN IP */
  if (isPrivateLanHostname(h) && import.meta.env.VITE_LAN_USE_API_PROXY !== "false") return true;
  return false;
}
