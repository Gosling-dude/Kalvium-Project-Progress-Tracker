import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchEmailTemplates, previewEmail, sendEmail } from "../../lib/queries";
import { apiErrorMessage } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select } from "../../components/ui/Form";
import { ErrorBanner, EmptyState } from "../../components/ui/Feedback";
import { Badge } from "../../components/ui/Badge";
import { Student } from "../../types";

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  variables: string;
  active: boolean;
}
interface EmailHistoryRow {
  id: string;
  status: string;
  sentAt: string | null;
  emailEvent: { template?: { name: string } | null; templateKeySnapshot: string; createdAt: string };
}

export function EmailsTab({ student, emailHistory }: { student: Student; emailHistory: EmailHistoryRow[] }) {
  const [showCompose, setShowCompose] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCompose((v) => !v)}>{showCompose ? "Cancel" : "Send Email"}</Button>
      </div>
      {showCompose && <ComposeForm student={student} onDone={() => setShowCompose(false)} />}

      {emailHistory.length === 0 ? (
        <EmptyState title="No emails sent yet" />
      ) : (
        <div className="space-y-2">
          {emailHistory.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border border-slate-100 p-3 text-sm">
              <span>{r.emailEvent.template?.name ?? r.emailEvent.templateKeySnapshot}</span>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Badge tone={r.status === "SENT" ? "success" : r.status === "FAILED" ? "danger" : "neutral"}>{r.status}</Badge>
                {r.sentAt && new Date(r.sentAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ComposeForm({ student, onDone }: { student: Student; onDone: () => void }) {
  const { data: templates } = useQuery<EmailTemplate[]>({ queryKey: ["email-templates"], queryFn: fetchEmailTemplates });
  const [templateKey, setTemplateKey] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({ studentName: student.fullName });
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const template = templates?.find((t) => t.key === templateKey);
  const variableNames: string[] = template ? JSON.parse(template.variables) : [];

  const previewMutation = useMutation({
    mutationFn: () =>
      previewEmail({ templateKey, recipients: [{ studentId: student.id, emailAddress: student.email, variables }] }),
    onSuccess: (result) => setPreview({ subject: result.subject, body: result.recipients[0].body }),
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendEmail({ templateKey, recipients: [{ studentId: student.id, emailAddress: student.email, variables }] }),
    onSuccess: onDone,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {error && <div className="mb-2"><ErrorBanner message={error} /></div>}
      <Field label="Template">
        <Select
          value={templateKey}
          onChange={(e) => {
            setTemplateKey(e.target.value);
            setPreview(null);
          }}
        >
          <option value="">Select a template…</option>
          {templates?.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>

      {template && (
        <div className="mt-3 space-y-2">
          {variableNames.map((name) => (
            <Field key={name} label={name}>
              <Input
                value={variables[name] ?? ""}
                onChange={(e) => setVariables((prev) => ({ ...prev, [name]: e.target.value }))}
              />
            </Field>
          ))}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending}>
              Preview
            </Button>
          </div>
        </div>
      )}

      {preview && (
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-500">To: {student.email}</p>
          <p className="text-sm font-semibold text-slate-900">{preview.subject}</p>
          <div className="mt-2 text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: preview.body }} />
          <div className="mt-3 flex justify-end">
            <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
              Confirm & Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
