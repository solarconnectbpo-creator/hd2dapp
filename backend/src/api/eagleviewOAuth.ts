type UnknownEnv = Record<string, unknown>;

export type EagleViewTokenResult =
  | {
      ok: true;
      token: string;
      expiresInSec: number;
    }
  | {
      ok: false;
      error: string;
    };

export type EagleViewTokenConfig = {
  cacheKey: string;
  clientIdKeys: string[];
  clientSecretKeys: string[];
  tokenUrlKeys: string[];
  scopeKeys?: string[];
  staticTokenKeys?: string[];
  defaultTokenUrl: string;
};

const tokenCache = new Map<string, { token: string; expMs: number; expiresInSec: number }>();

function fromEnv(env: UnknownEnv, keys: string[]): string {
  for (const k of keys) {
    const v = env[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function summarizeOAuthError(data: Record<string, unknown>): string {
  const pieces: string[] = [];
  const knownKeys = [
    "error",
    "error_description",
    "errorSummary",
    "errorDescription",
    "errorCode",
  ] as const;
  for (const key of knownKeys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      pieces.push(value.trim());
    } else if (typeof value === "number") {
      pieces.push(String(value));
    }
  }
  return pieces.filter(Boolean).slice(0, 2).join(" | ");
}

function toBase64Basic(user: string, pass: string): string {
  const pair = `${user}:${pass}`;
  if (typeof btoa === "function") {
    const bytes = new TextEncoder().encode(pair);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  }
  return Buffer.from(pair, "utf8").toString("base64");
}

export async function getEagleViewServiceBearer(
  env: UnknownEnv,
  cfg: EagleViewTokenConfig,
): Promise<EagleViewTokenResult> {
  const staticToken = fromEnv(env, cfg.staticTokenKeys ?? []);
  if (staticToken) return { ok: true, token: staticToken, expiresInSec: 3600 };

  const clientId = fromEnv(env, cfg.clientIdKeys);
  const clientSecret = fromEnv(env, cfg.clientSecretKeys);
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      error:
        "Missing EagleView client credentials. Set client_id and client_secret secrets for this Worker.",
    };
  }

  const now = Date.now();
  const cached = tokenCache.get(cfg.cacheKey);
  if (cached && cached.expMs > now + 60_000) {
    return { ok: true, token: cached.token, expiresInSec: cached.expiresInSec };
  }

  const tokenUrl = fromEnv(env, cfg.tokenUrlKeys) || cfg.defaultTokenUrl;
  const scope = fromEnv(env, cfg.scopeKeys ?? []);

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  if (scope) body.set("scope", scope);

  const basic = toBase64Basic(clientId, clientSecret);
  let res: Response;
  try {
    res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
  } catch (e) {
    console.error("EagleView token fetch failed:", e);
    return { ok: false, error: "Failed to contact EagleView auth service." };
  }

  const raw = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return { ok: false, error: "EagleView auth service returned non-JSON response." };
  }

  if (!res.ok) {
    console.error("EagleView token error:", res.status, data);
    const serviceError = summarizeOAuthError(data);
    if (res.status === 401) {
      return {
        ok: false,
        error: serviceError
          ? `EagleView auth rejected client credentials (401): ${serviceError}`
          : "EagleView auth rejected client credentials (401).",
      };
    }
    if (res.status === 400 && serviceError) {
      return {
        ok: false,
        error: `EagleView auth request malformed (400): ${serviceError}`,
      };
    }
    return {
      ok: false,
      error: serviceError
        ? `EagleView auth request failed (${res.status}): ${serviceError}`
        : `EagleView auth request failed (${res.status}).`,
    };
  }

  const access = data.access_token;
  const expiresInSec = Number(data.expires_in ?? 3600);
  if (typeof access !== "string" || !access) {
    return { ok: false, error: "EagleView auth response missing access_token." };
  }

  const ttl = Math.max(120, Number.isFinite(expiresInSec) ? expiresInSec : 3600);
  tokenCache.set(cfg.cacheKey, {
    token: access,
    expMs: now + ttl * 1000,
    expiresInSec: ttl,
  });

  return { ok: true, token: access, expiresInSec: ttl };
}
