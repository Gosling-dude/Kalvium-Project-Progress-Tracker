import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateUser,
  commitStudentImport,
  createAdminUser,
  createCampus,
  createGrowthCoach,
  deactivateUser,
  downloadExport,
  fetchCampuses,
  fetchCohorts,
  fetchGrowthCoaches,
  fetchRubricVersions,
  fetchUsers,
  fetchVideoQuestionSetVersions,
  previewStudentImport,
  updateGrowthCoach,
} from "../lib/queries";
import { Campus, Cohort, GrowthCoach, User } from "../types";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/Button";
import { Field, Input, Select } from "../components/ui/Form";
import { Spinner, ErrorBanner, EmptyState } from "../components/ui/Feedback";
import { Badge } from "../components/ui/Badge";
import { apiErrorMessage } from "../lib/api";

export function SettingsPage() {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <EmptyState title="Not available" description="Settings is only available to Program Admin accounts." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Accounts, reference data, policy versions, and data import/export.</p>
      </div>
      <ProgramAdminsSection />
      <CampusesSection />
      <GrowthCoachesSection />
      <RubricSection />
      <VideoQuestionSection />
      <ImportSection />
      <ExportSection />
    </div>
  );
}

function ProgramAdminsSection() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data: admins } = useQuery<User[]>({ queryKey: ["admins-settings"], queryFn: () => fetchUsers("ADMIN", true) });

  const createMutation = useMutation({
    mutationFn: () => createAdminUser({ name, email, password }),
    onSuccess: () => {
      setName("");
      setEmail("");
      setPassword("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admins-settings"] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (u: User) => (u.active ? deactivateUser(u.id) : activateUser(u.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admins-settings"] }),
  });

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Program Admins</h2>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {admins?.map((a) => (
            <Badge key={a.id} tone={a.active ? "neutral" : "warning"}>
              {a.name} ({a.email}) {!a.active && "· inactive"}
              <button
                className="ml-1.5 text-xs underline"
                onClick={() => toggleActiveMutation.mutate(a)}
                disabled={toggleActiveMutation.isPending}
              >
                {a.active ? "Deactivate" : "Reactivate"}
              </button>
            </Badge>
          ))}
        </div>
        {error && <div className="mb-2"><ErrorBanner message={error} /></div>}
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Password" hint="At least 8 characters — shared with them to sign in">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={!name || !email || password.length < 8 || createMutation.isPending}
          >
            Add Program Admin
          </Button>
        </div>
      </div>
    </section>
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
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data: coaches } = useQuery<GrowthCoach[]>({ queryKey: ["growth-coaches-settings"], queryFn: () => fetchGrowthCoaches(true) });
  const { data: campuses } = useQuery<Campus[]>({ queryKey: ["campuses"], queryFn: () => fetchCampuses() });

  const mutation = useMutation({
    mutationFn: () => createGrowthCoach({ name, email, campusId: campusId || undefined, password: password || undefined }),
    onSuccess: () => {
      setName("");
      setEmail("");
      setPassword("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["growth-coaches-settings"] });
      queryClient.invalidateQueries({ queryKey: ["growth-coaches"] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (c: GrowthCoach) => updateGrowthCoach(c.id, { active: !c.active }),
    onSuccess: () => {
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
              {c.name} {c.campus && `· ${c.campus.name}`} {c.userId && "· has login"} {!c.active && "· inactive"}
              <button
                className="ml-1.5 text-xs underline"
                onClick={() => toggleActiveMutation.mutate(c)}
                disabled={toggleActiveMutation.isPending}
              >
                {c.active ? "Deactivate" : "Reactivate"}
              </button>
            </Badge>
          ))}
        </div>
        {error && <div className="mb-2"><ErrorBanner message={error} /></div>}
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
          <Field label="Login password" hint="Optional — leave blank for no login, or at least 8 characters to grant one">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank for no login" />
          </Field>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={!name || !email || (password.length > 0 && password.length < 8) || mutation.isPending}
          >
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
  const [preview, setPreview] = useState<{ totalRows: number; validRows: { rowNumber: number; email: string; fullName: string; resumeLink?: string; batch?: string }[]; errors: { rowNumber: number; message: string }[]; warnings: { rowNumber: number; message: string }[] } | null>(null);
  const [cohortId, setCohortId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: number;
    skippedExisting: number;
    updatedExisting: number;
    enrolled: number;
    alreadyInCohort: number;
    warnings: { rowNumber: number; message: string }[];
  } | null>(null);
  const { data: cohorts } = useQuery<Cohort[]>({ queryKey: ["cohorts", "ACTIVE"], queryFn: () => fetchCohorts("ACTIVE") });

  const previewMutation = useMutation({
    mutationFn: (file: File) => previewStudentImport(file),
    onSuccess: setPreview,
    onError: (err) => setError(apiErrorMessage(err)),
  });
  const commitMutation = useMutation({
    mutationFn: () => commitStudentImport(preview!.validRows, cohortId || undefined),
    onSuccess: (res) => {
      setResult(res);
      setPreview(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Bulk Upload Students (CSV/XLSX)</h2>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {error && <div className="mb-2"><ErrorBanner message={error} /></div>}
        <p className="mb-2 text-xs text-slate-500">
          Recognized columns include email, full name, campus, growth coach (name and/or "Growth Coach Email"), batch/year, chosen
          project, and a resume Google Drive link (any of "Resume Link", "Resume Google Drive Link", "Resume"). A campus or growth coach
          that isn't already in the system is added automatically (marked inactive) rather than left blank — review it here afterward.
          An existing student's blank fields get filled in from the file too, rather than being skipped outright.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Enroll into cohort" hint="Optional — applies to every row committed">
            <Select value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
              <option value="">—</option>
              {cohorts?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
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
        </div>
        {preview && (
          <div className="mt-3 space-y-2 text-sm">
            <p>
              {preview.validRows.length} of {preview.totalRows} rows valid · {preview.errors.length} error(s) · {preview.warnings.length} warning(s)
            </p>
            {preview.errors.slice(0, 5).map((e, i) => (
              <p key={i} className="text-xs text-rose-600">Row {e.rowNumber}: {e.message}</p>
            ))}
            {preview.warnings.slice(0, 5).map((w, i) => (
              <p key={i} className="text-xs text-amber-600">Row {w.rowNumber}: {w.message}</p>
            ))}
            <Button size="sm" onClick={() => commitMutation.mutate()} disabled={preview.validRows.length === 0 || commitMutation.isPending}>
              Commit {preview.validRows.length} Valid Rows
            </Button>
          </div>
        )}
        {result && (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-emerald-700">
              Imported {result.created} new student(s), {result.updatedExisting} existing record(s) filled in, {result.skippedExisting}{" "}
              already on file with nothing new to add.
              {cohortId && ` ${result.enrolled} added to the cohort, ${result.alreadyInCohort} already in it.`}
            </p>
            {result.warnings.length > 0 && (
              <div className="space-y-1 rounded-md bg-amber-50 p-3">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-800">
                    Row {w.rowNumber}: {w.message}
                  </p>
                ))}
              </div>
            )}
          </div>
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
