/**
 * Verify Stripe webhook `Stripe-Signature` header (HMAC SHA-256) in Workers without the Stripe SDK.
 * @see https://stripe.com/docs/webhooks/signatures
 */
function decodeWebhookSecret(secret: string): Uint8Array {
  const s = secret.trim();
  if (s.startsWith("whsec_")) {
    const b64 = s.slice(6);
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  return new TextEncoder().encode(s);
}

export async function verifyStripeWebhookSignature(
  rawBody: string,
  sigHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!sigHeader || !secret) return false;
  const parts = sigHeader.split(",").map((s) => s.trim());
  let t = "";
  const v1s: string[] = [];
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const k = p.slice(0, eq);
    const v = p.slice(eq + 1);
    if (k === "t") t = v;
    if (k === "v1") v1s.push(v);
  }
  if (!t || v1s.length === 0) return false;
  const signedPayload = `${t}.${rawBody}`;
  const keyBytes = decodeWebhookSecret(secret);
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(signedPayload));
  const expectedHex = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return v1s.some((v) => v === expectedHex);
}
