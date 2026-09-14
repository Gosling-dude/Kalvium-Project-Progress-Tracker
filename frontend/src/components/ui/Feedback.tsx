import { ReactNode } from "react";
import { Icon, IconName } from "./Icon";

export function Spinner({ size = 24, label, className = "" }: { size?: number; label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2.5 py-10 ${className}`} role="status" aria-live="polite">
      <span
        className="animate-spin rounded-full border-2 border-slate-200 border-t-brand-600 dark:border-slate-700 dark:border-t-brand-500"
        style={{ width: size, height: size }}
      />
      {label ? (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      ) : (
        <span className="sr-only">Loading…</span>
      )}
    </div>
  );
}

/** Inline spinner for use next to text — no wrapper padding. */
export function InlineSpinner({ size = 14 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent align-[-0.125em] opacity-60"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex animate-fade-in items-start gap-2.5 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-800 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30"
    >
      <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-rose-500 dark:text-rose-400" />
      <span className="min-w-0 flex-1 leading-relaxed">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold text-rose-700 underline-offset-2 transition-colors hover:bg-rose-100 hover:underline dark:text-rose-300 dark:hover:bg-rose-500/20"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="flex animate-fade-in items-start gap-2.5 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
      <Icon name="checkCircle" size={16} className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
      <span className="min-w-0 flex-1 leading-relaxed">{message}</span>
    </div>
  );
}

export function InfoBanner({ message }: { message: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-blue-50/70 px-3 py-2.5 text-sm text-blue-900 ring-1 ring-inset ring-blue-200/70 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30">
      <Icon name="info" size={16} className="mt-0.5 shrink-0 text-blue-500 dark:text-blue-400" />
      <span className="min-w-0 flex-1 leading-relaxed">{message}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon = "inbox",
  action,
}: {
  title: string;
  description?: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <div className="flex animate-fade-in flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-slate-50 to-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200 dark:from-slate-800 dark:to-slate-800/60 dark:text-slate-500 dark:ring-slate-700">
        <Icon name={icon} size={22} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Shimmering placeholder block. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`skeleton block ${className}`} aria-hidden="true" />;
}

/** Table-shaped loading placeholder — steadier than a bare spinner because the
    layout doesn't jump when the real rows arrive. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="px-4 py-3" aria-hidden="true">
      <div className="flex gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-3 py-3.5" style={{ opacity: 1 - r * 0.11 }}>
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-3.5 flex-1 ${c === 0 ? "max-w-[8rem]" : ""}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Card-shaped loading placeholder for stat rows and detail panels. */
export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`surface p-4 ${className}`} aria-hidden="true">
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="mt-3 h-7 w-14" />
    </div>
  );
}
