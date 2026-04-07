import { type FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router";
import { AuthDivider } from "../components/auth/AuthDivider";
import { AuthScreenLayout } from "../components/auth/AuthScreenLayout";
import { AUTH_FIELD_CLASS, AUTH_SECONDARY_BTN } from "../components/auth/authFieldStyles";
import { PasswordField } from "../components/auth/PasswordField";
import { Seo } from "../components/Seo";
import { useAuth } from "../context/AuthContext";
import { fetchAuthCapabilities, safeInternalReturnPath } from "../lib/authClient";
import { fetchOrgDirectory, type PlacementPref } from "../lib/orgDirectoryClient";
import { US_STATE_OPTIONS } from "../lib/usStates";

export function SignUp() {
  const { register, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnTo = safeInternalReturnPath((location.state as { from?: string } | null)?.from);
  const postAuthDest =
    returnTo && returnTo !== "/login" && returnTo !== "/signup" ? returnTo : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accountType, setAccountType] = useState<"rep" | "company">("rep");
  const [companyName, setCompanyName] = useState("");
  const [homeState, setHomeState] = useState("TX");
  const [placementPref, setPlacementPref] = useState<PlacementPref>("either");
  const [orgPreviewCount, setOrgPreviewCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** loading | server allows | server disabled | health check failed */
  const [signupGate, setSignupGate] = useState<"loading" | "allowed" | "disabled" | "unreachable">("loading");

  useEffect(() => {
    const t = searchParams.get("type");
    if (t === "company") setAccountType("company");
    else if (t === "rep") setAccountType("rep");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const caps = await fetchAuthCapabilities();
        if (cancelled) return;
        if (!caps.ok) {
          setSignupGate("unreachable");
          return;
        }
        setSignupGate(caps.authSignup ? "allowed" : "disabled");
      } catch {
        if (!cancelled) setSignupGate("unreachable");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (accountType !== "rep") {
      setOrgPreviewCount(null);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const rows = await fetchOrgDirectory(homeState, placementPref);
          if (!cancelled) setOrgPreviewCount(rows.length);
        } catch {
          if (!cancelled) setOrgPreviewCount(null);
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [accountType, homeState, placementPref]);

  function setType(next: "rep" | "company") {
    setAccountType(next);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("type", next);
        return p;
      },
      { replace: true },
    );
  }

  if (loading) {
    return (
      <AuthScreenLayout
        tagline={
          <>
            Create your HD2D Closers account to sync leads, storm layers, and estimates across devices.
          </>
        }
      >
        <div
          className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border border-white/[0.08] bg-[#12141a]/95 p-8 text-[#e7e9ea]"
          role="status"
          aria-busy="true"
          aria-label="Checking session"
        >
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/[0.08] ring-2 ring-[#1d9bf0]/30" />
          <p className="text-sm text-[#8b9199]">Checking session…</p>
        </div>
      </AuthScreenLayout>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={postAuthDest} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const local = email.trim().split("@")[0]?.trim();
    const name = displayName.trim() || local || "User";
    try {
      if (accountType === "company") {
        await register({
          email: email.trim(),
          password,
          name,
          accountType: "company",
          companyName: companyName.trim(),
        });
      } else {
        await register({
          email: email.trim(),
          password,
          name,
          accountType: "rep",
          homeState,
          placementPref,
        });
      }
      navigate(postAuthDest, { replace: true });
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
          Create your HD2D Closers account — roofing companies onboard billing and territory; field reps opt into placement
          with teams in their state or storm-response crews.
        </>
      }
    >
      <Seo
        title="Sign up — HD2D Closers | Roofing field sales & estimates"
        description="Create an HD2D Closers account as a roofing company or field rep. Reps choose home state and local vs storm placement; contractors get an organization workspace."
        path="/signup"
      />
      <div className="rounded-2xl border border-white/[0.08] bg-[#12141a]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04] backdrop-blur-md">
        <h1 className="mb-1 text-center text-xl font-bold text-[#e7e9ea]">Create account</h1>
        <p className="mb-4 text-center text-sm text-[#8b9199]">Choose how you work with HD2D</p>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-white/[0.08] bg-black/20 p-1">
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              accountType === "rep"
                ? "bg-[#1d9bf0] text-white shadow-sm"
                : "text-[#8b9199] hover:bg-white/[0.06]"
            }`}
            onClick={() => setType("rep")}
          >
            Field rep
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              accountType === "company"
                ? "bg-[#1d9bf0] text-white shadow-sm"
                : "text-[#8b9199] hover:bg-white/[0.06]"
            }`}
            onClick={() => setType("company")}
          >
            Roofing company
          </button>
        </div>

        {signupGate === "disabled" ? (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            Self-service sign up is turned off on the server. Ask an admin to create your account, or use{" "}
            <Link to="/admin/login" className="font-medium text-[#1d9bf0] underline-offset-2 hover:underline">
              admin sign in
            </Link>{" "}
            if you have an admin account.
          </div>
        ) : null}
        {signupGate === "unreachable" ? (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            We can’t reach the server to confirm registration settings. Check your connection, then{" "}
            <button
              type="button"
              className="font-medium text-[#1d9bf0] underline-offset-2 hover:underline"
              onClick={() => window.location.reload()}
            >
              refresh the page
            </button>
            .
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {accountType === "company" ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[#e7e9ea]">Company / crew name *</span>
              <input
                className={AUTH_FIELD_CLASS}
                type="text"
                autoComplete="organization"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                minLength={2}
                maxLength={200}
                placeholder="Your roofing business name"
              />
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-[#e7e9ea]">Home state *</span>
                <select
                  className={AUTH_FIELD_CLASS}
                  value={homeState}
                  onChange={(e) => setHomeState(e.target.value)}
                  aria-label="Home state"
                >
                  {US_STATE_OPTIONS.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="space-y-2 text-sm">
                <legend className="font-medium text-[#e7e9ea]">Placement preference</legend>
                <p className="text-xs text-[#71767b]">
                  We use this to suggest teams: local territory, storm-response / CAT, or either.
                </p>
                <label className="flex cursor-pointer items-center gap-2 text-[#e7e9ea]">
                  <input
                    type="radio"
                    name="placement"
                    checked={placementPref === "local"}
                    onChange={() => setPlacementPref("local")}
                    className="accent-[#1d9bf0]"
                  />
                  Local / home market
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-[#e7e9ea]">
                  <input
                    type="radio"
                    name="placement"
                    checked={placementPref === "storm"}
                    onChange={() => setPlacementPref("storm")}
                    className="accent-[#1d9bf0]"
                  />
                  Storm chase / CAT response teams
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-[#e7e9ea]">
                  <input
                    type="radio"
                    name="placement"
                    checked={placementPref === "either"}
                    onChange={() => setPlacementPref("either")}
                    className="accent-[#1d9bf0]"
                  />
                  Either
                </label>
              </fieldset>
              {orgPreviewCount !== null ? (
                <p className="text-xs text-[#71767b]">
                  {orgPreviewCount === 0
                    ? "No partner teams are listed for this filter yet — you can still register; an admin will place you when orgs go live."
                    : `${orgPreviewCount} partner team${orgPreviewCount === 1 ? "" : "s"} match this filter in the directory.`}
                </p>
              ) : null}
            </>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[#e7e9ea]">Your name</span>
            <input
              className={AUTH_FIELD_CLASS}
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={128}
              placeholder="Optional — defaults to your email prefix"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "signup-error" : undefined}
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
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "signup-error" : undefined}
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
              invalid={error ? true : undefined}
              ariaDescribedBy={error ? "signup-error" : undefined}
            />
            <p className="mt-1.5 text-xs text-[#8b9199]">At least 8 characters (max 256).</p>
          </div>
          {error ? (
            <div
              id="signup-error"
              role="alert"
              aria-live="assertive"
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            >
              {error}
            </div>
          ) : null}
          <div className="flex flex-col gap-3 pt-1">
            <button
              type="submit"
              className="run-btn w-full min-h-[48px]"
              disabled={busy || signupGate === "disabled" || signupGate === "loading"}
            >
              {busy ? "Creating account..." : signupGate === "loading" ? "Checking registration…" : "Create account"}
            </button>
            <AuthDivider label="Already have an account?" />
            <Link to="/login" state={location.state} className={AUTH_SECONDARY_BTN}>
              Sign in instead
            </Link>
            <p className="text-center text-xs text-[#71767b]">
              Looking for a crew?{" "}
              <Link to="/careers" className="text-[#1d9bf0] hover:underline">
                Careers
              </Link>
            </p>
          </div>
        </form>
      </div>
    </AuthScreenLayout>
  );
}
