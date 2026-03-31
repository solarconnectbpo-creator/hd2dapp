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
              "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
              active
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-gray-100",
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
    <div className="flex h-[100dvh] bg-gray-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
          aria-expanded={mobileOpen}
          aria-controls="app-sidebar"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-6 w-6" aria-hidden />
          <span className="sr-only">Open menu</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">Roofing Pro</p>
          <p className="truncate text-xs text-gray-500">Professional suite</p>
        </div>
      </header>

      {/* Mobile overlay */}
      <button
        type="button"
        aria-label="Close menu"
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside
        id="app-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-out lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full lg:shadow-none",
        )}
      >
        <div className="flex items-start justify-between gap-2 border-b border-gray-200 p-6">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900">Roofing Pro</h1>
            <p className="text-sm text-gray-500">Professional Roofing Suite</p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" aria-hidden />
            <span className="sr-only">Close menu</span>
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main">
          <NavLinks currentPath={location.pathname} onNavigate={() => setMobileOpen(false)} />
        </nav>
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
