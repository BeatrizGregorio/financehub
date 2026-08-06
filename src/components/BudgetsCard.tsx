import Link from "next/link";
import { Sparkles, TriangleAlert, Plus } from "lucide-react";
import { budgetStatus, type BudgetLike, type EntryLike } from "@/lib/aggregate";
import { categoryColor, categoryIconName } from "@/lib/categories";
import { currentCycleKey, formatCurrency } from "@/lib/format";
import { CARD } from "@/lib/ui";
import { Icon } from "./CategoryIcon";

export function BudgetsCard({ entries, budgets }: { entries: EntryLike[]; budgets: BudgetLike[] }) {
  const currentMonth = currentCycleKey();
  const rows = budgetStatus(entries, budgets, currentMonth).filter((b) => b.limit > 0);

  const totalLimit = rows.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = rows.reduce((sum, b) => sum + b.spent, 0);
  const over = totalSpent > totalLimit;

  return (
    <div className={`${CARD} p-[18px]`}>
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[17px] font-extrabold tracking-tight">Budgets</span>
        <Link
          href="/settings"
          className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[var(--color-panel)] text-[var(--color-ink)] transition hover:bg-[var(--color-inset)]"
        >
          <Plus size={16} />
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--color-muted-2)]">
          No budgets set yet.{" "}
          <Link href="/settings" className="font-semibold text-[var(--color-meadow)]">
            Set one in Settings
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-[15px]">
          {rows.map((b) => {
            const rowOver = b.limit > 0 && b.spent > b.limit;
            const pct = b.limit > 0 ? Math.min((b.spent / b.limit) * 100, 100) : 0;
            return (
              <div key={b.category} className="flex items-center gap-3">
                <span
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: categoryColor(b.category) }}
                >
                  <Icon name={categoryIconName(b.category)} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13.5px] font-bold">{b.category}</span>
                    <span
                      className="shrink-0 font-mono text-[11.5px] whitespace-nowrap"
                      style={{ color: rowOver ? "#dc3545" : "#9ca3af" }}
                    >
                      {formatCurrency(b.spent)} / {formatCurrency(b.limit)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-track)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: rowOver ? "#dc3545" : "#0c9e57",
                        boxShadow: `0 0 6px ${rowOver ? "#dc354555" : "#0c9e5755"}`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalLimit > 0 && (
        <div className="mt-4 rounded-[14px] bg-[var(--color-inset-2)] p-[13px]">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full"
              style={{
                backgroundColor: over ? "rgba(220,53,69,0.12)" : "rgba(12,158,87,0.12)",
                color: over ? "#dc3545" : "#0c9e57",
              }}
            >
              {over ? <TriangleAlert size={12} /> : <Sparkles size={12} />}
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: over ? "#dc3545" : "#0c9e57" }}
            >
              {over ? "Over budget" : "Nice pace"}
            </span>
          </div>
          <p className="m-0 text-[12.5px] leading-snug text-[var(--color-muted)]">
            You&apos;re{" "}
            <strong className="text-[var(--color-ink)]">
              {formatCurrency(Math.abs(totalLimit - totalSpent))} {over ? "over" : "under"}
            </strong>{" "}
            budget this month{over ? "." : ". Keep it up."}
          </p>
        </div>
      )}
    </div>
  );
}
