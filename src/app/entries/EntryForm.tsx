"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createEntry, updateEntry, type ActionState } from "./actions";
import { toDateInputValue } from "@/lib/format";

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
      className="rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_4px_16px_rgba(12,158,87,0.28)] transition hover:brightness-105 active:scale-95 disabled:opacity-50"
      style={{ background: "linear-gradient(135deg, #0c9e57, #0a7a43)" }}
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

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={() => setSubmitCount((c) => c + 1)}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] p-1 sm:col-span-2">
        {(["expense", "income"] as const).map((t) => (
          <label
            key={t}
            className={`flex-1 cursor-pointer rounded-full px-4 py-2 text-center text-[13px] font-semibold capitalize transition ${
              type === t ? "bg-[var(--color-ink)] text-white" : "text-[var(--color-muted)]"
            }`}
          >
            <input
              type="radio"
              name="type"
              value={t}
              checked={type === t}
              onChange={() => setType(t)}
              className="sr-only"
            />
            {t}
          </label>
        ))}
      </div>

      {categories.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--color-muted-2)] sm:col-span-2">
          You don&apos;t have any {type} categories yet.{" "}
          <Link href="/settings" className="font-semibold text-[var(--color-meadow)]">
            Add one in Settings
          </Link>{" "}
          before logging {type === "income" ? "income" : "an expense"}.
        </p>
      ) : (
        <>
      <div>
        <label htmlFor={`${formId}-name`} className={LABEL}>
          Name
        </label>
        <input
          id={`${formId}-name`}
          name="name"
          type="text"
          maxLength={80}
          required
          defaultValue={entry?.name}
          placeholder="e.g. Trader Joe's"
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-date`} className={LABEL}>
          Date
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
          Notes (optional)
        </label>
        <input
          id={`${formId}-note`}
          name="note"
          type="text"
          maxLength={200}
          defaultValue={entry?.note ?? ""}
          placeholder="e.g. bought for team lunch"
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-category`} className={LABEL}>
          Category
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
          Value
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
            Payment method (optional)
          </label>
          <select
            id={`${formId}-method`}
            name="method"
            defaultValue={entry?.method ?? ""}
            className={INPUT}
          >
            <option value="">None</option>
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
          <label className={LABEL}>Repetition (optional)</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              name="seriesType"
              value={seriesType}
              onChange={(e) => setSeriesType(e.target.value as "none" | "fixed")}
              className={INPUT}
            >
              <option value="none">One time</option>
              <option value="fixed">Repeats monthly (12 months)</option>
            </select>

            {type === "expense" && seriesType === "none" && (
              <input
                name="installments"
                type="number"
                min="1"
                max="36"
                defaultValue={1}
                placeholder="Installments"
                className={INPUT}
              />
            )}
          </div>
          {type === "expense" && seriesType === "none" && (
            <p className="mt-1.5 text-xs text-[var(--color-muted-2)]">
              Installments splits the amount evenly across that many months.
            </p>
          )}
        </div>
      )}

      {state.error && <p className="text-sm text-[#dc3545] sm:col-span-2">{state.error}</p>}

      <div className="flex items-center gap-4 sm:col-span-2">
        <SubmitButton
          label={isEditing ? "Save changes" : "Add entry"}
          pendingLabel={isEditing ? "Saving…" : "Adding…"}
        />
        <button
          type="button"
          onClick={onDone}
          className="text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          Cancel
        </button>
      </div>
        </>
      )}
    </form>
  );
}
