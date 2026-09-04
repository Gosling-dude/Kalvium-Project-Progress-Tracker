import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-200 bg-white ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, tone = "default", onClick }: { label: string; value: ReactNode; tone?: "default" | "warning" | "danger"; onClick?: () => void }) {
  const toneClass = tone === "warning" ? "text-amber-700" : tone === "danger" ? "text-rose-700" : "text-slate-900";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex flex-col items-start rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-shadow ${onClick ? "hover:shadow-sm cursor-pointer" : "cursor-default"}`}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</span>
    </button>
  );
}
