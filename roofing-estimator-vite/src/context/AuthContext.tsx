import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  clearSession,
  fetchCurrentUser,
  getStoredSession,
  loginWithPassword,
  logoutRemote,
  registerAccount,
  type AuthAccess,
  type AuthSession,
  type AuthUser,
  type RegisterAccountPayload,
} from "../lib/authClient";
import { setActiveStorageUserId } from "../lib/userScopedStorage";

type AuthContextValue = {
  loading: boolean;
  session: AuthSession | null;
  user: AuthUser | null;
  /** Latest access evaluation from the Worker (approval + billing). */
  access: AuthAccess | null;
  /** False for company/rep until approved and billing active (admins always true). */
  accessGranted: boolean;
  /** Re-fetch GET /api/auth/me and update the stored session (e.g. after Stripe returns). */
  refreshSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterAccountPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const expiryWarnedRef = useRef(false);

  useEffect(() => {
    expiryWarnedRef.current = false;
  }, [session?.token]);

  useEffect(() => {
    const exp = session?.expiresAt;
    if (!exp || !session?.token) return;

    const tick = () => {
      const msLeft = exp - Date.now();
      if (msLeft <= 0) {
        clearSession();
        setSession(null);
        toast.error("Your session expired. Sign in again.");
        const p = window.location.pathname;
        if (!p.startsWith("/login") && !p.startsWith("/admin/login") && !p.startsWith("/signup") && p !== "/careers") {
          window.location.assign(p.startsWith("/admin") ? "/admin/login" : "/login");
        }
        return;
      }
      if (msLeft < 5 * 60 * 1000 && !expiryWarnedRef.current) {
        expiryWarnedRef.current = true;
        toast.message("Session expires in under 5 minutes — save your work.", { duration: 8000 });
      }
    };

    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [session?.expiresAt, session?.token]);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      const existing = getStoredSession();
      if (!existing) {
        if (mounted) {
          setSession(null);
          setLoading(false);
        }
        return;
      }
      try {
        const { user, access } = await fetchCurrentUser(existing.token);
        if (!mounted) return;
        setSession({ ...existing, user, access });
      } catch {
        clearSession();
        if (mounted) setSession(null);
        toast.error("We couldn’t verify your saved session. Sign in again.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await loginWithPassword(email, password);
    setSession(next);
    return next.user;
  }, []);

  const register = useCallback(async (payload: RegisterAccountPayload) => {
    const next = await registerAccount(payload);
    setSession(next);
    return next.user;
  }, []);

  const refreshSession = useCallback(async () => {
    const existing = getStoredSession();
    if (!existing?.token) return;
    try {
      const { user, access } = await fetchCurrentUser(existing.token);
      setSession({ ...existing, user, access });
    } catch {
      clearSession();
      setSession(null);
    }
  }, []);

  const logout = useCallback(async () => {
    const token = session?.token || "";
    clearSession();
    setSession(null);
    if (token) await logoutRemote(token);
  }, [session?.token]);

  const sessionUserId = session?.user?.id ?? null;
  if (typeof window !== "undefined") {
    setActiveStorageUserId(sessionUserId);
  }

  const access = session?.access ?? null;
  const accessGranted =
    session?.user?.user_type === "admin" || session?.access?.accessGranted === true;

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      access,
      accessGranted,
      refreshSession,
      login,
      register,
      logout,
      isAuthenticated: Boolean(session?.token),
    }),
    [loading, session, access, accessGranted, refreshSession, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Consumer hook for {@link AuthProvider}. */
// eslint-disable-next-line react-refresh/only-export-components -- hook is the public API for this module
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider.");
  return ctx;
}
