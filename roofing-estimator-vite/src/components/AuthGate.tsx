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
      <div className="min-h-screen flex items-center justify-center bg-[#000000] text-[#e7e9ea]">
        <p className="text-sm text-[#71767b]">Checking session...</p>
      </div>
    );
  }
  if (!isAuthenticated && !isPublicAppPath(location.pathname)) {
    const to = location.pathname.startsWith("/admin") ? "/admin/login" : "/login";
    return <Navigate to={to} replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
