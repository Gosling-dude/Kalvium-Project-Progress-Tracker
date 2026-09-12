import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchOpenFlags } from "../lib/queries";
import { Flag } from "../types";
import { Table } from "../components/ui/Table";
import { SeverityBadge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Feedback";

export function FlagsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<Flag[]>({ queryKey: ["open-flags"], queryFn: fetchOpenFlags });

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Flags</h1>
        <p className="text-sm text-slate-500">Open concerns across every student, most severe first.</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <Spinner />
        ) : (
          <Table
            rows={data ?? []}
            rowKey={(f) => f.id}
            onRowClick={(f) => navigate(`/students/${f.studentId}`)}
            emptyMessage="No open flags. Nothing needs attention right now."
            columns={[
              {
                header: "Student",
                className: "max-w-[140px] truncate",
                render: (f) => <span title={f.student?.fullName ?? ""}>{f.student?.fullName ?? "—"}</span>,
              },
              { header: "Category", render: (f) => f.category.replace(/_/g, " ") },
              { header: "Severity", render: (f) => <SeverityBadge severity={f.severity} /> },
              {
                header: "Title",
                className: "max-w-[260px] truncate",
                render: (f) => <span title={f.title}>{f.title}</span>,
              },
              {
                header: "Assigned To",
                className: "max-w-[140px] truncate",
                render: (f) => <span title={f.assignedTo?.name ?? ""}>{f.assignedTo?.name ?? "—"}</span>,
              },
              { header: "Raised", render: (f) => new Date(f.createdAt).toLocaleDateString() },
            ]}
          />
        )}
      </div>
    </div>
  );
}
