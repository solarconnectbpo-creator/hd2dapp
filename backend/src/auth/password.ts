/**
 * PBKDF2-SHA256 password hashing for D1-stored users (Web Crypto).
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const DERIVED_BITS = 256;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, "");
  if (clean.length % 2 !== 0) throw new Error("Invalid hex length.");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function hashPassword(password: string): Promise<{ saltHex: string; hashHex: string }> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    DERIVED_BITS,
  );
  return { saltHex: bytesToHex(salt), hashHex: bytesToHex(new Uint8Array(derived)) };
}

export async function verifyPassword(password: string, saltHex: string, hashHex: string): Promise<boolean> {
  const enc = new TextEncoder();
  const salt = hexToBytes(saltHex);
  const expected = hexToBytes(hashHex);
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    DERIVED_BITS,
  );
  const actual = new Uint8Array(derived);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
