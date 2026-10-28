"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { deleteEntry, deleteSeries, deleteSplit } from "./actions";
import { RowAction } from "@/components/RowAction";
import { tagsOf } from "@/lib/tags";
import { categoryColor } from "@/lib/categories";
import { formatCurrency, formatDate, formatWeekday } from "@/lib/format";
import { groupByDay } from "@/lib/entryGroups";
import type { EditableEntry } from "./EntryForm";
import { useT } from "@/components/LanguageProvider";
import type { Dict, Language } from "@/lib/i18n";
import type { Sort, SortColumn } from "@/lib/entrySort";

// Measured, not guessed — see the note in HoldingsTable. The 34px
// checkbox column and its 16px gap raised the floor from 820 to 870; the
// table only renders from md (768px) up, and between 768 and 870 it
// scrolls sideways as it already did at 820.
const GRID_COLS = "34px 90px 1.4fr 1.1fr 1fr 110px 150px";

/** One thing to render in the table body: a day heading, or an entry. */
type BodyItem =
  | { kind: "day"; key: string; date: Date; net: number; count: number }
  | { kind: "entry"; key: string; entry: EditableEntry };

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

/*
 * ─── Cells ──────────────────────────────────────────────────────────────────
 *
 * A six-column table and a two-line card are genuinely different layouts, and
 * trying to make one flat DOM be both with CSS gets unreadable fast. So the
 * *contents* of each cell live here once, and the two arrangements below
 * compose them. Nothing about an entry is written twice — only where it sits.
 */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-md bg-[var(--color-panel)] px-[7px] py-0.5 font-mono text-[9.5px] tracking-wide text-[var(--color-muted)] uppercase">
      {children}
    </span>
  );
}

function NameCell({ entry, t }: { entry: EditableEntry; t: Dict }) {
  const badge = seriesBadge(entry, t);
  const tags = tagsOf(entry.tags);
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="flex items-center gap-2 truncate text-[13.5px] font-semibold text-[var(--color-ink)]">
        <span className="truncate">{entry.name}</span>
        {entry.splitId && <Badge>{t.entries.splitBadge}</Badge>}
        {badge && <Badge>{badge}</Badge>}
      </span>
      {entry.note && (
        <span className="truncate text-[12px] text-[var(--color-muted-2)]">{entry.note}</span>
      )}
      {tags.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--color-brand-tint)] px-1.5 py-px font-mono text-[10px] text-[var(--color-brand-text)]"
            >
              #{tag}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

function CategoryCell({ entry }: { entry: EditableEntry }) {
  return (
    <span className="flex min-w-0 items-center gap-[9px] text-[13.5px] font-semibold">
      <span
        className="h-[9px] w-[9px] shrink-0 rounded-[3px]"
        style={{ backgroundColor: categoryColor(entry.category) }}
      />
      <span className="truncate">{entry.category}</span>
    </span>
  );
}

function MethodCell({
  entry,
  accountName,
}: {
  entry: EditableEntry;
  accountName?: (id: string | null) => string | null;
}) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-[13px] text-[var(--color-muted)]">{entry.method ?? ""}</span>
      {accountName?.(entry.accountId) && (
        <span className="truncate text-[11.5px] text-[var(--color-muted-2)]">
          {accountName(entry.accountId)}
        </span>
      )}
    </span>
  );
}

function AmountCell({ entry, className = "" }: { entry: EditableEntry; className?: string }) {
  return (
    <span
      className={`font-mono text-sm font-medium tabular-nums whitespace-nowrap ${className}`}
      style={{ color: entry.type === "income" ? "var(--color-positive-text)" : "var(--color-ink)" }}
    >
      {entry.type === "income" ? "+" : "−"}
      {formatCurrency(entry.amount)}
    </span>
  );
}

function RowActions({
  entry,
  t,
  onEdit,
  seriesCount,
  splitCount,
}: {
  entry: EditableEntry;
  t: Dict;
  onEdit: (entry: EditableEntry) => void;
  seriesCount: number;
  splitCount: number;
}) {
  return (
    <div className="flex items-center justify-end gap-2.5">
      <RowAction label={t.common.edit} icon={Pencil} onClick={() => onEdit(entry)} />
      <DeleteButton id={entry.id} t={t} />
      {entry.splitId && splitCount > 1 && (
        <DeleteSplitButton splitId={entry.splitId} count={splitCount} t={t} />
      )}
      {entry.groupId && seriesCount > 1 && (
        <DeleteSeriesButton groupId={entry.groupId} count={seriesCount} t={t} />
      )}
    </div>
  );
}

/**
 * A selection checkbox.
 *
 * The label carries the padding: a bare 16px box is well under the 24px
 * WCAG 2.2 minimum, and the negative margin keeps the row's height
 * unchanged — the same trick the row actions use.
 */
function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="-m-2 flex cursor-pointer items-center p-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="h-4 w-4 cursor-pointer accent-[var(--color-brand)]"
      />
    </label>
  );
}

/**
 * The band that opens each day, with that day's own net beside it.
 *
 * The subtotal is the point of grouping at all: it answers "what did
 * Tuesday cost" without reading down a column and adding up.
 */
function DayHeading({
  date,
  net,
  count,
  lang,
  t,
  variant,
}: {
  date: Date;
  net: number;
  count: number;
  lang: Language;
  t: Dict;
  variant: "row" | "card";
}) {
  const label = (
    <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 tracking-[0.08em] text-[var(--color-muted)] uppercase">
      {formatWeekday(date, lang)} · {formatDate(date, lang)}
      <span className="tracking-normal text-[var(--color-muted-2)] normal-case">
        {t.entries.countSuffix(count)}
      </span>
    </span>
  );
  const total = (
    <span
      className="text-right font-semibold tabular-nums whitespace-nowrap"
      style={{ color: net >= 0 ? "var(--color-positive-text)" : "var(--color-rust-text)" }}
    >
      {net >= 0 ? "+" : "−"}
      {formatCurrency(Math.abs(net))}
    </span>
  );

  if (variant === "card") {
    return (
      <div className="flex items-baseline justify-between gap-3 border-b border-[var(--color-track)] bg-[var(--color-inset)] px-4 py-2 font-mono text-[11px]">
        {label}
        {total}
      </div>
    );
  }

  return (
    // The same grid as the rows, so the day's subtotal lands in the Amount
    // column directly above the amounts it adds up. Right-aligning it to the
    // edge of the table instead would put it under Actions, where it would
    // read as unrelated to the numbers it totals.
    <div
      className="grid items-baseline gap-4 border-b border-[var(--color-track)] bg-[var(--color-inset)] px-6 py-2 font-mono text-[11px]"
      style={{ gridTemplateColumns: GRID_COLS }}
    >
      <span style={{ gridColumn: "span 5" }}>{label}</span>
      {total}
    </div>
  );
}

export function EntryTable({
  entries,
  groupCounts,
  onEdit,
  accountName,
  splitCounts = {},
  sort,
  onSort,
  selected,
  onToggle,
  onToggleAll,
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
  /** Ids ticked for a bulk action. Page-scoped — see EntriesClient. */
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
}) {
  const { t, lang } = useT();

  // Headings and rows flattened into one list, so each arrangement stays a
  // single map and a heading can never end up inside a row's markup.
  //
  // **Only a date sort is grouped.** Sorted by name or amount, the same day
  // turns up in a dozen places, so a heading per run would be one heading per
  // row — noise where the whole point was structure.
  const grouped = sort.column === "date";
  const body: BodyItem[] = grouped
    ? groupByDay(entries).flatMap((g) => [
        {
          kind: "day" as const,
          key: `day:${g.key}`,
          date: g.date,
          net: g.net,
          count: g.rows.length,
        },
        ...g.rows.map((entry) => ({ kind: "entry" as const, key: entry.id, entry })),
      ])
    : entries.map((entry) => ({ kind: "entry" as const, key: entry.id, entry }));

  const pageIds = entries.map((e) => e.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const seriesCountOf = (entry: EditableEntry) =>
    entry.groupId ? (groupCounts[entry.groupId] ?? 0) : 0;
  const splitCountOf = (entry: EditableEntry) =>
    entry.splitId ? (splitCounts[entry.splitId] ?? 0) : 0;

  if (entries.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-[var(--color-muted-2)]">
        {t.entries.noneMatch}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-black/[0.07] bg-[var(--color-card)] shadow-[var(--shadow-card)] backdrop-blur-xl">
      {/* ─── Table, from md up ─────────────────────────────────────────── */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <div className="min-w-[870px]">
            <div
              className="grid gap-4 border-b border-[var(--color-track)] px-6 py-[15px] font-mono text-[10.5px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase"
              style={{ gridTemplateColumns: GRID_COLS }}
            >
              <Check
                checked={allSelected}
                onChange={() => onToggleAll(pageIds, !allSelected)}
                label={t.entries.selectAllOnPage}
              />
              <SortableHeader column="date" label={t.common.date} sort={sort} onSort={onSort} t={t} />
              <SortableHeader column="name" label={t.common.name} sort={sort} onSort={onSort} t={t} />
              <SortableHeader column="category" label={t.common.category} sort={sort} onSort={onSort} t={t} />
              <SortableHeader column="method" label={t.entries.method} sort={sort} onSort={onSort} t={t} />
              <SortableHeader column="amount" label={t.common.amount} sort={sort} onSort={onSort} align="right" t={t} />
              <span className="text-right">{t.common.actions}</span>
            </div>

            {body.map((item) =>
              item.kind === "day" ? (
                <DayHeading
                  key={item.key}
                  date={item.date}
                  net={item.net}
                  count={item.count}
                  lang={lang}
                  t={t}
                  variant="row"
                />
              ) : (
                <div
                  key={item.key}
                  className={`grid items-center gap-4 border-b border-black/[0.04] px-6 py-[15px] last:border-0 ${
                    selected.has(item.entry.id) ? "bg-[var(--color-brand-tint)]" : ""
                  }`}
                  style={{ gridTemplateColumns: GRID_COLS }}
                >
                  <Check
                    checked={selected.has(item.entry.id)}
                    onChange={() => onToggle(item.entry.id)}
                    label={t.entries.selectEntry(item.entry.name)}
                  />
                  {/* Under a day heading the date is already stated, so the
                      cell is left empty rather than repeating it on every row.
                      The resulting indent reads as "these belong to the heading
                      above". The column itself stays, because its header is the
                      Date sort control. */}
                  <span className="font-mono text-[13px] text-[var(--color-muted-2)]">
                    {grouped ? "" : formatDate(item.entry.date, lang)}
                  </span>
                  <NameCell entry={item.entry} t={t} />
                  <CategoryCell entry={item.entry} />
                  <MethodCell entry={item.entry} accountName={accountName} />
                  <AmountCell entry={item.entry} className="text-right" />
                  <RowActions
                    entry={item.entry}
                    t={t}
                    onEdit={onEdit}
                    seriesCount={seriesCountOf(item.entry)}
                    splitCount={splitCountOf(item.entry)}
                  />
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* ─── Cards, below md ───────────────────────────────────────────────
          The table is 820px wide inside a sideways scroller, so on a phone
          the amount — the one column that matters — was off-screen until you
          scrolled to it. Stacked instead: name and amount on the first line,
          everything else underneath. */}
      <div className="md:hidden">
        {body.map((item) =>
          item.kind === "day" ? (
            <DayHeading
              key={item.key}
              date={item.date}
              net={item.net}
              count={item.count}
              lang={lang}
              t={t}
              variant="card"
            />
          ) : (
            <div
              key={item.key}
              className={`flex flex-col gap-2 border-b border-black/[0.04] px-4 py-3 last:border-0 ${
                selected.has(item.entry.id) ? "bg-[var(--color-brand-tint)]" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="mt-0.5 shrink-0">
                  <Check
                    checked={selected.has(item.entry.id)}
                    onChange={() => onToggle(item.entry.id)}
                    label={t.entries.selectEntry(item.entry.name)}
                  />
                </span>
                <NameCell entry={item.entry} t={t} />
                <AmountCell entry={item.entry} className="shrink-0" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--color-muted-2)]">
                  {/* Without a day heading above it, the card has to carry its
                      own date. */}
                  {!grouped && (
                    <span className="font-mono whitespace-nowrap">
                      {formatDate(item.entry.date, lang)}
                    </span>
                  )}
                  <CategoryCell entry={item.entry} />
                  <MethodCell entry={item.entry} accountName={accountName} />
                </span>
                <RowActions
                  entry={item.entry}
                  t={t}
                  onEdit={onEdit}
                  seriesCount={seriesCountOf(item.entry)}
                  splitCount={splitCountOf(item.entry)}
                />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
