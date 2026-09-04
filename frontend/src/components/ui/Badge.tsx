import { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}

const TRACK_TONE: Record<string, Tone> = { A: "info", A1: "success", A2: "warning", B: "danger" };
export function TrackBadge({ track }: { track: string | null }) {
  if (!track) return <Badge tone="neutral">Not routed</Badge>;
  return <Badge tone={TRACK_TONE[track] ?? "neutral"}>Track {track}</Badge>;
}

const STATUS_TONE: Record<string, Tone> = {
  ONBOARDING: "neutral",
  ACTIVE: "info",
  GRADUATED: "success",
  FUTURE_PIPELINE: "warning",
  INACTIVE: "neutral",
};
export function ProgramStatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{status.replace(/_/g, " ")}</Badge>;
}

const SEVERITY_TONE: Record<string, Tone> = { LOW: "neutral", MEDIUM: "warning", HIGH: "danger", CRITICAL: "danger" };
export function SeverityBadge({ severity }: { severity: string }) {
  return <Badge tone={SEVERITY_TONE[severity] ?? "neutral"}>{severity}</Badge>;
}
