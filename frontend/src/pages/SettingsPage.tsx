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
import { Spinner, ErrorBanner, EmptyState, InfoBanner } from "../components/ui/Feedback";
import { Badge } from "../components/ui/Badge";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import { PageContainer, PageHeader } from "../components/ui/Page";
import { Icon, IconName } from "../components/ui/Icon";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { apiErrorMessage } from "../lib/api";
import { useTheme } from "../lib/theme";

export function SettingsPage() {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") {
    return (
      <PageContainer width="max-w-5xl">
        <div className="surface">
          <EmptyState icon="settings" title="Not available" description="Settings is only available to Program Admin accounts." />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="max-w-5xl" className="!space-y-6">
      <PageHeader
        icon="settings"
        title="Settings"
        description="Accounts, reference data, policy versions, and data import/export."
      />
      <AppearanceSection />
      <ProgramAdminsSection />
      <CampusesSection />
      <GrowthCoachesSection />
      <RubricSection />
      <VideoQuestionSection />
      <ImportSection />
      <ExportSection />
    </PageContainer>
  );
}

// One row per account/record: name and facts on the left, the single
// activate/deactivate control on the right. Previously these were badges with a
// link nested inside them, which read as decoration rather than an action.
function EntityRow({
  icon,
  title,
  subtitle,
  facts,
  active,
  onToggle,
  toggling,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  facts?: string[];
  active?: boolean;
  onToggle?: () => void;
  toggling?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${
          active
            ? "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"
            : "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30"
        }`}
      >
        <Icon name={icon} size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          {title}
          {!active && (
            <Badge tone="warning" dot>
              inactive
            </Badge>
          )}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 truncate text-xs text-slate-500 dark:text-slate-400">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {facts?.map((f) => (
            <span key={f} className="flex items-center gap-2">
              <span className="text-slate-300 dark:text-slate-600">·</span>
              {f}
            </span>
          ))}
        </p>
      </div>
      {onToggle && (
        <Button size="xs" variant={active ? "ghost" : "secondary"} onClick={onToggle} loading={toggling}>
          {active ? "Deactivate" : "Reactivate"}
        </Button>
      )}
    </div>
  );
}

function AppearanceSection() {
  const { theme } = useTheme();
  return (
    <Card>
      <CardHeader icon="sun" title="Appearance" subtitle="Choose how the tracker looks on this device." />
      <CardBody>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50/70 p-3 ring-1 ring-inset ring-slate-200/70 dark:bg-slate-800/40 dark:ring-slate-700">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Dark mode</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {theme === "dark" ? "Dark theme is on." : "Light theme is on."} Applies across the whole app on this browser.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </CardBody>
    </Card>
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
    <Card>
      <CardHeader
        icon="user"
        title="Program Admins"
        subtitle="Full access to every cohort, student and setting."
        action={admins && <Badge tone="neutral">{admins.length} accounts</Badge>}
      />
      <CardBody className="space-y-4">
        {admins && admins.length > 0 && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {admins.map((a) => (
              <EntityRow
                key={a.id}
                icon="user"
                title={a.name}
                subtitle={a.email}
                active={a.active}
                onToggle={() => toggleActiveMutation.mutate(a)}
                toggling={toggleActiveMutation.isPending}
              />
            ))}
          </div>
        )}
        {error && <ErrorBanner message={error} />}
        <div className="flex flex-wrap items-end gap-3 rounded-lg bg-slate-50/70 p-3 ring-1 ring-inset ring-slate-200/70 dark:bg-slate-800/40 dark:ring-slate-700">
          <Field label="Name">
            <Input className="w-44" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input className="w-56" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" hint="At least 8 characters — shared with them to sign in">
            <Input className="w-44" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button
            size="sm"
            icon="plus"
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!name || !email || password.length < 8}
          >
            Add Program Admin
          </Button>
        </div>
      </CardBody>
    </Card>
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
    <Card>
      <CardHeader
        icon="layers"
        title="Campuses"
        subtitle="Reference data used on student records and imports."
        action={data && <Badge tone="neutral">{data.length} campuses</Badge>}
      />
      <CardBody className="space-y-4">
        {data && data.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.map((c) => (
              <Badge key={c.id} tone={c.active ? "neutral" : "warning"} dot>
                {c.name} ({c.code})
              </Badge>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3 rounded-lg bg-slate-50/70 p-3 ring-1 ring-inset ring-slate-200/70 dark:bg-slate-800/40 dark:ring-slate-700">
          <Field label="Name">
            <Input className="w-48" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Code">
            <Input className="w-32" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Button size="sm" icon="plus" onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!name || !code}>
            Add Campus
          </Button>
        </div>
      </CardBody>
    </Card>
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
    <Card>
      <CardHeader
        icon="students"
        title="Growth Coaches"
        subtitle="Each coach sees only their own assigned students."
        action={coaches && <Badge tone="neutral">{coaches.length} coaches</Badge>}
      />
      <CardBody className="space-y-4">
        {coaches && coaches.length > 0 && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {coaches.map((c) => (
              <EntityRow
                key={c.id}
                icon="students"
                title={c.name}
                subtitle={c.email}
                facts={[...(c.campus ? [c.campus.name] : []), ...(c.userId ? ["has login"] : ["no login"])]}
                active={c.active}
                onToggle={() => toggleActiveMutation.mutate(c)}
                toggling={toggleActiveMutation.isPending}
              />
            ))}
          </div>
        )}
        {error && <ErrorBanner message={error} />}
        <div className="flex flex-wrap items-end gap-3 rounded-lg bg-slate-50/70 p-3 ring-1 ring-inset ring-slate-200/70 dark:bg-slate-800/40 dark:ring-slate-700">
          <Field label="Name">
            <Input className="w-44" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input className="w-52" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Campus">
            <Select className="w-40" value={campusId} onChange={(e) => setCampusId(e.target.value)}>
              <option value="">—</option>
              {campuses?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Login password" hint="Optional — blank for no login, or 8+ characters to grant one">
            <Input
              className="w-48"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for no login"
            />
          </Field>
          <Button
            size="sm"
            icon="plus"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!name || !email || (password.length > 0 && password.length < 8)}
          >
            Add Growth Coach
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function RubricSection() {
  const { data, isLoading } = useQuery({ queryKey: ["rubric-versions"], queryFn: fetchRubricVersions });
  return (
    <Card>
      <CardHeader icon="clipboard" title="Project Review Rubric Versions" subtitle="Scoring policy for resume/project evaluation." />
      <CardBody className="space-y-3">
        {isLoading ? (
          <Spinner />
        ) : (
          data?.map(
            (v: {
              id: string;
              key: string;
              totalMax: number;
              threshold: number;
              active: boolean;
              dimensions: {
                label: string;
                maxScore: number;
                mandatory: boolean;
                mandatoryMin: number | null;
                whatItEvaluates?: string;
                lowBand?: string;
                midBand?: string;
                highBand?: string;
              }[];
            }) => (
              <div key={v.id} className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{v.key}</span>
                  <Badge tone={v.active ? "success" : "neutral"} dot>
                    threshold {v.threshold}/{v.totalMax}
                  </Badge>
                </div>
                <div className="mt-2 space-y-1.5">
                  {v.dimensions.map((d) => (
                    <details key={d.label} className="group rounded border border-slate-200/70 bg-white/60 px-2 py-1.5 dark:border-slate-700/70 dark:bg-slate-900/30">
                      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <Icon name="chevronRight" className="h-3 w-3 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                        <span className="font-medium text-slate-900 dark:text-slate-100">{d.label}</span>
                        <span>· {d.maxScore} marks</span>
                        {d.mandatory && <span className="text-amber-600 dark:text-amber-400">(min {d.mandatoryMin})</span>}
                      </summary>
                      {d.whatItEvaluates && (
                        <div className="mt-2 space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-400">
                          <p>
                            <span className="font-medium text-slate-700 dark:text-slate-300">What it evaluates: </span>
                            {d.whatItEvaluates}
                          </p>
                          <p>
                            <span className="font-medium text-slate-700 dark:text-slate-300">Low (0–1): </span>
                            {d.lowBand}
                          </p>
                          <p>
                            <span className="font-medium text-slate-700 dark:text-slate-300">Mid (2–3): </span>
                            {d.midBand}
                          </p>
                          <p>
                            <span className="font-medium text-slate-700 dark:text-slate-300">High (4–5): </span>
                            {d.highBand}
                          </p>
                        </div>
                      )}
                    </details>
                  ))}
                </div>
              </div>
            ),
          )
        )}
        <InfoBanner message="Historical evaluations retain the rubric version used at the time — editing policy here requires a new version and never rewrites past decisions." />
      </CardBody>
    </Card>
  );
}

function VideoQuestionSection() {
  const { data, isLoading } = useQuery({ queryKey: ["video-question-versions"], queryFn: fetchVideoQuestionSetVersions });
  return (
    <Card>
      <CardHeader icon="video" title="Track A Video Question Bank" subtitle="The 10 questions issued at the video assessment gate." />
      <CardBody className="space-y-3">
        {isLoading ? (
          <Spinner />
        ) : (
          data?.map(
            (v: {
              id: string;
              questionSet: { name: string };
              versionNumber: number;
              questions: {
                questionKey: string;
                title: string;
                questionText: string;
                marks: number;
                minTimeSeconds: number;
                listeningCriteria: string;
                isMandatory: boolean;
              }[];
            }) => (
              <div key={v.id} className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {v.questionSet.name} v{v.versionNumber}
                </span>
                <div className="mt-2 space-y-1.5">
                  {v.questions.map((q) => (
                    <details key={q.questionKey} className="group rounded border border-slate-200/70 bg-white/60 px-2 py-1.5 dark:border-slate-700/70 dark:bg-slate-900/30">
                      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <Icon name="chevronRight" className="h-3 w-3 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {q.questionKey}: {q.title}
                        </span>
                        <span>
                          · {q.marks} marks · min {Math.round(q.minTimeSeconds / 60)} min
                        </span>
                        {q.isMandatory && <span className="text-amber-600 dark:text-amber-400">(mandatory, min 3)</span>}
                      </summary>
                      <div className="mt-2 space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-400">
                        <p>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Question: </span>
                          {q.questionText}
                        </p>
                        <p>
                          <span className="font-medium text-slate-700 dark:text-slate-300">Expectations (what we're listening for): </span>
                          {q.listeningCriteria}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ),
          )
        )}
      </CardBody>
    </Card>
  );
}

function ImportSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{
    totalRows: number;
    validRows: { rowNumber: number; email: string; fullName: string; resumeLink?: string; batch?: string }[];
    errors: { rowNumber: number; message: string }[];
    warnings: { rowNumber: number; message: string }[];
  } | null>(null);
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
    <Card>
      <CardHeader icon="upload" title="Bulk Upload Students (CSV/XLSX)" subtitle="Validated before anything is written." />
      <CardBody className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Recognized columns include email, full name, campus, growth coach (name and/or "Growth Coach Email"), batch/year, chosen
          project, and a resume Google Drive link (any of "Resume Link", "Resume Google Drive Link", "Resume"). A campus or growth coach
          that isn't already in the system is added automatically (marked inactive) rather than left blank — review it here afterward.
          An existing student's blank fields get filled in from the file too, rather than being skipped outright.
        </p>
        <Field label="Enroll into cohort" hint="Optional — applies to every row committed">
          <Select className="w-64" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
            <option value="">—</option>
            {cohorts?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <label className="group flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-7 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/40 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-brand-500 dark:hover:bg-brand-500/10">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-xs ring-1 ring-inset ring-slate-200 transition-colors group-hover:text-brand-600 group-hover:ring-brand-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700 dark:group-hover:text-brand-400 dark:group-hover:ring-brand-500/30">
            <Icon name="upload" size={18} />
          </span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {previewMutation.isPending ? "Reading file…" : "Choose a CSV or XLSX file"}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Nothing is saved until you commit the preview.</span>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx"
            className="sr-only"
            onChange={(e) => {
              setError(null);
              setResult(null);
              const file = e.target.files?.[0];
              if (file) previewMutation.mutate(file);
            }}
          />
        </label>
        {preview && (
          <div className="animate-fade-in space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success" dot>
                {preview.validRows.length} of {preview.totalRows} rows valid
              </Badge>
              {preview.errors.length > 0 && (
                <Badge tone="danger" dot>
                  {preview.errors.length} error{preview.errors.length === 1 ? "" : "s"}
                </Badge>
              )}
              {preview.warnings.length > 0 && (
                <Badge tone="warning" dot>
                  {preview.warnings.length} warning{preview.warnings.length === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
            {(preview.errors.length > 0 || preview.warnings.length > 0) && (
              <div className="space-y-1 rounded-md bg-slate-50 p-2.5 dark:bg-slate-800/60">
                {preview.errors.slice(0, 5).map((e, i) => (
                  <p key={`e${i}`} className="text-xs text-rose-600 dark:text-rose-400">
                    <span className="font-semibold tabular">Row {e.rowNumber}:</span> {e.message}
                  </p>
                ))}
                {preview.warnings.slice(0, 5).map((w, i) => (
                  <p key={`w${i}`} className="text-xs text-amber-700 dark:text-amber-400">
                    <span className="font-semibold tabular">Row {w.rowNumber}:</span> {w.message}
                  </p>
                ))}
              </div>
            )}
            <Button
              size="sm"
              icon="check"
              onClick={() => commitMutation.mutate()}
              loading={commitMutation.isPending}
              disabled={preview.validRows.length === 0}
            >
              Commit {preview.validRows.length} Valid Rows
            </Button>
          </div>
        )}
        {result && (
          <div className="animate-fade-in space-y-2">
            <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
              <Icon name="checkCircle" size={16} className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
              <span>
                Imported {result.created} new student(s), {result.updatedExisting} existing record(s) filled in,{" "}
                {result.skippedExisting} already on file with nothing new to add.
                {cohortId && ` ${result.enrolled} added to the cohort, ${result.alreadyInCohort} already in it.`}
              </span>
            </div>
            {result.warnings.length > 0 && (
              <div className="space-y-1 rounded-lg bg-amber-50 p-3 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-semibold tabular">Row {w.rowNumber}:</span> {w.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function ExportSection() {
  const EXPORTS: { label: string; path: string; file: string; icon: IconName }[] = [
    { label: "Students", path: "/export/students", file: "students.csv", icon: "students" },
    { label: "Interviews", path: "/export/interviews", file: "interviews.csv", icon: "video" },
    { label: "Deliverables", path: "/export/deliverables", file: "deliverables.csv", icon: "clipboard" },
    { label: "History", path: "/export/history", file: "history.csv", icon: "history" },
  ];

  return (
    <Card>
      <CardHeader icon="external" title="Export Data" subtitle="Download a CSV snapshot of any dataset." />
      <CardBody>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {EXPORTS.map((x) => (
            <button
              key={x.path}
              type="button"
              onClick={() => downloadExport(x.path, { format: "csv" }, x.file)}
              className="group flex flex-col items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-4 text-center shadow-xs transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-500/50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:ring-brand-100 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700 dark:group-hover:bg-brand-500/10 dark:group-hover:text-brand-400 dark:group-hover:ring-brand-500/30">
                <Icon name={x.icon} size={17} />
              </span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{x.label}</span>
              <span className="text-2xs uppercase tracking-wider text-slate-400 dark:text-slate-500">CSV</span>
            </button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
