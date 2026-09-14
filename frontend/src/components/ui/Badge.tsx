import { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
  warning: "bg-amber-50 text-amber-800 ring-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30",
  danger: "bg-rose-50 text-rose-700 ring-rose-200/80 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/30",
  info: "bg-blue-50 text-blue-700 ring-blue-200/80 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30",
  brand: "bg-brand-50 text-brand-700 ring-brand-200/80 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30",
};

const DOT_CLASSES: Record<Tone, string> = {
  neutral: "bg-slate-400 dark:bg-slate-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-blue-500",
  brand: "bg-brand-500",
};

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  className = "",
  title,
}: {
  children: ReactNode;
  tone?: Tone;
  /** Adds a leading status dot — useful where the label alone reads as plain text. */
  dot?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASSES[tone]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASSES[tone]}`} aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

const TRACK_TONE: Record<string, Tone> = { A: "info", A1: "success", A2: "warning", B: "danger" };
export function TrackBadge({ track }: { track: string | null }) {
  if (!track)
    return (
      <Badge tone="neutral" dot>
        Not routed
      </Badge>
    );
  return (
    <Badge tone={TRACK_TONE[track] ?? "neutral"} dot>
      Track {track}
    </Badge>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  ONBOARDING: "neutral",
  ACTIVE: "info",
  GRADUATED: "success",
  FUTURE_PIPELINE: "warning",
  INACTIVE: "neutral",
};
export function ProgramStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"} dot>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

const DELIVERABLE_SET_STATUS_TONE: Record<string, Tone> = {
  NO_DELIVERABLES: "neutral",
  DRAFT: "neutral",
  ON_TRACK: "info",
  ALL_SUBMITTED: "brand",
  OVERDUE: "danger",
  COMPLETED: "success",
};
const DELIVERABLE_SET_STATUS_LABEL: Record<string, string> = {
  NO_DELIVERABLES: "No deliverables",
  DRAFT: "Not yet sent",
  ON_TRACK: "Within deadline",
  ALL_SUBMITTED: "All submitted",
  OVERDUE: "Overdue",
  COMPLETED: "All verified",
};
export function DeliverableSetStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-slate-300 dark:text-slate-600">—</span>;
  return (
    <Badge tone={DELIVERABLE_SET_STATUS_TONE[status] ?? "neutral"} dot>
      {DELIVERABLE_SET_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

const SEVERITY_TONE: Record<string, Tone> = { LOW: "neutral", MEDIUM: "warning", HIGH: "danger", CRITICAL: "danger" };
export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge tone={SEVERITY_TONE[severity] ?? "neutral"} dot>
      {severity}
    </Badge>
  );
}

/** Small count pill used for nav badges and inline totals. */
export function CountPill({ count, tone = "danger" }: { count: number; tone?: Tone }) {
  return (
    <span
      className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-2xs font-semibold tabular ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      {count}
    </span>
  );
}
