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
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
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
          <Button variant="secondary" onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending}>
            Preview
          </Button>
        </div>
      )}

      {body !== null && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500">To: {student.email}</p>
          <Field label="Subject">
            <Input value={subject ?? ""} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Body" hint="Edit freely before sending — this is exactly what gets sent.">
            <Textarea8 value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
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
      className="block w-full rounded-md border-0 px-3 py-1.5 font-mono text-xs text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600"
    />
  );
}
