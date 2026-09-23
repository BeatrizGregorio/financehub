"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { deleteEntry, deleteSeries, deleteSplit } from "./actions";
import { RowAction } from "@/components/RowAction";
import { tagsOf } from "@/lib/tags";
import { categoryColor } from "@/lib/categories";
import { formatCurrency, formatDate } from "@/lib/format";
import type { EditableEntry } from "./EntryForm";
import { useT } from "@/components/LanguageProvider";
import type { Dict } from "@/lib/i18n";
import type { Sort, SortColumn } from "@/lib/entrySort";

const GRID_COLS = "90px 1.4fr 1.1fr 1fr 110px 150px";

/**
 * A column heading that sorts. The arrow only appears on the active column —
 * an arrow on every header reads as decoration and stops meaning anything.
 *
 * `aria-sort` on the header carries the same fact for screen readers, which is
 * the bit an arrow glyph alone leaves out.
 */
function SortableHeader({
  column,
  label,
  sort,
  onSort,
  align = "left",
  t,
}: {
  column: SortColumn;
  label: string;
  sort: Sort;
  onSort: (column: SortColumn) => void;
  align?: "left" | "right";
  t: Dict;
}) {
  const active = sort.column === column;
  const Arrow = sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <span
      role="columnheader"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={align === "right" ? "text-right" : undefined}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        title={t.entries.sortBy(label)}
        className={`-my-1 inline-flex items-center gap-1 rounded px-1.5 py-1 transition hover:text-[var(--color-ink)] ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
        style={{ color: active ? "var(--color-ink)" : undefined }}
      >
        {label}
        {active && <Arrow size={12} className="shrink-0" />}
      </button>
    </span>
  );
}

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
      <RowAction type="submit" label={t.common.delete} icon={Trash2} tone="danger" />
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

function DeleteSplitButton({ splitId, count, t }: { splitId: string; count: number; t: Dict }) {
  return (
    <form
      action={deleteSplit.bind(null, splitId)}
      onSubmit={(e) => {
        if (!confirm(t.entries.confirmDeleteSplit(count))) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="-my-1 rounded px-1.5 py-1 text-xs font-semibold text-[var(--color-muted-2)] hover:text-[var(--color-rust-text)]"
      >
        {t.entries.splitAction}
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
  accountName,
  splitCounts = {},
  sort,
  onSort,
}: {
  entries: EditableEntry[];
  // A plain object rather than a Map: this crosses the server/client boundary
  // now, and a Map does not survive React serialization.
  groupCounts: Record<string, number>;
  onEdit: (entry: EditableEntry) => void;
  accountName?: (id: string | null) => string | null;
  splitCounts?: Record<string, number>;
  sort: Sort;
  onSort: (column: SortColumn) => void;
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
            <SortableHeader column="date" label={t.common.date} sort={sort} onSort={onSort} t={t} />
            <SortableHeader column="name" label={t.common.name} sort={sort} onSort={onSort} t={t} />
            <SortableHeader column="category" label={t.common.category} sort={sort} onSort={onSort} t={t} />
            <SortableHeader column="method" label={t.entries.method} sort={sort} onSort={onSort} t={t} />
            <SortableHeader column="amount" label={t.common.amount} sort={sort} onSort={onSort} align="right" t={t} />
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
                    {entry.splitId && (
                      <span className="shrink-0 rounded-md bg-[var(--color-panel)] px-[7px] py-0.5 font-mono text-[9.5px] uppercase tracking-wide text-[var(--color-muted)]">
                        {t.entries.splitBadge}
                      </span>
                    )}
                    {badge && (
                      <span className="shrink-0 rounded-md bg-[var(--color-panel)] px-[7px] py-0.5 font-mono text-[9.5px] uppercase tracking-wide text-[var(--color-muted)]">
                        {badge}
                      </span>
                    )}
                  </span>
                  {entry.note && (
                    <span className="truncate text-[12px] text-[var(--color-muted-2)]">{entry.note}</span>
                  )}
                  {tagsOf(entry.tags).length > 0 && (
                    <span className="flex flex-wrap gap-1">
                      {tagsOf(entry.tags).map((tag) => (
                        <span key={tag} className="rounded-full bg-[var(--color-brand-tint)] px-1.5 py-px font-mono text-[10px] text-[var(--color-brand-text)]">
                          #{tag}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-[9px] text-[13.5px] font-semibold">
                  <span
                    className="h-[9px] w-[9px] shrink-0 rounded-[3px]"
                    style={{ backgroundColor: categoryColor(entry.category) }}
                  />
                  {entry.category}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[13px] text-[var(--color-muted)]">{entry.method ?? ""}</span>
                  {accountName?.(entry.accountId) && (
                    <span className="truncate text-[11.5px] text-[var(--color-muted-2)]">
                      {accountName(entry.accountId)}
                    </span>
                  )}
                </span>
                <span
                  className="text-right font-mono text-sm font-medium"
                  style={{ color: entry.type === "income" ? "var(--color-positive-text)" : "var(--color-ink)" }}
                >
                  {entry.type === "income" ? "+" : "−"}
                  {formatCurrency(entry.amount)}
                </span>
                <div className="flex items-center justify-end gap-2.5">
                  <RowAction label={t.common.edit} icon={Pencil} onClick={() => onEdit(entry)} />
                  <DeleteButton id={entry.id} t={t} />
                  {entry.splitId && (splitCounts[entry.splitId] ?? 0) > 1 && (
                    <DeleteSplitButton splitId={entry.splitId} count={splitCounts[entry.splitId]} t={t} />
                  )}
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
