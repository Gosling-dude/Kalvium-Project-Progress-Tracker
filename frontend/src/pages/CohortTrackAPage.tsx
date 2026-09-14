import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { fetchCohort, fetchStudents } from "../lib/queries";
import { Table } from "../components/ui/Table";
import { Badge, DeliverableSetStatusBadge, ProgramStatusBadge, TrackBadge } from "../components/ui/Badge";
import { TableSkeleton } from "../components/ui/Feedback";
import { BackLink, PageContainer, PageHeader } from "../components/ui/Page";
import { Student } from "../types";

const SUB_TRACKS = ["ALL", "A", "A1", "A2"] as const;

// Track A entry point (spec section 7): the same mandatory student columns,
// filterable by sub-track, drilling into the Student 360 page for the
// video-question / interview / graduation workflow.
export function CohortTrackAPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subTrack, setSubTrack] = useState<(typeof SUB_TRACKS)[number]>("ALL");

  const { data: cohort } = useQuery({ queryKey: ["cohort", id], queryFn: () => fetchCohort(id!), enabled: !!id });
  const { data, isLoading } = useQuery<{ data: Student[] }>({
    queryKey: ["students", { cohortId: id, pageSize: 200 }],
    queryFn: () => fetchStudents({ cohortId: id, pageSize: 200 }),
    enabled: !!id,
  });

  const trackAStudents = (data?.data ?? []).filter((s) => s.currentTrack === "A" || s.currentTrack === "A1" || s.currentTrack === "A2");
  const filtered = subTrack === "ALL" ? trackAStudents : trackAStudents.filter((s) => s.currentTrack === subTrack);

  return (
    <PageContainer>
      <BackLink to={`/cohorts/${id}`} label={cohort?.name ?? "Cohort"} />
      <PageHeader
        icon="clipboard"
        title="Track A"
        description="Orientation → 10 Video Questions → A1 (5-day intensive) or A2 (targeted development)."
        meta={<Badge tone="info">{trackAStudents.length} students on Track A</Badge>}
      />

      {/* Segmented sub-track filter — clearer than an underline tab bar here,
          because these are filters over one list, not separate views. */}
      <div className="no-scrollbar flex w-full gap-1 overflow-x-auto rounded-lg border border-slate-200/80 bg-slate-100/70 p-1 dark:border-slate-800 dark:bg-slate-800/50 sm:w-auto sm:self-start">
        {SUB_TRACKS.map((t) => {
          const count =
            t === "ALL" ? trackAStudents.length : trackAStudents.filter((s) => s.currentTrack === t).length;
          const label = t === "ALL" ? "All" : t === "A" ? "No sub-track" : t;
          const isActive = subTrack === t;
          return (
            <button
              key={t}
              onClick={() => setSubTrack(t)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 ease-smooth ${
                isActive
                  ? "bg-white text-brand-700 shadow-sm ring-1 ring-inset ring-slate-200 dark:bg-slate-700 dark:text-brand-400 dark:ring-slate-600"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-100"
              }`}
            >
              {label}
              <span
                className={`inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 text-2xs font-semibold tabular ${
                  isActive
                    ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
                    : "bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="surface">
        {isLoading ? (
          <TableSkeleton rows={8} cols={10} />
        ) : (
          <Table
            rows={filtered}
            rowKey={(s) => s.id}
            onRowClick={(s) => navigate(`/students/${s.id}`)}
            emptyMessage="No students in this sub-track yet."
            columns={[
              {
                header: "Name",
                className: "max-w-[150px] truncate",
                render: (s) => (
                  <span className="font-medium text-slate-900 dark:text-slate-100" title={s.fullName}>
                    {s.fullName}
                  </span>
                ),
              },
              {
                header: "Email",
                className: "max-w-[180px] truncate",
                render: (s) => <span title={s.email}>{s.email}</span>,
              },
              {
                header: "Campus",
                className: "max-w-[120px] truncate",
                render: (s) => <span title={s.campus?.name ?? ""}>{s.campus?.name ?? "—"}</span>,
              },
              { header: "Batch", render: (s) => s.batch ?? <span className="text-slate-300 dark:text-slate-600">—</span> },
              {
                header: "Growth Coach Email",
                className: "max-w-[180px] truncate",
                render: (s) => <span title={s.growthCoach?.email ?? ""}>{s.growthCoach?.email ?? <span className="text-slate-300 dark:text-slate-600">—</span>}</span>,
              },
              { header: "Sub-track", render: (s) => <TrackBadge track={s.currentTrack} /> },
              { header: "Status", render: (s) => <ProgramStatusBadge status={s.programStatus} /> },
              {
                // Only meaningful for the A2 sub-track — deriveDeliverableSetStatus
                // returns null for A / A1, and the badge renders "—".
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
