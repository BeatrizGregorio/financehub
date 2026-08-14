"use client";

import { deleteEntry, deleteSeries } from "./actions";
import { categoryColor } from "@/lib/categories";
import { formatCurrency, formatDate } from "@/lib/format";
import type { EditableEntry } from "./EntryForm";

const GRID_COLS = "90px 1.4fr 1.1fr 1fr 110px 150px";

function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteEntry.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm("Delete this entry? This can't be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        // px/py enlarge the hit area to the 24px WCAG minimum (the bare text
        // was 16px tall); the matching negative margin keeps the row's
        // visual height unchanged.
        className="-my-1 rounded px-1.5 py-1 text-xs font-semibold text-[var(--color-muted-2)] hover:text-[#dc3545]"
      >
        Delete
      </button>
    </form>
  );
}

function DeleteSeriesButton({ groupId, count }: { groupId: string; count: number }) {
  return (
    <form
      action={deleteSeries.bind(null, groupId)}
      onSubmit={(e) => {
        if (!confirm(`Delete all ${count} entries in this series? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        // px/py enlarge the hit area to the 24px WCAG minimum (the bare text
        // was 16px tall); the matching negative margin keeps the row's
        // visual height unchanged.
        className="-my-1 rounded px-1.5 py-1 text-xs font-semibold text-[var(--color-muted-2)] hover:text-[#dc3545]"
      >
        Series
      </button>
    </form>
  );
}

function seriesBadge(entry: EditableEntry): string | null {
  if (entry.seriesType === "fixed") return "recurring";
  if (entry.seriesType === "installment") {
    return `${entry.installmentTotal}× installment`;
  }
  return null;
}

export function EntryTable({
  entries,
  groupCounts,
  onEdit,
}: {
  entries: EditableEntry[];
  groupCounts: Map<string, number>;
  onEdit: (entry: EditableEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-[var(--color-muted-2)]">
        No entries match these filters yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-black/[0.07] bg-[var(--color-card)] shadow-[var(--shadow-card)] backdrop-blur-xl">
      <div className="overflow-x-auto">
        <div className="min-w-[820px]">
          <div
            className="grid gap-4 border-b border-[var(--color-track)] px-6 py-[15px] font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-muted-2)]"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <span>Date</span>
            <span>Name</span>
            <span>Category</span>
            <span>Method</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Actions</span>
          </div>

          {entries.map((entry) => {
            const badge = seriesBadge(entry);
            const seriesCount = entry.groupId ? groupCounts.get(entry.groupId) ?? 0 : 0;
            return (
              <div
                key={entry.id}
                className="grid items-center gap-4 border-b border-black/[0.04] px-6 py-[15px] last:border-0"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <span className="font-mono text-[13px] text-[var(--color-muted-2)]">
                  {formatDate(entry.date)}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-2 truncate text-[13.5px] font-semibold text-[var(--color-ink)]">
                    <span className="truncate">{entry.name}</span>
                    {badge && (
                      <span className="shrink-0 rounded-md bg-[var(--color-panel)] px-[7px] py-0.5 font-mono text-[9.5px] uppercase tracking-wide text-[var(--color-muted)]">
                        {badge}
                      </span>
                    )}
                  </span>
                  {entry.note && (
                    <span className="truncate text-[12px] text-[var(--color-muted-2)]">{entry.note}</span>
                  )}
                </span>
                <span className="flex items-center gap-[9px] text-[13.5px] font-semibold">
                  <span
                    className="h-[9px] w-[9px] shrink-0 rounded-[3px]"
                    style={{ backgroundColor: categoryColor(entry.category) }}
                  />
                  {entry.category}
                </span>
                <span className="truncate text-[13px] text-[var(--color-muted)]">
                  {entry.method ?? ""}
                </span>
                <span
                  className="text-right font-mono text-sm font-medium"
                  style={{ color: entry.type === "income" ? "#0c9e57" : "var(--color-ink)" }}
                >
                  {entry.type === "income" ? "+" : "−"}
                  {formatCurrency(entry.amount)}
                </span>
                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => onEdit(entry)}
                    className="-my-1 rounded px-1.5 py-1 text-xs font-semibold text-[var(--color-muted-2)] hover:text-[var(--color-ink)]"
                  >
                    Edit
                  </button>
                  <DeleteButton id={entry.id} />
                  {entry.groupId && seriesCount > 1 && (
                    <DeleteSeriesButton groupId={entry.groupId} count={seriesCount} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
