import { HD2D_PUBLIC_API_ORIGIN, HD2D_WORKER_API_ORIGIN } from "../config/siteOrigin";
import { getHd2dApiBase } from "./hd2dApiBase";
import { readJsonResponseBody } from "./readJsonResponse";
import { networkFetchFailureHint, safeUserFacingApiMessage } from "./safeApiError";

const AUTH_STORAGE_KEY = "hd2d-auth-session-v1";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  user_type: "admin" | "company" | "sales_rep";
};

/** Mirrors Worker `evaluateAccess` payload on login / register / GET /api/auth/me. */
export type AuthAccess = {
  accessGranted: boolean;
  approval_status: string;
  billing_status: string;
  reasons: string[];
};

export type AuthSession = {
  token: string;
  user: AuthUser;
  expiresAt: number;
  access?: AuthAccess;
};

type LoginResponse = {
  success?: boolean;
  token?: string;
  user?: AuthUser;
  expiresAt?: number;
  access?: AuthAccess;
  error?: string;
  /** Server hint (e.g. D1 error) — safe to show in UI for debugging sign-up / login. */
  detail?: string;
};

function getAuthApiBase(): string {
  return getHd2dApiBase().replace(/\/$/, "");
}

/** Parse JSON from a response body already read with `await res.text()` (single read — avoids tee/clone issues). */
function parseFetchedJson<T>(text: string, res: Response, label: string): T {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(
      `Empty response (${res.status} ${res.statusText || ""}). Point VITE_INTEL_API_BASE at ${HD2D_PUBLIC_API_ORIGIN} (not ${HD2D_WORKER_API_ORIGIN}) if /api/* returns HTML.`,
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const hint = trimmed.startsWith("<") ? " (received HTML, not JSON)" : "";
    throw new Error(
      `Invalid JSON from ${label} (${res.status})${hint}. Check VITE_INTEL_API_BASE=${HD2D_PUBLIC_API_ORIGIN}.`,
    );
  }
}

/** Same-origin or cross-origin fetch to Worker; clearer errors on DNS / offline / blocked requests. */
async function authFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, {
      ...init,
      mode: "cors",
      credentials: "omit",
    });
  } catch (e) {
    const base = getAuthApiBase() || "(unknown)";
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(networkFetchFailureHint(base, msg));
  }
}

export type AuthCapabilities = {
  ok: boolean;
  /** False when Worker has AUTH_SIGNUP_ENABLED=false */
  authSignup: boolean;
  /** True when Worker can start membership Stripe Checkout. */
  membershipCheckout: boolean;
};

/** GET /api/health — use on sign-up page to show when self-service registration is off. */
export async function fetchAuthCapabilities(): Promise<AuthCapabilities> {
  const apiBase = getAuthApiBase();
  if (!apiBase) return { ok: false, authSignup: false, membershipCheckout: false };
  try {
    const res = await authFetch(`${apiBase}/api/health`, {
      headers: { Accept: "application/json" },
    });
    const data = await readJsonResponseBody<{
      ok?: boolean;
      capabilities?: { authSignup?: boolean; membershipCheckout?: boolean };
    }>(res);
    if (!res.ok || data.ok !== true) {
      return { ok: false, authSignup: true, membershipCheckout: false };
    }
    const signup = data.capabilities?.authSignup !== false;
    const membershipCheckout = data.capabilities?.membershipCheckout === true;
    return { ok: true, authSignup: signup, membershipCheckout };
  } catch {
    return { ok: false, authSignup: true, membershipCheckout: false };
  }
}

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.token || !parsed?.user || !parsed?.expiresAt) return null;
    if (Date.now() >= parsed.expiresAt) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function storeSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function loginWithPassword(email: string, password: string): Promise<AuthSession> {
  const apiBase = getAuthApiBase();
  if (!apiBase) throw new Error("Backend API base is not configured.");
  const res = await authFetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  const data = parseFetchedJson<LoginResponse>(text, res, "login");
  if (!res.ok || data.success !== true || !data.token || !data.user || !data.expiresAt) {
    const msg = [data.error || `Login failed (${res.status}).`, data.detail].filter(Boolean).join(" — ");
    throw new Error(safeUserFacingApiMessage(msg, res.status, { skipStatusHints: true }));
  }
  const session: AuthSession = {
    token: data.token,
    user: data.user,
    expiresAt: data.expiresAt,
    access: data.access,
  };
  storeSession(session);
  return session;
}

export async function fetchCurrentUser(token: string): Promise<{ user: AuthUser; access?: AuthAccess }> {
  const apiBase = getAuthApiBase();
  if (!apiBase) throw new Error("Backend API base is not configured.");
  const res = await authFetch(`${apiBase}/api/auth/me`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  const data = parseFetchedJson<{ success?: boolean; user?: AuthUser; access?: AuthAccess; error?: string }>(
    text,
    res,
    "/api/auth/me",
  );
  if (!res.ok || data.success !== true || !data.user) {
    throw new Error(
      safeUserFacingApiMessage(data.error || `Session validation failed (${res.status}).`, res.status, {
        skipStatusHints: true,
      }),
    );
  }
  return { user: data.user, access: data.access };
}

export async function logoutRemote(token: string): Promise<void> {
  const apiBase = getAuthApiBase();
  if (!apiBase) return;
  try {
    await authFetch(`${apiBase}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Ignore network/logout errors; client-side session clear is authoritative for SPA.
  }
}

export type RegisterAccountPayload = {
  email: string;
  password: string;
  name: string;
  /** Default "rep" (field sales). Use "company" for contractor / org owner. */
  accountType?: "rep" | "company";
  companyName?: string;
  /** 2-letter US state — required for reps. */
  homeState?: string;
  placementPref?: "local" | "storm" | "either";
};

export async function registerAccount(payload: RegisterAccountPayload): Promise<AuthSession> {
  const apiBase = getAuthApiBase();
  if (!apiBase) throw new Error("Backend API base is not configured.");
  const {
    email,
    password,
    name,
    accountType = "rep",
    companyName,
    homeState,
    placementPref,
  } = payload;
  const res = await authFetch(`${apiBase}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      email,
      password,
      name,
      accountType,
      companyName,
      homeState,
      placementPref,
    }),
  });
  const data = await readJsonResponseBody<LoginResponse>(res);
  if (!res.ok || data.success !== true || !data.token || !data.user || !data.expiresAt) {
    const msg = [data.error || `Sign up failed (${res.status}).`, data.detail].filter(Boolean).join(" — ");
    throw new Error(safeUserFacingApiMessage(msg, res.status, { skipStatusHints: true }));
  }
  const session: AuthSession = {
    token: data.token,
    user: data.user,
    expiresAt: data.expiresAt,
    access: data.access,
  };
  storeSession(session);
  return session;
}

export async function startMembershipCheckout(token: string): Promise<string> {
  const apiBase = getAuthApiBase();
  if (!apiBase) throw new Error("Backend API base is not configured.");
  const res = await authFetch(`${apiBase}/api/billing/membership-checkout-session`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await readJsonResponseBody<{ success?: boolean; url?: string; error?: string }>(res);
  if (!res.ok || data.success !== true || !data.url) {
    throw new Error(
      safeUserFacingApiMessage(data.error || `Could not start checkout (${res.status}).`, res.status, {
        skipStatusHints: true,
      }),
    );
  }
  return data.url;
}

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  user_type: AuthUser["user_type"];
  approval_status: string;
  billing_status: string;
  created_at: number;
  updated_at: number;
};

export async function adminListUsers(token: string): Promise<AdminUserRow[]> {
  const apiBase = getAuthApiBase();
  if (!apiBase) throw new Error("Backend API base is not configured.");
  const res = await authFetch(`${apiBase}/api/admin/users`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await readJsonResponseBody<{ success?: boolean; users?: AdminUserRow[]; error?: string }>(res);
  if (!res.ok || data.success !== true || !data.users) {
    throw new Error(
      safeUserFacingApiMessage(data.error || `Could not load users (${res.status}).`, res.status, {
        skipStatusHints: true,
      }),
    );
  }
  return data.users;
}

export async function adminCreateUser(
  token: string,
  body: { email: string; password: string; name: string; user_type: AuthUser["user_type"] },
): Promise<void> {
  const apiBase = getAuthApiBase();
  if (!apiBase) throw new Error("Backend API base is not configured.");
  const res = await authFetch(`${apiBase}/api/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await readJsonResponseBody<{ success?: boolean; error?: string }>(res);
  if (!res.ok || data.success !== true) {
    throw new Error(
      safeUserFacingApiMessage(data.error || `Create failed (${res.status}).`, res.status, { skipStatusHints: true }),
    );
  }
}

export async function adminDeleteUser(token: string, userId: string): Promise<void> {
  const apiBase = getAuthApiBase();
  if (!apiBase) throw new Error("Backend API base is not configured.");
  const res = await authFetch(`${apiBase}/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await readJsonResponseBody<{ success?: boolean; error?: string }>(res);
  if (!res.ok || data.success !== true) {
    throw new Error(
      safeUserFacingApiMessage(data.error || `Delete failed (${res.status}).`, res.status, { skipStatusHints: true }),
    );
  }
}

export async function adminSetUserApproval(
  token: string,
  userId: string,
  approval_status: "pending" | "approved" | "rejected",
): Promise<void> {
  const apiBase = getAuthApiBase();
  if (!apiBase) throw new Error("Backend API base is not configured.");
  const res = await authFetch(`${apiBase}/api/admin/users/${encodeURIComponent(userId)}/approval`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ approval_status }),
  });
  const data = await readJsonResponseBody<{ success?: boolean; error?: string }>(res);
  if (!res.ok || data.success !== true) {
    throw new Error(
      safeUserFacingApiMessage(data.error || `Approval update failed (${res.status}).`, res.status, {
        skipStatusHints: true,
      }),
    );
  }
}

export async function adminUpdateUser(
  token: string,
  userId: string,
  patch: { name?: string; password?: string; user_type?: AuthUser["user_type"] },
): Promise<void> {
  const apiBase = getAuthApiBase();
  if (!apiBase) throw new Error("Backend API base is not configured.");
  const res = await authFetch(`${apiBase}/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: patch.name,
      password: patch.password,
      user_type: patch.user_type,
    }),
  });
  const data = await readJsonResponseBody<{ success?: boolean; error?: string }>(res);
  if (!res.ok || data.success !== true) {
    throw new Error(
      safeUserFacingApiMessage(data.error || `Update failed (${res.status}).`, res.status, { skipStatusHints: true }),
    );
  }
}

/**
 * Post-login/sign-up redirect target: only same-app relative paths (blocks open redirects).
 */
export function safeInternalReturnPath(raw: unknown): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const p = raw.trim();
  if (!p.startsWith("/")) return null;
  if (p.startsWith("//")) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(p)) return null;
  return p;
}
