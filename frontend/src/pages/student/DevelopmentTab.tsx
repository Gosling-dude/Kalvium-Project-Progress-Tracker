import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  assignDeliverable,
  createCheckpoint,
  fetchDeliverableTemplates,
  recordDeliverableSubmission,
  recordGrowthCoachEvaluation,
  verifyDeliverable,
} from "../../lib/queries";
import { apiErrorMessage } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Form";
import { ErrorBanner, EmptyState } from "../../components/ui/Feedback";
import { Badge } from "../../components/ui/Badge";
import { Student } from "../../types";

interface Deliverable {
  id: string;
  status: string;
  verificationStatus: string;
  submissionFromStudent: string | null;
  feedback: string | null;
  dueAt: string | null;
  template: { title: string; whatStudentMustDo: string };
}
interface Checkpoint {
  id: string;
  name: string;
  sequence: number;
  status: string;
}
interface GrowthCoachEvaluation {
  id: string;
  track: string;
  decision: string;
  feedback: string;
  evaluatedAt: string;
}

export function DevelopmentTab({
  student,
  deliverables,
  checkpoints,
  growthCoachEvaluations,
  onChanged,
}: {
  student: Student;
  deliverables: Deliverable[];
  checkpoints: Checkpoint[];
  growthCoachEvaluations: GrowthCoachEvaluation[];
  onChanged: () => void;
}) {
  const isDevTrack = student.currentTrack === "A2" || student.currentTrack === "B";

  if (!isDevTrack && deliverables.length === 0) {
    return <EmptyState title="Not in a development loop" description="Development (deliverables, checkpoints, Growth Coach) applies to Track A2 and Track B." />;
  }

  return (
    <div className="space-y-6">
      {isDevTrack && <AssignDeliverableForm student={student} onChanged={onChanged} />}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Deliverables ({deliverables.filter((d) => d.status === "VERIFIED").length}/{deliverables.length} verified)</h3>
        <div className="space-y-2">
          {deliverables.map((d) => (
            <DeliverableRow key={d.id} deliverable={d} onChanged={onChanged} />
          ))}
          {deliverables.length === 0 && <p className="text-sm text-slate-500">No deliverables assigned yet.</p>}
        </div>
      </section>

      {isDevTrack && <NewCheckpointForm student={student} onChanged={onChanged} />}

      {checkpoints.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Checkpoints</h3>
          <div className="space-y-2">
            {checkpoints.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-slate-100 p-3 text-sm">
                <span>#{c.sequence} {c.name}</span>
                <Badge tone={c.status === "PASSED" ? "success" : c.status === "FAILED" ? "danger" : "neutral"}>{c.status}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {isDevTrack && <GrowthCoachForm student={student} onChanged={onChanged} />}

      {growthCoachEvaluations.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Growth Coach history</h3>
          <div className="space-y-2">
            {growthCoachEvaluations.map((g) => (
              <div key={g.id} className="rounded-md border border-slate-100 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>{g.track} · {new Date(g.evaluatedAt).toLocaleDateString()}</span>
                  <Badge tone={g.decision === "SUFFICIENT" ? "success" : "warning"}>{g.decision.replace("_", " ")}</Badge>
                </div>
                <p className="text-slate-600">{g.feedback}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AssignDeliverableForm({ student, onChanged }: { student: Student; onChanged: () => void }) {
  const track = student.currentTrack as "A2" | "B";
  const { data: templates } = useQuery({ queryKey: ["deliverable-templates", track], queryFn: () => fetchDeliverableTemplates(track) });
  const [templateId, setTemplateId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => assignDeliverable({ studentId: student.id, templateId, track, dueAt: dueAt || undefined }),
    onSuccess: () => {
      setTemplateId("");
      onChanged();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {error && <div className="mb-2"><ErrorBanner message={error} /></div>}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Assign deliverable template">
          <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">Select a template…</option>
            {templates?.map((t: { id: string; title: string }) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Due" hint="Optional">
          <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </Field>
        <Button onClick={() => mutation.mutate()} disabled={!templateId || mutation.isPending}>
          Assign
        </Button>
      </div>
    </div>
  );
}

function DeliverableRow({ deliverable, onChanged }: { deliverable: Deliverable; onChanged: () => void }) {
  const [submission, setSubmission] = useState(deliverable.submissionFromStudent ?? "");
  const [feedback, setFeedback] = useState("");

  const submitMutation = useMutation({ mutationFn: () => recordDeliverableSubmission(deliverable.id, submission), onSuccess: onChanged });
  const verifyMutation = useMutation({
    mutationFn: (status: "VERIFIED" | "REJECTED") => verifyDeliverable(deliverable.id, { verificationStatus: status, feedback }),
    onSuccess: onChanged,
  });

  return (
    <div className="rounded-md border border-slate-100 p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-800">{deliverable.template.title}</span>
        <Badge tone={deliverable.status === "VERIFIED" ? "success" : deliverable.status === "REJECTED" ? "danger" : "neutral"}>{deliverable.status.replace("_", " ")}</Badge>
      </div>
      <p className="mt-1 text-xs text-slate-500">{deliverable.template.whatStudentMustDo}</p>
      {deliverable.status !== "VERIFIED" && (
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
    </div>
  );
}

function NewCheckpointForm({ student, onChanged }: { student: Student; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [sequence, setSequence] = useState(1);
  const mutation = useMutation({
    mutationFn: () => createCheckpoint({ studentId: student.id, track: student.currentTrack, name, sequence }),
    onSuccess: () => {
      setName("");
      onChanged();
    },
  });
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-slate-300 p-3">
      <Field label="New checkpoint name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Checkpoint 2 — Ownership" />
      </Field>
      <Field label="Sequence">
        <Input type="number" min={1} className="w-20" value={sequence} onChange={(e) => setSequence(Number(e.target.value))} />
      </Field>
      <Button size="sm" variant="secondary" onClick={() => mutation.mutate()} disabled={!name}>
        Add Checkpoint
      </Button>
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
