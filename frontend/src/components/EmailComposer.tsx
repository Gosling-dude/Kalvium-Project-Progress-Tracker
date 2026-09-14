// Shared "preview -> edit -> send" widget reused by every workflow email
// action (resume result, video questions/result, interview result, A2/Track B
// deliverables). Keeps emails per-workflow (each caller passes its own
// template key and prefilled variables) while sharing one send mechanism —
// spec section 19: "not one vague centralized system," but no duplicated
// send logic either.
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchEmailTemplates, previewEmail, sendEmail } from "../lib/queries";
import { apiErrorMessage } from "../lib/api";
import { Button } from "./ui/Button";
import { Field, Input, Select } from "./ui/Form";
import { ErrorBanner } from "./ui/Feedback";
import { Icon } from "./ui/Icon";

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  variables: string;
  active: boolean;
}

export function EmailComposer({
  student,
  defaultTemplateKey,
  lockTemplate = false,
  defaultVariables = {},
  relatedEntityType,
  relatedEntityId,
  triggerLabel = "Send Email",
  onSent,
}: {
  student: { id: string; email: string; fullName: string };
  defaultTemplateKey?: string;
  lockTemplate?: boolean;
  defaultVariables?: Record<string, string>;
  relatedEntityType?: string;
  relatedEntityId?: string;
  triggerLabel?: string;
  onSent?: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="secondary" size="sm" icon="mail" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
    );
  }
  return (
    <ComposeForm
      student={student}
      defaultTemplateKey={defaultTemplateKey}
      lockTemplate={lockTemplate}
      defaultVariables={defaultVariables}
      relatedEntityType={relatedEntityType}
      relatedEntityId={relatedEntityId}
      onDone={() => {
        setOpen(false);
        onSent?.();
      }}
      onCancel={() => setOpen(false)}
    />
  );
}

function ComposeForm({
  student,
  defaultTemplateKey,
  lockTemplate,
  defaultVariables,
  relatedEntityType,
  relatedEntityId,
  onDone,
  onCancel,
}: {
  student: { id: string; email: string; fullName: string };
  defaultTemplateKey?: string;
  lockTemplate: boolean;
  defaultVariables: Record<string, string>;
  relatedEntityType?: string;
  relatedEntityId?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { data: templates } = useQuery<EmailTemplate[]>({ queryKey: ["email-templates"], queryFn: fetchEmailTemplates });
  const [templateKey, setTemplateKey] = useState(defaultTemplateKey ?? "");
  const [variables, setVariables] = useState<Record<string, string>>({ studentName: student.fullName, ...defaultVariables });
  const [subject, setSubject] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const template = templates?.find((t) => t.key === templateKey);
  const variableNames: string[] = template ? JSON.parse(template.variables) : [];

  const previewMutation = useMutation({
    mutationFn: () => previewEmail({ templateKey, recipients: [{ studentId: student.id, emailAddress: student.email, variables }] }),
    onSuccess: (result) => {
      setSubject(result.subject);
      setBody(result.recipients[0].body);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      sendEmail({
        templateKey,
        subjectOverride: subject,
        recipients: [{ studentId: student.id, emailAddress: student.email, variables, bodyOverride: body }],
        relatedEntityType,
        relatedEntityId,
      }),
    onSuccess: onDone,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div className="surface animate-fade-in w-full p-4 ring-1 ring-brand-100 dark:ring-brand-500/30">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30">
          <Icon name="mail" size={13} />
        </span>
        Compose email
      </p>
      {error && <div className="mb-2"><ErrorBanner message={error} /></div>}
      {!lockTemplate && (
        <Field label="Template">
          <Select
            value={templateKey}
            onChange={(e) => {
              setTemplateKey(e.target.value);
              setSubject(null);
              setBody(null);
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
      )}

      {template && !body && (
        <div className="mt-3 space-y-2">
          {variableNames.map((name) => (
            <Field key={name} label={name}>
              <Input value={variables[name] ?? ""} onChange={(e) => setVariables((prev) => ({ ...prev, [name]: e.target.value }))} />
            </Field>
          ))}
          <Button variant="secondary" onClick={() => previewMutation.mutate()} loading={previewMutation.isPending}>
            Preview
          </Button>
        </div>
      )}

      {body !== null && (
        <div className="mt-4 space-y-3">
          <p className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 ring-1 ring-inset ring-slate-200/70 dark:bg-slate-800/60 dark:text-slate-400 dark:ring-slate-700">
            <span className="font-semibold text-slate-500 dark:text-slate-400">To:</span>
            <span className="truncate font-medium text-slate-800 dark:text-slate-200">{student.email}</span>
          </p>
          <Field label="Subject" required>
            <Input value={subject ?? ""} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Body" hint="Edit freely before sending — this is exactly what gets sent.">
            <Textarea8 value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button icon="mail" onClick={() => sendMutation.mutate()} loading={sendMutation.isPending}>
              {sendMutation.isPending ? "Sending…" : "Confirm & Send"}
            </Button>
          </div>
        </div>
      )}

      {!template && (
        <div className="mt-3 flex justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

// A taller textarea for editable HTML email bodies (includes tables for
// deliverable-assignment emails) — kept local since no other form needs this height.
function Textarea8({ value, onChange }: { value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }) {
  return (
    <textarea
      rows={8}
      value={value}
      onChange={onChange}
      className="block w-full resize-y rounded-md border-0 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-slate-900 shadow-xs ring-1 ring-inset ring-slate-300 transition-shadow hover:ring-slate-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:hover:ring-slate-500"
    />
  );
}
