import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { recordGraduationDecision } from "../../lib/queries";
import { apiErrorMessage } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Field, Select, Textarea } from "../../components/ui/Form";
import { ErrorBanner, EmptyState } from "../../components/ui/Feedback";
import { Badge } from "../../components/ui/Badge";
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
    return <EmptyState title="Not applicable yet" description="Graduation decisions apply once a student reaches Track A1." />;
  }

  return (
    <div className="space-y-4">
      {student.currentTrack === "A1" && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Record Graduation Decision</h3>
          <p className="mb-3 text-xs text-slate-500">
            This is always an explicit Admin decision — completing interviews never graduates a student automatically.
          </p>
          {error && <div className="mb-2"><ErrorBanner message={error} /></div>}
          <div className="space-y-3">
            <Field label="Decision">
              <Select value={decision} onChange={(e) => setDecision(e.target.value as "GRADUATE" | "NOT_GRADUATE")}>
                <option value="GRADUATE">Graduate</option>
                <option value="NOT_GRADUATE">Not graduate — Future Pipeline / Re-evaluation</option>
              </Select>
            </Field>
            <Field label="Related interviews">
              <div className="flex flex-wrap gap-2">
                {interviews.map((i) => (
                  <label key={i.id} className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs">
                    <input
                      type="checkbox"
                      checked={selectedInterviews.includes(i.id)}
                      onChange={(e) =>
                        setSelectedInterviews((prev) => (e.target.checked ? [...prev, i.id] : prev.filter((id) => id !== i.id)))
                      }
                    />
                    #{i.sequenceNumber} {i.interviewType} {i.evaluation?.highestRungHeld ? `(R${i.evaluation.highestRungHeld})` : ""}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Reason" hint="Required, based on combined interview performance">
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Button onClick={() => mutation.mutate()} disabled={reason.trim().length < 10 || mutation.isPending}>
              Record Decision
            </Button>
          </div>
        </div>
      )}

      {decisions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">History</h3>
          {decisions.map((d) => (
            <div key={d.id} className="rounded-md border border-slate-100 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>{new Date(d.decidedAt).toLocaleDateString()} · {d.decidedBy?.name}</span>
                <Badge tone={d.decision === "GRADUATE" ? "success" : "warning"}>{d.decision.replace("_", " ")}</Badge>
              </div>
              <p className="text-slate-600">{d.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
