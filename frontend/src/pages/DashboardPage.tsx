import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchDashboard } from "../lib/queries";
import { DashboardSummary } from "../types";
import { StatCard } from "../components/ui/Card";
import { Spinner } from "../components/ui/Feedback";
import { TrackBadge } from "../components/ui/Badge";

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<DashboardSummary>({ queryKey: ["dashboard"], queryFn: fetchDashboard, refetchInterval: 60_000 });

  if (isLoading || !data) return <Spinner />;

  const q = data.actionQueue;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Where the program stands right now, and what needs your attention.</p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Students by track</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Track A" value={data.tracks.A} onClick={() => navigate("/students?track=A")} />
          <StatCard label="Track A1" value={data.tracks.A1} onClick={() => navigate("/students?track=A1")} />
          <StatCard label="Track A2" value={data.tracks.A2} tone="warning" onClick={() => navigate("/students?track=A2")} />
          <StatCard label="Track B" value={data.tracks.B} tone="warning" onClick={() => navigate("/students?track=B")} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Program status</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Onboarding" value={data.programStatus.ONBOARDING} onClick={() => navigate("/students?programStatus=ONBOARDING")} />
          <StatCard label="Active" value={data.programStatus.ACTIVE} onClick={() => navigate("/students?programStatus=ACTIVE")} />
          <StatCard label="Graduated" value={data.programStatus.GRADUATED} onClick={() => navigate("/students?programStatus=GRADUATED")} />
          <StatCard label="Future Pipeline" value={data.programStatus.FUTURE_PIPELINE} tone="warning" onClick={() => navigate("/students?programStatus=FUTURE_PIPELINE")} />
          <StatCard label="Inactive" value={data.programStatus.INACTIVE} onClick={() => navigate("/students?programStatus=INACTIVE")} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Action required</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Interviews upcoming" value={q.interviewsUpcoming} />
          <StatCard label="Interviews pending completion" value={q.interviewsPendingCompletion} tone={q.interviewsPendingCompletion > 0 ? "warning" : "default"} />
          <StatCard label="Incomplete video evaluations" value={q.incompleteVideoEvaluations} tone={q.incompleteVideoEvaluations > 0 ? "warning" : "default"} />
          <StatCard label="Pending deliverables" value={q.pendingDeliverables} onClick={() => navigate("/deliverables")} />
          <StatCard label="Overdue deliverables" value={q.overdueDeliverables} tone={q.overdueDeliverables > 0 ? "danger" : "default"} onClick={() => navigate("/deliverables")} />
          <StatCard label="Active flags" value={q.activeFlags} tone={q.activeFlags > 0 ? "danger" : "default"} onClick={() => navigate("/flags")} />
          <StatCard label="Track changes (7d)" value={q.recentTrackChanges7d} />
          <StatCard label="Awaiting graduation decision" value={q.studentsAwaitingGraduationDecision} tone={q.studentsAwaitingGraduationDecision > 0 ? "warning" : "default"} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Cohorts</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.cohorts.map((c) => (
            <StatCard key={c.id} label={c.name} value={c.activeStudentCount} onClick={() => navigate(`/cohorts/${c.id}`)} />
          ))}
        </div>
      </section>

      {data.stuckStudents.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Stuck for 14+ days without an update</h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <tbody className="divide-y divide-slate-100">
                {data.stuckStudents.map((s) => (
                  <tr key={s.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/students/${s.id}`)}>
                    <td className="px-3 py-2 font-medium text-slate-800">{s.fullName}</td>
                    <td className="px-3 py-2"><TrackBadge track={s.currentTrack} /></td>
                    <td className="px-3 py-2 text-slate-500">{s.currentStage.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{s.daysSinceUpdate} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
