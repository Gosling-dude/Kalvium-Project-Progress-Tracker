import { useState } from "react";
import { EmailComposer } from "../../components/EmailComposer";
import { EmptyState } from "../../components/ui/Feedback";
import { Badge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { Student } from "../../types";

interface EmailHistoryRow {
  id: string;
  status: string;
  sentAt: string | null;
  emailEvent: { template?: { name: string } | null; templateKeySnapshot: string; createdAt: string };
}

export function EmailsTab({ student, emailHistory }: { student: Student; emailHistory: EmailHistoryRow[] }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <EmailComposer key={refreshKey} student={student} triggerLabel="Send Email" onSent={() => setRefreshKey((k) => k + 1)} />
      </div>

      {emailHistory.length === 0 ? (
        <div className="surface">
          <EmptyState
            icon="mail"
            title="No emails sent yet"
            description="Workflow emails sent to this student will be listed here with their delivery status."
          />
        </div>
      ) : (
        <div className="surface divide-y divide-slate-100 dark:divide-slate-800">
          {emailHistory.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30">
                  <Icon name="mail" size={13} />
                </span>
                <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                  {r.emailEvent.template?.name ?? r.emailEvent.templateKeySnapshot}
                </span>
              </span>
              <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Badge tone={r.status === "SENT" ? "success" : r.status === "FAILED" ? "danger" : "neutral"} dot>
                  {r.status}
                </Badge>
                {r.sentAt && <time dateTime={r.sentAt}>{new Date(r.sentAt).toLocaleString()}</time>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
