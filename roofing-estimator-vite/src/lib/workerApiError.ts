/**
 * Parse JSON error bodies from HD2D Worker routes (`{ success?, error? }`).
 * Used for consistent user-facing messages when HTTP status is non-OK.
 */

export function parseWorkerErrorBody(rawText: string): string | null {
  const t = rawText?.trim();
  if (!t) return null;
  try {
    const o = JSON.parse(t) as { error?: unknown; message?: unknown; detail?: unknown };
    const msg = o.error ?? o.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
    /** FastAPI / Starlette HTTPException and validation errors */
    const d = o.detail;
    if (typeof d === "string" && d.trim()) return d.trim();
    if (Array.isArray(d) && d.length > 0) {
      const first = d[0] as { msg?: unknown; loc?: unknown };
      if (first && typeof first === "object" && typeof first.msg === "string" && first.msg.trim()) {
        return first.msg.trim();
      }
    }
  } catch {
    /* not JSON */
  }
  return null;
}

/**
 * User-visible line for a failed Worker `fetch`. Prefer server `error` field; add context for 503.
 */
export function formatWorkerFetchFailure(
  res: Response,
  rawText: string,
  fallback: string,
): string {
  const parsed = parseWorkerErrorBody(rawText);
  if (parsed) {
    if (res.status === 503) {
      const hint =
        /ROOF_VISION|roof.vision|ml-vision|SAM/i.test(parsed)
          ? " Deploy backend/ml-vision-service and set Worker secret ROOF_VISION_SERVICE_URL (see docs/PHASE0_GREEN_PATH.md)."
          : "";
      return `${parsed}${hint}`;
    }
    return parsed;
  }
  return `${fallback} (HTTP ${res.status}).`;
}
