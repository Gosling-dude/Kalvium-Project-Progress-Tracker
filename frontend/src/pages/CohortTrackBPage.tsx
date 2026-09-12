import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchCohort, fetchStudents } from "../lib/queries";
import { Table } from "../components/ui/Table";
import { Badge, ProgramStatusBadge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Feedback";
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
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <Link to={`/cohorts/${id}`} className="text-sm text-brand-600 hover:underline">
        ← {cohort?.name ?? "Cohort"}
      </Link>
      <div>
        <h1 className="text-xl font-bold text-slate-900">Track B</h1>
        <p className="text-sm text-slate-500">Feedback + development plan → deliverables → Growth Coach evaluation.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <Spinner />
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
                  <span className="font-medium text-slate-900" title={s.fullName}>
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
              { header: "Batch", render: (s) => s.batch ?? "—" },
              {
                header: "Growth Coach Email",
                className: "max-w-[200px] truncate",
                render: (s) => <span title={s.growthCoach?.email ?? ""}>{s.growthCoach?.email ?? "—"}</span>,
              },
              { header: "Status", render: (s) => <ProgramStatusBadge status={s.programStatus} /> },
              { header: "Flags", render: (s) => (s.openFlagCount ? <Badge tone="danger">{s.openFlagCount} open</Badge> : "—") },
            ]}
          />
        )}
      </div>
    </div>
  );
}
