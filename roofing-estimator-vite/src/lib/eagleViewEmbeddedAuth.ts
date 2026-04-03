import { getHd2dApiBase } from "./hd2dApiBase";

type TokenResponse = {
  success?: boolean;
  access_token?: string;
  expires_in?: number;
  error?: string;
  detail?: string;
};

function buildTokenErrorMessage(status: number, data: TokenResponse): string {
  const raw = data.error || data.detail || "";
  const text = raw.toLowerCase();
  if (status === 503 && text.includes("not configured")) {
    return "EagleView map token service is not configured on backend. Add EAGLEVIEW_EMBEDDED_CLIENT_ID and EAGLEVIEW_EMBEDDED_CLIENT_SECRET on the Worker.";
  }
  if (status === 503 && (text.includes("rejected") || text.includes("(401)"))) {
    return "EagleView map credentials were rejected by auth service (401). Verify embedded client ID/secret and token URL in backend secrets.";
  }
  if (status >= 500) {
    return `EagleView map token service error (${status}). Check backend /api/eagleview/embedded/token logs.`;
  }
  if (status === 404) {
    return "EagleView token route is missing on backend (/api/eagleview/embedded/token).";
  }
  if (raw) return raw;
  return `Embedded token endpoint failed (${status}). Configure EagleView credentials on backend.`;
}

let tokenCache: { token: string; expMs: number } | null = null;

export function clearEagleViewEmbeddedTokenCache(): void {
  tokenCache = null;
}

export async function getEagleViewEmbeddedAuthToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expMs > now + 60_000) return tokenCache.token;

  const apiBase = getHd2dApiBase().replace(/\/$/, "");
  if (!apiBase) {
    throw new Error(
      "HD2D API base is not configured. Set VITE_INTEL_API_BASE (or run dev with /intel-proxy).",
    );
  }

  const url = `${apiBase}/api/eagleview/embedded/token`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const raw = await res.text();
  let data: TokenResponse = {};
  try {
    data = raw ? (JSON.parse(raw) as TokenResponse) : {};
  } catch {
    throw new Error(`Embedded token endpoint returned invalid JSON (${res.status}).`);
  }
  if (!res.ok || data.success === false || typeof data.access_token !== "string") {
    throw new Error(buildTokenErrorMessage(res.status, data));
  }

  const ttl = Math.max(120, Number(data.expires_in ?? 3600));
  tokenCache = { token: data.access_token, expMs: now + ttl * 1000 };
  return data.access_token;
}
