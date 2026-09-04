import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { apiErrorMessage } from "../../lib/api";
import { Modal } from "../../components/ui/Modal";
import { Field, Input, Select, Textarea } from "../../components/ui/Form";
import { Button } from "../../components/ui/Button";
import { ErrorBanner } from "../../components/ui/Feedback";
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
        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Current: Track {student.currentTrack ?? "—"} / {student.currentStage.replace(/_/g, " ")} / {student.programStatus}
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
        <Field label="Reason" hint="Specific and evidence-based — this becomes part of the permanent record.">
          <Textarea required rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={useOverride} onChange={(e) => setUseOverride(e.target.checked)} />
          This is an exceptional move (not part of the normal program flow)
        </label>
        {useOverride && (
          <Field label="Override reason" hint="Required for exceptional moves such as Track A → Track B.">
            <Textarea required rows={2} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
          </Field>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Moving…" : "Confirm Move"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
