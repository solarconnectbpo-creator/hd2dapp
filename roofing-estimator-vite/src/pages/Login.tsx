import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AuthDivider } from "../components/auth/AuthDivider";
import { AuthScreenLayout } from "../components/auth/AuthScreenLayout";
import { AUTH_FIELD_CLASS, AUTH_SIGNUP_CTA } from "../components/auth/authFieldStyles";
import { BrowseWithoutSignInNav } from "../components/auth/BrowseWithoutSignInNav";
import { PasswordField } from "../components/auth/PasswordField";
import { useAuth } from "../context/AuthContext";
import { getExternalCareersUrl } from "../lib/careersLink";

export function Login() {
  const externalCareers = getExternalCareersUrl();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreenLayout
      tagline={
        <>
          Sign in to access canvassing, storm intel, and roofing estimates — built for reps in the field.
        </>
      }
    >
      <div className="rounded-2xl border border-white/[0.08] bg-[#12141a]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04] backdrop-blur-md">
        <h1 className="mb-1 text-center text-xl font-bold text-[#e7e9ea]">Sign in</h1>
        <p className="mb-6 text-center text-sm text-[#8b9199]">Use your HD2D Closers account</p>
        <p className="-mt-4 mb-4 text-center text-sm text-[#8b9199]">
          {externalCareers ? (
            <a
              href={externalCareers}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#1d9bf0] underline-offset-2 hover:underline"
            >
              Looking for a roofing company to work for?
            </a>
          ) : (
            <Link
              to="/careers"
              className="font-medium text-[#1d9bf0] underline-offset-2 hover:underline"
            >
              Looking for a roofing company to work for?
            </Link>
          )}
        </p>
        <p className="mb-6 text-center">
          <Link
            to="/admin/login"
            className="text-sm font-medium text-[#8b9199] underline-offset-2 hover:text-[#1d9bf0] hover:underline"
          >
            Admin sign in
          </Link>
        </p>
        <BrowseWithoutSignInNav />
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[#e7e9ea]">Email</span>
            <input
              className={AUTH_FIELD_CLASS}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
            />
          </label>
          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            invalid={error ? true : undefined}
            ariaDescribedBy={error ? "login-error" : undefined}
          />
          {error ? (
            <div
              id="login-error"
              role="alert"
              aria-live="assertive"
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            >
              {error}
            </div>
          ) : null}
          <div className="flex flex-col gap-3 pt-1">
            <button type="submit" className="run-btn w-full min-h-[48px]" disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
            </button>
            <AuthDivider label="New here?" />
            <Link to="/signup" className={AUTH_SIGNUP_CTA}>
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </AuthScreenLayout>
  );
}
