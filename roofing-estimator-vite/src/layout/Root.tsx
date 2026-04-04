import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import {
  FileSignature,
  FileText,
  Folder,
  Home,
  MapPinned,
  Megaphone,
  Menu,
  Ruler,
  Search,
  Shield,
  Users,
  X,
} from "lucide-react";
import { cn } from "../components/ui/utils";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { hydrateDealMachineCapabilitiesFromHealth } from "../lib/propertyDealMachineLookup";
import { isNavActive } from "../lib/navMatch";
import { hd2dLogoUrl } from "../branding/hd2dLogoUrl";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { path: "/", label: "Dashboard", icon: Home },
  { path: "/measurement/new", label: "New Measurement", icon: Ruler },
  { path: "/estimates", label: "Estimates", icon: FileText },
  { path: "/contracts", label: "Contracts", icon: FileSignature },
  { path: "/projects", label: "Projects", icon: Folder },
  { path: "/contacts", label: "Contacts & settings", icon: Users },
  { path: "/property-lookup", label: "Property records", icon: Search },
  { path: "/canvassing", label: "Canvassing", icon: MapPinned },
  { path: "/marketing", label: "Marketing", icon: Megaphone },
] as const;

const ADMIN_USERS_PATH = "/admin/users";
const ADMIN_USERS_LABEL = "Admin — users";

function NavLinks({
  onNavigate,
  currentPath,
}: {
  onNavigate?: () => void;
  currentPath: string;
}) {
  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(item.path, currentPath);
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold transition-colors",
              active
                ? "bg-[#1d9bf0] text-white"
                : "text-[#e7e9ea] hover:bg-[#1a1a1a]",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

export function Root() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, setCapabilitiesBump] = useState(0);
  const { user, logout } = useAuth();

  useEffect(() => {
    void hydrateDealMachineCapabilitiesFromHealth().then(() => {
      setCapabilitiesBump((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  return (
    <div className="flex h-[100dvh] bg-[#000000] text-[#e7e9ea]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] items-center gap-3 border-b border-[#2f3336] bg-[#000000]/95 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur lg:hidden">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#e7e9ea] hover:bg-[#1f1f1f]"
          aria-expanded={mobileOpen}
          aria-controls="app-sidebar"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-6 w-6" aria-hidden />
          <span className="sr-only">Open menu</span>
        </button>
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <img
            src={hd2dLogoUrl}
            alt=""
            className="h-8 w-auto max-w-[min(8.5rem,42vw)] shrink-0 object-contain object-left"
            width={136}
            height={40}
          />
          <div className="min-w-0 hidden min-[380px]:block">
            <p className="truncate text-xs text-[#71767b]">Roofing suite</p>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      <button
        type="button"
        aria-label="Close menu"
        className={cn(
          "fixed inset-0 z-40 bg-black/65 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside
        id="app-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-[#2f3336] bg-[#000000] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] transition-transform duration-200 ease-out lg:static lg:translate-x-0 lg:pt-0 lg:pb-0",
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full lg:shadow-none",
        )}
      >
        <div className="flex items-start justify-between gap-2 border-b border-[#2f3336] p-6">
          <div className="min-w-0 flex flex-col gap-2">
            <img
              src={hd2dLogoUrl}
              alt="Hardcore D2D Closers"
              className="h-auto w-full max-w-[12.5rem] object-contain object-left"
              width={200}
              height={120}
            />
            <p className="text-sm text-[#71767b]">Roofing Pro suite</p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#e7e9ea] hover:bg-[#1f1f1f] lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" aria-hidden />
            <span className="sr-only">Close menu</span>
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main">
          <NavLinks currentPath={location.pathname} onNavigate={() => setMobileOpen(false)} />
          {user?.user_type === "admin" ? (
            <Link
              to={ADMIN_USERS_PATH}
              onClick={() => setMobileOpen(false)}
              aria-current={isNavActive(ADMIN_USERS_PATH, location.pathname) ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold transition-colors",
                isNavActive(ADMIN_USERS_PATH, location.pathname)
                  ? "bg-[#1d9bf0] text-white"
                  : "text-[#e7e9ea] hover:bg-[#1a1a1a]",
              )}
            >
              <Shield className="h-5 w-5 shrink-0" aria-hidden />
              <span>{ADMIN_USERS_LABEL}</span>
            </Link>
          ) : null}
        </nav>
        <div className="border-t border-[#2f3336] p-4">
          {user ? (
            <>
              <p className="text-xs text-[#71767b] mb-2">
                Signed in as <span className="text-[#e7e9ea]">{user.email}</span>
              </p>
              <button type="button" className="secondary-btn w-full" onClick={() => void logout()}>
                Sign out
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-[#71767b]">
                Sign in to save estimates, canvassing, and storm intel across devices.
              </p>
              <Link
                to="/login"
                className="flex w-full items-center justify-center rounded-full border border-[#2f3336] bg-[#16181c] px-4 py-2.5 text-sm font-semibold text-[#e7e9ea] hover:bg-[#1a1a1a]"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="flex w-full items-center justify-center text-sm font-medium text-[#1d9bf0] hover:underline"
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      </aside>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[env(safe-area-inset-bottom,0px)] outline-none focus-visible:ring-2 focus-visible:ring-[#1d9bf0] focus-visible:ring-offset-2 focus-visible:ring-offset-black lg:pt-0 lg:pb-0"
      >
        <ErrorBoundary title="Something went wrong in this view">
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
