import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchEmailEvents, fetchEmailTemplates, updateEmailTemplate } from "../lib/queries";
import { Button } from "../components/ui/Button";
import { Textarea, Input, Field } from "../components/ui/Form";
import { Badge } from "../components/ui/Badge";
import { Spinner, EmptyState, TableSkeleton } from "../components/ui/Feedback";
import { Modal } from "../components/ui/Modal";
import { Pager } from "../components/ui/Table";
import { PageContainer, PageHeader, Tabs } from "../components/ui/Page";
import { Icon } from "../components/ui/Icon";

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  bodyHtml: string;
  variables: string;
  active: boolean;
  version: number;
}

const TABS = ["Templates", "Send Log"] as const;

export function EmailsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Templates");
  return (
    <PageContainer width="max-w-5xl">
      <PageHeader
        icon="mail"
        title="Emails"
        description="Templates and the full send log — every attempt is recorded, never assumed."
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <div className="animate-fade-in" key={tab}>
        {tab === "Templates" ? <TemplatesPanel /> : <LogPanel />}
      </div>
    </PageContainer>
  );
}

function TemplatesPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<EmailTemplate[]>({ queryKey: ["email-templates"], queryFn: fetchEmailTemplates });
  const [editing, setEditing] = useState<EmailTemplate | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { id: string; subject: string; bodyHtml: string }) => updateEmailTemplate(input.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      setEditing(null);
    },
  });

  if (isLoading) return <Spinner label="Loading templates…" />;

  return (
    <div className="space-y-2.5">
      {data?.map((t) => (
        <div
          key={t.id}
          className="surface group flex flex-col gap-2 p-4 transition-all duration-200 ease-smooth hover:border-slate-300 hover:shadow-sm dark:hover:border-slate-600 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30">
              <Icon name="mail" size={15} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900 dark:text-slate-100">{t.name}</p>
              <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400" title={t.subject}>
                {t.subject}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-2xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {t.key}
            </span>
            <Badge tone={t.active ? "success" : "neutral"} dot>
              v{t.version}
            </Badge>
            <Button size="sm" variant="secondary" icon="edit" onClick={() => setEditing(t)}>
              Edit
            </Button>
          </div>
        </div>
      ))}

      {editing && (
        <Modal
          open
          onClose={() => setEditing(null)}
          title={`Edit ${editing.name}`}
          description="Saving publishes a new version; past sends keep the template they used."
          width="max-w-2xl"
        >
          <div className="space-y-4">
            <Field label="Subject" required>
              <Input value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
            </Field>
            <Field label="Body (HTML)" hint={`Available variables: ${JSON.parse(editing.variables).join(", ")}`} required>
              <Textarea
                rows={10}
                className="font-mono text-xs"
                value={editing.bodyHtml}
                onChange={(e) => setEditing({ ...editing, bodyHtml: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                icon="check"
                onClick={() => mutation.mutate({ id: editing.id, subject: editing.subject, bodyHtml: editing.bodyHtml })}
                loading={mutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function LogPanel() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ["email-events", page], queryFn: () => fetchEmailEvents(page) });

  if (isLoading)
    return (
      <div className="surface">
        <TableSkeleton rows={7} cols={5} />
      </div>
    );

  return (
    <div className="surface">
      {data?.data.length === 0 ? (
        <EmptyState
          icon="mail"
          title="No emails sent yet"
          description="Every send attempt from any workflow will be recorded here with its status."
        />
      ) : (
        <div className="scroll-soft overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="surface-header border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                {["Template", "Recipients", "Status", "Triggered by", "When"].map((h, i) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap bg-slate-50/90 px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-900/90 dark:text-slate-400 ${
                      i === 4 ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.data.map(
                (e: {
                  id: string;
                  template?: { name: string };
                  templateKeySnapshot: string;
                  status: string;
                  recipients: unknown[];
                  createdAt: string;
                  triggeredBy?: { name: string };
                }) => (
                  <tr key={e.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td
                      className="max-w-[220px] truncate px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200"
                      title={e.template?.name ?? e.templateKeySnapshot}
                    >
                      {e.template?.name ?? e.templateKeySnapshot}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular text-slate-500 dark:text-slate-400">
                      {e.recipients.length} recipient{e.recipients.length === 1 ? "" : "s"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <Badge tone={e.status === "SENT" ? "success" : e.status === "FAILED" ? "danger" : "warning"} dot>
                        {e.status}
                      </Badge>
                    </td>
                    <td
                      className="max-w-[140px] truncate px-4 py-2.5 text-slate-500 dark:text-slate-400"
                      title={e.triggeredBy?.name ?? ""}
                    >
                      {e.triggeredBy?.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-slate-400 dark:text-slate-500">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
      {data?.pagination && <Pager page={page} totalPages={data.pagination.totalPages} onChange={setPage} />}
    </div>
  );
}
