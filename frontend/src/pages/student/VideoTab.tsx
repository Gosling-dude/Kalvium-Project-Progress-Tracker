import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { assignVideoQuestionSet, fetchVideoAssignmentProgress, finalizeVideoAssessment, recordVideoEvaluation, recordVideoSubmission } from "../../lib/queries";
import { apiErrorMessage } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Form";
import { ErrorBanner } from "../../components/ui/Feedback";
import { Badge } from "../../components/ui/Badge";
import { EmailComposer } from "../../components/EmailComposer";
import { Student } from "../../types";

interface VideoAssignment {
  id: string;
  status: string;
  outcome: "A1" | "A2" | null;
  outcomeReason: string | null;
  finalizedAt: string | null;
  totalScore: number | null;
  assignedAt: string;
  evaluations: {
    id: string;
    score: number | null;
    notes: string | null;
    question: { questionKey: string; questionNumber: number; title: string; marks: number };
  }[];
}

export function VideoTab({ student, assignments, onChanged }: { student: Student; assignments: VideoAssignment[]; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const latest = assignments[0];

  const assignMutation = useMutation({
    mutationFn: () => assignVideoQuestionSet({ studentId: student.id }),
    onSuccess: onChanged,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  if (student.currentTrack !== "A" && !latest) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Video Questions are only assigned to Track A students. This student is currently Track {student.currentTrack ?? "unrouted"}.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} />}
      {!latest || latest.finalizedAt ? (
        student.currentTrack === "A" && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
            <p className="mb-3 text-sm text-slate-600">{latest ? "Assign a new video question set." : "No video questions assigned yet."}</p>
            <Button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending}>
              Assign 10 Video Questions
            </Button>
          </div>
        )
      ) : (
        <VideoAssignmentPanel assignmentId={latest.id} student={student} onChanged={onChanged} />
      )}

      {assignments.filter((a) => a.finalizedAt).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">History</h3>
          {assignments
            .filter((a) => a.finalizedAt)
            .map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    {a.totalScore}/50 · {new Date(a.finalizedAt!).toLocaleDateString()}
                  </span>
                  <Badge tone={a.outcome === "A1" ? "success" : "warning"}>{a.outcome}</Badge>
                </div>
                <p className="mt-1 text-slate-600">{a.outcomeReason}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[...a.evaluations]
                    .sort((x, y) => x.question.questionNumber - y.question.questionNumber)
                    .map((e) => (
                      <div key={e.id} className="rounded-md bg-slate-50 p-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">
                            {e.question.questionNumber}. {e.question.title}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {e.score ?? 0}/{e.question.marks}
                          </span>
                        </div>
                        {e.notes && <p className="mt-0.5 text-xs text-slate-500">{e.notes}</p>}
                      </div>
                    ))}
                </div>
                <div className="mt-2">
                  <EmailComposer
                    student={student}
                    defaultTemplateKey="TRACK_A_VIDEO_RESULT"
                    lockTemplate
                    defaultVariables={{
                      track: a.outcome ?? "",
                      feedback: a.outcomeReason ?? "",
                      nextStep: a.outcome === "A1" ? "You will move into the A1 5-day intensive program." : "You will receive Track A2 development deliverables.",
                    }}
                    relatedEntityType="VideoAssignment"
                    relatedEntityId={a.id}
                    triggerLabel="Send Video Result Email"
                  />
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function VideoAssignmentPanel({ assignmentId, student, onChanged }: { assignmentId: string; student: Student; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [outcomeReason, setOutcomeReason] = useState("");
  const { data, refetch } = useQuery({ queryKey: ["video-assignment", assignmentId], queryFn: () => fetchVideoAssignmentProgress(assignmentId) });

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeVideoAssessment(assignmentId, outcomeReason),
    onSuccess: onChanged,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  if (!data) return null;

  const mandatoryKeys = new Set(data.mandatoryStatus.map((m: { questionKey: string }) => m.questionKey));
  const questionList = data.assignment.evaluations
    .map((e: { question: { questionNumber: number; title: string; questionText: string } }) => `${e.question.questionNumber}. ${e.question.title} — ${e.question.questionText}`)
    .join("<br/>");

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Video Assessment</h3>
        <span className="text-sm text-slate-500">
          {data.submittedCount}/{data.totalQuestions} submitted · {data.evaluatedCount}/{data.totalQuestions} reviewed · {data.totalScoreSoFar}/50 so far
        </span>
      </div>
      <div className="mb-3">
        <EmailComposer
          student={student}
          defaultTemplateKey="TRACK_A_VIDEO_QUESTIONS_ASSIGNED"
          lockTemplate
          defaultVariables={{ projectName: student.chosenProject ?? "", deadline: "3 days from assignment", questions: questionList }}
          relatedEntityType="VideoAssignment"
          relatedEntityId={assignmentId}
          triggerLabel="Send Video Questions Email"
        />
      </div>
      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}

      <div className="space-y-3">
        {data.assignment.evaluations.map((evalRow: { id: string; questionId: string; submitted: boolean; submissionReference: string | null; evaluated: boolean; score: number | null; notes: string | null; question: { questionKey: string; title: string; questionText: string; marks: number; isMandatory: boolean } }) => (
          <QuestionRow key={evalRow.id} assignmentId={assignmentId} evalRow={evalRow} isMandatory={mandatoryKeys.has(evalRow.question.questionKey)} onSaved={() => refetch()} />
        ))}
      </div>

      {data.evaluatedCount === data.totalQuestions && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">Finalization reason (required)</label>
          <Textarea rows={2} value={outcomeReason} onChange={(e) => setOutcomeReason(e.target.value)} placeholder="e.g. Total 40/50, all mandatory questions passed." />
          <div className="mt-2 flex justify-end">
            <Button onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending || outcomeReason.trim().length < 10}>
              Finalize & Route (A1/A2)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionRow({
  assignmentId,
  evalRow,
  isMandatory,
  onSaved,
}: {
  assignmentId: string;
  evalRow: { questionId: string; submitted: boolean; submissionReference: string | null; evaluated: boolean; score: number | null; notes: string | null; question: { questionKey: string; title: string; questionText: string; marks: number } };
  isMandatory: boolean;
  onSaved: () => void;
}) {
  const [reference, setReference] = useState(evalRow.submissionReference ?? "");
  const [score, setScore] = useState(evalRow.score ?? 3);
  const [notes, setNotes] = useState(evalRow.notes ?? "");

  const submitMutation = useMutation({
    mutationFn: () => recordVideoSubmission(assignmentId, evalRow.questionId, reference),
    onSuccess: onSaved,
  });
  const evalMutation = useMutation({
    mutationFn: () => recordVideoEvaluation(assignmentId, evalRow.questionId, score, notes),
    onSuccess: onSaved,
  });

  return (
    <div className="rounded-md border border-slate-100 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-800">
          {evalRow.question.questionKey} — {evalRow.question.title} {isMandatory && <Badge tone="info">Mandatory</Badge>}
        </span>
        {evalRow.evaluated && <Badge tone="success">Reviewed: {evalRow.score}/5</Badge>}
      </div>
      <p className="mb-2 text-xs text-slate-500">{evalRow.question.questionText}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Submission link/reference" value={reference} onChange={(e) => setReference(e.target.value)} />
        <Button size="sm" variant="secondary" onClick={() => submitMutation.mutate()} disabled={!reference || submitMutation.isPending}>
          Mark Submitted
        </Button>
        <select className="rounded border-slate-300 text-sm" value={score} onChange={(e) => setScore(Number(e.target.value))}>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <Input className="max-w-xs" placeholder="Evaluation notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button size="sm" onClick={() => evalMutation.mutate()} disabled={!notes || evalMutation.isPending}>
          {evalRow.evaluated ? "Update Score" : "Save Score"}
        </Button>
      </div>
    </div>
  );
}
