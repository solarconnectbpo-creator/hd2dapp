import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearSession,
  fetchCurrentUser,
  getStoredSession,
  loginWithPassword,
  logoutRemote,
  registerAccount,
  type AuthSession,
  type AuthUser,
} from "../lib/authClient";

type AuthContextValue = {
  loading: boolean;
  session: AuthSession | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, name: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);

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
        const user = await fetchCurrentUser(existing.token);
        if (!mounted) return;
        setSession({ ...existing, user });
      } catch {
        clearSession();
        if (mounted) setSession(null);
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

  const register = useCallback(async (email: string, password: string, name: string) => {
    const next = await registerAccount(email, password, name);
    setSession(next);
    return next.user;
  }, []);

  const logout = useCallback(async () => {
    const token = session?.token || "";
    clearSession();
    setSession(null);
    if (token) await logoutRemote(token);
  }, [session?.token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      login,
      register,
      logout,
      isAuthenticated: Boolean(session?.token),
    }),
    [loading, session, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider.");
  return ctx;
}
