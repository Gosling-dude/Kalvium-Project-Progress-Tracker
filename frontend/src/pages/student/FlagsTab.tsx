import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFlag, fetchUsers, resolveFlag } from "../../lib/queries";
import { apiErrorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Form";
import { ErrorBanner, EmptyState } from "../../components/ui/Feedback";
import { SeverityBadge, Badge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { Student, Flag, User } from "../../types";

const CATEGORIES = [
  "TRANSCRIPT_CONCERN",
  "SUSPICIOUS_SUBMISSION",
  "MANIPULATED_EVIDENCE",
  "PLAGIARISM_CONCERN",
  "OWNERSHIP_CONCERN",
  "INVALID_LINK",
  "UNEXPLAINED_DOCUMENT",
  "OTHER",
];

export function FlagsTab({ student, flags, onChanged }: { student: Student; flags: Flag[]; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();
  // Raising/resolving flags is an Admin action (spec section 15); a Growth
  // Coach viewing this tab sees flags on their student but can't create them.
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button
            variant={showForm ? "secondary" : "danger"}
            icon={showForm ? "close" : "flag"}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Cancel" : "Raise Flag"}
          </Button>
        </div>
      )}
      {showForm && (
        <div className="animate-fade-in">
          <CreateFlagForm studentId={student.id} onDone={() => { setShowForm(false); onChanged(); }} />
        </div>
      )}

      {flags.length === 0 && !showForm ? (
        <div className="surface">
          <EmptyState
            icon="checkCircle"
            title="No flags"
            description="Concerns raised about this student will appear here."
          />
        </div>
      ) : (
        <div className="space-y-2">
          {flags.map((f) => (
            <FlagRow key={f.id} flag={f} isAdmin={isAdmin} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateFlagForm({ studentId, onDone }: { studentId: string; onDone: () => void }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [severity, setSeverity] = useState("MEDIUM");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data: admins } = useQuery<User[]>({ queryKey: ["users", "ADMIN"], queryFn: () => fetchUsers("ADMIN") });

  const mutation = useMutation({
    mutationFn: () => createFlag({ studentId, category, severity, title, description, assignedToId: assignedToId || undefined }),
    onSuccess: onDone,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-4">
      {error && <div className="mb-2"><ErrorBanner message={error} /></div>}
      <div className="space-y-3">
        <div className="flex gap-3">
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Severity">
            <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </Select>
          </Field>
          <Field label="Assign to" hint="So it appears in that admin's Tasks">
            <Select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
              <option value="">Unassigned</option>
              {admins?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Description" hint="Explain the concern with specifics">
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Button variant="danger" onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!title || description.length < 10}>
          Raise Flag
        </Button>
      </div>
    </div>
  );
}

function FlagRow({ flag, isAdmin, onChanged }: { flag: Flag; isAdmin: boolean; onChanged: () => void }) {
  const [note, setNote] = useState("");
  const mutation = useMutation({ mutationFn: () => resolveFlag(flag.id, note), onSuccess: onChanged });

  return (
    <div
      className={`surface p-3.5 text-sm ${
        flag.status === "OPEN" ? "border-l-[3px] border-l-rose-400" : "border-l-[3px] border-l-emerald-400"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="min-w-0 font-medium text-slate-900">{flag.title}</span>
        <div className="flex shrink-0 items-center gap-2">
          <SeverityBadge severity={flag.severity} />
          <Badge tone={flag.status === "OPEN" ? "danger" : "success"} dot>
            {flag.status}
          </Badge>
        </div>
      </div>
      <p className="mt-1.5 leading-relaxed text-slate-600">{flag.description}</p>
      <p className="mt-2 text-xs text-slate-400">
        {flag.category.replace(/_/g, " ")} · raised by {flag.createdBy?.name} on {new Date(flag.createdAt).toLocaleDateString()}
        {flag.assignedTo && ` · assigned to ${flag.assignedTo.name}`}
      </p>
      {flag.status === "OPEN" ? (
        isAdmin && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <Input className="max-w-xs" placeholder="Resolution note" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button size="sm" variant="secondary" icon="check" onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!note}>
              Resolve
            </Button>
          </div>
        )
      ) : (
        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800 ring-1 ring-inset ring-emerald-100">
          <Icon name="checkCircle" size={13} className="mt-px shrink-0 text-emerald-500" />
          <span>Resolved: {flag.resolutionNote}</span>
        </p>
      )}
    </div>
  );
}
