import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchMyTasks } from "../lib/queries";
import { TaskItem } from "../types";
import { Table } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Spinner, EmptyState } from "../components/ui/Feedback";

const TYPE_LABEL: Record<TaskItem["type"], string> = {
  FLAG_ASSIGNED: "Flag assigned to you",
  INTERVIEW_UPCOMING: "Interview",
  DELIVERABLE_ASSIGNED: "New deliverable assigned",
  DELIVERABLE_AWAITING_REVIEW: "Deliverable to review",
  GROWTH_COACH_EVALUATION_PENDING: "Confirm Growth Coach transition",
  STUDENT_TIMELINE_UPDATE: "Recent activity",
};

const TYPE_TONE: Record<TaskItem["type"], "danger" | "info" | "neutral"> = {
  FLAG_ASSIGNED: "danger",
  INTERVIEW_UPCOMING: "info",
  DELIVERABLE_ASSIGNED: "info",
  DELIVERABLE_AWAITING_REVIEW: "info",
  GROWTH_COACH_EVALUATION_PENDING: "info",
  STUDENT_TIMELINE_UPDATE: "neutral",
};

// The account owner's to-do feed — assignments they should never have to
// discover manually: flags assigned to them, their upcoming interviews,
// deliverables assigned to or awaiting review for their students, pending
// Growth Coach transition confirmations, and (for Growth Coaches) a rolling
// few days of other significant activity on their assigned students.
export function TasksPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<TaskItem[]>({ queryKey: ["my-tasks"], queryFn: fetchMyTasks });

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Tasks</h1>
        <p className="text-sm text-slate-500">Everything assigned to your account across every workflow.</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <Spinner />
        ) : data && data.length > 0 ? (
          <Table
            rows={data}
            rowKey={(t) => `${t.entityType}-${t.entityId}`}
            onRowClick={(t) => navigate(`/students/${t.studentId}`)}
            columns={[
              { header: "Type", render: (t) => <Badge tone={TYPE_TONE[t.type]}>{TYPE_LABEL[t.type]}</Badge> },
              {
                header: "Item",
                className: "max-w-[220px] truncate",
                render: (t) => <span title={t.title}>{t.title}</span>,
              },
              {
                header: "Student",
                className: "max-w-[140px] truncate",
                render: (t) => <span title={t.studentName}>{t.studentName}</span>,
              },
              {
                header: "Detail",
                className: "max-w-[220px] truncate",
                render: (t) => <span title={t.detail ?? ""}>{t.detail ?? "—"}</span>,
              },
              { header: "When", render: (t) => new Date(t.at).toLocaleString() },
            ]}
          />
        ) : (
          <EmptyState title="Nothing needs your attention right now" description="Assigned flags, upcoming interviews, deliverables, and recent activity on your students will appear here." />
        )}
      </div>
    </div>
  );
}
