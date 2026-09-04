import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createStudent, fetchCampuses, fetchCohorts, fetchGrowthCoaches, fetchStudents } from "../lib/queries";
import { Student, Campus, Cohort, GrowthCoach, Pagination } from "../types";
import { Button } from "../components/ui/Button";
import { Table, Pager } from "../components/ui/Table";
import { Spinner, ErrorBanner } from "../components/ui/Feedback";
import { Badge, ProgramStatusBadge, TrackBadge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Field, Input, Select } from "../components/ui/Form";
import { apiErrorMessage } from "../lib/api";

export function StudentsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const search = params.get("search") ?? "";
  const track = params.get("track") ?? "";
  const programStatus = params.get("programStatus") ?? "";
  const cohortId = params.get("cohortId") ?? "";
  const page = Number(params.get("page") ?? "1");

  const { data: cohorts } = useQuery<Cohort[]>({ queryKey: ["cohorts"], queryFn: () => fetchCohorts() });

  const { data, isLoading } = useQuery<{ data: Student[]; pagination: Pagination }>({
    queryKey: ["students", { search, track, programStatus, cohortId, page }],
    queryFn: () =>
      fetchStudents({
        search: search || undefined,
        track: track || undefined,
        programStatus: programStatus || undefined,
        cohortId: cohortId || undefined,
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

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Students</h1>
          <p className="text-sm text-slate-500">Search, filter, and open a student's full journey.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>New Student</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search name, email, or project…"
          className="max-w-xs"
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
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <Spinner />
        ) : (
          <>
            <Table
              rows={data?.data ?? []}
              rowKey={(s) => s.id}
              onRowClick={(s) => navigate(`/students/${s.id}`)}
              emptyMessage="No students match these filters."
              columns={[
                { header: "Name", render: (s) => <span className="font-medium text-slate-900">{s.fullName}</span> },
                { header: "Email", render: (s) => s.email },
                { header: "Cohort", render: (s) => s.currentCohort?.name ?? "—" },
                { header: "Track", render: (s) => <TrackBadge track={s.currentTrack} /> },
                { header: "Stage", render: (s) => s.currentStage.replace(/_/g, " ") },
                { header: "Status", render: (s) => <ProgramStatusBadge status={s.programStatus} /> },
                { header: "Flags", render: (s) => (s.openFlagCount ? <Badge tone="danger">{s.openFlagCount} open</Badge> : "—") },
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
            setShowCreate(false);
            navigate(`/students/${id}`);
          }}
        />
      )}
    </div>
  );
}

function CreateStudentModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [campusId, setCampusId] = useState("");
  const [growthCoachId, setGrowthCoachId] = useState("");
  const [cohortId, setCohortId] = useState("");
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
        chosenProject: chosenProject || undefined,
      }),
    onSuccess: (student: Student) => onCreated(student.id),
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Modal open onClose={onClose} title="New Student">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        {error && <ErrorBanner message={error} />}
        <Field label="Full name">
          <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Chosen project" hint="Optional">
          <Input value={chosenProject} onChange={(e) => setChosenProject(e.target.value)} />
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
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create Student"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
