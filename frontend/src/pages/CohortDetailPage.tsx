import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { enrollStudentInCohort, fetchCohort, fetchStudents, updateCohort } from "../lib/queries";
import { Button } from "../components/ui/Button";
import { Spinner, ErrorBanner } from "../components/ui/Feedback";
import { Badge, ProgramStatusBadge, TrackBadge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Field, Select } from "../components/ui/Form";
import { apiErrorMessage } from "../lib/api";
import { Student } from "../types";

export function CohortDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEnroll, setShowEnroll] = useState(false);

  const { data: cohort, isLoading } = useQuery({ queryKey: ["cohort", id], queryFn: () => fetchCohort(id!), enabled: !!id });

  const archiveMutation = useMutation({
    mutationFn: (status: string) => updateCohort(id!, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cohort", id] }),
  });

  if (isLoading || !cohort) return <Spinner />;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <Link to="/cohorts" className="text-sm text-brand-600 hover:underline">
        ← Cohorts
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{cohort.name}</h1>
          <p className="text-sm text-slate-500">
            {cohort.code} · {cohort.campus?.name ?? "No campus"} ·{" "}
            <Badge tone={cohort.status === "ACTIVE" ? "success" : "neutral"}>{cohort.status}</Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowEnroll(true)}>
            Enroll Student
          </Button>
          {cohort.status === "ACTIVE" ? (
            <Button variant="secondary" onClick={() => archiveMutation.mutate("ARCHIVED")}>
              Archive
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => archiveMutation.mutate("ACTIVE")}>
              Reactivate
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Students ({cohort.enrollments.filter((e: { isActive: boolean }) => e.isActive).length} active)</h2>
        </div>
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <tbody className="divide-y divide-slate-100">
            {cohort.enrollments.map((e: { id: string; isActive: boolean; startedAt: string; endedAt: string | null; student: Student }) => (
              <tr key={e.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/students/${e.student.id}`)}>
                <td className="px-4 py-2.5 font-medium text-slate-800">{e.student.fullName}</td>
                <td className="px-4 py-2.5 text-slate-500">{e.student.email}</td>
                <td className="px-4 py-2.5"><TrackBadge track={e.student.currentTrack} /></td>
                <td className="px-4 py-2.5"><ProgramStatusBadge status={e.student.programStatus} /></td>
                <td className="px-4 py-2.5 text-right">
                  {e.isActive ? <Badge tone="success">Active</Badge> : <Badge>Left {new Date(e.endedAt!).toLocaleDateString()}</Badge>}
                </td>
              </tr>
            ))}
            {cohort.enrollments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  No students enrolled yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showEnroll && <EnrollModal cohortId={cohort.id} onClose={() => setShowEnroll(false)} onDone={() => { setShowEnroll(false); queryClient.invalidateQueries({ queryKey: ["cohort", id] }); }} />}
    </div>
  );
}

function EnrollModal({ cohortId, onClose, onDone }: { cohortId: string; onClose: () => void; onDone: () => void }) {
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data } = useQuery({ queryKey: ["students-for-enroll"], queryFn: () => fetchStudents({ pageSize: 100 }) });

  const mutation = useMutation({
    mutationFn: () => enrollStudentInCohort(cohortId, studentId),
    onSuccess: onDone,
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Modal open onClose={onClose} title="Enroll Student">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        {error && <ErrorBanner message={error} />}
        <Field label="Student">
          <Select required value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Select a student…</option>
            {data?.data.map((s: Student) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.email})
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!studentId || mutation.isPending}>
            {mutation.isPending ? "Enrolling…" : "Enroll"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
