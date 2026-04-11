import { isValidEmail } from "./validation";

type GoogleJwks = { keys: Array<{ kid: string; alg?: string; kty: string; n: string; e: string }> };

let jwksCache: { keys: GoogleJwks["keys"]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000;

function base64UrlToUint8Array(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getGoogleJwksKeys(): Promise<GoogleJwks["keys"]> {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_TTL_MS) return jwksCache.keys;
  const res = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!res.ok) throw new Error(`Google JWKS fetch failed: ${res.status}`);
  const data = (await res.json()) as GoogleJwks;
  const keys = Array.isArray(data.keys) ? data.keys : [];
  jwksCache = { keys, fetchedAt: now };
  return keys;
}

export type VerifiedGoogleIdentity = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
};

function audMatches(payloadAud: unknown, clientId: string): boolean {
  if (payloadAud === clientId) return true;
  if (Array.isArray(payloadAud)) return payloadAud.includes(clientId);
  return false;
}

/**
 * Verifies a Google Sign-In ID token (JWT) for the given OAuth Web client id (`aud`).
 */
export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
): Promise<VerifiedGoogleIdentity | null> {
  const cid = clientId.trim();
  if (!cid) return null;
  const trimmed = idToken.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(".");
  if (parts.length !== 3) return null;
  const [hB64, pB64, sigB64] = parts;
  let header: { alg?: string; kid?: string };
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(hB64))) as { alg?: string; kid?: string };
    payload = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(pB64))) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (header.alg !== "RS256" || !header.kid) return null;
  const keys = await getGoogleJwksKeys();
  const jwk = keys.find((k) => k.kid === header.kid && k.kty === "RSA");
  if (!jwk?.n || !jwk?.e) return null;
  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      "jwk",
      { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
  } catch {
    return null;
  }
  let sigBytes: Uint8Array;
  try {
    sigBytes = base64UrlToUint8Array(sigB64);
  } catch {
    return null;
  }
  const signedBytes = new TextEncoder().encode(`${hB64}.${pB64}`);
  let ok = false;
  try {
    ok = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, cryptoKey, sigBytes, signedBytes);
  } catch {
    return null;
  }
  if (!ok) return null;
  if (!audMatches(payload.aud, cid)) return null;
  const iss = String(payload.iss ?? "");
  if (iss !== "https://accounts.google.com" && iss !== "accounts.google.com") return null;
  const exp = Number(payload.exp);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now() - 60_000) return null;
  const email = String(payload.email ?? "").trim().toLowerCase();
  if (!email || !isValidEmail(email)) return null;
  const sub = String(payload.sub ?? "").trim();
  if (!sub) return null;
  const email_verified = payload.email_verified === true;
  const nameRaw = String(payload.name ?? "").trim();
  const name = nameRaw || email.split("@")[0] || "User";
  return { sub, email, email_verified, name };
}
