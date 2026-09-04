import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/cohorts", label: "Cohorts" },
  { to: "/students", label: "Students" },
  { to: "/deliverables", label: "Deliverables" },
  { to: "/flags", label: "Flags" },
  { to: "/emails", label: "Emails" },
  { to: "/history", label: "History" },
  { to: "/settings", label: "Settings" },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="px-4 py-4">
          <p className="text-sm font-bold text-slate-900">Kalvium Project Defence</p>
          <p className="text-xs text-slate-500">Progress Tracker</p>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="truncate text-xs font-medium text-slate-700">{user?.name}</p>
          <p className="truncate text-xs text-slate-500">{user?.role}</p>
          <button onClick={logout} className="mt-2 text-xs font-medium text-brand-600 hover:underline">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
