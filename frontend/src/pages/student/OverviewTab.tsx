import { EmptyState } from "../../components/ui/Feedback";

interface TimelineEvent {
  at: string;
  type: string;
  title: string;
  detail?: string;
  actor?: string | null;
}

export function OverviewTab({ detail }: { detail: { timeline: TimelineEvent[]; student: { notes: string | null } } }) {
  const events = [...detail.timeline].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="space-y-4">
      {detail.student.notes && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{detail.student.notes}</p>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Full timeline</h3>
        {events.length === 0 ? (
          <EmptyState title="No events yet" description="Timeline entries appear as the student moves through the program." />
        ) : (
          <ol className="space-y-3 border-l border-slate-200 pl-4">
            {events.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500" />
                <p className="text-xs text-slate-400">
                  {new Date(e.at).toLocaleString()} {e.actor && `· ${e.actor}`}
                </p>
                <p className="text-sm font-medium text-slate-800">{e.title}</p>
                {e.detail && <p className="text-sm text-slate-600">{e.detail}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
