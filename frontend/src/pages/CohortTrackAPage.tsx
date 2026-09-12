import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchCohort, fetchStudents } from "../lib/queries";
import { Table } from "../components/ui/Table";
import { Badge, ProgramStatusBadge, TrackBadge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Feedback";
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
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <Link to={`/cohorts/${id}`} className="text-sm text-brand-600 hover:underline">
        ← {cohort?.name ?? "Cohort"}
      </Link>
      <div>
        <h1 className="text-xl font-bold text-slate-900">Track A</h1>
        <p className="text-sm text-slate-500">Orientation → 10 Video Questions → A1 (5-day intensive) or A2 (targeted development).</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {SUB_TRACKS.map((t) => (
          <button
            key={t}
            onClick={() => setSubTrack(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${subTrack === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t === "ALL" ? `All (${trackAStudents.length})` : t === "A" ? `No sub-track (${trackAStudents.filter((s) => s.currentTrack === "A").length})` : `${t} (${trackAStudents.filter((s) => s.currentTrack === t).length})`}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <Spinner />
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
                  <span className="font-medium text-slate-900" title={s.fullName}>
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
              { header: "Batch", render: (s) => s.batch ?? "—" },
              {
                header: "Growth Coach Email",
                className: "max-w-[180px] truncate",
                render: (s) => <span title={s.growthCoach?.email ?? ""}>{s.growthCoach?.email ?? "—"}</span>,
              },
              { header: "Sub-track", render: (s) => <TrackBadge track={s.currentTrack} /> },
              { header: "Status", render: (s) => <ProgramStatusBadge status={s.programStatus} /> },
              { header: "Flags", render: (s) => (s.openFlagCount ? <Badge tone="danger">{s.openFlagCount} open</Badge> : "—") },
            ]}
          />
        )}
      </div>
    </div>
  );
}
