import { getHd2dApiBase } from "./hd2dApiBase";
import type { DamagePhotoAiSummary } from "./fieldProjectTypes";

type RoofDamageResponse =
  | { success: true; data: DamagePhotoAiSummary }
  | { success: false; error?: string };

/**
 * Calls Worker POST /api/ai/roof-damage (OpenAI vision assist).
 */
export async function postRoofDamageDraft(params: {
  imageBase64: string;
  mimeType?: string;
  context?: string;
}): Promise<{ ok: true; data: DamagePhotoAiSummary } | { ok: false; error: string }> {
  const apiBase = getHd2dApiBase().replace(/\/$/, "");
  let res: Response;
  try {
    res = await fetch(`${apiBase}/api/ai/roof-damage`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        imageBase64: params.imageBase64,
        mimeType: params.mimeType ?? "image/jpeg",
        context: params.context?.trim().slice(0, 2500) || undefined,
      }),
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error calling roof-damage API",
    };
  }

  const rawText = await res.text();
  const trimmed = rawText.trim();
  let body: RoofDamageResponse;
  try {
    if (!trimmed) throw new Error(`Empty response (${res.status}).`);
    body = JSON.parse(trimmed) as RoofDamageResponse;
  } catch (e) {
    const hint = trimmed.startsWith("<") ? " (received HTML, not JSON)" : "";
    return {
      ok: false,
      error:
        e instanceof Error
          ? `${e.message}${hint}`
          : `Invalid JSON from server (${res.status})${hint}`,
    };
  }

  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid response from server" };
  }
  if (!body.success) {
    return { ok: false, error: body.error || `AI request failed (HTTP ${res.status})` };
  }
  if (!body.data || typeof body.data !== "object") {
    return { ok: false, error: "Missing AI data in response" };
  }
  return { ok: true, data: body.data };
}
