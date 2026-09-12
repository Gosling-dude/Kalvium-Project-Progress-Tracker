import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchEmailEvents, fetchEmailTemplates, updateEmailTemplate } from "../lib/queries";
import { Button } from "../components/ui/Button";
import { Textarea, Input, Field } from "../components/ui/Form";
import { Badge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Feedback";

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

export function EmailsPage() {
  const [tab, setTab] = useState<"templates" | "log">("templates");
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Emails</h1>
        <p className="text-sm text-slate-500">Templates and the full send log — every attempt is recorded, never assumed.</p>
      </div>
      <div className="flex gap-1 border-b border-slate-200">
        {(["templates", "log"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium ${tab === t ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500"}`}
          >
            {t === "templates" ? "Templates" : "Send Log"}
          </button>
        ))}
      </div>
      {tab === "templates" ? <TemplatesPanel /> : <LogPanel />}
    </div>
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

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-2">
      {data?.map((t) => (
        <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-900">{t.name}</span>
            <div className="flex items-center gap-2">
              <Badge>{t.key}</Badge>
              <Badge tone={t.active ? "success" : "neutral"}>v{t.version}</Badge>
              <Button size="sm" variant="secondary" onClick={() => setEditing(t)}>
                Edit
              </Button>
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-600">{t.subject}</p>
        </div>
      ))}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16">
          <div className="w-full max-w-2xl rounded-lg bg-white p-4 shadow-xl">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Edit {editing.name}</h2>
            <div className="space-y-3">
              <Field label="Subject">
                <Input value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
              </Field>
              <Field label="Body (HTML)" hint={`Variables: ${JSON.parse(editing.variables).join(", ")}`}>
                <Textarea rows={8} value={editing.bodyHtml} onChange={(e) => setEditing({ ...editing, bodyHtml: e.target.value })} />
              </Field>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={() => mutation.mutate({ id: editing.id, subject: editing.subject, bodyHtml: editing.bodyHtml })} disabled={mutation.isPending}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LogPanel() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ["email-events", page], queryFn: () => fetchEmailEvents(page) });

  if (isLoading) return <Spinner />;

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <tbody className="divide-y divide-slate-100">
            {data?.data.map((e: { id: string; template?: { name: string }; templateKeySnapshot: string; status: string; recipients: unknown[]; createdAt: string; triggeredBy?: { name: string } }) => (
              <tr key={e.id}>
                <td className="max-w-[220px] truncate px-4 py-2.5 font-medium text-slate-800" title={e.template?.name ?? e.templateKeySnapshot}>
                  {e.template?.name ?? e.templateKeySnapshot}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{e.recipients.length} recipient(s)</td>
                <td className="whitespace-nowrap px-4 py-2.5"><Badge tone={e.status === "SENT" ? "success" : e.status === "FAILED" ? "danger" : "warning"}>{e.status}</Badge></td>
                <td className="max-w-[140px] truncate px-4 py-2.5 text-slate-500" title={e.triggeredBy?.name ?? ""}>{e.triggeredBy?.name}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-400">{new Date(e.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {data?.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No emails sent yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex justify-end gap-2 border-t border-slate-100 px-3 py-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40">
            Previous
          </button>
          <button disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
