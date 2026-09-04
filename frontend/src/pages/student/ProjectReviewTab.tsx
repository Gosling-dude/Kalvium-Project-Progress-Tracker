import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { completeProjectReview, createProjectReview, fetchRubric, updateProjectReview } from "../../lib/queries";
import { apiErrorMessage } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Form";
import { ErrorBanner } from "../../components/ui/Feedback";
import { Badge } from "../../components/ui/Badge";
import { Student } from "../../types";

interface RubricDimension {
  key: string;
  label: string;
  maxScore: number;
  mandatory: boolean;
  mandatoryMin: number | null;
  order: number;
}

interface ReviewScore {
  dimensionKey: string;
  dimensionLabel: string;
  score: number;
  maxScore: number;
  isMandatory: boolean;
  mandatoryMin: number | null;
  mandatoryPass: boolean | null;
  reason: string;
}

interface ProjectReview {
  id: string;
  status: "DRAFT" | "COMPLETED";
  totalScore: number;
  thresholdPassed: boolean | null;
  mandatoryPassed: boolean | null;
  outcome: "TRACK_A" | "TRACK_B" | null;
  outcomeReason: string | null;
  scores: ReviewScore[];
  reviewer?: { name: string };
  createdAt: string;
}

export function ProjectReviewTab({ student, reviews, onChanged }: { student: Student; reviews: ProjectReview[]; onChanged: () => void }) {
  const draft = reviews.find((r) => r.status === "DRAFT");
  const completed = reviews.filter((r) => r.status === "COMPLETED");
  const { data: rubric } = useQuery({ queryKey: ["rubric"], queryFn: fetchRubric });

  const startMutation = useMutation({
    mutationFn: () =>
      createProjectReview({
        studentId: student.id,
        scores: (rubric?.dimensions as RubricDimension[])?.map((d) => ({ dimensionKey: d.key, score: 0, reason: "" })) ?? [],
      }),
    onSuccess: onChanged,
  });

  return (
    <div className="space-y-4">
      {draft ? (
        <ReviewForm review={draft} dimensions={rubric?.dimensions ?? []} onChanged={onChanged} />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
          <p className="mb-3 text-sm text-slate-600">No review in progress.</p>
          <Button onClick={() => startMutation.mutate()} disabled={!rubric || startMutation.isPending}>
            Start Project Review
          </Button>
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Past reviews</h3>
          {completed.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">
                  {r.totalScore}/50 · {new Date(r.createdAt).toLocaleDateString()} · {r.reviewer?.name}
                </span>
                <Badge tone={r.outcome === "TRACK_A" ? "info" : "danger"}>{r.outcome?.replace("_", " ")}</Badge>
              </div>
              <p className="text-sm text-slate-600">{r.outcomeReason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewForm({ review, dimensions, onChanged }: { review: ProjectReview; dimensions: RubricDimension[]; onChanged: () => void }) {
  const [scores, setScores] = useState<Record<string, { score: number; reason: string }>>(
    Object.fromEntries(review.scores.map((s) => [s.dimensionKey, { score: s.score, reason: s.reason }])),
  );
  const [outcomeReason, setOutcomeReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const total = Object.values(scores).reduce((sum, s) => sum + s.score, 0);
  const mandatoryFailures = dimensions.filter((d) => d.mandatory && (scores[d.key]?.score ?? 0) < (d.mandatoryMin ?? 0));
  const wouldPass = total >= 25 && mandatoryFailures.length === 0;

  const saveMutation = useMutation({
    mutationFn: () =>
      updateProjectReview(review.id, { scores: Object.entries(scores).map(([dimensionKey, v]) => ({ dimensionKey, ...v })) }),
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      completeProjectReview(review.id, {
        scores: Object.entries(scores).map(([dimensionKey, v]) => ({ dimensionKey, ...v })),
        outcomeReason,
      }),
    onSuccess: onChanged,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Project / Resume Review</h3>
        <span className={`text-lg font-bold ${wouldPass ? "text-emerald-600" : "text-rose-600"}`}>{total}/50</span>
      </div>
      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}

      <div className="space-y-3">
        {dimensions.map((d) => {
          const value = scores[d.key] ?? { score: 0, reason: "" };
          const fails = d.mandatory && value.score < (d.mandatoryMin ?? 0);
          return (
            <div key={d.key} className="rounded-md border border-slate-100 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">
                  {d.label} {d.mandatory && <span className="text-xs text-slate-400">(min {d.mandatoryMin}+)</span>}
                </span>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded border-slate-300 text-sm"
                    value={value.score}
                    onChange={(e) => setScores((prev) => ({ ...prev, [d.key]: { ...value, score: Number(e.target.value) } }))}
                  >
                    {Array.from({ length: d.maxScore + 1 }, (_, i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-400">/ {d.maxScore}</span>
                  {fails && <Badge tone="danger">Below minimum</Badge>}
                </div>
              </div>
              <Textarea
                rows={1}
                placeholder="Evidence-based reason…"
                value={value.reason}
                onChange={(e) => setScores((prev) => ({ ...prev, [d.key]: { ...value, reason: e.target.value } }))}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
        <p>
          Total: <strong>{total}/50</strong> (threshold 25) — Mandatory minimums:{" "}
          {mandatoryFailures.length === 0 ? <span className="text-emerald-700">all pass</span> : <span className="text-rose-700">{mandatoryFailures.map((d) => d.label).join(", ")} below minimum</span>}
        </p>
        <p className="mt-1 font-medium">Projected outcome: {wouldPass ? "Track A" : "Track B"} (calculated server-side on completion)</p>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">Final reason (required to complete)</label>
        <Textarea rows={2} value={outcomeReason} onChange={(e) => setOutcomeReason(e.target.value)} placeholder="Specific, evidence-based classification reason…" />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          Save Draft
        </Button>
        <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending || outcomeReason.trim().length < 10}>
          Complete Review & Route Student
        </Button>
      </div>
    </div>
  );
}
