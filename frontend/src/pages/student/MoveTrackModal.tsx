import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { apiErrorMessage } from "../../lib/api";
import { Modal } from "../../components/ui/Modal";
import { Field, Input, Select, Textarea, Checkbox } from "../../components/ui/Form";
import { Button } from "../../components/ui/Button";
import { ErrorBanner } from "../../components/ui/Feedback";
import { Badge, ProgramStatusBadge, TrackBadge } from "../../components/ui/Badge";
import { Student } from "../../types";

const TRACK_STAGE_DEFAULT: Record<string, string> = {
  A: "VIDEO_ASSESSMENT",
  A1: "A1_INTENSIVE",
  A2: "A2_DEVELOPMENT",
  B: "B_DEVELOPMENT",
};

export function MoveTrackModal({ student, onClose, onDone }: { student: Student; onClose: () => void; onDone: () => void }) {
  const [toTrack, setToTrack] = useState<string>(student.currentTrack ?? "A");
  const [toStage, setToStage] = useState(TRACK_STAGE_DEFAULT[student.currentTrack ?? "A"]);
  const [toProgramStatus, setToProgramStatus] = useState<string>(student.programStatus);
  const [reason, setReason] = useState("");
  const [useOverride, setUseOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/students/${student.id}/track-transition`, {
        toTrack,
        toStage,
        toProgramStatus,
        reason,
        sourceType: useOverride ? "OVERRIDE" : "MANUAL",
        overrideReason: useOverride ? overrideReason : undefined,
      }),
    onSuccess: onDone,
    onError: (err) => {
      const message = apiErrorMessage(err);
      // If the server rejects a routine-move assumption, guide the admin to override deliberately.
      if (message.toLowerCase().includes("override")) setUseOverride(true);
      setError(message);
    },
  });

  return (
    <Modal open onClose={onClose} title="Move Student">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        {error && <ErrorBanner message={error} />}
        <div className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-200/70 dark:bg-slate-800/40 dark:ring-slate-700">
          <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Currently</p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5">
            <TrackBadge track={student.currentTrack} />
            <Badge tone="brand">{student.currentStage.replace(/_/g, " ")}</Badge>
            <ProgramStatusBadge status={student.programStatus} />
          </p>
        </div>
        <Field label="New track">
          <Select
            value={toTrack ?? ""}
            onChange={(e) => {
              setToTrack(e.target.value);
              setToStage(TRACK_STAGE_DEFAULT[e.target.value] ?? toStage);
            }}
          >
            <option value="A">Track A</option>
            <option value="A1">Track A1</option>
            <option value="A2">Track A2</option>
            <option value="B">Track B</option>
          </Select>
        </Field>
        <Field label="New stage">
          <Input value={toStage} onChange={(e) => setToStage(e.target.value)} />
        </Field>
        <Field label="Program status">
          <Select value={toProgramStatus} onChange={(e) => setToProgramStatus(e.target.value)}>
            <option value="ONBOARDING">Onboarding</option>
            <option value="ACTIVE">Active</option>
            <option value="GRADUATED">Graduated</option>
            <option value="FUTURE_PIPELINE">Future Pipeline</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </Field>
        <Field label="Reason" required hint="Specific and evidence-based — this becomes part of the permanent record.">
          <Textarea required rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div
          className={`rounded-lg p-3 ring-1 ring-inset transition-colors ${
            useOverride
              ? "bg-amber-50 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30"
              : "bg-slate-50/70 ring-slate-200/70 dark:bg-slate-800/40 dark:ring-slate-700"
          }`}
        >
          <Checkbox
            checked={useOverride}
            onChange={(e) => setUseOverride(e.target.checked)}
            label="This is an exceptional move (not part of the normal program flow)"
          />
          {useOverride && (
            <div className="mt-3 animate-fade-in">
              <Field label="Override reason" required hint="Required for exceptional moves such as Track A → Track B.">
                <Textarea required rows={2} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
              </Field>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {mutation.isPending ? "Moving…" : "Confirm Move"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
