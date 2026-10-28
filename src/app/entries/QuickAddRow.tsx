"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { createEntry, type ActionState } from "./actions";
import { MoneyInput } from "@/components/MoneyInput";
import { toDateInputValue } from "@/lib/format";
import { useT } from "@/components/LanguageProvider";

type CategoryOption = { id: string; name: string };

/**
 * Log an entry without opening the dialog.
 *
 * The modal is the right shape for a split or a twelve-month series. It is
 * heavy for "Padaria, 18,50, Groceries, today", which is most of what gets
 * logged — so the common case gets one row and the Enter key, and everything
 * else stays one click away behind "More options".
 *
 * It posts to the same createEntry the modal does. There is no second code
 * path for creating an entry, only a smaller set of fields reaching it.
 */
export function QuickAddRow({
  expenseCategories,
  incomeCategories,
  onMore,
}: {
  expenseCategories: CategoryOption[];
  incomeCategories: CategoryOption[];
  onMore: () => void;
}) {
  const { t } = useT();
  const [state, formAction] = useActionState(createEntry, {} as ActionState);
  const [submitCount, setSubmitCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // Kept across submissions on purpose: logging five expenses for today means
  // setting the type, the category and the date once, not five times. Only the
  // name and the amount differ row to row, and those are what get cleared.
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(() => toDateInputValue(new Date()));

  const categories = type === "income" ? incomeCategories : expenseCategories;
  // Fall back to the first category rather than holding a name that is not in
  // the list — switching type would otherwise submit the other type's category.
  const chosen = categories.some((c) => c.name === category)
    ? category
    : (categories[0]?.name ?? "");

  useEffect(() => {
    if (submitCount === 0 || state.error) return;
    const form = formRef.current;
    if (!form) return;
    // React 19 resets the form's fields once the action finishes, which clears
    // the name and amount for us but also takes the controlled ones back to
    // what React rendered at mount — the V1.44 bug, where the control lied
    // about what would be submitted. Put them back from state.
    const put = (name: string, value: string) => {
      const el = form.elements.namedItem(name);
      if (el instanceof HTMLSelectElement || el instanceof HTMLInputElement) el.value = value;
    };
    put("category", chosen);
    put("date", date);
    for (const radio of form.querySelectorAll<HTMLInputElement>('input[name="type"]')) {
      radio.checked = radio.value === type;
    }
    // Straight on to the next one.
    (form.elements.namedItem("name") as HTMLInputElement | null)?.focus();
  }, [state, submitCount, chosen, date, type]);

  const field =
    "rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-[13px] text-[var(--color-ink)] outline-none focus:ring-1 focus:ring-[var(--color-ink)]";

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={() => setSubmitCount((n) => n + 1)}
      // Hidden below sm. Wrapped onto a phone it is a 287px stack that pushes
      // every entry below the fold — at which point it is just a worse version
      // of the modal, which is one tap away on the same screen. The point of
      // the inline row is saving a click on a wide screen.
      className="hidden flex-wrap items-center gap-2 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 backdrop-blur-xl sm:flex"
    >
      {/* The same two-value toggle the modal uses, as radios so the posted
          FormData matches createEntry's expectations exactly. */}
      <div className="flex shrink-0 gap-1 rounded-full bg-[var(--color-inset)] p-1">
        {(["expense", "income"] as const).map((value) => (
          <label
            key={value}
            className="cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition"
            style={
              type === value
                ? {
                    background:
                      value === "income" ? "var(--color-positive-tint)" : "var(--color-rust-tint)",
                    color: value === "income" ? "var(--color-positive)" : "var(--color-rust)",
                  }
                : { color: "var(--color-muted)" }
            }
          >
            <input
              type="radio"
              name="type"
              value={value}
              checked={type === value}
              onChange={() => setType(value)}
              className="sr-only"
            />
            {value === "income" ? t.entries.income : t.entries.expense}
          </label>
        ))}
      </div>

      {categories.length === 0 ? (
        <p className="text-[13px] text-[var(--color-muted-2)]">
          {t.entries.noCategoriesFor(
            type === "income" ? t.entries.incomeWord : t.entries.expenseWord,
          )}
        </p>
      ) : (
        <>
          <input
            name="name"
            required
            maxLength={80}
            placeholder={t.entries.namePlaceholder}
            aria-label={t.common.name}
            className={`${field} min-w-[150px] flex-1`}
          />
          <MoneyInput
            name="amount"
            required
            placeholder="0,00"
            aria-label={t.common.amount}
            className={`${field} w-[110px] shrink-0 text-right`}
          />
          <select
            name="category"
            value={chosen}
            onChange={(e) => setCategory(e.target.value)}
            aria-label={t.common.category}
            className={`${field} shrink-0`}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label={t.common.date}
            className={`${field} shrink-0`}
          />
          <button
            type="submit"
            className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Plus size={15} /> {t.common.add}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={onMore}
        className="shrink-0 text-[12.5px] font-semibold text-[var(--color-muted)] underline underline-offset-2"
      >
        {t.entries.moreOptions}
      </button>

      {state.error && (
        <p className="w-full text-[12.5px] text-[var(--color-rust-text)]">{state.error}</p>
      )}
    </form>
  );
}
