import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createCohort, fetchCampuses, fetchCohorts } from "../lib/queries";
import { Cohort, Campus } from "../types";
import { Button } from "../components/ui/Button";
import { Table } from "../components/ui/Table";
import { Spinner, ErrorBanner } from "../components/ui/Feedback";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Field, Input, Select, Textarea } from "../components/ui/Form";
import { apiErrorMessage } from "../lib/api";

export function CohortsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const { data: cohorts, isLoading } = useQuery<Cohort[]>({ queryKey: ["cohorts"], queryFn: () => fetchCohorts() });

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cohorts</h1>
          <p className="text-sm text-slate-500">Program cycles. Students belong to a cohort with full historical enrollment.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>New Cohort</Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <Spinner />
        ) : (
          <Table
            rows={cohorts ?? []}
            rowKey={(c) => c.id}
            onRowClick={(c) => navigate(`/cohorts/${c.id}`)}
            emptyMessage="No cohorts yet. Create the first one to start enrolling students."
            columns={[
              { header: "Name", render: (c) => <span className="font-medium text-slate-900">{c.name}</span> },
              { header: "Code", render: (c) => c.code },
              { header: "Campus", render: (c) => c.campus?.name ?? "—" },
              { header: "Active students", render: (c) => c.activeStudentCount ?? 0 },
              { header: "Status", render: (c) => <Badge tone={c.status === "ACTIVE" ? "success" : "neutral"}>{c.status}</Badge> },
            ]}
          />
        )}
      </div>

      {showCreate && (
        <CreateCohortModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["cohorts"] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function CreateCohortModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [campusId, setCampusId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: campuses } = useQuery<Campus[]>({ queryKey: ["campuses"], queryFn: () => fetchCampuses() });
  const mutation = useMutation({
    mutationFn: () => createCohort({ name, code, campusId: campusId || undefined, description: description || undefined }),
    onSuccess: onCreated,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Modal open onClose={onClose} title="New Cohort">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        {error && <ErrorBanner message={error} />}
        <Field label="Name">
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="SPE 2024 Batch 3" />
        </Field>
        <Field label="Code">
          <Input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="SPE-2024-B3" />
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
        <Field label="Description" hint="Optional">
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create Cohort"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
