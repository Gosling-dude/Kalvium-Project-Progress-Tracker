import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  bulkEnrollStudents,
  commitStudentImport,
  fetchCohort,
  fetchCohortDashboard,
  fetchStudentDetail,
  fetchStudents,
  previewStudentImport,
  removeStudentFromCohort,
  updateCohort,
  updateStudent,
} from "../lib/queries";
import { Button } from "../components/ui/Button";
import { Spinner, ErrorBanner } from "../components/ui/Feedback";
import { Badge, ProgramStatusBadge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Field, Input } from "../components/ui/Form";
import { BackLink, PageContainer, PageHeader } from "../components/ui/Page";
import { StatCard } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";
import { EmailComposer } from "../components/EmailComposer";
import { ProjectReviewTab } from "./student/ProjectReviewTab";
import { apiErrorMessage } from "../lib/api";
import { CohortDashboard, Student } from "../types";

// Shared between the header row and each RosterRow so columns stay aligned.
// Weighted (not equal 1fr each) since Email/Growth Coach Email need much
// more room than Batch — and every cell below still truncates with a hover
// title, so a column can never force itself wider than its track and shove
// into its neighbor.
const ROSTER_GRID_COLS = "grid-cols-[1.1fr_1.5fr_1fr_0.6fr_1.5fr_1.5fr]";

interface RosterStudent extends Student {
  _count?: { flags: number };
}
interface Enrollment {
  id: string;
  isActive: boolean;
  startedAt: string;
  endedAt: string | null;
  student: RosterStudent;
}

export function CohortDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEnroll, setShowEnroll] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const { data: cohort, isLoading } = useQuery({ queryKey: ["cohort", id], queryFn: () => fetchCohort(id!), enabled: !!id });
  const { data: dashboard } = useQuery<CohortDashboard>({ queryKey: ["cohort-dashboard", id], queryFn: () => fetchCohortDashboard(id!), enabled: !!id });

  const archiveMutation = useMutation({
    mutationFn: (status: string) => updateCohort(id!, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cohort", id] }),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["cohort", id] });
    queryClient.invalidateQueries({ queryKey: ["cohort-dashboard", id] });
  }

  if (isLoading || !cohort) return <Spinner />;

  const activeEnrollments: Enrollment[] = cohort.enrollments.filter((e: Enrollment) => e.isActive);

  return (
    <PageContainer>
      <BackLink to="/cohorts" label="Cohorts" />
      <PageHeader
        icon="layers"
        title={cohort.name}
        meta={
          <>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {cohort.code}
            </span>
            <Badge tone={cohort.status === "ACTIVE" ? "success" : "neutral"} dot>
              {cohort.status}
            </Badge>
          </>
        }
        actions={
          <>
            <Button variant="secondary" icon="plus" onClick={() => setShowEnroll(true)}>
              Add Students
            </Button>
            <Button variant="secondary" icon="upload" onClick={() => setShowBulkUpload(true)}>
              Bulk Upload (CSV)
            </Button>
            {cohort.status === "ACTIVE" ? (
              <Button variant="secondary" loading={archiveMutation.isPending} onClick={() => archiveMutation.mutate("ARCHIVED")}>
                Archive
              </Button>
            ) : (
              <Button variant="secondary" loading={archiveMutation.isPending} onClick={() => archiveMutation.mutate("ACTIVE")}>
                Reactivate
              </Button>
            )}
          </>
        }
      />

      {dashboard && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Graduated" value={dashboard.graduatedCount} tone="success" icon="graduation" />
          <StatCard label="Not yet on a track" value={dashboard.unassignedCount} tone="warning" icon="user" />
          <StatCard label="Total active students" value={dashboard.totalActiveStudents} tone="info" icon="students" />
          <StatCard label="Cohort status" value={cohort.status} tone="default" icon="layers" />
        </div>
      )}

      {dashboard && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => navigate(`/cohorts/${id}/track-a`)}
            className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 text-left shadow-xs transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/50"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-500 opacity-70"
            />
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Icon name="clipboard" size={15} className="text-blue-500 dark:text-blue-400" />
                Track A
              </h2>
              <Badge tone="info">{dashboard.trackACount} students</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
              <span>
                Not yet in a sub-track:{" "}
                <strong className="font-semibold tabular text-slate-900 dark:text-slate-100">
                  {dashboard.trackABreakdown.unassignedSubTrack}
                </strong>
              </span>
              <span>
                A1:{" "}
                <strong className="font-semibold tabular text-emerald-600 dark:text-emerald-400">
                  {dashboard.trackABreakdown.a1}
                </strong>
              </span>
              <span>
                A2:{" "}
                <strong className="font-semibold tabular text-amber-600 dark:text-amber-400">
                  {dashboard.trackABreakdown.a2}
                </strong>
              </span>
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-blue-400">
              Open Track A <Icon name="chevronRight" size={12} />
            </span>
          </button>
          <button
            onClick={() => navigate(`/cohorts/${id}/track-b`)}
            className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 text-left shadow-xs transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-rose-500/50"
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-rose-400 to-rose-500 opacity-70"
            />
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Icon name="sparkle" size={15} className="text-rose-500 dark:text-rose-400" />
                Track B
              </h2>
              <Badge tone="danger">{dashboard.trackBCount} students</Badge>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Foundational development pipeline — no sub-tracks.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-rose-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-rose-400">
              Open Track B <Icon name="chevronRight" size={12} />
            </span>
          </button>
        </div>
      )}

      <div className="surface">
        <div className="surface-header flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Students</h2>
          <Badge tone="neutral">{activeEnrollments.length} active</Badge>
        </div>
        <div className="divide-y divide-slate-100 overflow-x-auto dark:divide-slate-800">
          <div
            className={`grid ${ROSTER_GRID_COLS} min-w-[52rem] gap-3 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/40 dark:text-slate-400`}
          >
            <span>Name</span>
            <span>Email</span>
            <span>Campus</span>
            <span>Batch</span>
            <span>Growth Coach Email</span>
            <span>Status</span>
          </div>
          {activeEnrollments.map((e) => (
            <RosterRow
              key={e.id}
              student={e.student}
              cohortId={cohort.id}
              expanded={expandedStudentId === e.student.id}
              onToggle={() => setExpandedStudentId(expandedStudentId === e.student.id ? null : e.student.id)}
              onChanged={refresh}
            />
          ))}
          {activeEnrollments.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700">
                <Icon name="students" size={20} />
              </span>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No students enrolled yet.</p>
              <Button size="sm" variant="secondary" icon="plus" onClick={() => setShowEnroll(true)}>
                Add Students
              </Button>
            </div>
          )}
        </div>
      </div>

      {showEnroll && (
        <EnrollModal
          cohortId={cohort.id}
          onClose={() => setShowEnroll(false)}
          onDone={() => {
            setShowEnroll(false);
            refresh();
          }}
        />
      )}

      {showBulkUpload && (
        <BulkUploadModal
          cohortId={cohort.id}
          onClose={() => setShowBulkUpload(false)}
          onDone={refresh}
        />
      )}
    </PageContainer>
  );
}

// Clicking a row expands the resume-evaluation workflow inline (spec section
// 5) — resume link, evaluated/not-evaluated state, and the exact Project
// Review rubric UI already used on the Student 360 page (reused, not rebuilt).
function RosterRow({
  student,
  cohortId,
  expanded,
  onToggle,
  onChanged,
}: {
  student: RosterStudent;
  cohortId: string;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const removeMutation = useMutation({
    mutationFn: () => removeStudentFromCohort(cohortId, student.id),
    onSuccess: onChanged,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div>
      <div
        className={`grid ${ROSTER_GRID_COLS} min-w-[52rem] cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
          expanded ? "bg-brand-50/50 dark:bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
        }`}
        onClick={onToggle}
      >
        <span
          className="flex min-w-0 items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100"
          title={student.fullName}
        >
          <Icon
            name="chevronRight"
            size={13}
            className={`shrink-0 text-slate-400 transition-transform duration-200 ease-smooth dark:text-slate-500 ${expanded ? "rotate-90 text-brand-600 dark:text-brand-400" : ""}`}
          />
          <span className="truncate">{student.fullName}</span>
        </span>
        <span className="truncate text-slate-500 dark:text-slate-400" title={student.email}>
          {student.email}
        </span>
        <span className="truncate" title={student.campus?.name ?? ""}>
          {student.campus?.name ?? "—"}
        </span>
        <span className="truncate">{student.batch ?? "—"}</span>
        <span className="truncate" title={student.growthCoach?.email ?? ""}>
          {student.growthCoach?.email ?? "—"}
        </span>
        <span className="flex flex-wrap items-center justify-end gap-2">
          <StatusBadge status={student.displayStatus} />
          <button
            className="inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-800 dark:text-brand-400 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/students/${student.id}`);
            }}
          >
            Open 360
            <Icon name="chevronRight" size={12} />
          </button>
          <button
            className="inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
            disabled={removeMutation.isPending}
            title="Remove from this cohort"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Remove ${student.fullName} from this cohort? Their history is kept — you can add them back any time.`)) {
                setError(null);
                removeMutation.mutate();
              }
            }}
          >
            <Icon name="close" size={12} />
            Remove
          </button>
        </span>
      </div>
      {error && <div className="px-4 pb-2"><ErrorBanner message={error} /></div>}
      {expanded && (
        <div className="animate-fade-in">
          <ResumeEvalPanel student={student} onChanged={onChanged} />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (status === "Graduated")
    return (
      <Badge tone="success" dot>
        Graduated
      </Badge>
    );
  if (status === "Track A")
    return (
      <Badge tone="info" dot>
        Track A
      </Badge>
    );
  if (status === "Track B")
    return (
      <Badge tone="danger" dot>
        Track B
      </Badge>
    );
  return (
    <Badge tone="neutral" dot>
      Onboarded
    </Badge>
  );
}

function ResumeEvalPanel({ student, onChanged }: { student: RosterStudent; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const [resumeLink, setResumeLink] = useState(student.resumeLink ?? "");
  const { data: detail, isLoading } = useQuery({ queryKey: ["student-detail", student.id], queryFn: () => fetchStudentDetail(student.id) });

  const saveLinkMutation = useMutation({
    mutationFn: () => updateStudent(student.id, { resumeLink }),
    onSuccess: () => {
      onChanged();
      queryClient.invalidateQueries({ queryKey: ["student-detail", student.id] });
    },
  });

  function refreshDetail() {
    queryClient.invalidateQueries({ queryKey: ["student-detail", student.id] });
    onChanged();
  }

  if (isLoading || !detail)
    return (
      <div className="border-t border-slate-100 p-4 dark:border-slate-800">
        <Spinner />
      </div>
    );

  const completedReview = detail.projectReviews.find((r: { status: string }) => r.status === "COMPLETED");

  return (
    <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Resume Google Drive link" hint="Editable any time — changing it after evaluation does not retroactively alter the recorded score">
          <Input className="min-w-[24rem]" value={resumeLink} onChange={(e) => setResumeLink(e.target.value)} placeholder="https://drive.google.com/..." />
        </Field>
        <Button size="sm" variant="secondary" onClick={() => saveLinkMutation.mutate()} loading={saveLinkMutation.isPending}>
          Save Link
        </Button>
        {student.resumeLink && (
          <a
            href={student.resumeLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-800 dark:text-brand-400 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
          >
            <Icon name="external" size={13} />
            Open resume
          </a>
        )}
        <Badge tone={completedReview ? "success" : "warning"} dot>
          {completedReview ? "Resume evaluated" : "Needs evaluation"}
        </Badge>
      </div>

      <ProjectReviewTab student={student} reviews={detail.projectReviews} onChanged={refreshDetail} />

      {completedReview && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Send the result to the student:</span>
          <EmailComposer
            student={student}
            defaultTemplateKey="RESUME_REVIEW_RESULT"
            lockTemplate
            defaultVariables={{
              track: completedReview.outcome === "TRACK_A" ? "Track A" : "Track B",
              feedback: completedReview.outcomeReason ?? "",
              nextStep: completedReview.outcome === "TRACK_A" ? "You will receive a Track A orientation and 10 video questions." : "You will receive your Track B development plan.",
            }}
            relatedEntityType="ProjectReview"
            relatedEntityId={completedReview.id}
            triggerLabel="Send Resume Result Email"
          />
        </div>
      )}
    </div>
  );
}

// Lets an Admin select any number of existing students at once, rather than
// enrolling one at a time — students already active in this cohort are left
// out of the pick list since re-adding them is a no-op the backend would
// otherwise reject.
function EnrollModal({ cohortId, onClose, onDone }: { cohortId: string; onClose: () => void; onDone: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data } = useQuery({ queryKey: ["students-for-enroll"], queryFn: () => fetchStudents({ pageSize: 500 }) });

  const candidates: Student[] = (data?.data ?? []).filter((s: Student) => s.currentCohort?.id !== cohortId);
  const q = search.trim().toLowerCase();
  const filtered = q
    ? candidates.filter((s) => s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
    : candidates;

  const mutation = useMutation({
    mutationFn: () => bulkEnrollStudents(cohortId, selected),
    onSuccess: onDone,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <Modal open onClose={onClose} title="Add Students to Cohort" width="max-w-xl">
      <div className="space-y-3">
        {error && <ErrorBanner message={error} />}
        <Field label="Search" hint="Select one or more existing students. To add a brand-new student, create them first from Students, or use Bulk Upload (CSV).">
          <Input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
        <div className="scroll-soft max-h-72 space-y-0.5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/40 p-1.5 dark:border-slate-700 dark:bg-slate-800/30">
          {filtered.map((s) => {
            const isSelected = selected.includes(s.id);
            return (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors ${
                  isSelected
                    ? "bg-brand-50 ring-1 ring-inset ring-brand-100 dark:bg-brand-500/10 dark:ring-brand-500/30"
                    : "hover:bg-white dark:hover:bg-slate-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(s.id)}
                  className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
                />
                <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-200">{s.fullName}</span>
                <span className="min-w-0 truncate text-xs text-slate-400 dark:text-slate-500">{s.email}</span>
              </label>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-slate-500 dark:text-slate-400">No matching students.</p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <span className="text-xs font-medium tabular text-slate-500 dark:text-slate-400">
            {selected.length > 0 ? `${selected.length} selected` : `${filtered.length} available`}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={selected.length === 0}>
              {mutation.isPending ? "Adding…" : `Add ${selected.length ? selected.length : ""} Student${selected.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Uploads a CSV/XLSX of students straight into this cohort: any row whose
// email doesn't already exist becomes a new Student record, and every row —
// new or pre-existing — gets enrolled here. Re-enrolling someone already
// active in this cohort is reported, not an error, so re-uploading a roster
// to add a few names never fails on the rest.
function BulkUploadModal({ cohortId, onClose, onDone }: { cohortId: string; onClose: () => void; onDone: () => void }) {
  interface PreviewRow {
    rowNumber: number;
    email: string;
    fullName: string;
    resumeLink?: string;
    batch?: string;
  }
  interface PreviewResult {
    totalRows: number;
    validRows: PreviewRow[];
    errors: { rowNumber: number; message: string }[];
    warnings: { rowNumber: number; message: string }[];
  }
  interface CommitResult {
    created: number;
    skippedExisting: number;
    updatedExisting: number;
    enrolled: number;
    alreadyInCohort: number;
    warnings: { rowNumber: number; message: string }[];
  }

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewMutation = useMutation({
    mutationFn: (file: File) => previewStudentImport(file),
    onSuccess: (res: PreviewResult) => {
      setPreview(res);
      setResult(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });
  const commitMutation = useMutation({
    mutationFn: () => commitStudentImport(preview!.validRows, cohortId),
    onSuccess: (res: CommitResult) => {
      setResult(res);
      setPreview(null);
      onDone();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Modal open onClose={onClose} title="Bulk Upload Students (CSV/XLSX)" width="max-w-2xl">
      <div className="space-y-3">
        {error && <ErrorBanner message={error} />}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Recognized columns include email, full name, campus, growth coach (name and/or "Growth Coach Email"), batch/year, chosen
          project, and a resume link. Every row is checked against the student database first: a matching email is reused as-is (never
          duplicated) and any blank fields on it get filled in from this file; a new email creates a new student. Either way, every
          student in the file gets added to this cohort. A campus or growth coach that isn't already in the system is added
          automatically (marked inactive) rather than left blank — review it in Settings afterward.
        </p>
        <label className="group flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-7 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/40 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-brand-500 dark:hover:bg-brand-500/10">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-xs ring-1 ring-inset ring-slate-200 transition-colors group-hover:text-brand-600 group-hover:ring-brand-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700 dark:group-hover:text-brand-400 dark:group-hover:ring-brand-500/30">
            <Icon name="upload" size={18} />
          </span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {previewMutation.isPending ? "Reading file…" : "Choose a CSV or XLSX file"}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">The file is validated before anything is written.</span>
          <input
            type="file"
            accept=".csv,.xlsx"
            className="sr-only"
            onChange={(e) => {
              setError(null);
              setResult(null);
              const file = e.target.files?.[0];
              if (file) previewMutation.mutate(file);
            }}
          />
        </label>
        {preview && (
          <div className="animate-fade-in space-y-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success" dot>
                {preview.validRows.length} of {preview.totalRows} rows valid
              </Badge>
              {preview.errors.length > 0 && (
                <Badge tone="danger" dot>
                  {preview.errors.length} error{preview.errors.length === 1 ? "" : "s"}
                </Badge>
              )}
              {preview.warnings.length > 0 && (
                <Badge tone="warning" dot>
                  {preview.warnings.length} warning{preview.warnings.length === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
            {(preview.errors.length > 0 || preview.warnings.length > 0) && (
              <div className="space-y-1 rounded-md bg-slate-50 p-2.5 dark:bg-slate-800/60">
                {preview.errors.slice(0, 5).map((e, i) => (
                  <p key={`e${i}`} className="text-xs text-rose-600 dark:text-rose-400">
                    <span className="font-semibold tabular">Row {e.rowNumber}:</span> {e.message}
                  </p>
                ))}
                {preview.warnings.slice(0, 5).map((w, i) => (
                  <p key={`w${i}`} className="text-xs text-amber-700 dark:text-amber-400">
                    <span className="font-semibold tabular">Row {w.rowNumber}:</span> {w.message}
                  </p>
                ))}
              </div>
            )}
            <Button
              size="sm"
              icon="check"
              onClick={() => commitMutation.mutate()}
              loading={commitMutation.isPending}
              disabled={preview.validRows.length === 0}
            >
              {commitMutation.isPending
                ? "Uploading…"
                : `Add ${preview.validRows.length} Student${preview.validRows.length === 1 ? "" : "s"} to this Cohort`}
            </Button>
          </div>
        )}
        {result && (
          <div className="animate-fade-in space-y-2">
            <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
              <Icon name="checkCircle" size={16} className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
              <span>
                {result.created} new student{result.created === 1 ? "" : "s"} created · {result.updatedExisting} existing record
                {result.updatedExisting === 1 ? "" : "s"} filled in · {result.skippedExisting} already existed on file ·{" "}
                {result.enrolled} added to this cohort · {result.alreadyInCohort} were already in this cohort.
              </span>
            </div>
            {result.warnings.length > 0 && (
              <div className="space-y-1 rounded-lg bg-amber-50 p-3 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-semibold tabular">Row {w.rowNumber}:</span> {w.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
