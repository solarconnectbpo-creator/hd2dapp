import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

export function AuthGate() {
  const { loading, isAuthenticated, accessGranted, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#030406] px-6 text-[#e7e9ea]"
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label="Checking session"
      >
        <div className="h-10 w-10 animate-pulse rounded-full bg-white/[0.08] ring-2 ring-[#1d9bf0]/30" />
        <p className="text-sm text-[#8b9199]">Checking session…</p>
      </div>
    );
  }
  if (!isAuthenticated) {
    const to = location.pathname.startsWith("/admin") ? "/admin/login" : "/login";
    const from = `${location.pathname}${location.search || ""}`;
    return <Navigate to={to} replace state={{ from }} />;
  }

  const needsOrgGate = user?.user_type === "company" || user?.user_type === "sales_rep";
  const onPendingPath = location.pathname.startsWith("/account/pending");
  if (needsOrgGate && !accessGranted && !onPendingPath) {
    return <Navigate to="/account/pending" replace />;
  }
  if (needsOrgGate && accessGranted && onPendingPath) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
