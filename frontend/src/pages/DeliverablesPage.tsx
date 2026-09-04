import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { archiveDeliverableTemplate, createDeliverableTemplate, fetchDeliverableTemplates } from "../lib/queries";
import { apiErrorMessage } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Field, Input, Select, Textarea } from "../components/ui/Form";
import { ErrorBanner, Spinner } from "../components/ui/Feedback";
import { Badge } from "../components/ui/Badge";

interface DeliverableTemplate {
  id: string;
  key: string;
  title: string;
  gapAddressed: string;
  track: string;
  active: boolean;
  submissionType: string;
  estimatedTime: string | null;
}

export function DeliverablesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<DeliverableTemplate[]>({ queryKey: ["deliverable-templates-all"], queryFn: () => fetchDeliverableTemplates() });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveDeliverableTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deliverable-templates-all"] }),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Deliverable Templates</h1>
          <p className="text-sm text-slate-500">Reusable A2 / Track B development tasks. Editing a template never changes past assignments.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>New Template</Button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          {data?.map((t) => (
            <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{t.title}</span>
                <div className="flex items-center gap-2">
                  <Badge tone={t.track === "A2" ? "warning" : t.track === "B" ? "danger" : "neutral"}>{t.track}</Badge>
                  {!t.active && <Badge>Archived</Badge>}
                  {t.active && (
                    <Button size="sm" variant="secondary" onClick={() => archiveMutation.mutate(t.id)}>
                      Archive
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-600">{t.gapAddressed}</p>
              <p className="mt-1 text-xs text-slate-400">
                {t.submissionType} · {t.estimatedTime ?? "no estimate"}
              </p>
            </div>
          ))}
          {data?.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No templates yet.</p>}
        </div>
      )}

      {showCreate && (
        <CreateTemplateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["deliverable-templates-all"] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function CreateTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    key: "",
    title: "",
    gapAddressed: "",
    whatStudentMustDo: "",
    expectedOutcome: "",
    submissionType: "REPOSITORY",
    submissionRequired: "",
    verificationCriteria: "",
    estimatedTime: "",
    track: "BOTH",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createDeliverableTemplate(form),
    onSuccess: onCreated,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Modal open onClose={onClose} title="New Deliverable Template" width="max-w-2xl">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Key"><Input required value={form.key} onChange={(e) => set("key", e.target.value)} placeholder="UNIQUE_KEY" /></Field>
          <Field label="Track">
            <Select value={form.track} onChange={(e) => set("track", e.target.value)}>
              <option value="BOTH">Both A2 & B</option>
              <option value="A2">A2 only</option>
              <option value="B">Track B only</option>
            </Select>
          </Field>
        </div>
        <Field label="Title"><Input required value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Gap being addressed"><Textarea required rows={2} value={form.gapAddressed} onChange={(e) => set("gapAddressed", e.target.value)} /></Field>
        <Field label="What the student must do"><Textarea required rows={2} value={form.whatStudentMustDo} onChange={(e) => set("whatStudentMustDo", e.target.value)} /></Field>
        <Field label="Expected outcome"><Textarea required rows={2} value={form.expectedOutcome} onChange={(e) => set("expectedOutcome", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Submission type">
            <Select value={form.submissionType} onChange={(e) => set("submissionType", e.target.value)}>
              {["LINK", "TEXT", "REPOSITORY", "DOCUMENT_URL", "VIDEO_URL", "FILE_METADATA", "OTHER_URL"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Estimated time" hint="e.g. 6 hours"><Input value={form.estimatedTime} onChange={(e) => set("estimatedTime", e.target.value)} /></Field>
        </div>
        <Field label="Submission required" hint="Exactly what must be submitted"><Textarea required rows={2} value={form.submissionRequired} onChange={(e) => set("submissionRequired", e.target.value)} /></Field>
        <Field label="Verification criteria"><Textarea required rows={2} value={form.verificationCriteria} onChange={(e) => set("verificationCriteria", e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Creating…" : "Create Template"}</Button>
        </div>
      </form>
    </Modal>
  );
}
