import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { completeProjectReview, createProjectReview, fetchRubric, updateProjectReview } from "../../lib/queries";
import { apiErrorMessage } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Field, Select, Textarea } from "../../components/ui/Form";
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
        <div className="surface p-4 text-center">
          <p className="mb-3 text-sm text-slate-600">No review in progress.</p>
          <Button onClick={() => startMutation.mutate()} loading={startMutation.isPending} disabled={!rubric}>
            Start Project Review
          </Button>
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Past reviews</h3>
          {completed.map((r) => (
            <div key={r.id} className="surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">
                  {r.totalScore}/50 · {new Date(r.createdAt).toLocaleDateString()} · {r.reviewer?.name}
                </span>
                <Badge tone={r.outcome === "TRACK_A" ? "info" : "danger"}>{r.outcome?.replace("_", " ")}</Badge>
              </div>
              <p className="text-sm text-slate-600">{r.outcomeReason}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {r.scores.map((s) => (
                  <div key={s.dimensionKey} className="rounded-lg bg-slate-50 p-2 ring-1 ring-inset ring-slate-200/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{s.dimensionLabel}</span>
                      <span className={s.mandatoryPass === false ? "font-semibold text-rose-600" : "font-semibold text-slate-800"}>
                        {s.score}/{s.maxScore}
                      </span>
                    </div>
                    {s.reason && <p className="mt-0.5 text-xs text-slate-500">{s.reason}</p>}
                  </div>
                ))}
              </div>
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
    <div className="surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">Project / Resume Review</h3>
        <span className={`text-lg font-bold tabular ${wouldPass ? "text-emerald-600" : "text-rose-600"}`}>{total}/50</span>
      </div>

      {/* Live score bar with the pass threshold marked, so the reviewer can see
          where this review stands relative to 25 without doing the arithmetic. */}
      <div className="relative mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-smooth ${
            wouldPass ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-rose-400 to-rose-500"
          }`}
          style={{ width: `${Math.min(100, (total / 50) * 100)}%` }}
        />
        <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-slate-400/70" />
      </div>

      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}

      <div className="space-y-3">
        {dimensions.map((d) => {
          const value = scores[d.key] ?? { score: 0, reason: "" };
          const fails = d.mandatory && value.score < (d.mandatoryMin ?? 0);
          return (
            <div
              className={`rounded-lg border p-3 transition-colors ${
                fails ? "border-rose-200 bg-rose-50/40" : "border-slate-200/70 hover:border-slate-300"
              }`}
              key={d.key}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">
                  {d.label} {d.mandatory && <span className="text-xs text-slate-400">(min {d.mandatoryMin}+)</span>}
                </span>
                <div className="flex items-center gap-2">
                  {fails && <Badge tone="danger">Below minimum</Badge>}
                  <Select
                    className="w-16"
                    value={value.score}
                    onChange={(e) => setScores((prev) => ({ ...prev, [d.key]: { ...value, score: Number(e.target.value) } }))}
                  >
                    {Array.from({ length: d.maxScore + 1 }, (_, i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </Select>
                  <span className="text-xs tabular text-slate-400">/ {d.maxScore}</span>
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

      <div
        className={`mt-4 rounded-lg p-3 text-sm ring-1 ring-inset ${
          wouldPass ? "bg-emerald-50/60 ring-emerald-200/70" : "bg-rose-50/50 ring-rose-200/70"
        }`}
      >
        <p className="text-slate-700">
          Total: <strong className="tabular">{total}/50</strong> (threshold 25) — Mandatory minimums:{" "}
          {mandatoryFailures.length === 0 ? (
            <span className="font-medium text-emerald-700">all pass</span>
          ) : (
            <span className="font-medium text-rose-700">{mandatoryFailures.map((d) => d.label).join(", ")} below minimum</span>
          )}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 font-medium text-slate-900">
          Projected outcome:
          <Badge tone={wouldPass ? "info" : "danger"} dot>
            {wouldPass ? "Track A" : "Track B"}
          </Badge>
          <span className="text-xs font-normal text-slate-500">(calculated server-side on completion)</span>
        </p>
      </div>

      <div className="mt-4">
        <Field label="Final reason (required to complete)" required>
          <Textarea
            rows={2}
            value={outcomeReason}
            onChange={(e) => setOutcomeReason(e.target.value)}
            placeholder="Specific, evidence-based classification reason…"
          />
        </Field>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
          Save Draft
        </Button>
        <Button
          icon="check"
          onClick={() => completeMutation.mutate()}
          loading={completeMutation.isPending}
          disabled={outcomeReason.trim().length < 10}
        >
          Complete Review & Route Student
        </Button>
      </div>
    </div>
  );
}
