import { ReactNode } from "react";
import { Icon } from "./Icon";

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyMessage = "No records found.",
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 ring-1 ring-inset ring-slate-200">
          <Icon name="inbox" size={20} />
        </span>
        <p className="max-w-sm text-sm font-medium text-slate-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="scroll-soft overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="surface-header border-b border-slate-200/80">
            {columns.map((col) => (
              <th
                key={col.header}
                scope="col"
                className={`whitespace-nowrap bg-slate-50/90 px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-slate-500 backdrop-blur first:pl-4 last:pr-4 ${
                  col.className ?? ""
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      // Rows that navigate should be reachable without a mouse.
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
              className={`transition-colors duration-100 ${
                onRowClick
                  ? "cursor-pointer hover:bg-brand-50/50 focus-visible:bg-brand-50/60 focus-visible:outline-none"
                  : "hover:bg-slate-50/60"
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={`whitespace-nowrap px-3 py-2.5 text-slate-600 first:pl-4 last:pr-4 ${col.className ?? ""}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-600">
      <span className="tabular">
        Page <span className="font-semibold text-slate-900">{page}</span> of{" "}
        <span className="font-semibold text-slate-900">{totalPages}</span>
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-md bg-white px-2.5 text-sm font-medium text-slate-700 shadow-xs ring-1 ring-inset ring-slate-300 transition-colors hover:bg-slate-50 hover:ring-slate-400 disabled:cursor-not-allowed disabled:bg-white disabled:text-slate-300 disabled:shadow-none disabled:ring-slate-200"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <Icon name="chevronLeft" size={14} />
          Previous
        </button>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-md bg-white px-2.5 text-sm font-medium text-slate-700 shadow-xs ring-1 ring-inset ring-slate-300 transition-colors hover:bg-slate-50 hover:ring-slate-400 disabled:cursor-not-allowed disabled:bg-white disabled:text-slate-300 disabled:shadow-none disabled:ring-slate-200"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
          <Icon name="chevronRight" size={14} />
        </button>
      </div>
    </div>
  );
}
