import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import {
  FileSignature,
  FileText,
  Folder,
  Home,
  MapPinned,
  Menu,
  Ruler,
  Search,
  Users,
  X,
} from "lucide-react";
import { cn } from "../components/ui/utils";
import { isNavActive } from "../lib/navMatch";
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
] as const;

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
  const { user, logout } = useAuth();

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
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-[#2f3336] bg-[#000000]/95 px-4 backdrop-blur lg:hidden">
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
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[#e7e9ea]">Roofing Pro</p>
          <p className="truncate text-xs text-[#71767b]">Professional suite</p>
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
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-[#2f3336] bg-[#000000] transition-transform duration-200 ease-out lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full lg:shadow-none",
        )}
      >
        <div className="flex items-start justify-between gap-2 border-b border-[#2f3336] p-6">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-[#e7e9ea]">Roofing Pro</h1>
            <p className="text-sm text-[#71767b]">Professional Roofing Suite</p>
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
        </nav>
        <div className="border-t border-[#2f3336] p-4">
          <p className="text-xs text-[#71767b] mb-2">
            Signed in as <span className="text-[#e7e9ea]">{user?.email || "unknown"}</span>
          </p>
          <button type="button" className="secondary-btn w-full" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </aside>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto pt-14 outline-none lg:pt-0"
      >
        <Outlet />
      </main>
    </div>
  );
}
