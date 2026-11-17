import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  LayoutDashboard,
  FileText,
  GitPullRequest,
  AlertCircle,
  UploadCloud,
  Search,
  Bell,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/crs", label: "CR List", icon: FileText },
  { to: "/planner", label: "Rollout Planner", icon: GitPullRequest },
  { to: "/srs", label: "SR Tracking", icon: AlertCircle },
  { to: "/import", label: "Load Data", icon: UploadCloud },
];

export default function AppLayout() {
  const { pathname } = useLocation();
  const currentTitle =
    NAV_ITEMS.find((item) => pathname.startsWith(item.to))?.label ||
    "CR & SMI Rollout System";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight block leading-none">
              CR & SMI Tracker
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              CNDP / SMI Ops
            </span>
          </div>
        </div>

        <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-4 ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border-blue-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent"
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0">
          <h1 className="text-lg font-bold text-slate-900">{currentTitle}</h1>
          <div className="flex items-center gap-5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search CR, Site, Rack, Node..."
                className="form-input pl-9 w-64 bg-slate-50 text-xs"
              />
            </div>
            <button className="relative text-slate-500 hover:text-slate-700">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
              OE
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
