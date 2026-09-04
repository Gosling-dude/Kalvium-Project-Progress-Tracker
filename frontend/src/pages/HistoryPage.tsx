import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAudit } from "../lib/queries";
import { Spinner } from "../components/ui/Feedback";
import { Field, Input } from "../components/ui/Form";

interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor?: { name: string; role: string } | null;
}

export function HistoryPage() {
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ["audit", entityType, page], queryFn: () => fetchAudit({ entityType: entityType || undefined, page }) });

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">History / Audit Trail</h1>
        <p className="text-sm text-slate-500">Every significant action across the program, append-only.</p>
      </div>
      <Field label="Filter by entity type" hint="e.g. Student, ProjectReview, Interview, Flag">
        <Input className="max-w-xs" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} />
      </Field>

      <div className="rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <Spinner />
        ) : (
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <tbody className="divide-y divide-slate-100">
              {(data?.data as AuditEvent[] | undefined)?.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{e.action.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2.5 text-slate-500">{e.entityType} · {e.entityId.slice(0, 8)}</td>
                  <td className="px-4 py-2.5 text-slate-500">{e.actor?.name ?? "system"}</td>
                  <td className="px-4 py-2.5 text-right text-slate-400">{new Date(e.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {data?.data.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    No events found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
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
    </div>
  );
}
