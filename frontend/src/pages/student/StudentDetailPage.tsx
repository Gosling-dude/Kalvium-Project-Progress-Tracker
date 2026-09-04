import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchStudentDetail } from "../../lib/queries";
import { Spinner } from "../../components/ui/Feedback";
import { Badge, ProgramStatusBadge, SeverityBadge, TrackBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { OverviewTab } from "./OverviewTab";
import { ProjectReviewTab } from "./ProjectReviewTab";
import { VideoTab } from "./VideoTab";
import { InterviewsTab } from "./InterviewsTab";
import { DevelopmentTab } from "./DevelopmentTab";
import { GraduationTab } from "./GraduationTab";
import { FlagsTab } from "./FlagsTab";
import { EmailsTab } from "./EmailsTab";
import { MoveTrackModal } from "./MoveTrackModal";

const TABS = [
  "Overview",
  "Project Review",
  "Video",
  "Interviews",
  "Development",
  "Graduation",
  "Flags",
  "Emails",
] as const;
type Tab = (typeof TABS)[number];

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("Overview");
  const [showMove, setShowMove] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["student-detail", id], queryFn: () => fetchStudentDetail(id!), enabled: !!id });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["student-detail", id] });
  }

  if (isLoading || !data) return <Spinner />;

  const s = data.student;
  const openFlags = data.flags.filter((f: { status: string }) => f.status === "OPEN");

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <Link to="/students" className="text-sm text-brand-600 hover:underline">
        ← Students
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{s.fullName}</h1>
            <p className="text-sm text-slate-500">{s.email}</p>
          </div>
          <Button variant="secondary" onClick={() => setShowMove(true)}>
            Move Student
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <TrackBadge track={s.currentTrack} />
          <Badge>{s.currentStage.replace(/_/g, " ")}</Badge>
          <ProgramStatusBadge status={s.programStatus} />
          {s.currentCohort && <Badge tone="info">{s.currentCohort.name}</Badge>}
          {s.campus && <Badge>{s.campus.name}</Badge>}
          {s.growthCoach && <Badge>Coach: {s.growthCoach.name}</Badge>}
          {s.chosenProject && <Badge tone="neutral">{s.chosenProject}</Badge>}
        </div>
        {openFlags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {openFlags.map((f: { id: string; severity: string; title: string }) => (
              <SeverityBadge key={f.id} severity={f.severity} />
            ))}
            <span className="text-xs text-rose-700">{openFlags.length} open flag(s) — see Flags tab</span>
          </div>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        {tab === "Overview" && <OverviewTab detail={data} />}
        {tab === "Project Review" && <ProjectReviewTab student={s} reviews={data.projectReviews} onChanged={refresh} />}
        {tab === "Video" && <VideoTab student={s} assignments={data.videoAssignments} onChanged={refresh} />}
        {tab === "Interviews" && <InterviewsTab student={s} interviews={data.interviews} onChanged={refresh} />}
        {tab === "Development" && (
          <DevelopmentTab
            student={s}
            deliverables={data.deliverables}
            checkpoints={data.checkpoints}
            growthCoachEvaluations={data.growthCoachEvaluations}
            onChanged={refresh}
          />
        )}
        {tab === "Graduation" && <GraduationTab student={s} interviews={data.interviews} decisions={data.graduationDecisions} onChanged={refresh} />}
        {tab === "Flags" && <FlagsTab student={s} flags={data.flags} onChanged={refresh} />}
        {tab === "Emails" && <EmailsTab student={s} emailHistory={data.emailHistory} />}
      </div>

      {showMove && <MoveTrackModal student={s} onClose={() => setShowMove(false)} onDone={() => { setShowMove(false); refresh(); }} />}
    </div>
  );
}
