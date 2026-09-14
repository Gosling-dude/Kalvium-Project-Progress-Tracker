import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { recordGraduationDecision } from "../../lib/queries";
import { apiErrorMessage } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Field, Select, Textarea } from "../../components/ui/Form";
import { ErrorBanner, EmptyState, InfoBanner } from "../../components/ui/Feedback";
import { Badge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { Student } from "../../types";

interface Interview {
  id: string;
  interviewType: string;
  sequenceNumber: number;
  evaluation: { highestRungHeld: number | null; result: string | null } | null;
}
interface GraduationDecision {
  id: string;
  decision: string;
  reason: string;
  decidedAt: string;
  decidedBy?: { name: string };
}

export function GraduationTab({
  student,
  interviews,
  decisions,
  onChanged,
}: {
  student: Student;
  interviews: Interview[];
  decisions: GraduationDecision[];
  onChanged: () => void;
}) {
  const [decision, setDecision] = useState<"GRADUATE" | "NOT_GRADUATE">("GRADUATE");
  const [reason, setReason] = useState("");
  const [selectedInterviews, setSelectedInterviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      recordGraduationDecision({ studentId: student.id, decision, reason, relatedInterviewIds: selectedInterviews.length ? selectedInterviews : undefined }),
    onSuccess: () => {
      setReason("");
      onChanged();
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  if (student.currentTrack !== "A1" && decisions.length === 0) {
    return (
      <div className="surface">
        <EmptyState
          icon="graduation"
          title="Not applicable yet"
          description="Graduation decisions apply once a student reaches Track A1."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {student.currentTrack === "A1" && (
        <div className="surface p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30">
              <Icon name="graduation" size={13} />
            </span>
            Record Graduation Decision
          </h3>
          <div className="mb-3 mt-2">
            <InfoBanner message="This is always an explicit Admin decision — completing interviews never graduates a student automatically." />
          </div>
          {error && <div className="mb-2"><ErrorBanner message={error} /></div>}
          <div className="space-y-3">
            <Field label="Decision" required>
              <Select value={decision} onChange={(e) => setDecision(e.target.value as "GRADUATE" | "NOT_GRADUATE")}>
                <option value="GRADUATE">Graduate</option>
                <option value="NOT_GRADUATE">Not graduate — Future Pipeline / Re-evaluation</option>
              </Select>
            </Field>
            <Field label="Related interviews">
              <div className="flex flex-wrap gap-2">
                {interviews.map((i) => {
                  const checked = selectedInterviews.includes(i.id);
                  return (
                    <label
                      key={i.id}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                        checked
                          ? "bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30"
                          : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700 dark:hover:bg-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelectedInterviews((prev) => (e.target.checked ? [...prev, i.id] : prev.filter((id) => id !== i.id)))
                        }
                        className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800"
                      />
                      #{i.sequenceNumber} {i.interviewType} {i.evaluation?.highestRungHeld ? `(R${i.evaluation.highestRungHeld})` : ""}
                    </label>
                  );
                })}
              </div>
            </Field>
            <Field label="Reason" required hint="Required, based on combined interview performance">
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Button
              icon={decision === "GRADUATE" ? "graduation" : "check"}
              onClick={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={reason.trim().length < 10}
            >
              Record Decision
            </Button>
          </div>
        </div>
      )}

      {decisions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">History</h3>
          {decisions.map((d) => (
            <div
              className={`surface p-3.5 text-sm ${
                d.decision === "GRADUATE" ? "border-l-[3px] border-l-emerald-400" : "border-l-[3px] border-l-amber-400"
              }`}
              key={d.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(d.decidedAt).toLocaleDateString()} · {d.decidedBy?.name}
                </span>
                <Badge tone={d.decision === "GRADUATE" ? "success" : "warning"} dot>
                  {d.decision.replace("_", " ")}
                </Badge>
              </div>
              <p className="mt-1.5 leading-relaxed text-slate-600 dark:text-slate-400">{d.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
