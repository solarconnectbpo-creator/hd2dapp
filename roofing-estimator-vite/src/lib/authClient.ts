import { getHd2dApiBase } from "./hd2dApiBase";

const AUTH_STORAGE_KEY = "hd2d-auth-session-v1";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  user_type: "admin" | "company" | "sales_rep";
};

export type AuthSession = {
  token: string;
  user: AuthUser;
  expiresAt: number;
};

type LoginResponse = {
  success?: boolean;
  token?: string;
  user?: AuthUser;
  expiresAt?: number;
  error?: string;
};

function getAuthApiBase(): string {
  return getHd2dApiBase().replace(/\/$/, "");
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
  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as LoginResponse;
  if (!res.ok || data.success !== true || !data.token || !data.user || !data.expiresAt) {
    throw new Error(data.error || `Login failed (${res.status}).`);
  }
  const session: AuthSession = {
    token: data.token,
    user: data.user,
    expiresAt: data.expiresAt,
  };
  storeSession(session);
  return session;
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  const apiBase = getAuthApiBase();
  if (!apiBase) throw new Error("Backend API base is not configured.");
  const res = await fetch(`${apiBase}/api/auth/me`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as { success?: boolean; user?: AuthUser; error?: string };
  if (!res.ok || data.success !== true || !data.user) {
    throw new Error(data.error || `Session validation failed (${res.status}).`);
  }
  return data.user;
}

export async function logoutRemote(token: string): Promise<void> {
  const apiBase = getAuthApiBase();
  if (!apiBase) return;
  try {
    await fetch(`${apiBase}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Ignore network/logout errors; client-side session clear is authoritative for SPA.
  }
}
