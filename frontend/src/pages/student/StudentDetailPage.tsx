import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { deleteStudent, fetchStudentDetail } from "../../lib/queries";
import { apiErrorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Spinner, ErrorBanner } from "../../components/ui/Feedback";
import { Badge, ProgramStatusBadge, SeverityBadge, TrackBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Field, Input } from "../../components/ui/Form";
import { BackLink, PageContainer, Tabs } from "../../components/ui/Page";
import { Icon } from "../../components/ui/Icon";
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

  const initials = s.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <PageContainer width="max-w-5xl">
      <BackLink to="/students" label={isAdmin ? "Students" : "My Students"} />

      <div className="surface overflow-hidden">
        {/* A thin track-coloured spine at the top of the identity card makes the
            student's current route legible before any text is read. */}
        <div
          aria-hidden="true"
          className={`h-1 w-full ${
            s.currentTrack === "B"
              ? "bg-gradient-to-r from-rose-400 to-rose-500"
              : s.currentTrack === "A2"
                ? "bg-gradient-to-r from-amber-400 to-amber-500"
                : s.currentTrack === "A1"
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                  : s.currentTrack === "A"
                    ? "bg-gradient-to-r from-blue-400 to-blue-500"
                    : "bg-slate-200 dark:bg-slate-700"
          }`}
        />
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-base font-bold text-white shadow-brand">
                {initials}
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-slate-100">{s.fullName}</h1>
                <a
                  href={`mailto:${s.email}`}
                  className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-400"
                >
                  <Icon name="mail" size={13} />
                  <span className="truncate">{s.email}</span>
                </a>
              </div>
            </div>
            {isAdmin && (
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" icon="external" onClick={() => setShowMove(true)}>
                  Move Student
                </Button>
                <Button variant="danger" icon="trash" onClick={() => setShowDelete(true)}>
                  Delete
                </Button>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <TrackBadge track={s.currentTrack} />
            <Badge tone="brand">{s.currentStage.replace(/_/g, " ")}</Badge>
            <ProgramStatusBadge status={s.programStatus} />
            {s.currentCohort && <Badge tone="info">{s.currentCohort.name}</Badge>}
            {s.campus && <Badge>{s.campus.name}</Badge>}
            {s.growthCoach && <Badge>Coach: {s.growthCoach.name}</Badge>}
            {s.chosenProject && <Badge tone="neutral">{s.chosenProject}</Badge>}
          </div>
          {openFlags.length > 0 && (
            <button
              type="button"
              onClick={() => setTab("Flags")}
              className="mt-4 flex w-full items-center gap-2.5 rounded-lg bg-rose-50 px-3 py-2.5 text-left ring-1 ring-inset ring-rose-200 transition-colors hover:bg-rose-100 dark:bg-rose-500/10 dark:ring-rose-500/30 dark:hover:bg-rose-500/20"
            >
              <Icon name="flag" size={15} className="shrink-0 text-rose-500 dark:text-rose-400" />
              <span className="flex flex-wrap items-center gap-1.5">
                {openFlags.map((f: { id: string; severity: string; title: string }) => (
                  <SeverityBadge key={f.id} severity={f.severity} />
                ))}
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-400">
                {openFlags.length} open flag{openFlags.length > 1 ? "s" : ""}
                <Icon name="chevronRight" size={13} />
              </span>
            </button>
          )}
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} counts={{ Flags: openFlags.length }} />

      <div className="animate-fade-in" key={tab}>
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
    </PageContainer>
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
        <p className="text-sm text-slate-700 dark:text-slate-300">
          This permanently deletes <strong>{student.fullName}</strong> and everything tied to them — cohort history, project/resume
          reviews, video and interview evaluations, deliverables, flags, growth coach evaluations, graduation decisions, and
          email history. This cannot be undone.
        </p>
        <Field label={`Type "${student.fullName}" to confirm`}>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus placeholder={student.fullName} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            icon="trash"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={confirmText !== student.fullName}
          >
            {mutation.isPending ? "Deleting…" : "Delete Permanently"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
