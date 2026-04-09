import { safeUserFacingApiMessage } from "./safeApiError";

/** Optional machine-readable codes from POST /api/auth/* and GET /api/auth/me. */
export type AuthErrorPayload = {
  error?: string;
  detail?: string;
  /** Worker usually sends strings; proxies or edge cases may send numbers. */
  error_code?: string | number;
};

/**
 * Maps Worker auth responses to short, user-focused copy (prefers `error_code` when present).
 */
export function mapAuthFailureMessage(payload: AuthErrorPayload, status: number): string {
  const code = String(payload.error_code ?? "").trim().toUpperCase();
  switch (code) {
    case "INVALID_CREDENTIALS":
      return "That email or password doesn’t match our records. Try again, or create an account if you’re new.";
    case "INVALID_EMAIL":
      return "Enter a valid email address.";
    case "MISSING_FIELDS":
      return "Enter both email and password.";
    case "INVALID_JSON":
      return "Something went wrong sending your request. Refresh the page and try again.";
    case "SIGNUP_DISABLED":
      return "Self-service sign-up isn’t available. Ask your admin for an account.";
    case "EMAIL_TAKEN":
      return "An account with this email already exists. Sign in instead.";
    case "SESSION_EXPIRED":
    case "SESSION_INVALID":
      return "Your session expired. Sign in again.";
    case "MISSING_BEARER":
      return "Sign in again to continue.";
    case "DB_UNAVAILABLE":
      return "We can’t reach the account service right now. Try again in a moment.";
    case "ACCOUNT_REMOVED":
      return "This account is no longer active. Use a different account or contact support.";
    case "PASSWORD_TOO_SHORT":
      return "Password must be at least 8 characters.";
    case "PASSWORD_TOO_LONG":
      return "Password is too long. Use a shorter password.";
    default:
      break;
  }

  const raw = [payload.error, payload.detail].filter(Boolean).join(" — ");
  return safeUserFacingApiMessage(raw, status, { skipStatusHints: true });
}
