import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createCohort, fetchCohorts } from "../lib/queries";
import { Cohort } from "../types";
import { Button } from "../components/ui/Button";
import { Table } from "../components/ui/Table";
import { TableSkeleton, ErrorBanner } from "../components/ui/Feedback";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Field, Input, Textarea } from "../components/ui/Form";
import { PageContainer, PageHeader } from "../components/ui/Page";
import { Icon } from "../components/ui/Icon";
import { apiErrorMessage } from "../lib/api";

export function CohortsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const { data: cohorts, isLoading } = useQuery<Cohort[]>({ queryKey: ["cohorts"], queryFn: () => fetchCohorts() });

  const activeCount = cohorts?.filter((c) => c.status === "ACTIVE").length ?? 0;
  const totalStudents = cohorts?.reduce((sum, c) => sum + (c.activeStudentCount ?? 0), 0) ?? 0;

  return (
    <PageContainer>
      <PageHeader
        icon="cohorts"
        title="Cohorts"
        description="Program cycles. Students belong to a cohort with full historical enrollment."
        meta={
          cohorts &&
          cohorts.length > 0 && (
            <>
              <Badge tone="success" dot>
                {activeCount} active
              </Badge>
              <Badge tone="neutral">{cohorts.length} total</Badge>
              <Badge tone="info">{totalStudents} enrolled students</Badge>
            </>
          )
        }
        actions={
          <Button icon="plus" onClick={() => setShowCreate(true)}>
            New Cohort
          </Button>
        }
      />

      <div className="surface">
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          <Table
            rows={cohorts ?? []}
            rowKey={(c) => c.id}
            onRowClick={(c) => navigate(`/cohorts/${c.id}`)}
            emptyMessage="No cohorts yet. Create the first one to start enrolling students."
            columns={[
              {
                header: "Name",
                render: (c) => (
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/30">
                      <Icon name="layers" size={14} />
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{c.name}</span>
                  </span>
                ),
              },
              {
                header: "Code",
                render: (c) => (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {c.code}
                  </span>
                ),
              },
              {
                header: "Active students",
                render: (c) => (
                  <span className="font-medium tabular text-slate-900 dark:text-slate-100">{c.activeStudentCount ?? 0}</span>
                ),
              },
              {
                header: "Status",
                render: (c) => (
                  <Badge tone={c.status === "ACTIVE" ? "success" : "neutral"} dot>
                    {c.status}
                  </Badge>
                ),
              },
              {
                header: "",
                className: "w-10 text-right text-slate-300 dark:text-slate-700",
                render: () => <Icon name="chevronRight" size={15} />,
              },
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
    </PageContainer>
  );
}

function CreateCohortModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createCohort({ name, code, description: description || undefined }),
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
        <Field label="Name" required>
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="SPE 2024 Batch 3" />
        </Field>
        <Field label="Code" required hint="A short unique identifier used across reports.">
          <Input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="SPE-2024-B3" />
        </Field>
        <Field label="Description" hint="Optional">
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create Cohort"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
