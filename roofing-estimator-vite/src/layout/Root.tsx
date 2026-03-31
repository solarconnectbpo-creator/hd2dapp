import { Link, Outlet, useLocation } from "react-router";
import { FileSignature, FileText, Folder, Home, MapPinned, Ruler, Search, Users } from "lucide-react";

export function Root() {
  const location = useLocation();
  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/measurement/new", label: "New Measurement", icon: Ruler },
    { path: "/estimates", label: "Estimates", icon: FileText },
    { path: "/contracts", label: "Contracts", icon: FileSignature },
    { path: "/projects", label: "Projects", icon: Folder },
    { path: "/contacts", label: "Contacts & settings", icon: Users },
    { path: "/property-lookup", label: "Property records", icon: Search },
    { path: "/canvassing", label: "Canvassing", icon: MapPinned },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="font-semibold text-xl text-gray-900">Roofing Pro</h1>
          <p className="text-sm text-gray-500">Professional Roofing Suite</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

