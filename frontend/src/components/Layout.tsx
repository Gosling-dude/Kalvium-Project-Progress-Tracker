import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { changeMyPassword, fetchMyTasks } from "../lib/queries";
import { apiErrorMessage } from "../lib/api";
import { TaskItem } from "../types";
import { Modal } from "./ui/Modal";
import { Field, Input } from "./ui/Form";
import { Button } from "./ui/Button";
import { ErrorBanner, SuccessBanner } from "./ui/Feedback";
import { Icon, IconName } from "./ui/Icon";
import { CountPill } from "./ui/Badge";

// Cohorts are the starting point — each cohort has its own dashboard — with
// a central Students list right after for a program-wide roster/search.
const ADMIN_NAV_ITEMS: { to: string; label: string; end?: boolean; icon: IconName }[] = [
  { to: "/cohorts", label: "Cohorts", icon: "cohorts" },
  { to: "/students", label: "Students", icon: "students" },
  { to: "/flags", label: "Flags", icon: "flag" },
  { to: "/tasks", label: "Tasks", icon: "tasks" },
  { to: "/emails", label: "Emails", icon: "mail" },
  { to: "/history", label: "History", icon: "history" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

// A Growth Coach's surface is their own assigned students (Students, already
// filtered server-side to their own) plus their Tasks feed — every other nav
// destination calls an Admin-only endpoint.
const GROWTH_COACH_NAV_ITEMS: { to: string; label: string; end?: boolean; icon: IconName }[] = [
  { to: "/tasks", label: "Tasks", end: true, icon: "tasks" },
  { to: "/students", label: "My Students", icon: "students" },
];

const ROLE_LABEL: Record<string, string> = { ADMIN: "Program Admin", GROWTH_COACH: "Growth Coach" };

function initialsOf(name: string | undefined) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const NAV_ITEMS = user?.role === "ADMIN" ? ADMIN_NAV_ITEMS : GROWTH_COACH_NAV_ITEMS;
  const { data: tasks } = useQuery<TaskItem[]>({ queryKey: ["my-tasks-badge"], queryFn: fetchMyTasks, refetchInterval: 60_000 });
  // The sidebar badge counts only actionable items — "recent activity" is
  // informational (nothing to do about it), so it shouldn't read as urgent.
  const actionableTaskCount = tasks?.filter((t) => t.type !== "STUDENT_TIMELINE_UPDATE").length ?? 0;

  // Navigating on a phone should dismiss the nav overlay it was tapped in.
  useEffect(() => setMobileNavOpen(false), [location.pathname]);

  const navList = (
    <nav className="flex-1 space-y-0.5 px-2.5">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 ease-smooth ${
              isActive
                ? "bg-brand-50 text-brand-700 shadow-xs ring-1 ring-inset ring-brand-100"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            }`
          }
        >
          {({ isActive }) => (
            <>
              {/* Active rail — a quiet anchor on the left edge that makes the
                  current section scannable without a heavy filled pill. */}
              <span
                aria-hidden="true"
                className={`absolute -left-2.5 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-600 transition-all duration-200 ease-smooth ${
                  isActive ? "opacity-100" : "scale-y-0 opacity-0"
                }`}
              />
              <Icon
                name={item.icon}
                size={16}
                className={isActive ? "text-brand-600" : "text-slate-400 transition-colors group-hover:text-slate-600"}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.to === "/tasks" && actionableTaskCount > 0 && <CountPill count={actionableTaskCount} />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 px-4 py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-brand">
        K
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-slate-900">Project Defence</p>
        <p className="truncate text-xs text-slate-500">Progress Tracker</p>
      </div>
    </div>
  );

  const footer = (
    <div className="border-t border-slate-200/80 p-2.5">
      <UserMenu
        user={user}
        onChangePassword={() => setShowChangePassword(true)}
        onLogout={logout}
      />
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur lg:flex">
        {brand}
        {navList}
        {footer}
      </aside>

      {/* Mobile slide-over nav */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 animate-slide-in-left flex-col border-r border-slate-200 bg-white shadow-pop">
            <div className="flex items-start justify-between">
              {brand}
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="m-3 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close navigation"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            {navList}
            {footer}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar — the only place the hamburger lives. */}
        <header className="flex items-center gap-2 border-b border-slate-200/80 bg-white/90 px-3 py-2.5 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100"
            aria-label="Open navigation"
          >
            <Icon name="menu" size={18} />
          </button>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
            K
          </span>
          <span className="truncate text-sm font-semibold text-slate-900">Project Defence Tracker</span>
          {actionableTaskCount > 0 && (
            <span className="ml-auto">
              <CountPill count={actionableTaskCount} />
            </span>
          )}
        </header>

        <main className="scroll-soft flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
}

// The account block doubles as a menu so "Change password" and "Sign out"
// aren't two permanently-visible micro-links competing with the nav.
function UserMenu({
  user,
  onChangePassword,
  onLogout,
}: {
  user: { name: string; role: string } | null | undefined;
  onChangePassword: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1.5 animate-scale-in overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onChangePassword();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <Icon name="key" size={15} className="text-slate-400" />
            Change password
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            <Icon name="logout" size={15} className="text-rose-400" />
            Sign out
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${
          open ? "bg-slate-100" : "hover:bg-slate-100/80"
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-2xs font-bold text-white">
          {initialsOf(user?.name)}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-medium text-slate-800">{user?.name}</span>
          <span className="block truncate text-xs text-slate-500">{user && (ROLE_LABEL[user.role] ?? user.role)}</span>
        </span>
        <Icon
          name="chevronDown"
          size={14}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => changeMyPassword(currentPassword, newPassword),
    onSuccess: () => setDone(true),
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Modal open onClose={onClose} title="Change Password">
      {done ? (
        <div className="space-y-4">
          <SuccessBanner message="Password updated." />
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (newPassword !== confirmPassword) {
              setError("New password and confirmation do not match.");
              return;
            }
            mutation.mutate();
          }}
        >
          {error && <ErrorBanner message={error} />}
          <Field label="Current password" required>
            <Input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </Field>
          <Field label="New password" hint="At least 8 characters" required>
            <Input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
          <Field label="Confirm new password" required>
            <Input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {mutation.isPending ? "Updating…" : "Update Password"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
