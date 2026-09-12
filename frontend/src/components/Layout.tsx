import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { changeMyPassword, fetchMyTasks } from "../lib/queries";
import { apiErrorMessage } from "../lib/api";
import { TaskItem } from "../types";
import { Modal } from "./ui/Modal";
import { Field, Input } from "./ui/Form";
import { Button } from "./ui/Button";
import { ErrorBanner } from "./ui/Feedback";

// Cohorts are the starting point — each cohort has its own dashboard — with
// a central Students list right after for a program-wide roster/search.
const ADMIN_NAV_ITEMS: { to: string; label: string; end?: boolean }[] = [
  { to: "/cohorts", label: "Cohorts" },
  { to: "/students", label: "Students" },
  { to: "/flags", label: "Flags" },
  { to: "/tasks", label: "Tasks" },
  { to: "/emails", label: "Emails" },
  { to: "/history", label: "History" },
  { to: "/settings", label: "Settings" },
];

// A Growth Coach's surface is their own assigned students (Students, already
// filtered server-side to their own) plus their Tasks feed — every other nav
// destination calls an Admin-only endpoint.
const GROWTH_COACH_NAV_ITEMS = [
  { to: "/tasks", label: "Tasks", end: true },
  { to: "/students", label: "My Students" },
];

const ROLE_LABEL: Record<string, string> = { ADMIN: "Program Admin", GROWTH_COACH: "Growth Coach" };

export function Layout() {
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const NAV_ITEMS = user?.role === "ADMIN" ? ADMIN_NAV_ITEMS : GROWTH_COACH_NAV_ITEMS;
  const { data: tasks } = useQuery<TaskItem[]>({ queryKey: ["my-tasks-badge"], queryFn: fetchMyTasks, refetchInterval: 60_000 });
  // The sidebar badge counts only actionable items — "recent activity" is
  // informational (nothing to do about it), so it shouldn't read as urgent.
  const actionableTaskCount = tasks?.filter((t) => t.type !== "STUDENT_TIMELINE_UPDATE").length ?? 0;

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
                `flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <span>{item.label}</span>
              {item.to === "/tasks" && actionableTaskCount > 0 && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-xs font-semibold text-rose-700">{actionableTaskCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="truncate text-xs font-medium text-slate-700">{user?.name}</p>
          <p className="truncate text-xs text-slate-500">{user && (ROLE_LABEL[user.role] ?? user.role)}</p>
          <div className="mt-2 flex items-center gap-3">
            <button onClick={() => setShowChangePassword(true)} className="text-xs font-medium text-slate-500 hover:underline">
              Change password
            </button>
            <button onClick={logout} className="text-xs font-medium text-brand-600 hover:underline">
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
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
        <div className="space-y-3">
          <p className="text-sm text-emerald-700">Password updated.</p>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-3"
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
          <Field label="Current password">
            <Input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </Field>
          <Field label="New password" hint="At least 8 characters">
            <Input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
          <Field label="Confirm new password">
            <Input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Updating…" : "Update Password"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
