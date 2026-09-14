import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchMyTasks } from "../lib/queries";
import { TaskItem } from "../types";
import { Table } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { TableSkeleton, EmptyState } from "../components/ui/Feedback";
import { PageContainer, PageHeader } from "../components/ui/Page";

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

  const actionableCount = data?.filter((t) => t.type !== "STUDENT_TIMELINE_UPDATE").length ?? 0;

  return (
    <PageContainer width="max-w-5xl">
      <PageHeader
        icon="tasks"
        title="My Tasks"
        description="Everything assigned to your account across every workflow."
        meta={
          data &&
          data.length > 0 && (
            <>
              <Badge tone={actionableCount > 0 ? "danger" : "success"} dot>
                {actionableCount} needing action
              </Badge>
              <Badge tone="neutral">{data.length} total items</Badge>
            </>
          )
        }
      />
      <div className="surface">
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : data && data.length > 0 ? (
          <Table
            rows={data}
            rowKey={(t) => `${t.entityType}-${t.entityId}`}
            onRowClick={(t) => navigate(`/students/${t.studentId}`)}
            columns={[
              {
                header: "Type",
                render: (t) => (
                  <Badge tone={TYPE_TONE[t.type]} dot>
                    {TYPE_LABEL[t.type]}
                  </Badge>
                ),
              },
              {
                header: "Item",
                className: "max-w-[220px] truncate",
                render: (t) => (
                  <span className="font-medium text-slate-900 dark:text-slate-100" title={t.title}>
                    {t.title}
                  </span>
                ),
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
              {
                header: "When",
                render: (t) => (
                  <time className="text-xs text-slate-500 dark:text-slate-400" dateTime={t.at}>
                    {new Date(t.at).toLocaleString()}
                  </time>
                ),
              },
            ]}
          />
        ) : (
          <EmptyState
            icon="checkCircle"
            title="Nothing needs your attention right now"
            description="Assigned flags, upcoming interviews, deliverables, and recent activity on your students will appear here."
          />
        )}
      </div>
    </PageContainer>
  );
}
