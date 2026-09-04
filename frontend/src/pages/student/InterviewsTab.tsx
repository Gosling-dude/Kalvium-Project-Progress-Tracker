import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { completeInterview, fetchRungLevels, recordInterviewEvaluation, scheduleInterview } from "../../lib/queries";
import { apiErrorMessage } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Form";
import { ErrorBanner } from "../../components/ui/Feedback";
import { Badge } from "../../components/ui/Badge";
import { Student } from "../../types";

interface InterviewEvaluation {
  id: string;
  highestRungHeld: number | null;
  breakRung: number | null;
  overallFeedback: string;
  result: string | null;
}
interface Interview {
  id: string;
  interviewType: string;
  sequenceNumber: number;
  status: string;
  scheduledStart: string | null;
  interviewer?: { name: string } | null;
  evaluation: InterviewEvaluation | null;
}

export function InterviewsTab({ student, interviews, onChanged }: { student: Student; interviews: Interview[]; onChanged: () => void }) {
  const [showSchedule, setShowSchedule] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowSchedule((v) => !v)}>{showSchedule ? "Cancel" : "Schedule Interview"}</Button>
      </div>
      {showSchedule && <ScheduleForm studentId={student.id} onDone={() => { setShowSchedule(false); onChanged(); }} />}

      {interviews.length === 0 && !showSchedule && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">No interviews scheduled yet.</div>
      )}

      {interviews.map((interview) => (
        <InterviewCard key={interview.id} interview={interview} onChanged={onChanged} />
      ))}
    </div>
  );
}

function ScheduleForm({ studentId, onDone }: { studentId: string; onDone: () => void }) {
  const [interviewType, setInterviewType] = useState("MOCK");
  const [scheduledStart, setScheduledStart] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => scheduleInterview({ studentId, interviewType, scheduledStart: scheduledStart || undefined }),
    onSuccess: onDone,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Type">
          <Select value={interviewType} onChange={(e) => setInterviewType(e.target.value)}>
            <option value="GAP_CLOSURE">Day 1 — Gap Closure</option>
            <option value="MOCK">Mock Interview</option>
            <option value="FINAL">Final Interview</option>
            <option value="OTHER">Other</option>
          </Select>
        </Field>
        <Field label="Scheduled start" hint="Optional">
          <Input type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} />
        </Field>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Schedule
        </Button>
      </div>
    </div>
  );
}

function InterviewCard({ interview, onChanged }: { interview: Interview; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const { data: rungLevels } = useQuery({ queryKey: ["rung-levels"], queryFn: fetchRungLevels, enabled: editing });
  const [highestRungHeld, setHighestRungHeld] = useState(interview.evaluation?.highestRungHeld ?? 1);
  const [breakRung, setBreakRung] = useState(interview.evaluation?.breakRung ?? 0);
  const [overallFeedback, setOverallFeedback] = useState(interview.evaluation?.overallFeedback ?? "");
  const [result, setResult] = useState(interview.evaluation?.result ?? "");
  const [error, setError] = useState<string | null>(null);

  const completeMutation = useMutation({
    mutationFn: () => completeInterview(interview.id, {}),
    onSuccess: onChanged,
  });

  const evalMutation = useMutation({
    mutationFn: () =>
      recordInterviewEvaluation(interview.id, {
        highestRungHeld,
        breakRung: breakRung || undefined,
        overallFeedback,
        result: result || undefined,
      }),
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-900">
          #{interview.sequenceNumber} {interview.interviewType} {interview.interviewer && `· ${interview.interviewer.name}`}
        </span>
        <div className="flex items-center gap-2">
          <Badge tone={interview.status === "COMPLETED" ? "success" : "info"}>{interview.status}</Badge>
          {interview.status !== "COMPLETED" && (
            <Button size="sm" variant="secondary" onClick={() => completeMutation.mutate()}>
              Mark Complete
            </Button>
          )}
        </div>
      </div>
      {interview.scheduledStart && <p className="mt-1 text-xs text-slate-500">{new Date(interview.scheduledStart).toLocaleString()}</p>}

      {interview.evaluation && !editing ? (
        <div className="mt-2 rounded-md bg-slate-50 p-2 text-sm">
          <p>
            Highest rung held: R{interview.evaluation.highestRungHeld} {interview.evaluation.breakRung ? `· Break rung: R${interview.evaluation.breakRung}` : ""}
            {interview.evaluation.result && ` · ${interview.evaluation.result}`}
          </p>
          <p className="text-slate-600">{interview.evaluation.overallFeedback}</p>
          <button className="mt-1 text-xs text-brand-600 hover:underline" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
          {error && <ErrorBanner message={error} />}
          <div className="flex gap-3">
            <Field label="Highest rung held">
              <Select value={highestRungHeld} onChange={(e) => setHighestRungHeld(Number(e.target.value))}>
                {(rungLevels ?? [1, 2, 3, 4, 5].map((level) => ({ level, label: `R${level}` }))).map((r: { level: number; label: string }) => (
                  <option key={r.level} value={r.level}>
                    R{r.level} — {r.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Break rung" hint="0 = no break">
              <Select value={breakRung} onChange={(e) => setBreakRung(Number(e.target.value))}>
                <option value={0}>None</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    R{n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Result">
              <Select value={result} onChange={(e) => setResult(e.target.value)}>
                <option value="">—</option>
                <option value="ADVANCE">Advance</option>
                <option value="REPEAT">Repeat</option>
                <option value="FAIL">Fail</option>
                <option value="INCONCLUSIVE">Inconclusive</option>
              </Select>
            </Field>
          </div>
          <Field label="Overall feedback">
            <Textarea rows={2} value={overallFeedback} onChange={(e) => setOverallFeedback(e.target.value)} />
          </Field>
          {!editing && !interview.evaluation && null}
          <div className="flex justify-end gap-2">
            {editing && (
              <Button variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
            <Button onClick={() => evalMutation.mutate()} disabled={evalMutation.isPending || overallFeedback.trim().length < 10}>
              Save Feedback
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
