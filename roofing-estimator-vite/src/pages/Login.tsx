import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("admin@hardcoredoortodoorclosers.com");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
      const target = location.state?.from || "/";
      navigate(target, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#e7e9ea] flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-[#2f3336] bg-[#0f1419] p-6 space-y-4"
      >
        <div>
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="text-sm text-[#71767b]">Use your HD2D account credentials.</p>
        </div>
        <label className="block">
          <span className="text-sm text-[#9aa0a6]">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm text-[#9aa0a6]">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-[#f4212e]">{error}</p> : null}
        <button type="submit" className="run-btn w-full" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
