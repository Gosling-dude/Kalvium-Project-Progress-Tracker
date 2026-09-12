import { useState } from "react";
import { EmailComposer } from "../../components/EmailComposer";
import { EmptyState } from "../../components/ui/Feedback";
import { Badge } from "../../components/ui/Badge";
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
        <EmptyState title="No emails sent yet" />
      ) : (
        <div className="space-y-2">
          {emailHistory.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border border-slate-100 p-3 text-sm">
              <span>{r.emailEvent.template?.name ?? r.emailEvent.templateKeySnapshot}</span>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Badge tone={r.status === "SENT" ? "success" : r.status === "FAILED" ? "danger" : "neutral"}>{r.status}</Badge>
                {r.sentAt && new Date(r.sentAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
