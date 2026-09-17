"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Wand2, X } from "lucide-react";
import { addCategoryRule, deleteCategoryRule, type ActionState } from "./actions";
import { CARD } from "@/lib/ui";
import { useT } from "@/components/LanguageProvider";

type Option = { id: string; name: string };

/**
 * "Description contains X → category" rules for CSV imports. The importer also
 * learns from past entries on its own; rules are for when that guess is wrong
 * or there's no history yet.
 */
export function CategoryRulesCard({
  rules,
  expenseCategories,
  incomeCategories,
}: {
  rules: { id: string; pattern: string; type: string; category: string }[];
  expenseCategories: Option[];
  incomeCategories: Option[];
}) {
  const { t } = useT();
  const [state, formAction] = useActionState(addCategoryRule, {} as ActionState);
  const [type, setType] = useState<"expense" | "income">("expense");
  const options = type === "expense" ? expenseCategories : incomeCategories;

  const inputClass =
    "rounded-full bg-[var(--color-inset)] px-4 py-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:bg-[var(--color-surface-raised)] focus:ring-1 focus:ring-[var(--color-ink)]";

  return (
    <div className={`${CARD} p-[22px] md:col-span-2`}>
      <div className="mb-1 flex items-center gap-2">
        <Wand2 size={16} className="shrink-0 text-[var(--color-brand-text)]" />
        <h2 className="text-base font-extrabold tracking-tight">{t.settings.rulesTitle}</h2>
      </div>
      <p className="mb-3.5 text-[12.5px] text-[var(--color-muted-2)]">{t.settings.rulesBlurb}</p>

      {rules.length === 0 ? (
        <p className="mb-3.5 text-[13px] text-[var(--color-muted-2)]">{t.settings.rulesEmpty}</p>
      ) : (
        <ul className="mb-3.5 flex flex-wrap gap-2">
          {rules.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-[7px] rounded-full bg-[var(--color-inset)] py-[7px] pl-3 pr-2.5 text-[13px] text-[var(--color-ink)]"
            >
              <span className="font-mono text-[12px]">{r.pattern}</span>
              <ArrowRight size={12} className="text-[var(--color-muted-2)]" />
              <span className="font-semibold">{r.category}</span>
              <span className="font-mono text-[10px] tracking-wide text-[var(--color-muted-2)] uppercase">
                {r.type === "income" ? t.entries.typeIncome : t.entries.typeExpense}
              </span>
              <button
                type="button"
                aria-label={t.common.delete}
                onClick={() => void deleteCategoryRule(r.id)}
                className="rounded-full opacity-40 transition hover:opacity-100"
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Keyed on the rule count: a successful add grows the list, which
          remounts the form empty; a failed one keeps what was typed. */}
      <form key={rules.length} action={formAction} className="flex flex-wrap items-center gap-2">
        <input
          name="pattern"
          required
          maxLength={40}
          aria-label={t.settings.rulesPattern}
          placeholder={t.settings.rulesPatternPlaceholder}
          className={`${inputClass} min-w-[160px] flex-1`}
        />
        <select
          name="type"
          aria-label={t.common.type}
          value={type}
          onChange={(e) => setType(e.target.value as "expense" | "income")}
          className={inputClass}
        >
          <option value="expense">{t.entries.typeExpense}</option>
          <option value="income">{t.entries.typeIncome}</option>
        </select>
        <select key={type} name="category" aria-label={t.common.category} className={inputClass}>
          {options.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full px-[19px] py-2.5 text-[13px] font-semibold text-white transition hover:brightness-105 active:scale-95"
          style={{ background: "var(--gradient-brand)" }}
        >
          {t.settings.rulesAdd}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-[var(--color-rust-text)]">{state.error}</p>}
    </div>
  );
}
