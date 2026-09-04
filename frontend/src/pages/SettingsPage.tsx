import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  commitStudentImport,
  createCampus,
  createGrowthCoach,
  downloadExport,
  fetchCampuses,
  fetchGrowthCoaches,
  fetchRubricVersions,
  fetchVideoQuestionSetVersions,
  previewStudentImport,
} from "../lib/queries";
import { Campus, GrowthCoach } from "../types";
import { Button } from "../components/ui/Button";
import { Field, Input, Select } from "../components/ui/Form";
import { Spinner, ErrorBanner } from "../components/ui/Feedback";
import { Badge } from "../components/ui/Badge";
import { apiErrorMessage } from "../lib/api";

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Reference data, policy versions, and data import/export.</p>
      </div>
      <CampusesSection />
      <GrowthCoachesSection />
      <RubricSection />
      <VideoQuestionSection />
      <ImportSection />
      <ExportSection />
    </div>
  );
}

function CampusesSection() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const { data } = useQuery<Campus[]>({ queryKey: ["campuses-settings"], queryFn: () => fetchCampuses(true) });
  const mutation = useMutation({
    mutationFn: () => createCampus({ name, code }),
    onSuccess: () => {
      setName("");
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["campuses-settings"] });
      queryClient.invalidateQueries({ queryKey: ["campuses"] });
    },
  });

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Campuses</h2>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {data?.map((c) => (
            <Badge key={c.id} tone={c.active ? "neutral" : "warning"}>
              {c.name} ({c.code})
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Code"><Input value={code} onChange={(e) => setCode(e.target.value)} /></Field>
          <Button size="sm" onClick={() => mutation.mutate()} disabled={!name || !code || mutation.isPending}>
            Add Campus
          </Button>
        </div>
      </div>
    </section>
  );
}

function GrowthCoachesSection() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [campusId, setCampusId] = useState("");
  const { data: coaches } = useQuery<GrowthCoach[]>({ queryKey: ["growth-coaches-settings"], queryFn: () => fetchGrowthCoaches(true) });
  const { data: campuses } = useQuery<Campus[]>({ queryKey: ["campuses"], queryFn: () => fetchCampuses() });

  const mutation = useMutation({
    mutationFn: () => createGrowthCoach({ name, email, campusId: campusId || undefined }),
    onSuccess: () => {
      setName("");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["growth-coaches-settings"] });
      queryClient.invalidateQueries({ queryKey: ["growth-coaches"] });
    },
  });

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Growth Coaches</h2>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {coaches?.map((c) => (
            <Badge key={c.id} tone={c.active ? "neutral" : "warning"}>
              {c.name} {c.campus && `· ${c.campus.name}`}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Campus">
            <Select value={campusId} onChange={(e) => setCampusId(e.target.value)}>
              <option value="">—</option>
              {campuses?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Button size="sm" onClick={() => mutation.mutate()} disabled={!name || !email || mutation.isPending}>
            Add Growth Coach
          </Button>
        </div>
      </div>
    </section>
  );
}

function RubricSection() {
  const { data, isLoading } = useQuery({ queryKey: ["rubric-versions"], queryFn: fetchRubricVersions });
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Project Review Rubric Versions</h2>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {isLoading ? (
          <Spinner />
        ) : (
          data?.map((v: { id: string; key: string; totalMax: number; threshold: number; active: boolean; dimensions: { label: string; maxScore: number; mandatory: boolean; mandatoryMin: number | null }[] }) => (
            <div key={v.id} className="mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{v.key}</span>
                <Badge tone={v.active ? "success" : "neutral"}>threshold {v.threshold}/{v.totalMax}</Badge>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-600 sm:grid-cols-3">
                {v.dimensions.map((d) => (
                  <span key={d.label}>
                    {d.label} {d.mandatory && `(min ${d.mandatoryMin})`}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
        <p className="mt-2 text-xs text-slate-400">
          Historical evaluations retain the rubric version used at the time — editing policy here requires a new version and never rewrites past decisions.
        </p>
      </div>
    </section>
  );
}

function VideoQuestionSection() {
  const { data, isLoading } = useQuery({ queryKey: ["video-question-versions"], queryFn: fetchVideoQuestionSetVersions });
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Track A Video Question Bank</h2>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {isLoading ? (
          <Spinner />
        ) : (
          data?.map((v: { id: string; questionSet: { name: string }; versionNumber: number; questions: { questionKey: string; title: string; isMandatory: boolean }[] }) => (
            <div key={v.id} className="mb-2">
              <span className="font-medium text-slate-900">
                {v.questionSet.name} v{v.versionNumber}
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {v.questions.map((q) => (
                  <Badge key={q.questionKey} tone={q.isMandatory ? "info" : "neutral"}>
                    {q.questionKey}: {q.title}
                  </Badge>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ImportSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ totalRows: number; validRows: unknown[]; errors: { rowNumber: number; message: string }[]; warnings: { rowNumber: number; message: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skippedExisting: number } | null>(null);

  const previewMutation = useMutation({
    mutationFn: (file: File) => previewStudentImport(file),
    onSuccess: setPreview,
    onError: (err) => setError(apiErrorMessage(err)),
  });
  const commitMutation = useMutation({
    mutationFn: () => commitStudentImport(preview!.validRows),
    onSuccess: (res) => {
      setResult(res);
      setPreview(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Import Students</h2>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {error && <div className="mb-2"><ErrorBanner message={error} /></div>}
        <input
          ref={fileRef}
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
          <div className="mt-3 space-y-2 text-sm">
            <p>
              {preview.validRows.length} of {preview.totalRows} rows valid · {preview.errors.length} error(s) · {preview.warnings.length} warning(s)
            </p>
            {preview.errors.slice(0, 5).map((e, i) => (
              <p key={i} className="text-xs text-rose-600">Row {e.rowNumber}: {e.message}</p>
            ))}
            <Button size="sm" onClick={() => commitMutation.mutate()} disabled={preview.validRows.length === 0 || commitMutation.isPending}>
              Commit {preview.validRows.length} Valid Rows
            </Button>
          </div>
        )}
        {result && (
          <p className="mt-2 text-sm text-emerald-700">
            Imported {result.created} new student(s), skipped {result.skippedExisting} already on file.
          </p>
        )}
      </div>
    </section>
  );
}

function ExportSection() {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Export Data</h2>
      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-4">
        <Button size="sm" variant="secondary" onClick={() => downloadExport("/export/students", { format: "csv" }, "students.csv")}>
          Export Students (CSV)
        </Button>
        <Button size="sm" variant="secondary" onClick={() => downloadExport("/export/interviews", { format: "csv" }, "interviews.csv")}>
          Export Interviews (CSV)
        </Button>
        <Button size="sm" variant="secondary" onClick={() => downloadExport("/export/deliverables", { format: "csv" }, "deliverables.csv")}>
          Export Deliverables (CSV)
        </Button>
        <Button size="sm" variant="secondary" onClick={() => downloadExport("/export/history", { format: "csv" }, "history.csv")}>
          Export History (CSV)
        </Button>
      </div>
    </section>
  );
}
