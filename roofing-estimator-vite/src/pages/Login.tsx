import { type FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { Seo } from "../components/Seo";
import { AuthDivider } from "../components/auth/AuthDivider";
import { AuthScreenLayout } from "../components/auth/AuthScreenLayout";
import { AUTH_FIELD_CLASS, AUTH_SIGNUP_CTA } from "../components/auth/authFieldStyles";
import { PasswordField } from "../components/auth/PasswordField";
import { useAuth } from "../context/AuthContext";
import { safeInternalReturnPath } from "../lib/authClient";
import { getExternalCareersUrl } from "../lib/careersLink";

export function Login() {
  const externalCareers = getExternalCareersUrl();
  const { login, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = safeInternalReturnPath((location.state as { from?: string } | null)?.from);
  const postAuthDest =
    returnTo && returnTo !== "/login" && returnTo !== "/signup" ? returnTo : "/";
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
      navigate(postAuthDest, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <>
        <Seo
          title="Sign in — Door to Door Closers"
          description="Sign in to Door to Door Closers for roof measurements, canvassing, estimates, and SMS follow-up."
          path="/login"
        />
        <AuthScreenLayout
          tagline={<>Sign in for canvassing, estimates, and SMS follow-up - built for reps in the field.</>}
        >
          <div
            className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border border-white/[0.08] bg-[#12141a]/95 p-8 text-[#e7e9ea]"
            role="status"
            aria-busy="true"
            aria-label="Checking session"
          >
            <div className="h-10 w-10 animate-pulse rounded-full bg-white/[0.08] ring-2 ring-[#1d9bf0]/30" />
            <p className="text-sm text-[#8b9199]">Checking session...</p>
          </div>
        </AuthScreenLayout>
      </>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={postAuthDest} replace />;
  }

  return (
    <>
      <Seo
        title="Sign in — Door to Door Closers"
        description="Sign in to Door to Door Closers for roof measurements, canvassing, estimates, and SMS follow-up."
        path="/login"
      />
      <AuthScreenLayout
        tagline={
        <>
          Sign in for canvassing, storm intel, roofing estimates, and{" "}
          <strong className="font-semibold text-[#c4d0dc]">SMS follow-up</strong> sequences. After sign-in, use{" "}
          <strong className="font-semibold text-[#c4d0dc]">SMS follow-up</strong> in the sidebar (menu on mobile) or open{" "}
          <Link to="/sms-automation" className="font-semibold text-[#1d9bf0] underline-offset-2 hover:underline">
            /sms-automation
          </Link>{" "}
          after you are signed in.
        </>
      }
    >
      <div className="rounded-2xl border border-white/[0.08] bg-[#12141a]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04] backdrop-blur-md">
        <h1 className="mb-1 text-center text-xl font-bold text-[#e7e9ea]">Sign in</h1>
        <p className="mb-2 text-center text-sm text-[#8b9199]">Use your Door to Door Closers account</p>
        <p className="mb-6 text-center text-xs leading-relaxed text-[#71767b]">
          An account is required - sign up below or use credentials from your admin. There is no guest access to the app.
        </p>
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
          <p className="text-center text-xs text-[#71767b]">
            <a
              href="mailto:support@hardcoredoortodoorclosers.com?subject=Door%20to%20Door%20Closers%20-%20password%20help"
              className="font-medium text-[#1d9bf0] underline-offset-2 hover:underline"
            >
              Forgot password?
            </a>{" "}
            - resets go through your admin or support (no self-serve reset yet).
          </p>
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
            <Link to="/signup" state={location.state} className={AUTH_SIGNUP_CTA}>
              Sign up
            </Link>
          </div>
        </form>
      </div>
      </AuthScreenLayout>
    </>
  );
}

