import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { completeInterview, fetchUsers, recordInterviewEvaluation, scheduleInterview } from "../../lib/queries";
import { apiErrorMessage } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Form";
import { ErrorBanner, EmptyState } from "../../components/ui/Feedback";
import { Badge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { EmailComposer } from "../../components/EmailComposer";
import { Student, User } from "../../types";

// Rung scale corrected to match the program's actual scoring workbook: 1
// Explain - 2 Justify - 3 Tradeoff - 4 Scale & Failure (target >= 3).
const RUNGS = [
  { level: 1, label: "R1 — Explain" },
  { level: 2, label: "R2 — Justify" },
  { level: 3, label: "R3 — Tradeoff" },
  { level: 4, label: "R4 — Scale & Failure" },
];

const BREAK_CAUSES = [
  { value: "KNOWLEDGE_GAP", label: "Knowledge gap (hint didn't land)" },
  { value: "ARTICULATION_GAP", label: "Articulation gap (recovered after hint)" },
  { value: "OWNERSHIP_GAP", label: "Ownership gap" },
  { value: "EVIDENCE_CLAIM_GAP", label: "Evidence/claim gap" },
  { value: "OTHER", label: "Other" },
];

interface InterviewEvaluation {
  id: string;
  highestRungHeld: number | null;
  breakRung: number | null;
  breakCauseCategory: string | null;
  breakCauseNotes: string | null;
  communicationRating: number | null;
  prescription: string | null;
  overallFeedback: string;
  result: string | null;
}
interface Interview {
  id: string;
  interviewType: string;
  sequenceNumber: number;
  status: string;
  scheduledStart: string | null;
  transcriptUrl: string | null;
  interviewer?: { name: string } | null;
  evaluation: InterviewEvaluation | null;
}

export function InterviewsTab({ student, interviews, onChanged }: { student: Student; interviews: Interview[]; onChanged: () => void }) {
  const [showSchedule, setShowSchedule] = useState(false);
  // A1 students have exactly 2 interviews (Mock + Final) by default — the
  // backend still supports more if a genuine re-run is needed (spec section 9).
  const canScheduleMore = interviews.length < 2 || showSchedule;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {interviews.length > 0 ? (
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Interviews
            <Badge tone="neutral">{interviews.length} of 2</Badge>
          </h3>
        ) : (
          <span />
        )}
        {canScheduleMore && (
          <Button
            variant={showSchedule ? "secondary" : "primary"}
            icon={showSchedule ? "close" : "calendar"}
            onClick={() => setShowSchedule((v) => !v)}
          >
            {showSchedule ? "Cancel" : interviews.length === 0 ? "Schedule Mock Interview" : "Schedule Final Interview"}
          </Button>
        )}
      </div>
      {showSchedule && (
        <div className="animate-fade-in">
          <ScheduleForm
            studentId={student.id}
            suggestedType={interviews.length === 0 ? "MOCK" : "FINAL"}
            onDone={() => {
              setShowSchedule(false);
              onChanged();
            }}
          />
        </div>
      )}

      {interviews.length === 0 && !showSchedule && (
        <div className="surface">
          <EmptyState
            icon="calendar"
            title="No interviews scheduled yet"
            description="Schedule a mock interview to begin the A1 interview sequence."
          />
        </div>
      )}

      {interviews.map((interview) => (
        <InterviewCard key={interview.id} student={student} interview={interview} onChanged={onChanged} />
      ))}
    </div>
  );
}

function ScheduleForm({ studentId, suggestedType, onDone }: { studentId: string; suggestedType: "MOCK" | "FINAL"; onDone: () => void }) {
  const [interviewType, setInterviewType] = useState(suggestedType);
  const [scheduledStart, setScheduledStart] = useState("");
  const [interviewerId, setInterviewerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Interviewers are admin accounts on the platform (spec section 9).
  const { data: admins } = useQuery<User[]>({ queryKey: ["users", "ADMIN"], queryFn: () => fetchUsers("ADMIN") });

  const mutation = useMutation({
    mutationFn: () => scheduleInterview({ studentId, interviewType, scheduledStart: scheduledStart || undefined, interviewerId: interviewerId || undefined }),
    onSuccess: onDone,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div className="surface p-4">
      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Type">
          <Select value={interviewType} onChange={(e) => setInterviewType(e.target.value as "MOCK" | "FINAL")}>
            <option value="GAP_CLOSURE">Day 1 — Gap Closure</option>
            <option value="MOCK">Mock Interview</option>
            <option value="FINAL">Final Interview</option>
            <option value="OTHER">Other</option>
          </Select>
        </Field>
        <Field label="Interviewer" hint="Must be an admin account on the platform">
          <Select value={interviewerId} onChange={(e) => setInterviewerId(e.target.value)}>
            <option value="">Select interviewer…</option>
            {admins?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Scheduled start" hint="Optional">
          <Input type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} />
        </Field>
        <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
          Schedule
        </Button>
      </div>
    </div>
  );
}

function InterviewCard({ student, interview, onChanged }: { student: Student; interview: Interview; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [highestRungHeld, setHighestRungHeld] = useState(interview.evaluation?.highestRungHeld ?? 1);
  const [breakRung, setBreakRung] = useState(interview.evaluation?.breakRung ?? 0);
  const [breakCauseCategory, setBreakCauseCategory] = useState(interview.evaluation?.breakCauseCategory ?? "");
  const [breakCauseNotes, setBreakCauseNotes] = useState(interview.evaluation?.breakCauseNotes ?? "");
  const [communicationRating, setCommunicationRating] = useState(interview.evaluation?.communicationRating ?? 3);
  const [prescription, setPrescription] = useState(interview.evaluation?.prescription ?? "");
  const [transcriptUrl, setTranscriptUrl] = useState(interview.transcriptUrl ?? "");
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
        breakCauseCategory: breakCauseCategory || undefined,
        breakCauseNotes: breakCauseNotes || undefined,
        communicationRating,
        prescription: prescription || undefined,
        transcriptUrl: transcriptUrl || undefined,
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
    <div className="surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5 text-sm font-medium text-slate-900 dark:text-slate-100">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-2xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30">
            #{interview.sequenceNumber}
          </span>
          <span className="truncate">
            {interview.interviewType}
            {interview.interviewer && (
              <span className="font-normal text-slate-500 dark:text-slate-400"> · {interview.interviewer.name}</span>
            )}
          </span>
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={interview.status === "COMPLETED" ? "success" : "info"} dot>
            {interview.status}
          </Badge>
          {interview.status !== "COMPLETED" && (
            <Button size="sm" variant="secondary" icon="check" onClick={() => completeMutation.mutate()} loading={completeMutation.isPending}>
              Mark Complete
            </Button>
          )}
        </div>
      </div>
      {interview.scheduledStart && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Icon name="calendar" size={12} className="text-slate-400 dark:text-slate-500" />
          <time dateTime={interview.scheduledStart}>{new Date(interview.scheduledStart).toLocaleString()}</time>
        </p>
      )}

      {interview.evaluation && !editing ? (
        <div className="mt-2 rounded-lg bg-slate-50 p-2 ring-1 ring-inset ring-slate-200/60 text-sm dark:bg-slate-800/40 dark:ring-slate-700">
          <p>
            Highest rung held: {RUNGS.find((r) => r.level === interview.evaluation!.highestRungHeld)?.label ?? "—"}
            {interview.evaluation.breakRung ? ` · Broke at R${interview.evaluation.breakRung}` : ""}
            {interview.evaluation.result && ` · ${interview.evaluation.result}`}
          </p>
          {interview.evaluation.breakCauseCategory && (
            <p className="text-slate-500 dark:text-slate-400">
              Break cause: {BREAK_CAUSES.find((b) => b.value === interview.evaluation!.breakCauseCategory)?.label}
            </p>
          )}
          <p className="text-slate-600 dark:text-slate-400">{interview.evaluation.overallFeedback}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button className="text-xs text-brand-600 hover:underline dark:text-brand-400" onClick={() => setEditing(true)}>
              Edit
            </button>
            <EmailComposer
              student={student}
              defaultTemplateKey="INTERVIEW_FEEDBACK"
              lockTemplate
              defaultVariables={{ feedback: interview.evaluation.overallFeedback, nextStep: interview.evaluation.prescription ?? "" }}
              relatedEntityType="Interview"
              relatedEntityId={interview.id}
              triggerLabel="Send Interview Result Email"
            />
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2 border-t border-slate-100 pt-2 dark:border-slate-800">
          {error && <ErrorBanner message={error} />}
          <div className="flex flex-wrap gap-3">
            <Field label="Highest rung held (1-4)">
              <Select value={highestRungHeld} onChange={(e) => setHighestRungHeld(Number(e.target.value))}>
                {RUNGS.map((r) => (
                  <option key={r.level} value={r.level}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Break rung" hint="0 = no break">
              <Select value={breakRung} onChange={(e) => setBreakRung(Number(e.target.value))}>
                <option value={0}>None</option>
                {RUNGS.map((r) => (
                  <option key={r.level} value={r.level}>
                    R{r.level}
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
          <div className="flex flex-wrap gap-3">
            <Field label="Break cause" hint="One hint after the break: recovered = articulation, still stuck = knowledge">
              <Select value={breakCauseCategory} onChange={(e) => setBreakCauseCategory(e.target.value)}>
                <option value="">—</option>
                {BREAK_CAUSES.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Communication (1-5)">
              <Select value={communicationRating} onChange={(e) => setCommunicationRating(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Break cause notes" hint="Optional">
            <Input value={breakCauseNotes} onChange={(e) => setBreakCauseNotes(e.target.value)} />
          </Field>
          <Field label="Improvement / prescription" hint="The single most useful next step for this student">
            <Input value={prescription} onChange={(e) => setPrescription(e.target.value)} />
          </Field>
          <Field label="Transcript URL" hint="Optional — Google Meet transcript doc link">
            <Input value={transcriptUrl} onChange={(e) => setTranscriptUrl(e.target.value)} />
          </Field>
          <Field label="Overall feedback">
            <Textarea rows={2} value={overallFeedback} onChange={(e) => setOverallFeedback(e.target.value)} />
          </Field>
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
