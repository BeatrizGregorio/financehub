"use client";

import { useOptimistic, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Calendar, ChevronDown, Search, X, ChevronLeft, ChevronRight, Undo2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Modal } from "@/components/Modal";
import { EntryForm, type EditableEntry } from "./EntryForm";
import { dismissDeletedBatch, undoDelete } from "./actions";
import { isDefaultSort, nextSort, type Sort, type SortColumn } from "@/lib/entrySort";
import { EntryTable } from "./EntryTable";
import { useT } from "@/components/LanguageProvider";

type CategoryOption = { id: string; name: string };
type TypeFilter = "all" | "income" | "expense";
type Filters = { q: string; month: string; type: string; account: string; tag: string };

/**
 * Filters live in the URL rather than in component state.
 *
 * The page used to load every entry and filter in the browser. Now the server
 * does the filtering, paging and totals, so the filters have to be readable
 * server-side — which the query string gives for free, along with a working
 * back button and a shareable link to a search.
 */
export function EntriesClient({
  entries,
  months,
  groupCounts,
  total,
  net,
  page,
  pageSize,
  filters,
  expenseCategories,
  incomeCategories,
  paymentMethods,
  accounts,
  creditCardNames,
  splitCounts,
  tags,
  deleted,
  sort,
}: {
  entries: EditableEntry[];
  months: { key: string; label: string }[];
  groupCounts: Record<string, number>;
  total: number;
  net: number;
  page: number;
  pageSize: number;
  filters: Filters;
  expenseCategories: CategoryOption[];
  incomeCategories: CategoryOption[];
  paymentMethods: CategoryOption[];
  accounts: { id: string; name: string; archived: boolean }[];
  creditCardNames: string[];
  splitCounts: Record<string, number>;
  tags: string[];
  /** The last delete, while it is still undoable. */
  deleted?: { id: string; label: string; count: number } | null;
  sort: Sort;
}) {
  const { t } = useT();
  const activeAccounts = accounts.filter((a) => !a.archived);
  const accountName = (id: string | null) => (id ? accounts.find((a) => a.id === id)?.name ?? null : null);
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  // The filter controls show what was just picked, straight away.
  //
  // They are controlled by server state, and picking an option only starts a
  // navigation — so until the server answers, React re-renders them with the
  // OLD filters and the control snaps back to its previous value. Locally
  // that is a single frame; on a slow response (cold start, a big database)
  // it reads as "my click did nothing". useOptimistic holds the picked value
  // for the length of the transition, then hands back to the real one —
  // reverting by itself if the navigation never lands.
  const [shownFilters, showFilters] = useOptimistic(filters);
  // The header arrow moves on click for the same reason the filters do: it is
  // server state, so without this it would snap back until the rows arrive.
  const [shownSort, showSort] = useOptimistic(sort);

  const [editing, setEditing] = useState<EditableEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  // The search box is controlled locally so typing stays responsive; it only
  // becomes a navigation on submit.
  const [q, setQ] = useState(filters.q);

  /** Re-sort by a column: first click uses that column's natural direction,
      clicking the active column flips it. Paging resets, since page 3 of the
      old order means nothing in the new one. */
  function sortBy(column: SortColumn) {
    const next = nextSort(sort, column);
    startTransition(() => {
      showSort(next);
    });
    navigate({ sort: next });
  }

  function navigate(next: Partial<Filters & { page: number; sort: Sort }>) {
    const params = new URLSearchParams();
    const merged = { ...filters, page, ...next };
    if (merged.q) params.set("q", merged.q);
    if (merged.month && merged.month !== "all") params.set("month", merged.month);
    if (merged.type && merged.type !== "all") params.set("type", merged.type);
    if (merged.account && merged.account !== "all") params.set("account", merged.account);
    if (merged.tag && merged.tag !== "all") params.set("tag", merged.tag);
    // Any filter change resets to page 1 unless the caller asked for a page.
    const nextPage = "page" in next ? next.page : 1;
    if (nextPage && nextPage > 1) params.set("page", String(nextPage));
    // A default sort is left out of the URL entirely, so the plain /entries
    // link stays clean.
    const nextSortValue = "sort" in next && next.sort ? next.sort : sort;
    if (!isDefaultSort(nextSortValue)) {
      params.set("sort", nextSortValue.column);
      params.set("dir", nextSortValue.dir);
    }
    const query = params.toString();
    startTransition(() => {
      // Inside the transition on purpose: an optimistic update made outside
      // one is thrown away immediately.
      showFilters({ ...filters, ...next });
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const scopeLabel =
    filters.month === "all"
      ? t.entries.allTime
      : months.find((m) => m.key === filters.month)?.label ?? filters.month;

  function startEdit(entry: EditableEntry) {
    setEditing(entry);
    setShowForm(true);
  }

  function closeForm() {
    setEditing(null);
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[34px]">{t.entries.title}</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {t.entries.countSuffix(total)} · {scopeLabel} · {t.entries.net}{" "}
            <span
              style={{ color: net >= 0 ? "var(--color-positive-text)" : "var(--color-rust-text)" }}
              className="font-semibold"
            >
              {net >= 0 ? "+" : "−"}
              {formatCurrency(Math.abs(net))}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm((v) => !v);
          }}
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-[13.5px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Plus size={16} /> {t.entries.addEntry}
        </button>
      </div>

      {showForm && (
        <Modal title={editing ? t.entries.editEntry : t.entries.addEntry} onClose={closeForm}>
          <EntryForm
            key={editing?.id ?? "new"}
            entry={editing ?? undefined}
            seriesCount={editing?.groupId ? groupCounts[editing.groupId] ?? 0 : 0}
            onDone={closeForm}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            paymentMethods={paymentMethods}
            accounts={activeAccounts}
            creditCardNames={creditCardNames}
          />
        </Modal>
      )}

      {/* Only the most recent delete, and only for a short window — see
          UNDO_WINDOW_MINUTES. */}
      {deleted && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-inset)] px-4 py-3">
          <p className="text-[13px] text-[var(--color-muted)]">
            {deleted.count === 1
              ? t.entries.deletedOne(deleted.label)
              : t.entries.deletedMany(deleted.label, deleted.count)}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <form action={dismissDeletedBatch.bind(null, deleted.id)}>
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-[var(--color-muted-2)] transition hover:bg-[var(--color-panel)]"
              >
                {t.entries.dismiss}
              </button>
            </form>
            <form action={undoDelete.bind(null, deleted.id)}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-tint)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--color-brand-text)] transition hover:brightness-105"
              >
                <Undo2 size={14} /> {t.entries.undo}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex gap-1 rounded-full border border-black/[0.06] bg-[var(--color-card)] p-1 backdrop-blur-xl">
          {(["all", "income", "expense"] as const).map((filter) => {
            const active = shownFilters.type === filter;
            const activeBg =
              filter === "income"
                ? "var(--color-positive-tint)"
                : filter === "expense"
                  ? "var(--color-rust-tint)"
                  : "rgba(0,0,0,0.08)";
            const activeColor =
              filter === "income"
                ? "var(--color-positive)"
                : filter === "expense"
                  ? "var(--color-rust)"
                  : "var(--color-ink)";
            return (
              <button
                key={filter}
                type="button"
                onClick={() => navigate({ type: filter })}
                className="rounded-full px-[17px] py-2 text-[13px] font-semibold capitalize transition"
                style={{
                  background: active ? activeBg : "transparent",
                  color: active ? activeColor : "var(--color-muted)",
                }}
              >
                {t.entries[filter as TypeFilter]}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2 text-[var(--color-ink)]">
            <Calendar size={15} />
          </div>
          <select
            aria-label={t.entries.filterByMonth}
            value={shownFilters.month}
            onChange={(e) => navigate({ month: e.target.value })}
            className="appearance-none rounded-full border border-[var(--color-border)] bg-[var(--color-card)] py-[9px] pl-[38px] pr-8 text-[13px] font-semibold text-[var(--color-ink)] outline-none"
          >
            <option value="all">{t.entries.allTime}</option>
            {months.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink)]"
          />
        </div>

        {tags.length > 0 && (
          <div className="relative">
            <select
              aria-label={t.entries.filterByTag}
              value={shownFilters.tag}
              onChange={(e) => navigate({ tag: e.target.value })}
              className="appearance-none rounded-full border border-[var(--color-border)] bg-[var(--color-card)] py-[9px] pl-4 pr-8 text-[13px] font-semibold text-[var(--color-ink)] outline-none"
            >
              <option value="all">{t.entries.allTags}</option>
              {tags.map((tg) => (
                <option key={tg} value={tg}>
                  #{tg}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink)]"
            />
          </div>
        )}

        {accounts.length > 0 && (
          <div className="relative">
            <select
              aria-label={t.accounts.filterByAccount}
              value={shownFilters.account}
              onChange={(e) => navigate({ account: e.target.value })}
              className="appearance-none rounded-full border border-[var(--color-border)] bg-[var(--color-card)] py-[9px] pl-4 pr-8 text-[13px] font-semibold text-[var(--color-ink)] outline-none"
            >
              <option value="all">{t.accounts.allAccounts}</option>
              <option value="none">{t.accounts.notAssigned}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink)]"
            />
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ q });
          }}
          className="relative min-w-[210px] flex-1 sm:max-w-[300px]"
        >
          <div className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2 text-[var(--color-muted-2)]">
            <Search size={15} />
          </div>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t.entries.searchLabel}
            placeholder={t.entries.searchPlaceholder}
            className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-card)] py-[9px] pl-[38px] pr-9 text-[13px] text-[var(--color-ink)] outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                navigate({ q: "" });
              }}
              aria-label={t.entries.clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--color-muted-2)] transition hover:text-[var(--color-ink)]"
            >
              <X size={14} />
            </button>
          )}
        </form>
      </div>

      <div style={{ opacity: pending ? 0.6 : 1 }} className="transition-opacity">
        <EntryTable
          entries={entries}
          groupCounts={groupCounts}
          onEdit={startEdit}
          accountName={accountName}
          splitCounts={splitCounts}
          sort={shownSort}
          onSort={sortBy}
        />
      </div>

      {total > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[12px] text-[var(--color-muted-2)] tabular-nums">
            {t.entries.showingRange(from, to, total)}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => navigate({ page: page - 1 })}
              className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] py-2 pl-2.5 pr-3.5 text-[13px] font-semibold text-[var(--color-ink)] transition enabled:hover:bg-[var(--color-track)] disabled:opacity-40"
            >
              <ChevronLeft size={14} /> {t.entries.previousPage}
            </button>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => navigate({ page: page + 1 })}
              className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] py-2 pl-3.5 pr-2.5 text-[13px] font-semibold text-[var(--color-ink)] transition enabled:hover:bg-[var(--color-track)] disabled:opacity-40"
            >
              {t.entries.nextPage} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
