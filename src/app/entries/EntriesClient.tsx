"use client";

import { useOptimistic, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Calendar, ChevronDown, Search, X, ChevronLeft, ChevronRight, Undo2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Modal } from "@/components/Modal";
import { EntryForm, type EditableEntry } from "./EntryForm";
import { bulkDeleteEntries, bulkUpdateEntries, dismissDeletedBatch, undoDelete, type BulkField } from "./actions";
import { isDefaultSort, nextSort, type Sort, type SortColumn } from "@/lib/entrySort";
import { EntryTable } from "./EntryTable";
import { useT } from "@/components/LanguageProvider";

type CategoryOption = { id: string; name: string };

/**
 * A dropdown that acts on pick and then shows its prompt again.
 *
 * It is not a form field holding a value — it is a menu of one-shot
 * actions. Resetting to "" after each pick keeps it honest: leaving the
 * chosen option displayed would imply the selection still carries it.
 */
function BulkSelect({
  label,
  options,
  onPick,
}: {
  label: string;
  options: { value: string; label: string }[];
  onPick: (value: string, label: string) => void;
}) {
  return (
    <select
      value=""
      aria-label={label}
      onChange={(e) => {
        const picked = options.find((o) => o.value === e.target.value);
        if (picked) onPick(picked.value, picked.label);
        e.target.value = "";
      }}
      className="rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-[7px] text-[12.5px] font-semibold text-[var(--color-ink)] outline-none"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value || "none"} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** One figure in the totals band: a micro label over a coloured amount. */
function Figure({
  label,
  value,
  tone,
  prefix,
}: {
  label: string;
  value: number;
  tone: string;
  prefix: string;
}) {
  return (
    // A floor rather than min-w-0 so a long label wraps instead of being
    // crushed, per the pattern the rest of this app uses for stat text.
    <div className="min-w-[90px]">
      <p className="font-mono text-[10px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-[15px] font-semibold tabular-nums" style={{ color: tone }}>
        {prefix}
        {formatCurrency(value)}
      </p>
    </div>
  );
}
type TypeFilter = "all" | "income" | "expense";
type Filters = { q: string; month: string; type: string; account: string; tag: string; from: string; to: string };

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
  inflow,
  outflow,
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
  inflow: number;
  outflow: number;
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

  // What is ticked for a bulk action.
  //
  // **Deliberately page-scoped and not in the URL.** A selection is a
  // momentary intention, not a view worth sharing or returning to with the
  // back button — and carrying ids across a filter change would let a bulk
  // action touch rows that are no longer on screen.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [tag, setTag] = useState("");

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(ids: string[], checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  /** Apply one field to everything ticked, after confirming the count. */
  async function applyBulk(field: BulkField, value: string, confirmText: string) {
    const ids = [...selected];
    if (ids.length === 0) return;
    // A bulk edit is not undoable, unlike a bulk delete, so it asks first.
    if (!confirm(confirmText)) return;
    const result = await bulkUpdateEntries(ids, field, value);
    setBulkError(result.error ?? null);
    if (!result.error) {
      setSelected(new Set());
      setTag("");
    }
  }

  async function deleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(t.entries.confirmBulkDelete(ids.length))) return;
    const result = await bulkDeleteEntries(ids);
    setBulkError(result.error ?? null);
    if (!result.error) setSelected(new Set());
  }

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
    // A month and an explicit range would describe two different windows,
    // so picking either clears the other rather than silently losing to it.
    if ("month" in next) {
      merged.from = "";
      merged.to = "";
    } else if ("from" in next || "to" in next) {
      merged.month = "all";
      params.delete("month");
    }
    if (merged.from) params.set("from", merged.from);
    if (merged.to) params.set("to", merged.to);
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

  const anyFilter =
    filters.q !== "" ||
    filters.month !== "all" ||
    filters.type !== "all" ||
    filters.account !== "all" ||
    filters.tag !== "all" ||
    filters.from !== "" ||
    filters.to !== "";
  const dateField =
    "rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-[7px] text-[12.5px] text-[var(--color-ink)] outline-none focus:ring-1 focus:ring-[var(--color-ink)]";

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
            {t.entries.countSuffix(total)} · {scopeLabel}
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

      {/* Totals for everything the filters match, not just the visible page.
          Both sides are shown rather than net alone: a month that takes in
          R$ 8.000 and spends R$ 8.000 nets to zero, and "R$ 0" is the one
          figure that tells you nothing about it. */}
      <div className="flex flex-wrap gap-x-6 gap-y-3 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-inset)] px-5 py-3.5 sm:gap-x-10">
        <Figure label={t.dashboard.income} value={inflow} tone="var(--color-positive-text)" prefix="+" />
        <Figure label={t.dashboard.expenses} value={outflow} tone="var(--color-rust-text)" prefix="−" />
        <Figure
          label={t.entries.net}
          value={Math.abs(net)}
          tone={net >= 0 ? "var(--color-positive-text)" : "var(--color-rust-text)"}
          prefix={net >= 0 ? "+" : "−"}
        />
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

        <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-2)]">
          {t.investments.rangeFrom}
          <input
            type="date"
            value={shownFilters.from}
            max={shownFilters.to || undefined}
            onChange={(e) => navigate({ from: e.target.value })}
            className={dateField}
          />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-2)]">
          {t.investments.rangeTo}
          <input
            type="date"
            value={shownFilters.to}
            min={shownFilters.from || undefined}
            onChange={(e) => navigate({ to: e.target.value })}
            className={dateField}
          />
        </label>

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

        {anyFilter && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              navigate({ q: "", month: "all", type: "all", account: "all", tag: "all", from: "", to: "" });
            }}
            className="text-[12.5px] font-semibold text-[var(--color-muted)] underline underline-offset-2"
          >
            {t.entries.clearFilters}
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-col gap-2 rounded-[16px] border border-[var(--color-brand)]/30 bg-[var(--color-brand-tint)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[13px] font-semibold text-[var(--color-brand-text)]">
              {t.entries.selectedCount(selected.size)}
            </span>

            <BulkSelect
              label={t.entries.setCategory}
              // By name, deduplicated: Category is unique on (name, type), so
              // "Other" legitimately exists as both an income and an expense
              // category — and an entry's category is just the name, so the
              // two are the same choice. Listing it twice was both a duplicate
              // React key and an option you could not tell apart.
              options={[...new Set([...expenseCategories, ...incomeCategories].map((c) => c.name))]
                .sort((a, b) => a.localeCompare(b))
                .map((name) => ({ value: name, label: name }))}
              onPick={(value, label) =>
                applyBulk("category", value, t.entries.confirmBulkUpdate(selected.size, label))
              }
            />

            <BulkSelect
              label={t.entries.setMethod}
              options={[
                { value: "", label: t.common.none },
                ...paymentMethods.map((m) => ({ value: m.name, label: m.name })),
              ]}
              onPick={(value, label) =>
                applyBulk("method", value, t.entries.confirmBulkUpdate(selected.size, label))
              }
            />

            {activeAccounts.length > 0 && (
              <BulkSelect
                label={t.entries.setAccount}
                options={[
                  { value: "", label: t.common.none },
                  ...activeAccounts.map((a) => ({ value: a.id, label: a.name })),
                ]}
                onPick={(value, label) =>
                  applyBulk("accountId", value, t.entries.confirmBulkUpdate(selected.size, label))
                }
              />
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (tag.trim()) {
                  applyBulk("addTag", tag, t.entries.confirmBulkUpdate(selected.size, `#${tag.trim()}`));
                }
              }}
              className="flex items-center gap-1.5"
            >
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder={t.entries.addTagPlaceholder}
                aria-label={t.entries.addTagPlaceholder}
                maxLength={30}
                className="w-[130px] rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-[7px] text-[12.5px] text-[var(--color-ink)] outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
              />
              {tag.trim() && (
                <button
                  type="submit"
                  className="rounded-full px-3 py-[7px] text-[12.5px] font-semibold text-white"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {t.common.add}
                </button>
              )}
            </form>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={deleteSelected}
                className="rounded-full border border-[var(--color-rust)]/30 px-3.5 py-[7px] text-[12.5px] font-semibold text-[var(--color-rust-text)] transition hover:bg-[var(--color-rust-tint)]"
              >
                {t.common.delete}
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="rounded-full px-3 py-[7px] text-[12.5px] font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
              >
                {t.entries.clearSelection}
              </button>
            </div>
          </div>
          {bulkError && <p className="text-[12.5px] text-[var(--color-rust-text)]">{bulkError}</p>}
        </div>
      )}

      <div style={{ opacity: pending ? 0.6 : 1 }} className="transition-opacity">
        <EntryTable
          entries={entries}
          groupCounts={groupCounts}
          onEdit={startEdit}
          accountName={accountName}
          splitCounts={splitCounts}
          sort={shownSort}
          onSort={sortBy}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
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
