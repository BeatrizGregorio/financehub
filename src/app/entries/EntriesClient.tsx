"use client";

import { useMemo, useState } from "react";
import { Plus, Calendar, ChevronDown } from "lucide-react";
import { availableMonths } from "@/lib/aggregate";
import { cycleKey, formatCurrency } from "@/lib/format";
import { Modal } from "@/components/Modal";
import { EntryForm, type EditableEntry } from "./EntryForm";
import { EntryTable } from "./EntryTable";

type CategoryOption = { id: string; name: string };
type TypeFilter = "all" | "income" | "expense";

export function EntriesClient({
  entries,
  expenseCategories,
  incomeCategories,
  paymentMethods,
  cycleStartDay,
}: {
  entries: EditableEntry[];
  expenseCategories: CategoryOption[];
  incomeCategories: CategoryOption[];
  paymentMethods: CategoryOption[];
  cycleStartDay: number;
}) {
  const [editing, setEditing] = useState<EditableEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [month, setMonth] = useState("all");
  const [type, setType] = useState<TypeFilter>("all");

  const months = useMemo(() => availableMonths(entries, cycleStartDay), [entries, cycleStartDay]);

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      if (!e.groupId) continue;
      counts.set(e.groupId, (counts.get(e.groupId) ?? 0) + 1);
    }
    return counts;
  }, [entries]);

  const filtered = useMemo(() => {
    return entries
      .filter((e) => month === "all" || cycleKey(e.date, cycleStartDay) === month)
      .filter((e) => type === "all" || e.type === type)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [entries, month, type, cycleStartDay]);

  const net = filtered.reduce((sum, e) => sum + (e.type === "income" ? e.amount : -e.amount), 0);
  const scopeLabel = month === "all" ? "all time" : months.find((m) => m.key === month)?.label ?? month;

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
          <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[34px]">Entries</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {filtered.length} transaction{filtered.length === 1 ? "" : "s"} · {scopeLabel} · net{" "}
            <span style={{ color: net >= 0 ? "#0c9e57" : "#dc3545" }} className="font-semibold">
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
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-[13.5px] font-semibold text-white shadow-[0_4px_16px_rgba(12,158,87,0.28)] transition hover:brightness-105 active:scale-95"
          style={{ background: "linear-gradient(135deg, #0c9e57, #0a7a43)" }}
        >
          <Plus size={16} /> Add entry
        </button>
      </div>

      {showForm && (
        <Modal title={editing ? "Edit entry" : "Add entry"} onClose={closeForm}>
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
          {(["all", "income", "expense"] as const).map((t) => {
            const active = type === t;
            const activeBg =
              t === "income" ? "rgba(12,158,87,0.12)" : t === "expense" ? "rgba(220,53,69,0.1)" : "rgba(0,0,0,0.08)";
            const activeColor = t === "income" ? "#0c9e57" : t === "expense" ? "#dc3545" : "var(--color-ink)";
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className="rounded-full px-[17px] py-2 text-[13px] font-semibold capitalize transition"
                style={{
                  background: active ? activeBg : "transparent",
                  color: active ? activeColor : "var(--color-muted)",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2 text-[var(--color-ink)]">
            <Calendar size={15} />
          </div>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="appearance-none rounded-full border border-[var(--color-border)] bg-[var(--color-card)] py-[9px] pl-[38px] pr-8 text-[13px] font-semibold text-[var(--color-ink)] outline-none"
          >
            <option value="all">All time</option>
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
      </div>

      <EntryTable entries={filtered} groupCounts={groupCounts} onEdit={startEdit} />
    </div>
  );
}
