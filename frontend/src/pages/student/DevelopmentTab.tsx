import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  assignDeliverable,
  confirmGrowthCoachEvaluation,
  deleteDeliverable,
  dismissGrowthCoachEvaluation,
  fetchDeliverablesTable,
  fetchEstimatedTime,
  recordDeliverableSubmission,
  recordGrowthCoachEvaluation,
  updateDeliverable,
  verifyDeliverable,
} from "../../lib/queries";
import { apiErrorMessage } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Field, Input, Select, Textarea } from "../../components/ui/Form";
import { ErrorBanner, EmptyState } from "../../components/ui/Feedback";
import { Badge } from "../../components/ui/Badge";
import { EmailComposer } from "../../components/EmailComposer";
import { useAuth } from "../../lib/auth";
import { Student } from "../../types";

interface Deliverable {
  id: string;
  status: string;
  verificationStatus: string;
  submissionFromStudent: string | null;
  feedback: string | null;
  dueAt: string | null;
  title: string;
  gapAddressed: string;
  whatStudentMustDo: string;
  expectedOutcome: string;
  submissionType: string;
  submissionRequired: string;
  submissionDetails: string | null;
  verificationCriteria: string;
  estimatedTimeValue: number;
  estimatedTimeUnit: string;
}
interface GrowthCoachEvaluation {
  id: string;
  track: string;
  decision: string;
  feedback: string;
  evaluatedAt: string;
  pendingAdminConfirmation: boolean;
}

// Track A2 and Track B share the exact same deliverable mechanics but are
// kept visually distinct — a student is only ever on one at a time.
const TRACK_LABEL: Record<string, string> = { A2: "Track A2 Development Plan", B: "Track B Development Plan" };

export function DevelopmentTab({
  student,
  deliverables,
  growthCoachEvaluations,
  onChanged,
}: {
  student: Student;
  deliverables: Deliverable[];
  growthCoachEvaluations: GrowthCoachEvaluation[];
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const track = student.currentTrack;
  const isDevTrack = track === "A2" || track === "B";
  const [showAdd, setShowAdd] = useState(false);
  const verifiedCount = deliverables.filter((d) => d.status === "VERIFIED").length;

  // Which deliverables go in the next assignment email — defaults to every
  // currently-assigned one, and stays in sync as deliverables are added or
  // removed (a newly-added one defaults to selected; a deleted one drops out).
  const [selectedIds, setSelectedIds] = useState<string[]>(() => deliverables.map((d) => d.id));
  useEffect(() => {
    setSelectedIds((prev) => {
      const stillExists = new Set(deliverables.map((d) => d.id));
      const kept = prev.filter((id) => stillExists.has(id));
      const added = deliverables.filter((d) => !prev.includes(d.id)).map((d) => d.id);
      return [...kept, ...added];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverables.map((d) => d.id).join(",")]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  if (!isDevTrack && deliverables.length === 0) {
    return <EmptyState title="Not in a development loop" description="Development (deliverables, Growth Coach) applies to Track A2 and Track B." />;
  }

  return (
    <div className="space-y-6">
      {isDevTrack && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">{TRACK_LABEL[track as string]}</h2>
          <EstimatedTimeSummary studentId={student.id} track={track as "A2" | "B"} />
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            Deliverables — {verifiedCount} of {deliverables.length} completed
          </h3>
          <div className="flex items-center gap-2">
            {isDevTrack && isAdmin && deliverables.length > 0 && (
              <SendDeliverablesEmail student={student} track={track as "A2" | "B"} selectedIds={selectedIds} />
            )}
            {isDevTrack && isAdmin && <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Deliverable</Button>}
          </div>
        </div>
        {isAdmin && deliverables.length > 0 && (
          <p className="mb-2 text-xs text-slate-400">Checked deliverables are the ones included when you send the assignment email.</p>
        )}
        <div className="space-y-2">
          {deliverables.map((d) => (
            <DeliverableRow
              key={d.id}
              deliverable={d}
              isAdmin={isAdmin}
              selected={selectedIds.includes(d.id)}
              onToggleSelected={() => toggleSelected(d.id)}
              onChanged={onChanged}
            />
          ))}
          {deliverables.length === 0 && <p className="text-sm text-slate-500">No deliverables assigned yet.</p>}
        </div>
      </section>

      {isDevTrack && <GrowthCoachForm student={student} onChanged={onChanged} />}

      {growthCoachEvaluations.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Growth Coach history</h3>
          <div className="space-y-2">
            {growthCoachEvaluations.map((g) => (
              <GrowthCoachEvaluationRow key={g.id} evaluation={g} isAdmin={isAdmin} onChanged={onChanged} />
            ))}
          </div>
        </section>
      )}

      {showAdd && isDevTrack && (
        <AddDeliverableModal
          student={student}
          track={track as "A2" | "B"}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

// Prefetches the rendered deliverables table for exactly the selected
// deliverables (includes the total estimated time across just those, as its
// last row) so it's already in place as the `deliverables` variable — the
// admin only needs to click Preview, then edit the resulting body freely.
function SendDeliverablesEmail({ student, track, selectedIds }: { student: Student; track: "A2" | "B"; selectedIds: string[] }) {
  const { data } = useQuery({
    queryKey: ["deliverables-table", student.id, track, selectedIds],
    queryFn: () => fetchDeliverablesTable(student.id, track, selectedIds),
    enabled: selectedIds.length > 0,
  });
  if (selectedIds.length === 0) {
    return <span className="text-xs text-slate-400">Select at least one deliverable to email</span>;
  }
  return (
    <EmailComposer
      student={student}
      defaultTemplateKey={track === "A2" ? "A2_DELIVERABLE_ASSIGNMENT" : "TRACK_B_DELIVERABLE_ASSIGNMENT"}
      lockTemplate
      defaultVariables={{ deliverables: data?.html ?? "", deadline: "See individual due dates above" }}
      relatedEntityType="Student"
      relatedEntityId={student.id}
      triggerLabel={`Send ${selectedIds.length} Selected Deliverable${selectedIds.length === 1 ? "" : "s"}`}
    />
  );
}

// The one progress number for this student's development loop — shown to
// both Admin and Growth Coach here, and also embedded as the last row of
// the deliverables table sent by email (see renderDeliverablesTable).
function EstimatedTimeSummary({ studentId, track }: { studentId: string; track: "A2" | "B" }) {
  const { data } = useQuery({ queryKey: ["estimated-time", studentId, track], queryFn: () => fetchEstimatedTime(studentId, track) });
  if (!data || data.count === 0) return null;
  return (
    <p className="mt-1 text-sm text-slate-500">
      Estimated time to complete all {data.count} assigned deliverable{data.count === 1 ? "" : "s"}:{" "}
      <strong className="text-slate-800">
        {data.value} {data.unit.toLowerCase()}
      </strong>
      {" · "}
      {data.verifiedCount} of {data.count} verified
    </p>
  );
}

const SUBMISSION_TYPES = ["LINK", "TEXT", "REPOSITORY", "DOCUMENT_URL", "VIDEO_URL", "FILE_METADATA", "OTHER_URL"];

// Every deliverable is unique to the student it's assigned to — there is no
// template library to pick from, so this is the only way to assign one.
function AddDeliverableModal({
  student,
  track,
  onClose,
  onCreated,
}: {
  student: Student;
  track: "A2" | "B";
  onClose: () => void;
  onCreated: () => void;
}) {
  const unit = track === "B" ? "DAYS" : "HOURS";
  const [form, setForm] = useState({
    title: "",
    gapAddressed: "",
    whatStudentMustDo: "",
    expectedOutcome: "",
    submissionType: "REPOSITORY",
    submissionRequired: "",
    verificationCriteria: "",
    estimatedTimeValue: "0.5",
  });
  const [dueAt, setDueAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      assignDeliverable({
        studentId: student.id,
        track,
        dueAt: dueAt || undefined,
        direct: { ...form, estimatedTimeValue: Number(form.estimatedTimeValue), estimatedTimeUnit: unit },
      }),
    onSuccess: onCreated,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Modal open onClose={onClose} title={`New Deliverable — ${student.fullName}`} width="max-w-2xl">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        {error && <ErrorBanner message={error} />}
        <Field label="Title"><Input required value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Gap being addressed"><Textarea required rows={2} value={form.gapAddressed} onChange={(e) => set("gapAddressed", e.target.value)} /></Field>
        <Field label="What the student must do"><Textarea required rows={2} value={form.whatStudentMustDo} onChange={(e) => set("whatStudentMustDo", e.target.value)} /></Field>
        <Field label="Expected outcome"><Textarea required rows={2} value={form.expectedOutcome} onChange={(e) => set("expectedOutcome", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Submission type">
            <Select value={form.submissionType} onChange={(e) => set("submissionType", e.target.value)}>
              {SUBMISSION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field
            label="Estimated time"
            hint={track === "B" ? "Track B is estimated in days, half-day steps (min 0.5)" : "Track A2 is estimated in hours"}
          >
            <Input type="number" min="0.5" step="0.5" value={form.estimatedTimeValue} onChange={(e) => set("estimatedTimeValue", e.target.value)} />
          </Field>
        </div>
        <Field label="Submission required" hint="Exactly what must be submitted"><Textarea required rows={2} value={form.submissionRequired} onChange={(e) => set("submissionRequired", e.target.value)} /></Field>
        <Field label="Verification criteria"><Textarea required rows={2} value={form.verificationCriteria} onChange={(e) => set("verificationCriteria", e.target.value)} /></Field>
        <Field label="Due" hint="Optional">
          <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Adding…" : "Add Deliverable"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function DeliverableRow({
  deliverable,
  isAdmin,
  selected,
  onToggleSelected,
  onChanged,
}: {
  deliverable: Deliverable;
  isAdmin: boolean;
  selected: boolean;
  onToggleSelected: () => void;
  onChanged: () => void;
}) {
  const [submission, setSubmission] = useState(deliverable.submissionFromStudent ?? "");
  const [feedback, setFeedback] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const isVerified = deliverable.status === "VERIFIED";

  const submitMutation = useMutation({ mutationFn: () => recordDeliverableSubmission(deliverable.id, submission), onSuccess: onChanged });
  const verifyMutation = useMutation({
    mutationFn: (status: "VERIFIED" | "REJECTED") => verifyDeliverable(deliverable.id, { verificationStatus: status, feedback }),
    onSuccess: onChanged,
  });
  const deleteMutation = useMutation({ mutationFn: () => deleteDeliverable(deliverable.id), onSuccess: onChanged });

  function openDetails() {
    setExpanded(true);
    setMode("view");
  }

  return (
    <div className={`rounded-md border p-3 text-sm ${isVerified ? "border-emerald-200 bg-emerald-50/40" : "border-slate-100"}`}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-medium text-slate-800">
          {isAdmin && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelected}
              title="Include in the next assignment email"
              className="h-3.5 w-3.5"
            />
          )}
          {isVerified && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">✓</span>
          )}
          <button type="button" className="text-left hover:underline" onClick={() => (expanded ? setExpanded(false) : openDetails())}>
            {deliverable.title}
          </button>
        </span>
        <div className="flex items-center gap-2">
          <Badge tone={isVerified ? "success" : deliverable.status === "REJECTED" ? "danger" : "neutral"}>{deliverable.status.replace("_", " ")}</Badge>
          <button
            type="button"
            className="text-xs text-slate-400 hover:text-slate-600"
            onClick={() => (expanded ? setExpanded(false) : openDetails())}
          >
            {expanded ? "▾" : "▸"}
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">{deliverable.whatStudentMustDo}</p>
      {!isVerified && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input className="max-w-xs" placeholder="Submission link" value={submission} onChange={(e) => setSubmission(e.target.value)} />
          <Button size="sm" variant="secondary" onClick={() => submitMutation.mutate()} disabled={!submission || submitMutation.isPending}>
            Record Submission
          </Button>
          <Input className="max-w-xs" placeholder="Verification feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          <Button size="sm" onClick={() => verifyMutation.mutate("VERIFIED")} disabled={!feedback || verifyMutation.isPending}>
            Verify
          </Button>
          <Button size="sm" variant="danger" onClick={() => verifyMutation.mutate("REJECTED")} disabled={!feedback || verifyMutation.isPending}>
            Reject
          </Button>
        </div>
      )}
      {deliverable.feedback && <p className="mt-1 text-xs text-slate-500">Feedback: {deliverable.feedback}</p>}

      {expanded && mode === "view" && (
        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <p><strong className="text-slate-700">Gap addressed:</strong> {deliverable.gapAddressed}</p>
          <p><strong className="text-slate-700">Expected outcome:</strong> {deliverable.expectedOutcome}</p>
          <p><strong className="text-slate-700">Submission type:</strong> {deliverable.submissionType}</p>
          <p><strong className="text-slate-700">Submission required:</strong> {deliverable.submissionRequired}</p>
          {deliverable.submissionDetails && <p><strong className="text-slate-700">Submission details:</strong> {deliverable.submissionDetails}</p>}
          <p><strong className="text-slate-700">Verification criteria:</strong> {deliverable.verificationCriteria}</p>
          <p><strong className="text-slate-700">Estimated time:</strong> {deliverable.estimatedTimeValue} {deliverable.estimatedTimeUnit.toLowerCase()}</p>
          <p><strong className="text-slate-700">Due:</strong> {deliverable.dueAt ? new Date(deliverable.dueAt).toLocaleDateString() : "—"}</p>
          {isAdmin && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="secondary" onClick={() => setMode("edit")}>Edit</Button>
              <Button size="sm" variant="danger" onClick={() => setMode("confirmDelete")}>Delete</Button>
            </div>
          )}
        </div>
      )}

      {expanded && mode === "confirmDelete" && (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs">
          <span className="text-rose-700">Delete this deliverable? This cannot be undone.</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setMode("view")} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting…" : "Confirm Delete"}
            </Button>
          </div>
        </div>
      )}

      {expanded && mode === "edit" && (
        <EditDeliverableForm
          deliverable={deliverable}
          onCancel={() => setMode("view")}
          onSaved={() => {
            setMode("view");
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function EditDeliverableForm({
  deliverable,
  onCancel,
  onSaved,
}: {
  deliverable: Deliverable;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: deliverable.title,
    gapAddressed: deliverable.gapAddressed,
    whatStudentMustDo: deliverable.whatStudentMustDo,
    expectedOutcome: deliverable.expectedOutcome,
    submissionType: deliverable.submissionType,
    submissionRequired: deliverable.submissionRequired,
    submissionDetails: deliverable.submissionDetails ?? "",
    verificationCriteria: deliverable.verificationCriteria,
    estimatedTimeValue: String(deliverable.estimatedTimeValue),
  });
  const [dueAt, setDueAt] = useState(deliverable.dueAt ? deliverable.dueAt.slice(0, 10) : "");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      updateDeliverable(deliverable.id, {
        ...form,
        estimatedTimeValue: Number(form.estimatedTimeValue),
        dueAt: dueAt || null,
      }),
    onSuccess: onSaved,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      className="mt-3 space-y-2 border-t border-slate-100 pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      {error && <ErrorBanner message={error} />}
      <Field label="Title"><Input required value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
      <Field label="Gap being addressed"><Textarea required rows={2} value={form.gapAddressed} onChange={(e) => set("gapAddressed", e.target.value)} /></Field>
      <Field label="What the student must do"><Textarea required rows={2} value={form.whatStudentMustDo} onChange={(e) => set("whatStudentMustDo", e.target.value)} /></Field>
      <Field label="Expected outcome"><Textarea required rows={2} value={form.expectedOutcome} onChange={(e) => set("expectedOutcome", e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Submission type">
          <Select value={form.submissionType} onChange={(e) => set("submissionType", e.target.value)}>
            {SUBMISSION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label={`Estimated time (${deliverable.estimatedTimeUnit.toLowerCase()})`} hint={deliverable.estimatedTimeUnit === "DAYS" ? "Half-day steps, min 0.5" : undefined}>
          <Input type="number" min="0.5" step="0.5" value={form.estimatedTimeValue} onChange={(e) => set("estimatedTimeValue", e.target.value)} />
        </Field>
      </div>
      <Field label="Submission required"><Textarea required rows={2} value={form.submissionRequired} onChange={(e) => set("submissionRequired", e.target.value)} /></Field>
      <Field label="Submission details" hint="Optional"><Textarea rows={2} value={form.submissionDetails} onChange={(e) => set("submissionDetails", e.target.value)} /></Field>
      <Field label="Verification criteria"><Textarea required rows={2} value={form.verificationCriteria} onChange={(e) => set("verificationCriteria", e.target.value)} /></Field>
      <Field label="Due" hint="Optional">
        <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Save Changes"}</Button>
      </div>
    </form>
  );
}

function GrowthCoachEvaluationRow({
  evaluation: g,
  isAdmin,
  onChanged,
}: {
  evaluation: GrowthCoachEvaluation;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const confirmMutation = useMutation({
    mutationFn: () => confirmGrowthCoachEvaluation(g.id),
    onSuccess: onChanged,
    onError: (err) => setError(apiErrorMessage(err)),
  });
  const dismissMutation = useMutation({
    mutationFn: () => dismissGrowthCoachEvaluation(g.id),
    onSuccess: onChanged,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div className="rounded-md border border-slate-100 p-3 text-sm">
      {error && <div className="mb-2"><ErrorBanner message={error} /></div>}
      <div className="flex items-center justify-between">
        <span>{g.track} · {new Date(g.evaluatedAt).toLocaleDateString()}</span>
        <Badge tone={g.decision === "SUFFICIENT" ? "success" : "warning"}>{g.decision.replace("_", " ")}</Badge>
      </div>
      <p className="text-slate-600">{g.feedback}</p>
      {g.pendingAdminConfirmation && (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-amber-50 p-2">
          <span className="text-xs text-amber-800">
            Recorded by a Growth Coach — the track move above has not been applied yet.
          </span>
          {isAdmin ? (
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => dismissMutation.mutate()} disabled={dismissMutation.isPending}>
                Dismiss
              </Button>
              <Button size="sm" onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
                Confirm Transition
              </Button>
            </div>
          ) : (
            <span className="ml-auto text-xs text-amber-700">Awaiting Program Admin confirmation</span>
          )}
        </div>
      )}
    </div>
  );
}

function GrowthCoachForm({ student, onChanged }: { student: Student; onChanged: () => void }) {
  const [decision, setDecision] = useState<"SUFFICIENT" | "NOT_SUFFICIENT">("SUFFICIENT");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => recordGrowthCoachEvaluation({ studentId: student.id, track: student.currentTrack, decision, feedback }),
    onSuccess: () => {
      setFeedback("");
      onChanged();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">Record Growth Coach Evaluation</h3>
      {error && <div className="mb-2"><ErrorBanner message={error} /></div>}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Decision">
          <Select value={decision} onChange={(e) => setDecision(e.target.value as "SUFFICIENT" | "NOT_SUFFICIENT")}>
            <option value="SUFFICIENT">Sufficient — promote</option>
            <option value="NOT_SUFFICIENT">Not sufficient — continue loop</option>
          </Select>
        </Field>
        <Field label="Feedback" hint="Required, evidence-based">
          <Textarea rows={2} className="min-w-[20rem]" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        </Field>
        <Button onClick={() => mutation.mutate()} disabled={feedback.trim().length < 10 || mutation.isPending}>
          Record Decision
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {student.currentTrack === "A2"
          ? "Sufficient promotes directly to Track A1 (Video Questioning is not repeated)."
          : "Sufficient promotes to Track A via Orientation → Video Questioning (never skipped for Track B)."}
      </p>
    </div>
  );
}
