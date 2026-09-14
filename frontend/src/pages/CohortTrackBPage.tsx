import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { fetchCohort, fetchStudents } from "../lib/queries";
import { Table } from "../components/ui/Table";
import { Badge, DeliverableSetStatusBadge, ProgramStatusBadge } from "../components/ui/Badge";
import { TableSkeleton } from "../components/ui/Feedback";
import { BackLink, PageContainer, PageHeader } from "../components/ui/Page";
import { Student } from "../types";

// Track B has no sub-tracks (spec section 1/7) — one flat list, each row
// drilling into the Student 360 page's Development tab for deliverables.
export function CohortTrackBPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: cohort } = useQuery({ queryKey: ["cohort", id], queryFn: () => fetchCohort(id!), enabled: !!id });
  const { data, isLoading } = useQuery<{ data: Student[] }>({
    queryKey: ["students", { cohortId: id, pageSize: 200 }],
    queryFn: () => fetchStudents({ cohortId: id, pageSize: 200 }),
    enabled: !!id,
  });

  const trackBStudents = (data?.data ?? []).filter((s) => s.currentTrack === "B");

  return (
    <PageContainer>
      <BackLink to={`/cohorts/${id}`} label={cohort?.name ?? "Cohort"} />
      <PageHeader
        icon="sparkle"
        title="Track B"
        description="Feedback + development plan → deliverables → Growth Coach evaluation."
        meta={<Badge tone="danger">{trackBStudents.length} students on Track B</Badge>}
      />

      <div className="surface">
        {isLoading ? (
          <TableSkeleton rows={8} cols={9} />
        ) : (
          <Table
            rows={trackBStudents}
            rowKey={(s) => s.id}
            onRowClick={(s) => navigate(`/students/${s.id}`)}
            emptyMessage="No students in Track B yet."
            columns={[
              {
                header: "Name",
                className: "max-w-[160px] truncate",
                render: (s) => (
                  <span className="font-medium text-slate-900 dark:text-slate-100" title={s.fullName}>
                    {s.fullName}
                  </span>
                ),
              },
              {
                header: "Email",
                className: "max-w-[200px] truncate",
                render: (s) => <span title={s.email}>{s.email}</span>,
              },
              {
                header: "Campus",
                className: "max-w-[130px] truncate",
                render: (s) => <span title={s.campus?.name ?? ""}>{s.campus?.name ?? "—"}</span>,
              },
              { header: "Batch", render: (s) => s.batch ?? <span className="text-slate-300 dark:text-slate-600">—</span> },
              {
                header: "Growth Coach Email",
                className: "max-w-[200px] truncate",
                render: (s) => <span title={s.growthCoach?.email ?? ""}>{s.growthCoach?.email ?? <span className="text-slate-300 dark:text-slate-600">—</span>}</span>,
              },
              { header: "Status", render: (s) => <ProgramStatusBadge status={s.programStatus} /> },
              {
                header: "Deliverable Status",
                render: (s) => <DeliverableSetStatusBadge status={s.deliverableSetStatus} />,
              },
              {
                header: "Deadline",
                render: (s) =>
                  s.deliverableDeadline ? (
                    <span className={s.deliverableSetStatus === "OVERDUE" ? "font-medium text-rose-600 dark:text-rose-400" : ""}>
                      {new Date(s.deliverableDeadline).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                  ),
              },
              {
                header: "Flags",
                render: (s) =>
                  s.openFlagCount ? <Badge tone="danger">{s.openFlagCount} open</Badge> : <span className="text-slate-300 dark:text-slate-600">—</span>,
              },
            ]}
          />
        )}
      </div>
    </PageContainer>
  );
}
