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
              { header: "Student", render: (f) => f.student?.fullName ?? "—" },
              { header: "Category", render: (f) => f.category.replace(/_/g, " ") },
              { header: "Severity", render: (f) => <SeverityBadge severity={f.severity} /> },
              { header: "Title", render: (f) => f.title },
              { header: "Raised", render: (f) => new Date(f.createdAt).toLocaleDateString() },
            ]}
          />
        )}
      </div>
    </div>
  );
}
