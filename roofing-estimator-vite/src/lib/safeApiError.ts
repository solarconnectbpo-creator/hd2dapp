export type SafeApiErrorOptions = {
  /** When true, do not replace messages from HTTP status (use on login/sign-up forms where 401 ≠ “sign in again”). */
  skipStatusHints?: boolean;
};

/**
 * Maps raw API error text + HTTP status to user-safe copy (no Stripe/internal stack leakage).
 */
export function safeUserFacingApiMessage(
  raw: string,
  status?: number,
  options?: SafeApiErrorOptions,
): string {
  const t = (raw || "").trim();
  if (!options?.skipStatusHints) {
    if (status === 401) return "Sign in again to continue.";
    if (status === 403) return "You don’t have permission for this action.";
    if (status === 503) return "This service is temporarily unavailable. Try again shortly.";
    if (status === 502 || status === 504) return "The server had a problem. Try again in a moment.";
  }

  const lower = t.toLowerCase();
  if (
    lower.includes("stripe") ||
    lower.includes("invalid_request") ||
    lower.includes("resource_missing") ||
    lower.includes("no such price") ||
    lower.includes("checkout")
  ) {
    return "Checkout could not be started. Verify your package is set up or try again later.";
  }
  if (t.length > 200) return "Something went wrong. Try again or contact support.";
  return t || "Something went wrong.";
}
