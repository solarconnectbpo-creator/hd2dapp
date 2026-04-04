export type AuthRole = "admin" | "company" | "sales_rep";

export type AuthUser = { id: string; email: string; name: string; user_type: AuthRole };

export type AuthTokenPayload = {
  sub: string;
  email: string;
  user_type: AuthRole;
  exp: number;
};

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export async function signAuthPayload(payload: AuthTokenPayload, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const sig = toBase64Url(new Uint8Array(sigBuf));
  return `${body}.${sig}`;
}

export async function verifyAuthToken(token: string, secret: string): Promise<AuthTokenPayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify("HMAC", key, fromBase64Url(sig), enc.encode(body));
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as AuthTokenPayload;
    if (!payload?.sub || !payload?.email || !payload?.user_type || !payload?.exp) return null;
    if (Date.now() >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
