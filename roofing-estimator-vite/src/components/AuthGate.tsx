import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

/** Map-first tools (public, like Atlas “enter the map”) — no account required for field use / local data. */
function isPublicAppPath(pathname: string): boolean {
  return (
    pathname === "/measurement/new" ||
    pathname.startsWith("/measurement/new/") ||
    pathname === "/canvassing" ||
    pathname.startsWith("/canvassing/")
  );
}

export function AuthGate() {
  const { loading, isAuthenticated } = useAuth();
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
  if (!isAuthenticated && !isPublicAppPath(location.pathname)) {
    const to = location.pathname.startsWith("/admin") ? "/admin/login" : "/login";
    return <Navigate to={to} replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
