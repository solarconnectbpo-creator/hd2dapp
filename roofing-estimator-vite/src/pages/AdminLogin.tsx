import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AuthScreenLayout } from "../components/auth/AuthScreenLayout";
import { AUTH_FIELD_CLASS } from "../components/auth/authFieldStyles";
import { PasswordField } from "../components/auth/PasswordField";
import { DEFAULT_ADMIN_EMAIL } from "../config/authDefaults";
import { useAuth } from "../context/AuthContext";

/**
 * Dedicated entry for team admins — same API as `/login`, redirects to `/admin/users` on success.
 */
export function AdminLogin() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEFAULT_ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      if (user.user_type !== "admin") {
        await logout();
        setError("This account is not an admin. Use the regular sign-in for reps and companies.");
        return;
      }
      navigate("/admin/users", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreenLayout
      tagline={
        <>Administrator access — manage users and roles. Use the credentials configured on the HD2D Worker.</>
      }
    >
      <div className="rounded-2xl border border-white/[0.08] bg-[#12141a]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04] backdrop-blur-md">
        <h1 className="mb-1 text-center text-xl font-bold text-[#e7e9ea]">Admin sign in</h1>
        <p className="mb-6 text-center text-sm text-[#8b9199]">HD2D Closers team dashboard</p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[#e7e9ea]">Admin email</span>
            <input
              className={AUTH_FIELD_CLASS}
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "admin-login-error" : undefined}
            />
          </label>
          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            invalid={error ? true : undefined}
            ariaDescribedBy={error ? "admin-login-error" : undefined}
          />
          {error ? (
            <div
              id="admin-login-error"
              role="alert"
              aria-live="assertive"
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            >
              {error}
            </div>
          ) : null}
          <div className="flex flex-col gap-3 pt-1">
            <button type="submit" className="run-btn w-full min-h-[48px]" disabled={busy}>
              {busy ? "Signing in..." : "Sign in to admin"}
            </button>
            <p className="text-center text-xs text-[#8b9199]">
              Default dev email is pre-filled; production uses{" "}
              <code className="text-[#a8b0b8]">AUTH_ADMIN_EMAIL</code> /{" "}
              <code className="text-[#a8b0b8]">AUTH_ADMIN_PASSWORD</code> on the Worker.
            </p>
            <Link
              to="/login"
              className="text-center text-sm font-medium text-[#1d9bf0] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d9bf0]"
            >
              Rep / company sign in
            </Link>
          </div>
        </form>
      </div>
    </AuthScreenLayout>
  );
}
