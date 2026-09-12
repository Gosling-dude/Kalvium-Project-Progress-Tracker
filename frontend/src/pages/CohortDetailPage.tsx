import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
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
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <Link to="/cohorts" className="text-sm text-brand-600 hover:underline">
        ← Cohorts
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{cohort.name}</h1>
          <p className="text-sm text-slate-500">
            {cohort.code} · <Badge tone={cohort.status === "ACTIVE" ? "success" : "neutral"}>{cohort.status}</Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowEnroll(true)}>
            Add Students
          </Button>
          <Button variant="secondary" onClick={() => setShowBulkUpload(true)}>
            Bulk Upload (CSV)
          </Button>
          {cohort.status === "ACTIVE" ? (
            <Button variant="secondary" onClick={() => archiveMutation.mutate("ARCHIVED")}>
              Archive
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => archiveMutation.mutate("ACTIVE")}>
              Reactivate
            </Button>
          )}
        </div>
      </div>

      {dashboard && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat label="Graduated" value={dashboard.graduatedCount} tone="success" />
          <SummaryStat label="Not yet assigned to a track" value={dashboard.unassignedCount} tone="neutral" />
          <SummaryStat label="Total active students" value={dashboard.totalActiveStudents} tone="info" />
          <SummaryStat label="Cohort" value={cohort.status} tone="neutral" />
        </div>
      )}

      {dashboard && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button onClick={() => navigate(`/cohorts/${id}/track-a`)} className="rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-blue-300 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Track A</h2>
              <Badge tone="info">{dashboard.trackACount} students</Badge>
            </div>
            <div className="mt-2 flex gap-2 text-xs text-slate-600">
              <span>Not yet in a sub-track: {dashboard.trackABreakdown.unassignedSubTrack}</span>
              <span>· A1: {dashboard.trackABreakdown.a1}</span>
              <span>· A2: {dashboard.trackABreakdown.a2}</span>
            </div>
          </button>
          <button onClick={() => navigate(`/cohorts/${id}/track-b`)} className="rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-rose-300 hover:shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Track B</h2>
              <Badge tone="danger">{dashboard.trackBCount} students</Badge>
            </div>
            <p className="mt-2 text-xs text-slate-500">Foundational development pipeline — no sub-tracks.</p>
          </button>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Students ({activeEnrollments.length} active)</h2>
        </div>
        <div className="divide-y divide-slate-100 overflow-x-auto">
          <div className={`grid ${ROSTER_GRID_COLS} min-w-[52rem] gap-3 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500`}>
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
            <p className="px-4 py-10 text-center text-sm text-slate-500">No students enrolled yet.</p>
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
    </div>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string | number; tone: "success" | "info" | "neutral" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === "success" ? "text-emerald-600" : tone === "info" ? "text-blue-600" : "text-slate-900"}`}>{value}</p>
    </div>
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
      <div className={`grid ${ROSTER_GRID_COLS} min-w-[52rem] cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50`} onClick={onToggle}>
        <span className="truncate font-medium text-slate-900" title={student.fullName}>
          {student.fullName}
        </span>
        <span className="truncate text-slate-500" title={student.email}>
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
            className="whitespace-nowrap text-xs text-brand-600 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/students/${student.id}`);
            }}
          >
            Open 360 →
          </button>
          <button
            className="whitespace-nowrap text-xs text-rose-600 hover:underline disabled:opacity-40"
            disabled={removeMutation.isPending}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Remove ${student.fullName} from this cohort? Their history is kept — you can add them back any time.`)) {
                setError(null);
                removeMutation.mutate();
              }
            }}
          >
            Remove
          </button>
        </span>
      </div>
      {error && <div className="px-4 pb-2"><ErrorBanner message={error} /></div>}
      {expanded && <ResumeEvalPanel student={student} onChanged={onChanged} />}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (status === "Graduated") return <Badge tone="success">Graduated</Badge>;
  if (status === "Track A") return <Badge tone="info">Track A</Badge>;
  if (status === "Track B") return <Badge tone="danger">Track B</Badge>;
  return <Badge tone="neutral">Onboarded</Badge>;
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

  if (isLoading || !detail) return <div className="border-t border-slate-100 p-4"><Spinner /></div>;

  const completedReview = detail.projectReviews.find((r: { status: string }) => r.status === "COMPLETED");

  return (
    <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Resume Google Drive link" hint="Editable any time — changing it after evaluation does not retroactively alter the recorded score">
          <Input className="min-w-[24rem]" value={resumeLink} onChange={(e) => setResumeLink(e.target.value)} placeholder="https://drive.google.com/..." />
        </Field>
        <Button size="sm" variant="secondary" onClick={() => saveLinkMutation.mutate()} disabled={saveLinkMutation.isPending}>
          Save Link
        </Button>
        {student.resumeLink && (
          <a href={student.resumeLink} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">
            Open resume ↗
          </a>
        )}
        <Badge tone={completedReview ? "success" : "warning"}>{completedReview ? "Resume evaluated" : "Needs evaluation"}</Badge>
      </div>

      <ProjectReviewTab student={student} reviews={detail.projectReviews} onChanged={refreshDetail} />

      {completedReview && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Send the result to the student:</span>
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
        <div className="max-h-72 space-y-0.5 overflow-y-auto rounded-md border border-slate-200 p-1">
          {filtered.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
              <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
              <span className="font-medium text-slate-800">{s.fullName}</span>
              <span className="truncate text-slate-400">{s.email}</span>
            </label>
          ))}
          {filtered.length === 0 && <p className="p-2 text-sm text-slate-500">No matching students.</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={selected.length === 0 || mutation.isPending}>
            {mutation.isPending ? "Adding…" : `Add ${selected.length ? selected.length : ""} Student${selected.length === 1 ? "" : "s"}`}
          </Button>
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
        <p className="text-xs text-slate-500">
          Recognized columns include email, full name, campus, growth coach (name and/or "Growth Coach Email"), batch/year, chosen
          project, and a resume link. Every row is checked against the student database first: a matching email is reused as-is (never
          duplicated) and any blank fields on it get filled in from this file; a new email creates a new student. Either way, every
          student in the file gets added to this cohort. A campus or growth coach that isn't already in the system is added
          automatically (marked inactive) rather than left blank — review it in Settings afterward.
        </p>
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => {
            setError(null);
            setResult(null);
            const file = e.target.files?.[0];
            if (file) previewMutation.mutate(file);
          }}
        />
        {preview && (
          <div className="space-y-2 text-sm">
            <p>
              {preview.validRows.length} of {preview.totalRows} rows valid · {preview.errors.length} error(s) · {preview.warnings.length} warning(s)
            </p>
            {preview.errors.slice(0, 5).map((e, i) => (
              <p key={i} className="text-xs text-rose-600">
                Row {e.rowNumber}: {e.message}
              </p>
            ))}
            {preview.warnings.slice(0, 5).map((w, i) => (
              <p key={i} className="text-xs text-amber-600">
                Row {w.rowNumber}: {w.message}
              </p>
            ))}
            <Button size="sm" onClick={() => commitMutation.mutate()} disabled={preview.validRows.length === 0 || commitMutation.isPending}>
              {commitMutation.isPending ? "Uploading…" : `Add ${preview.validRows.length} Student${preview.validRows.length === 1 ? "" : "s"} to this Cohort`}
            </Button>
          </div>
        )}
        {result && (
          <div className="space-y-2">
            <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
              {result.created} new student{result.created === 1 ? "" : "s"} created · {result.updatedExisting} existing record
              {result.updatedExisting === 1 ? "" : "s"} filled in · {result.skippedExisting} already existed on file ·{" "}
              {result.enrolled} added to this cohort · {result.alreadyInCohort} were already in this cohort.
            </div>
            {result.warnings.length > 0 && (
              <div className="space-y-1 rounded-md bg-amber-50 p-3">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-800">
                    Row {w.rowNumber}: {w.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
