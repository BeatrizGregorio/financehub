"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Calendar, ChevronDown, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Modal } from "@/components/Modal";
import { EntryForm, type EditableEntry } from "./EntryForm";
import { EntryTable } from "./EntryTable";
import { useT } from "@/components/LanguageProvider";

type CategoryOption = { id: string; name: string };
type TypeFilter = "all" | "income" | "expense";
type Filters = { q: string; month: string; type: string };

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
}) {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const [editing, setEditing] = useState<EditableEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  // The search box is controlled locally so typing stays responsive; it only
  // becomes a navigation on submit.
  const [q, setQ] = useState(filters.q);

  function navigate(next: Partial<Filters & { page: number }>) {
    const params = new URLSearchParams();
    const merged = { ...filters, page, ...next };
    if (merged.q) params.set("q", merged.q);
    if (merged.month && merged.month !== "all") params.set("month", merged.month);
    if (merged.type && merged.type !== "all") params.set("type", merged.type);
    // Any filter change resets to page 1 unless the caller asked for a page.
    const nextPage = "page" in next ? next.page : 1;
    if (nextPage && nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    startTransition(() => {
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
              style={{ color: net >= 0 ? "var(--color-positive)" : "var(--color-rust)" }}
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
            onDone={closeForm}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            paymentMethods={paymentMethods}
          />
        </Modal>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex gap-1 rounded-full border border-black/[0.06] bg-[var(--color-card)] p-1 backdrop-blur-xl">
          {(["all", "income", "expense"] as const).map((filter) => {
            const active = filters.type === filter;
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
            value={filters.month}
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
        <EntryTable entries={entries} groupCounts={groupCounts} onEdit={startEdit} />
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
