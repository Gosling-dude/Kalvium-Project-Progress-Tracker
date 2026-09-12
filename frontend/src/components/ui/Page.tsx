import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon, IconName } from "./Icon";

/** Standard page shell: consistent max width, gutters and entrance animation. */
export function PageContainer({
  children,
  width = "max-w-6xl",
  className = "",
}: {
  children: ReactNode;
  width?: string;
  className?: string;
}) {
  return (
    <div className={`page-enter mx-auto w-full ${width} space-y-5 px-4 py-6 sm:px-6 lg:px-8 ${className}`}>{children}</div>
  );
}

/** Page title block with optional eyebrow, description and action cluster. */
export function PageHeader({
  title,
  description,
  actions,
  icon,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: IconName;
  /** Badges or inline facts shown under the title. */
  meta?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-brand-50 to-brand-100/70 text-brand-600 ring-1 ring-inset ring-brand-200/60">
            <Icon name={icon} size={19} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">{description}</p>}
          {meta && <div className="mt-2.5 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Back navigation that reads as a control rather than a stray blue link. */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="group -ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-sm font-medium text-slate-500 transition-colors hover:text-brand-700"
    >
      <Icon
        name="arrowLeft"
        size={15}
        className="transition-transform duration-200 ease-smooth group-hover:-translate-x-0.5"
      />
      {label}
    </Link>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-slate-900">{children}</h2>
      {action}
    </div>
  );
}

/** Underline tab bar with an animated active indicator. */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  counts,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
  /** Optional per-tab count pill, e.g. open flags. */
  counts?: Partial<Record<T, number>>;
}) {
  return (
    <div
      role="tablist"
      className="no-scrollbar -mb-px flex gap-1 overflow-x-auto border-b border-slate-200"
    >
      {tabs.map((t) => {
        const isActive = active === t;
        const count = counts?.[t];
        return (
          <button
            key={t}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t)}
            className={`group relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
              isActive ? "text-brand-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            {t}
            {count !== undefined && count > 0 && (
              <span
                className={`inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 text-2xs font-semibold tabular ${
                  isActive ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                {count}
              </span>
            )}
            <span
              aria-hidden="true"
              className={`absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand-600 transition-all duration-200 ease-smooth ${
                isActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

/** Two-column label/value list used across detail panels. */
export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-slate-100">
      {items.map((item) => (
        <div key={item.label} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-sm text-slate-500">{item.label}</dt>
          <dd className="min-w-0 text-right text-sm font-medium text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
