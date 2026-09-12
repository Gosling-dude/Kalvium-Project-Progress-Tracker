import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteStudent, fetchStudentDetail } from "../../lib/queries";
import { apiErrorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Spinner, ErrorBanner } from "../../components/ui/Feedback";
import { Badge, ProgramStatusBadge, SeverityBadge, TrackBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Field, Input } from "../../components/ui/Form";
import { OverviewTab } from "./OverviewTab";
import { ProjectReviewTab } from "./ProjectReviewTab";
import { VideoTab } from "./VideoTab";
import { InterviewsTab } from "./InterviewsTab";
import { DevelopmentTab } from "./DevelopmentTab";
import { GraduationTab } from "./GraduationTab";
import { FlagsTab } from "./FlagsTab";
import { EmailsTab } from "./EmailsTab";
import { MoveTrackModal } from "./MoveTrackModal";

const ADMIN_TABS = ["Overview", "Project Review", "Video", "Interviews", "Development", "Graduation", "Flags", "Emails"] as const;
// A Growth Coach's job is narrower (spec section 17): their own assigned
// students' deliverables and status — not the full Admin 360 (video/interview
// evaluation, graduation, email template sends are all Admin-only server-side).
const GROWTH_COACH_TABS = ["Overview", "Development", "Flags"] as const;
type Tab = (typeof ADMIN_TABS)[number];

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const TABS = isAdmin ? ADMIN_TABS : GROWTH_COACH_TABS;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("Overview");
  const [showMove, setShowMove] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

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
        ← {isAdmin ? "Students" : "My Students"}
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{s.fullName}</h1>
            <p className="text-sm text-slate-500">{s.email}</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowMove(true)}>
                Move Student
              </Button>
              <Button variant="danger" onClick={() => setShowDelete(true)}>
                Delete Student
              </Button>
            </div>
          )}
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
            growthCoachEvaluations={data.growthCoachEvaluations}
            onChanged={refresh}
          />
        )}
        {tab === "Graduation" && <GraduationTab student={s} interviews={data.interviews} decisions={data.graduationDecisions} onChanged={refresh} />}
        {tab === "Flags" && <FlagsTab student={s} flags={data.flags} onChanged={refresh} />}
        {tab === "Emails" && <EmailsTab student={s} emailHistory={data.emailHistory} />}
      </div>

      {showMove && <MoveTrackModal student={s} onClose={() => setShowMove(false)} onDone={() => { setShowMove(false); refresh(); }} />}
      {showDelete && (
        <DeleteStudentModal
          student={s}
          onClose={() => setShowDelete(false)}
          onDeleted={() => navigate(isAdmin ? "/students" : "/tasks")}
        />
      )}
    </div>
  );
}

// A hard, irreversible delete — unlike everything else in this app (which
// keeps append-only history), this wipes the student and every record that
// exists only because of them. Requires typing the student's name so it
// can't be triggered by a stray click.
function DeleteStudentModal({
  student,
  onClose,
  onDeleted,
}: {
  student: { id: string; fullName: string };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => deleteStudent(student.id),
    onSuccess: onDeleted,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Modal open onClose={onClose} title="Delete Student">
      <div className="space-y-3">
        {error && <ErrorBanner message={error} />}
        <p className="text-sm text-slate-700">
          This permanently deletes <strong>{student.fullName}</strong> and everything tied to them — cohort history, project/resume
          reviews, video and interview evaluations, deliverables, flags, growth coach evaluations, graduation decisions, and
          email history. This cannot be undone.
        </p>
        <Field label={`Type "${student.fullName}" to confirm`}>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => mutation.mutate()} disabled={confirmText !== student.fullName || mutation.isPending}>
            {mutation.isPending ? "Deleting…" : "Delete Permanently"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
