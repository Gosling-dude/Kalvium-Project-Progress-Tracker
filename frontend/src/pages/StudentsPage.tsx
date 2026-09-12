import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  createStudent,
  fetchCampuses,
  fetchCohorts,
  fetchGrowthCoaches,
  fetchProgramTrackSummary,
  fetchStudents,
} from "../lib/queries";
import { Student, Campus, Cohort, GrowthCoach, Pagination, ProgramTrackSummary } from "../types";
import { Button } from "../components/ui/Button";
import { Table, Pager } from "../components/ui/Table";
import { TableSkeleton, ErrorBanner } from "../components/ui/Feedback";
import { Badge, ProgramStatusBadge, TrackBadge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Field, Input, InputWithIcon, Select } from "../components/ui/Form";
import { PageContainer, PageHeader } from "../components/ui/Page";
import { Icon, IconName } from "../components/ui/Icon";
import { apiErrorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";

export function StudentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [params, setParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const search = params.get("search") ?? "";
  const track = params.get("track") ?? "";
  const programStatus = params.get("programStatus") ?? "";
  const cohortId = params.get("cohortId") ?? "";
  const batch = params.get("batch") ?? "";
  const page = Number(params.get("page") ?? "1");

  const { data: cohorts } = useQuery<Cohort[]>({ queryKey: ["cohorts"], queryFn: () => fetchCohorts() });

  const { data, isLoading } = useQuery<{ data: Student[]; pagination: Pagination }>({
    queryKey: ["students", { search, track, programStatus, cohortId, batch, page }],
    queryFn: () =>
      fetchStudents({
        search: search || undefined,
        track: track || undefined,
        programStatus: programStatus || undefined,
        cohortId: cohortId || undefined,
        batch: batch || undefined,
        page,
        pageSize: 20,
        sort: "updated",
      }),
  });

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
  }

  const activeFilterCount = [track, programStatus, cohortId, batch].filter(Boolean).length;

  // The batch box is deliberately uncontrolled (typing shouldn't fight the URL),
  // so clearing filters has to remount it for the emptied value to show.
  const [filterEpoch, setFilterEpoch] = useState(0);

  function clearFilters() {
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    setParams(next);
    setFilterEpoch((n) => n + 1);
  }

  return (
    <PageContainer>
      <PageHeader
        icon="students"
        title={isAdmin ? "Students" : "My Students"}
        description={
          isAdmin
            ? "Search, filter, and open a student's full journey. For bulk creation, see Settings → Bulk Upload."
            : "Students assigned to you. Open one to review deliverables, flags, and their full history."
        }
        actions={
          isAdmin && (
            <>
              <Link to="/settings">
                <Button variant="secondary" icon="upload">
                  Bulk Upload
                </Button>
              </Link>
              <Button icon="plus" onClick={() => setShowCreate(true)}>
                New Student
              </Button>
            </>
          )
        }
      />

      {isAdmin && <ProgramTrackPanel />}

      <div className="surface flex flex-wrap items-center gap-2 p-3">
        <InputWithIcon
          icon="search"
          placeholder="Search name, email, or project…"
          wrapperClassName="w-full sm:w-72"
          defaultValue={search}
          onChange={(e) => setParam("search", e.target.value)}
        />
        <Select className="w-auto" value={track} onChange={(e) => setParam("track", e.target.value)}>
          <option value="">All tracks</option>
          <option value="A">Track A</option>
          <option value="A1">Track A1</option>
          <option value="A2">Track A2</option>
          <option value="B">Track B</option>
        </Select>
        <Select className="w-auto" value={programStatus} onChange={(e) => setParam("programStatus", e.target.value)}>
          <option value="">All statuses</option>
          <option value="ONBOARDING">Onboarding</option>
          <option value="ACTIVE">Active</option>
          <option value="GRADUATED">Graduated</option>
          <option value="FUTURE_PIPELINE">Future Pipeline</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
        <Select className="w-auto" value={cohortId} onChange={(e) => setParam("cohortId", e.target.value)}>
          <option value="">All cohorts</option>
          {cohorts?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input
          key={`batch-${filterEpoch}`}
          placeholder="Batch (e.g. 2024)"
          className="w-36"
          defaultValue={batch}
          onChange={(e) => setParam("batch", e.target.value)}
        />
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <Icon name="close" size={13} />
            Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
          </button>
        )}
        {data?.pagination && (
          <span className="ml-auto pr-1 text-xs font-medium tabular text-slate-500">
            {data.pagination.total ?? data.data.length} result{(data.pagination.total ?? data.data.length) === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="surface">
        {isLoading ? (
          <TableSkeleton rows={8} cols={8} />
        ) : (
          <>
            <Table
              rows={data?.data ?? []}
              rowKey={(s) => s.id}
              onRowClick={(s) => navigate(`/students/${s.id}`)}
              emptyMessage="No students match these filters."
              columns={[
                {
                  header: "Name",
                  className: "max-w-[180px] truncate",
                  render: (s) => (
                    <span className="flex items-center gap-2.5" title={s.fullName}>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-brand-100 text-2xs font-bold text-brand-700 ring-1 ring-inset ring-brand-200/60">
                        {s.fullName
                          .trim()
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase() ?? "")
                          .join("")}
                      </span>
                      <span className="truncate font-medium text-slate-900">{s.fullName}</span>
                    </span>
                  ),
                },
                {
                  header: "Email",
                  className: "max-w-[200px] truncate",
                  render: (s) => <span title={s.email}>{s.email}</span>,
                },
                {
                  header: "Cohort",
                  className: "max-w-[140px] truncate",
                  render: (s) => <span title={s.currentCohort?.name ?? ""}>{s.currentCohort?.name ?? "—"}</span>,
                },
                { header: "Batch", render: (s) => s.batch ?? <span className="text-slate-300">—</span> },
                { header: "Track", render: (s) => <TrackBadge track={s.currentTrack} /> },
                {
                  header: "Stage",
                  render: (s) => <span className="text-xs font-medium text-slate-600">{s.currentStage.replace(/_/g, " ")}</span>,
                },
                { header: "Status", render: (s) => <ProgramStatusBadge status={s.programStatus} /> },
                {
                  header: "Flags",
                  render: (s) =>
                    s.openFlagCount ? <Badge tone="danger">{s.openFlagCount} open</Badge> : <span className="text-slate-300">—</span>,
                },
              ]}
            />
            {data?.pagination && (
              <Pager page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={(p) => setParam("page", String(p))} />
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateStudentModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
            // A new student changes the program totals too (they land in
            // "Not yet on a track"), so the panel has to be refetched.
            queryClient.invalidateQueries({ queryKey: ["program-track-summary"] });
            setShowCreate(false);
            navigate(`/students/${id}`);
          }}
        />
      )}
    </PageContainer>
  );
}

/** A label over a big number — the shape the plain cells in the strip share. */
function Stat({
  label,
  value,
  icon,
  toneClassName,
}: {
  label: string;
  value: number;
  icon: IconName;
  toneClassName: string;
}) {
  return (
    <>
      <span className={`flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider ${toneClassName}`}>
        <Icon name={icon} size={13} />
        {label}
      </span>
      <p className={`mt-1 text-2xl font-semibold tabular ${toneClassName}`}>{value}</p>
    </>
  );
}

/** One of the sub-track cells sitting side by side inside the Track A box. */
function MiniStat({ label, value, valueClassName }: { label: string; value: number; valueClassName: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-medium uppercase leading-tight tracking-wide text-slate-500">{label}</dt>
      <dd className={`text-base font-semibold tabular ${valueClassName}`}>{value}</dd>
    </div>
  );
}

/** A label/number line for the stacked totals cell. */
function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className="text-sm font-semibold tabular text-slate-900">{value}</dd>
    </div>
  );
}

// Since-inception totals for the whole program, as a horizontal strip above the
// filters so the roster below always has an unfiltered reference point over it.
//
// Admin-only, for two reasons: /dashboard/track-summary is an ADMIN route, and
// program-wide numbers sitting over a Growth Coach's own (server-filtered)
// students would read as though the two were describing the same population.
function ProgramTrackPanel() {
  const { data, isLoading, isError } = useQuery<ProgramTrackSummary>({
    queryKey: ["program-track-summary"],
    queryFn: fetchProgramTrackSummary,
  });

  // Five columns rather than four: Track A takes a double-width cell because it
  // is the only one carrying a nested breakdown, and squeezing A1/A2/no-sub-track
  // into a quarter of the row leaves all three unreadable at laptop widths.
  const gridClass = "grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-5";

  return (
    <section className="surface overflow-hidden">
      <div className="surface-header flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-200/80 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Icon name="trendUp" size={15} className="text-brand-600" />
          Program totals
        </h2>
        <p className="text-xs text-slate-500">All cohorts · since inception</p>
      </div>

      {isLoading ? (
        <div className={gridClass}>
          <div className="skeleton h-[5.25rem] w-full" />
          <div className="skeleton h-[5.25rem] w-full sm:col-span-2" />
          <div className="skeleton h-[5.25rem] w-full" />
          <div className="skeleton h-[5.25rem] w-full" />
        </div>
      ) : isError || !data ? (
        <p className="px-4 py-4 text-xs text-slate-500">Program totals are unavailable right now.</p>
      ) : (
        <div className={gridClass}>
          <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 px-3 py-2.5">
            <Stat label="Graduated" value={data.graduatedCount} icon="graduation" toneClassName="text-emerald-700" />
          </div>

          {/* Track A owns its sub-tracks, so A1/A2 are nested inside this cell
              rather than standing alongside it. The headline number is the
              roll-up (A + A1 + A2), matching each cohort's own dashboard. */}
          <div className="rounded-lg border border-blue-200/70 bg-blue-50/40 px-3 py-2.5 sm:col-span-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-blue-700">
                <Icon name="clipboard" size={13} />
                Track A
              </span>
              <span className="text-2xl font-semibold tabular text-blue-700">{data.trackACount}</span>
            </div>
            <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-blue-200/60 pt-2">
              <MiniStat label="Sub-track A1" value={data.trackABreakdown.a1} valueClassName="text-emerald-600" />
              <MiniStat label="Sub-track A2" value={data.trackABreakdown.a2} valueClassName="text-amber-600" />
              <MiniStat
                label="No sub-track yet"
                value={data.trackABreakdown.unassignedSubTrack}
                valueClassName="text-slate-500"
              />
            </dl>
          </div>

          <div className="rounded-lg border border-rose-200/70 bg-rose-50/40 px-3 py-2.5">
            <Stat label="Track B" value={data.trackBCount} icon="sparkle" toneClassName="text-rose-700" />
            <p className="mt-0.5 text-2xs text-rose-700/70">No sub-tracks.</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5">
            <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-slate-500">
              <Icon name="students" size={13} />
              Everyone
            </span>
            <dl className="mt-1.5 space-y-1">
              <CountRow label="Not yet on a track" value={data.notOnTrackCount} />
              <CountRow label="All students" value={data.totalStudents} />
            </dl>
          </div>
        </div>
      )}

      <p className="border-t border-slate-200/80 bg-slate-50/60 px-4 py-3 text-2xs leading-relaxed text-slate-500">
        Covers students across <strong className="font-semibold text-slate-600">all cohorts</strong> who have been part of the
        Project Defence track from the very start of the program until now — not just the current intake, and not affected by
        the filters or search below. A graduated student is counted only under Graduated, never also under the track they left.
      </p>
    </section>
  );
}

function CreateStudentModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [campusId, setCampusId] = useState("");
  const [growthCoachId, setGrowthCoachId] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [batch, setBatch] = useState("");
  const [resumeLink, setResumeLink] = useState("");
  const [chosenProject, setChosenProject] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: campuses } = useQuery<Campus[]>({ queryKey: ["campuses"], queryFn: () => fetchCampuses() });
  const { data: coaches } = useQuery<GrowthCoach[]>({ queryKey: ["growth-coaches"], queryFn: () => fetchGrowthCoaches() });
  const { data: cohorts } = useQuery<Cohort[]>({ queryKey: ["cohorts"], queryFn: () => fetchCohorts("ACTIVE") });

  const mutation = useMutation({
    mutationFn: () =>
      createStudent({
        fullName,
        email,
        campusId: campusId || undefined,
        growthCoachId: growthCoachId || undefined,
        cohortId: cohortId || undefined,
        batch: batch || undefined,
        resumeLink: resumeLink || undefined,
        chosenProject: chosenProject || undefined,
      }),
    onSuccess: (student: Student) => onCreated(student.id),
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Modal open onClose={onClose} title="New Student" description="Only name and email are required — everything else can be set later.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        {error && <ErrorBanner message={error} />}
        <Field label="Full name" required>
          <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Asha Menon" />
        </Field>
        <Field label="Email" required>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="asha@example.com" />
        </Field>
        <Field label="Chosen project" hint="Optional">
          <Input value={chosenProject} onChange={(e) => setChosenProject(e.target.value)} />
        </Field>
        <Field label="Batch / Year" hint="Optional, e.g. 2024">
          <Input value={batch} onChange={(e) => setBatch(e.target.value)} />
        </Field>
        <Field label="Resume Google Drive link" hint="Optional">
          <Input value={resumeLink} onChange={(e) => setResumeLink(e.target.value)} placeholder="https://drive.google.com/..." />
        </Field>
        <Field label="Campus" hint="Optional">
          <Select value={campusId} onChange={(e) => setCampusId(e.target.value)}>
            <option value="">—</option>
            {campuses?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Growth Coach" hint="Optional">
          <Select value={growthCoachId} onChange={(e) => setGrowthCoachId(e.target.value)}>
            <option value="">—</option>
            {coaches?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cohort" hint="Optional — can be assigned later">
          <Select value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
            <option value="">—</option>
            {cohorts?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create Student"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
