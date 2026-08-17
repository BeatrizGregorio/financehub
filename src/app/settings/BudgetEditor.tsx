"use client";

import { useFormStatus } from "react-dom";
import { saveBudgets } from "./actions";
import { categoryColor } from "@/lib/categories";
import { CARD } from "@/lib/ui";
import { useT } from "@/components/LanguageProvider";

function SaveButton() {
  const { t } = useT();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95 disabled:opacity-50"
      style={{ background: "var(--gradient-brand)" }}
    >
      {pending ? t.common.saving : t.settings.saveLimits}
    </button>
  );
}

export function BudgetEditor({
  categories,
  budgets,
}: {
  categories: { id: string; name: string }[];
  budgets: { category: string; limit: number }[];
}) {
  const { t } = useT();
  const limitByCategory = new Map(budgets.map((b) => [b.category, b.limit]));

  return (
    <div className={`${CARD} p-[22px]`}>
      <h2 className="mb-1 text-base font-extrabold tracking-tight">{t.settings.monthlyBudgets}</h2>
      <p className="mb-3.5 text-[12.5px] text-[var(--color-muted-2)]">{t.settings.blankNoLimit}</p>

      {categories.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-2)]">{t.settings.addExpenseCategoryFirst}</p>
      ) : (
        <form action={saveBudgets}>
          <div className="flex flex-col gap-[11px]">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-[9px] text-[13.5px] font-semibold">
                  <span
                    className="h-[9px] w-[9px] shrink-0 rounded-[3px]"
                    style={{ backgroundColor: categoryColor(c.name) }}
                  />
                  {c.name}
                </span>
                {/* py moved off the wrapper and onto the input below, so the
                    pill keeps its size but the input itself is a 28px target
                    rather than 20px of bare text. */}
                <div className="flex items-center gap-1.5 rounded-[10px] bg-[var(--color-inset)] px-[13px] py-1">
                  <span className="font-mono text-xs text-[var(--color-muted-2)]">R$</span>
                  <input
                    type="number"
                    name={`budget:${c.name}`}
                    // The category name is only a visual sibling, so screen
                    // readers would otherwise announce four identical
                    // unlabelled number fields.
                    aria-label={t.settings.budgetLimitFor(c.name)}
                    min="0"
                    step="10"
                    defaultValue={limitByCategory.get(c.name) || ""}
                    placeholder="0"
                    className="w-20 bg-transparent py-1 text-right font-mono text-[13px] outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
          <SaveButton />
        </form>
      )}
    </div>
  );
}
