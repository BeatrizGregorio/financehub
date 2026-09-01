"use client";

import { deleteEntry, deleteSeries } from "./actions";
import { categoryColor } from "@/lib/categories";
import { formatCurrency, formatDate } from "@/lib/format";
import type { EditableEntry } from "./EntryForm";
import { useT } from "@/components/LanguageProvider";
import type { Dict } from "@/lib/i18n";

const GRID_COLS = "90px 1.4fr 1.1fr 1fr 110px 150px";

function DeleteButton({ id, t }: { id: string; t: Dict }) {
  return (
    <form
      action={deleteEntry.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm(t.entries.confirmDelete)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        // px/py enlarge the hit area to the 24px WCAG minimum (the bare text
        // was 16px tall); the matching negative margin keeps the row's
        // visual height unchanged.
        className="-my-1 rounded px-1.5 py-1 text-xs font-semibold text-[var(--color-muted-2)] hover:text-[var(--color-rust-text)]"
      >
        {t.common.delete}
      </button>
    </form>
  );
}

function DeleteSeriesButton({
  groupId,
  count,
  t,
}: {
  groupId: string;
  count: number;
  t: Dict;
}) {
  return (
    <form
      action={deleteSeries.bind(null, groupId)}
      onSubmit={(e) => {
        if (!confirm(t.entries.confirmDeleteSeries(count))) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        // px/py enlarge the hit area to the 24px WCAG minimum (the bare text
        // was 16px tall); the matching negative margin keeps the row's
        // visual height unchanged.
        className="-my-1 rounded px-1.5 py-1 text-xs font-semibold text-[var(--color-muted-2)] hover:text-[var(--color-rust-text)]"
      >
        {t.entries.series}
      </button>
    </form>
  );
}

function seriesBadge(entry: EditableEntry, t: Dict): string | null {
  if (entry.seriesType === "fixed") return t.entries.recurring;
  if (entry.seriesType === "installment") {
    return `${entry.installmentTotal}× ${t.entries.installment}`;
  }
  return null;
}

export function EntryTable({
  entries,
  groupCounts,
  onEdit,
}: {
  entries: EditableEntry[];
  // A plain object rather than a Map: this crosses the server/client boundary
  // now, and a Map does not survive React serialization.
  groupCounts: Record<string, number>;
  onEdit: (entry: EditableEntry) => void;
}) {
  const { t, lang } = useT();

  if (entries.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-[var(--color-muted-2)]">
        {t.entries.noneMatch}
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
            <span>{t.common.date}</span>
            <span>{t.common.name}</span>
            <span>{t.common.category}</span>
            <span>{t.entries.method}</span>
            <span className="text-right">{t.common.amount}</span>
            <span className="text-right">{t.common.actions}</span>
          </div>

          {entries.map((entry) => {
            const badge = seriesBadge(entry, t);
            const seriesCount = entry.groupId ? groupCounts[entry.groupId] ?? 0 : 0;
            return (
              <div
                key={entry.id}
                className="grid items-center gap-4 border-b border-black/[0.04] px-6 py-[15px] last:border-0"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <span className="font-mono text-[13px] text-[var(--color-muted-2)]">
                  {formatDate(entry.date, lang)}
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
                  style={{ color: entry.type === "income" ? "var(--color-positive-text)" : "var(--color-ink)" }}
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
                    {t.common.edit}
                  </button>
                  <DeleteButton id={entry.id} t={t} />
                  {entry.groupId && seriesCount > 1 && (
                    <DeleteSeriesButton groupId={entry.groupId} count={seriesCount} t={t} />
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
