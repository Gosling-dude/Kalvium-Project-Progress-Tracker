import { EmptyState } from "../../components/ui/Feedback";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Icon, IconName } from "../../components/ui/Icon";

interface TimelineEvent {
  at: string;
  type: string;
  title: string;
  detail?: string;
  actor?: string | null;
}

// Timeline entry types are open-ended, so the marker is derived from the type
// string rather than an exhaustive map — a new event type still gets a sensible
// icon and colour with no change here.
function markerFor(type: string): { icon: IconName; classes: string } {
  const t = type.toUpperCase();
  if (/FLAG/.test(t)) return { icon: "flag", classes: "bg-amber-50 text-amber-600 ring-amber-100" };
  if (/EMAIL/.test(t)) return { icon: "mail", classes: "bg-blue-50 text-blue-600 ring-blue-100" };
  if (/VIDEO/.test(t)) return { icon: "video", classes: "bg-violet-50 text-violet-600 ring-violet-100" };
  if (/INTERVIEW/.test(t)) return { icon: "calendar", classes: "bg-indigo-50 text-indigo-600 ring-indigo-100" };
  if (/GRADUAT/.test(t)) return { icon: "graduation", classes: "bg-emerald-50 text-emerald-600 ring-emerald-100" };
  if (/DELIVERABLE|EVALUATION/.test(t)) return { icon: "clipboard", classes: "bg-slate-100 text-slate-500 ring-slate-200" };
  if (/TRACK|TRANSITION|ROUTE/.test(t)) return { icon: "trendUp", classes: "bg-brand-50 text-brand-600 ring-brand-100" };
  if (/REVIEW|RESUME/.test(t)) return { icon: "checkCircle", classes: "bg-teal-50 text-teal-600 ring-teal-100" };
  return { icon: "info", classes: "bg-slate-100 text-slate-500 ring-slate-200" };
}

export function OverviewTab({ detail }: { detail: { timeline: TimelineEvent[]; student: { notes: string | null } } }) {
  const events = [...detail.timeline].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="space-y-4">
      {detail.student.notes && (
        <Card>
          <CardHeader icon="edit" title="Notes" />
          <CardBody>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{detail.student.notes}</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader icon="history" title="Full timeline" subtitle={events.length > 0 ? `${events.length} events` : undefined} />
        {events.length === 0 ? (
          <EmptyState
            icon="history"
            title="No events yet"
            description="Timeline entries appear as the student moves through the program."
          />
        ) : (
          <CardBody>
            <ol className="relative space-y-1">
              {/* Continuous spine behind the markers, inset so it lines up with
                  their centres and stops cleanly at the last entry. */}
              <span aria-hidden="true" className="absolute bottom-3 left-4 top-3 w-px -translate-x-1/2 bg-slate-200" />
              {events.map((e, i) => {
                const m = markerFor(e.type);
                return (
                  <li key={i} className="relative flex gap-3.5 pb-3 last:pb-0">
                    <span
                      className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${m.classes}`}
                    >
                      <Icon name={m.icon} size={14} />
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-sm font-medium text-slate-900">{e.title}</p>
                      {e.detail && <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{e.detail}</p>}
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                        <time dateTime={e.at}>{new Date(e.at).toLocaleString()}</time>
                        {e.actor && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span>{e.actor}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardBody>
        )}
      </Card>
    </div>
  );
}
