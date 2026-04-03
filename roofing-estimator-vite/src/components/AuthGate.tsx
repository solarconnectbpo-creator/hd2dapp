import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

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
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
