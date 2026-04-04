import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AuthDivider } from "../components/auth/AuthDivider";
import { AuthScreenLayout } from "../components/auth/AuthScreenLayout";
import { AUTH_FIELD_CLASS, AUTH_SECONDARY_BTN } from "../components/auth/authFieldStyles";
import { PasswordField } from "../components/auth/PasswordField";
import { useAuth } from "../context/AuthContext";
import { fetchAuthCapabilities } from "../lib/authClient";

export function SignUp() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signupAllowed, setSignupAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const caps = await fetchAuthCapabilities();
      if (!cancelled) setSignupAllowed(caps.ok ? caps.authSignup : null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const local = email.trim().split("@")[0]?.trim();
    const name = displayName.trim() || local || "User";
    try {
      await register(email.trim(), password, name);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreenLayout
      tagline={
        <>
          Create your HD2D Closers account to sync leads, storm layers, and estimates across devices.
        </>
      }
    >
      <div className="rounded-2xl border border-[#2f3336] bg-[#16181c]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <h1 className="mb-1 text-center text-xl font-bold text-[#e7e9ea]">Create account</h1>
        <p className="mb-6 text-center text-sm text-[#71767b]">Join the field sales workspace</p>
        {signupAllowed === false ? (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            Self-service sign up is turned off on the server. Ask an admin to create your account, or use{" "}
            <Link to="/admin/login" className="font-medium text-[#1d9bf0] underline-offset-2 hover:underline">
              admin sign in
            </Link>{" "}
            if you have an admin account.
          </div>
        ) : null}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[#e7e9ea]">Display name</span>
            <input
              className={AUTH_FIELD_CLASS}
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={128}
              placeholder="Optional — defaults to your email prefix"
            />
          </label>
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
            />
          </label>
          <div>
            <PasswordField
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              minLength={8}
              maxLength={256}
            />
            <p className="mt-1.5 text-xs text-[#71767b]">At least 8 characters (max 256).</p>
          </div>
          {error ? (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}
          <div className="flex flex-col gap-3 pt-1">
            <button
              type="submit"
              className="run-btn w-full min-h-[48px]"
              disabled={busy || signupAllowed === false}
            >
              {busy ? "Creating account..." : "Create account"}
            </button>
            <AuthDivider label="Already have an account?" />
            <Link to="/login" className={AUTH_SECONDARY_BTN}>
              Sign in instead
            </Link>
          </div>
        </form>
      </div>
    </AuthScreenLayout>
  );
}
