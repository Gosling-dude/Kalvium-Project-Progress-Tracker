import { ReactNode } from "react";
import { Icon, IconName } from "./Icon";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`surface overflow-hidden ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="surface-header flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
            <Icon name={icon} size={15} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-4 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-end gap-2 border-t border-slate-200/80 bg-slate-50/60 px-4 py-3 ${className}`}>
      {children}
    </div>
  );
}

const STAT_TONES = {
  default: { value: "text-slate-900", chip: "bg-slate-100 text-slate-600 ring-slate-200", glow: "from-slate-400/10" },
  brand: { value: "text-brand-700", chip: "bg-brand-50 text-brand-600 ring-brand-100", glow: "from-brand-500/10" },
  success: { value: "text-emerald-600", chip: "bg-emerald-50 text-emerald-600 ring-emerald-100", glow: "from-emerald-500/10" },
  info: { value: "text-blue-600", chip: "bg-blue-50 text-blue-600 ring-blue-100", glow: "from-blue-500/10" },
  warning: { value: "text-amber-600", chip: "bg-amber-50 text-amber-600 ring-amber-100", glow: "from-amber-500/10" },
  danger: { value: "text-rose-600", chip: "bg-rose-50 text-rose-600 ring-rose-100", glow: "from-rose-500/10" },
} as const;

export type StatTone = keyof typeof STAT_TONES;

export function StatCard({
  label,
  value,
  tone = "default",
  onClick,
  icon,
  hint,
  className = "",
}: {
  label: string;
  value: ReactNode;
  tone?: StatTone;
  onClick?: () => void;
  icon?: IconName;
  hint?: ReactNode;
  className?: string;
}) {
  const t = STAT_TONES[tone] ?? STAT_TONES.default;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`group relative isolate flex w-full flex-col items-start overflow-hidden rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 text-left shadow-xs transition-all duration-200 ease-smooth ${
        onClick
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0"
          : "cursor-default"
      } ${className}`}
    >
      {/* Tone is carried by a soft corner wash instead of a hard border, so a
          row of stat cards still reads as one calm set. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-6 -top-10 -z-10 h-24 w-24 rounded-full bg-gradient-to-br ${t.glow} to-transparent blur-xl`}
      />
      <span className="flex w-full items-start justify-between gap-2">
        <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        {icon && (
          <span className={`flex h-6 w-6 items-center justify-center rounded-md ring-1 ring-inset ${t.chip}`}>
            <Icon name={icon} size={13} />
          </span>
        )}
      </span>
      <span className={`mt-1.5 text-2xl font-semibold tabular ${t.value}`}>{value}</span>
      {hint && <span className="mt-0.5 text-xs text-slate-500">{hint}</span>}
      {onClick && (
        <span className="mt-1 inline-flex items-center gap-0.5 text-2xs font-medium text-brand-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          View <Icon name="chevronRight" size={11} />
        </span>
      )}
    </button>
  );
}
