import { getHd2dApiBase } from "./hd2dApiBase";
import { readJsonResponseBody } from "./readJsonResponse";

function apiBase(): string {
  return getHd2dApiBase().replace(/\/$/, "");
}

export async function generateMarketingImage(
  token: string,
  body: { prompt: string; size?: "1024x1024" | "1792x1024" | "1024x1792" },
): Promise<{ b64_json: string; mimeType: string; size: string }> {
  const base = apiBase();
  if (!base) throw new Error("Backend API base is not configured.");
  const res = await fetch(`${base}/api/marketing/generate-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await readJsonResponseBody<{
    success?: boolean;
    data?: { b64_json?: string; mimeType?: string; size?: string };
    error?: string;
  }>(res);
  if (!res.ok || data.success !== true || !data.data?.b64_json) {
    throw new Error(data.error || `Image generation failed (${res.status}).`);
  }
  return {
    b64_json: data.data.b64_json,
    mimeType: data.data.mimeType || "image/png",
    size: data.data.size || "1024x1024",
  };
}
