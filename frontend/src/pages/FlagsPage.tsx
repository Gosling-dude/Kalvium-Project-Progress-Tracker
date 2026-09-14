import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchOpenFlags } from "../lib/queries";
import { Flag } from "../types";
import { Table } from "../components/ui/Table";
import { Badge, SeverityBadge } from "../components/ui/Badge";
import { TableSkeleton } from "../components/ui/Feedback";
import { PageContainer, PageHeader } from "../components/ui/Page";

export function FlagsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<Flag[]>({ queryKey: ["open-flags"], queryFn: fetchOpenFlags });

  const criticalCount = data?.filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH").length ?? 0;

  return (
    <PageContainer width="max-w-5xl">
      <PageHeader
        icon="flag"
        title="Flags"
        description="Open concerns across every student, most severe first."
        meta={
          data &&
          data.length > 0 && (
            <>
              <Badge tone="danger" dot>
                {data.length} open
              </Badge>
              {criticalCount > 0 && <Badge tone="warning">{criticalCount} high or critical</Badge>}
            </>
          )
        }
      />
      <div className="surface">
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : (
          <Table
            rows={data ?? []}
            rowKey={(f) => f.id}
            onRowClick={(f) => navigate(`/students/${f.studentId}`)}
            emptyMessage="No open flags. Nothing needs attention right now."
            columns={[
              {
                header: "Student",
                className: "max-w-[140px] truncate",
                render: (f) => (
                  <span className="font-medium text-slate-900 dark:text-slate-100" title={f.student?.fullName ?? ""}>
                    {f.student?.fullName ?? "—"}
                  </span>
                ),
              },
              {
                header: "Category",
                render: (f) => (
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{f.category.replace(/_/g, " ")}</span>
                ),
              },
              { header: "Severity", render: (f) => <SeverityBadge severity={f.severity} /> },
              {
                header: "Title",
                className: "max-w-[260px] truncate",
                render: (f) => <span title={f.title}>{f.title}</span>,
              },
              {
                header: "Assigned To",
                className: "max-w-[140px] truncate",
                render: (f) =>
                  f.assignedTo?.name ? (
                    <span title={f.assignedTo.name}>{f.assignedTo.name}</span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">Unassigned</span>
                  ),
              },
              {
                header: "Raised",
                render: (f) => (
                  <time className="text-xs text-slate-500 dark:text-slate-400" dateTime={f.createdAt}>
                    {new Date(f.createdAt).toLocaleDateString()}
                  </time>
                ),
              },
            ]}
          />
        )}
      </div>
    </PageContainer>
  );
}
