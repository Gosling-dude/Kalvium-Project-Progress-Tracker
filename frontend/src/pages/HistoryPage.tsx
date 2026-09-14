import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAudit } from "../lib/queries";
import { TableSkeleton, EmptyState } from "../components/ui/Feedback";
import { InputWithIcon } from "../components/ui/Form";
import { Pager } from "../components/ui/Table";
import { PageContainer, PageHeader } from "../components/ui/Page";
import { Icon, IconName } from "../components/ui/Icon";

interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor?: { name: string; role: string } | null;
}

// Derived from the action verb rather than an exhaustive map, so new audit
// actions get a sensible icon and colour without needing a code change here.
function describeAction(action: string): { icon: IconName; ring: string; text: string } {
  if (/DELET|REMOV/.test(action))
    return {
      icon: "trash",
      ring: "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/30",
      text: "text-rose-700 dark:text-rose-400",
    };
  if (/CREAT|ASSIGN|ADD|ENROL/.test(action))
    return {
      icon: "plus",
      ring: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
      text: "text-emerald-700 dark:text-emerald-400",
    };
  if (/VERIF|CONFIRM|COMPLET|GRADUAT/.test(action))
    return {
      icon: "checkCircle",
      ring: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
      text: "text-emerald-700 dark:text-emerald-400",
    };
  if (/FLAG/.test(action))
    return {
      icon: "flag",
      ring: "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30",
      text: "text-amber-700 dark:text-amber-400",
    };
  if (/EMAIL|SENT/.test(action))
    return {
      icon: "mail",
      ring: "bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30",
      text: "text-blue-700 dark:text-blue-400",
    };
  if (/TRANSITION|MOVE|TRACK/.test(action))
    return {
      icon: "trendUp",
      ring: "bg-brand-50 text-brand-600 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/30",
      text: "text-brand-700 dark:text-brand-400",
    };
  if (/UPDAT|EDIT|CHANG/.test(action))
    return {
      icon: "edit",
      ring: "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
      text: "text-slate-700 dark:text-slate-300",
    };
  return {
    icon: "info",
    ring: "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
    text: "text-slate-700 dark:text-slate-300",
  };
}

export function HistoryPage() {
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["audit", entityType, page],
    queryFn: () => fetchAudit({ entityType: entityType || undefined, page }),
  });

  const events = data?.data as AuditEvent[] | undefined;

  return (
    <PageContainer width="max-w-5xl">
      <PageHeader
        icon="history"
        title="History / Audit Trail"
        description="Every significant action across the program, append-only."
      />

      <div className="surface flex flex-wrap items-center gap-2 p-3">
        <InputWithIcon
          icon="search"
          placeholder="Filter by entity type…"
          wrapperClassName="w-full sm:w-80"
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
        />
        <span className="text-xs text-slate-500 dark:text-slate-400">e.g. Student, ProjectReview, Interview, Flag</span>
        {data?.pagination && (
          <span className="ml-auto pr-1 text-xs font-medium tabular text-slate-500 dark:text-slate-400">
            {data.pagination.total} events
          </span>
        )}
      </div>

      <div className="surface">
        {isLoading ? (
          <TableSkeleton rows={8} cols={3} />
        ) : events && events.length > 0 ? (
          <>
            <ol className="divide-y divide-slate-100 dark:divide-slate-800">
              {events.map((e) => {
                const a = describeAction(e.action);
                return (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${a.ring}`}
                    >
                      <Icon name={a.icon} size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${a.text}`} title={e.action.replace(/_/g, " ")}>
                        {e.action.replace(/_/g, " ")}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-600 dark:text-slate-300">{e.entityType}</span>
                        <span className="rounded bg-slate-100 px-1 py-px font-mono text-2xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {e.entityId.slice(0, 8)}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span>{e.actor?.name ?? "system"}</span>
                      </p>
                    </div>
                    <time
                      className="shrink-0 whitespace-nowrap text-xs text-slate-400 dark:text-slate-500"
                      dateTime={e.createdAt}
                    >
                      {new Date(e.createdAt).toLocaleString()}
                    </time>
                  </li>
                );
              })}
            </ol>
            {data?.pagination && (
              <Pager page={page} totalPages={data.pagination.totalPages} onChange={setPage} />
            )}
          </>
        ) : (
          <EmptyState
            icon="history"
            title="No events found"
            description={entityType ? `Nothing recorded for "${entityType}". Try a different entity type.` : undefined}
          />
        )}
      </div>
    </PageContainer>
  );
}
