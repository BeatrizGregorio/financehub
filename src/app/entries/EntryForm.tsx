"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createEntry, updateEntry, type ActionState } from "./actions";
import { toDateInputValue } from "@/lib/format";
import { useT } from "@/components/LanguageProvider";

export type EditableEntry = {
  id: string;
  name: string;
  amount: number;
  date: Date;
  type: string;
  category: string;
  note: string | null;
  method: string | null;
  groupId: string | null;
  seriesType: string | null;
  installmentNum: number | null;
  installmentTotal: number | null;
};

type CategoryOption = { id: string; name: string };

const INPUT =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-ink)] focus:bg-white";
const LABEL = "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)]";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95 disabled:opacity-50"
      style={{ background: "var(--gradient-brand)" }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function EntryForm({
  entry,
  onDone,
  expenseCategories,
  incomeCategories,
  paymentMethods,
}: {
  entry?: EditableEntry;
  onDone?: () => void;
  expenseCategories: CategoryOption[];
  incomeCategories: CategoryOption[];
  paymentMethods: CategoryOption[];
}) {
  const { t } = useT();
  const isEditing = Boolean(entry);
  const formId = useId();
  const [type, setType] = useState<"income" | "expense">(
    (entry?.type as "income" | "expense") ?? "expense",
  );
  const [seriesType, setSeriesType] = useState<"none" | "fixed">("none");

  const action = isEditing ? updateEntry.bind(null, entry!.id) : createEntry;
  const initialState: ActionState = {};
  const [state, formAction] = useActionState(action, initialState);
  const [submitCount, setSubmitCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (submitCount === 0 || state.error) return;
    if (isEditing) {
      onDone?.();
    } else {
      formRef.current?.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const categories = type === "income" ? incomeCategories : expenseCategories;
  const typeWord = type === "income" ? t.entries.typeIncome : t.entries.typeExpense;

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={() => setSubmitCount((c) => c + 1)}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] p-1 sm:col-span-2">
        {(["expense", "income"] as const).map((option) => (
          <label
            key={option}
            className={`flex-1 cursor-pointer rounded-full px-4 py-2 text-center text-[13px] font-semibold capitalize transition ${
              type === option ? "bg-[var(--color-ink)] text-white" : "text-[var(--color-muted)]"
            }`}
          >
            <input
              type="radio"
              name="type"
              value={option}
              checked={type === option}
              onChange={() => setType(option)}
              className="sr-only"
            />
            {option === "income" ? t.entries.typeIncome : t.entries.typeExpense}
          </label>
        ))}
      </div>

      {categories.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--color-muted-2)] sm:col-span-2">
          {t.entries.noCategoriesFor(typeWord)}{" "}
          <Link href="/settings" className="font-semibold text-[var(--color-brand)]">
            {t.entries.addOneInSettings}
          </Link>{" "}
          {t.entries.beforeLogging(type === "income" ? t.entries.incomeWord : t.entries.expenseWord)}
        </p>
      ) : (
        <>
      <div>
        <label htmlFor={`${formId}-name`} className={LABEL}>
          {t.common.name}
        </label>
        <input
          id={`${formId}-name`}
          name="name"
          type="text"
          maxLength={80}
          required
          defaultValue={entry?.name}
          placeholder={t.entries.namePlaceholder}
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-date`} className={LABEL}>
          {t.common.date}
        </label>
        <input
          id={`${formId}-date`}
          name="date"
          type="date"
          required
          defaultValue={toDateInputValue(entry?.date ?? new Date())}
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-note`} className={LABEL}>
          {t.entries.notes}
        </label>
        <input
          id={`${formId}-note`}
          name="note"
          type="text"
          maxLength={200}
          defaultValue={entry?.note ?? ""}
          placeholder={t.entries.notesPlaceholder}
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-category`} className={LABEL}>
          {t.common.category}
        </label>
        <select
          id={`${formId}-category`}
          name="category"
          required
          defaultValue={entry?.category}
          key={type}
          className={INPUT}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className={type === "expense" || !isEditing ? "" : "sm:col-span-2"}>
        <label htmlFor={`${formId}-amount`} className={LABEL}>
          {t.common.value}
        </label>
        <input
          id={`${formId}-amount`}
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={entry?.amount}
          placeholder="0.00"
          className={INPUT}
        />
      </div>

      {type === "expense" && (
        <div>
          <label htmlFor={`${formId}-method`} className={LABEL}>
            {t.entries.paymentMethod}
          </label>
          <select
            id={`${formId}-method`}
            name="method"
            defaultValue={entry?.method ?? ""}
            className={INPUT}
          >
            <option value="">{t.common.none}</option>
            {paymentMethods.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isEditing && (
        <div className={type === "expense" ? "sm:col-span-2" : "sm:col-start-2"}>
          <label className={LABEL}>{t.entries.repetition}</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              name="seriesType"
              value={seriesType}
              onChange={(e) => setSeriesType(e.target.value as "none" | "fixed")}
              className={INPUT}
            >
              <option value="none">{t.entries.oneTime}</option>
              <option value="fixed">{t.entries.repeatsMonthly}</option>
            </select>

            {type === "expense" && seriesType === "none" && (
              <input
                name="installments"
                type="number"
                min="1"
                max="36"
                defaultValue={1}
                placeholder={t.entries.installments}
                className={INPUT}
              />
            )}
          </div>
          {type === "expense" && seriesType === "none" && (
            <p className="mt-1.5 text-xs text-[var(--color-muted-2)]">
              {t.entries.installmentsHint}
            </p>
          )}
        </div>
      )}

      {state.error && <p className="text-sm text-[#dc3545] sm:col-span-2">{state.error}</p>}

      <div className="flex items-center gap-4 sm:col-span-2">
        <SubmitButton
          label={isEditing ? t.common.saveChanges : t.entries.addEntry}
          pendingLabel={isEditing ? t.common.saving : t.common.adding}
        />
        <button
          type="button"
          onClick={onDone}
          className="text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          {t.common.cancel}
        </button>
      </div>
        </>
      )}
    </form>
  );
}
