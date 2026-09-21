"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { createEntry, updateEntry, type ActionState } from "./actions";
import { formatCurrency, toDateInputValue } from "@/lib/format";
import { tagsOf } from "@/lib/tags";
import { useT } from "@/components/LanguageProvider";
import { useKeepTypedValues } from "@/components/useKeepTypedValues";

export type EditableEntry = {
  id: string;
  name: string;
  amount: number;
  date: Date;
  type: string;
  category: string;
  note: string | null;
  method: string | null;
  accountId: string | null;
  groupId: string | null;
  seriesType: string | null;
  installmentNum: number | null;
  installmentTotal: number | null;
  splitId?: string | null;
  tags?: string;
};

type CategoryOption = { id: string; name: string };

const INPUT =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-ink)] focus:bg-[var(--color-surface-raised)]";
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
  seriesCount = 0,
  onDone,
  expenseCategories,
  incomeCategories,
  paymentMethods,
  accounts = [],
  creditCardNames = [],
}: {
  entry?: EditableEntry;
  /** How many entries share this one's groupId — the series scope is only
      offered when there is actually more than one. */
  seriesCount?: number;
  onDone?: () => void;
  expenseCategories: CategoryOption[];
  incomeCategories: CategoryOption[];
  paymentMethods: CategoryOption[];
  /** Active accounts. The field is hidden entirely when there are none. */
  accounts?: CategoryOption[];
  /** Payment methods set up as credit cards: choosing one hides Account. */
  creditCardNames?: string[];
}) {
  const { t } = useT();
  const isEditing = Boolean(entry);
  // Editing one of a series: offer to apply the change to all of them.
  const editingSeries = isEditing && Boolean(entry?.groupId) && seriesCount > 1;
  const [scope, setScope] = useState<"one" | "series">("one");
  const formId = useId();
  const [type, setType] = useState<"income" | "expense">(
    (entry?.type as "income" | "expense") ?? "expense",
  );
  const [seriesType, setSeriesType] = useState<"none" | "fixed">("none");
  // Controlled so choosing a credit card can hide the Account field.
  const [method, setMethod] = useState(entry?.method ?? "");
  // Splitting is add-only: once saved, each part is an ordinary entry that
  // edits on its own. The part inputs are uncontrolled (so the form's reset
  // after an add clears them); only how many rows to show lives in state, and
  // the running total is recomputed from the form on every input.
  const [split, setSplit] = useState(false);
  const [partCount, setPartCount] = useState(2);
  const [splitGap, setSplitGap] = useState<number | null>(null);

  const action = isEditing ? updateEntry.bind(null, entry!.id) : createEntry;
  const initialState: ActionState = {};
  const [state, formAction] = useActionState(action, initialState);
  const [submitCount, setSubmitCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  // The split case is caught client-side below; this covers every other
  // server rejection, which React 19 would otherwise answer by emptying the
  // form. resetOnSuccess is off because the effect below already decides what
  // success means here: adding resets and stays open for the next entry,
  // editing closes the modal.
  const keep = useKeepTypedValues(state, { formRef, resetOnSuccess: false });

  useEffect(() => {
    if (submitCount === 0 || state.error) return;
    if (isEditing) {
      onDone?.();
    } else {
      formRef.current?.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function currentSplitGap(): number | null {
    const form = formRef.current;
    if (!form || !split) return null;
    const total = Number((form.elements.namedItem("amount") as HTMLInputElement | null)?.value || 0);
    const parts = [...form.querySelectorAll<HTMLInputElement>('input[name="splitAmount"]')].reduce(
      (sum, el) => sum + (Number(el.value) || 0),
      0,
    );
    return Math.round((total - parts) * 100) / 100;
  }

  function recomputeSplit() {
    const gap = currentSplitGap();
    if (gap !== null) setSplitGap(gap);
  }

  const categories = type === "income" ? incomeCategories : expenseCategories;
  const paidByCard = type === "expense" && creditCardNames.includes(method);
  const showAccount = accounts.length > 0 && !paidByCard;
  const splitting = split && !isEditing;
  // Half-width fields after Notes/Category: Value, Payment method (expenses),
  // Account (when accounts exist). With an odd count the last one would leave
  // an empty cell beside it in the two-column grid, so it spans both columns.
  const halfWidthFields = 1 + (type === "expense" ? 1 : 0) + (showAccount ? 1 : 0);
  const typeWord = type === "income" ? t.entries.typeIncome : t.entries.typeExpense;

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(e) => {
        // Catch an unbalanced split here rather than on the server. React 19
        // clears a form's uncontrolled fields once its action finishes — even
        // when the action returns an error — so a server-side rejection would
        // wipe everything the owner just typed.
        const gap = currentSplitGap();
        if (gap !== null && Math.abs(gap) >= 0.005) {
          e.preventDefault();
          setSplitGap(gap);
          return;
        }
        keep.onSubmit();
        setSubmitCount((c) => c + 1);
      }}
      onInput={recomputeSplit}
      onReset={() => setSplitGap(null)}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] p-1 sm:col-span-2">
        {(["expense", "income"] as const).map((option) => (
          <label
            key={option}
            className={`flex-1 cursor-pointer rounded-full px-4 py-2 text-center text-[13px] font-semibold capitalize transition ${
              // Page-background text on an ink pill contrasts in both themes;
              // literal white turned invisible in dark mode, where ink is light.
              type === option ? "bg-[var(--color-ink)] text-[var(--background)]" : "text-[var(--color-muted)]"
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
          <Link href="/settings" className="font-semibold text-[var(--color-brand-text)]">
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

          <div className={splitting ? "sm:col-span-2" : ""}>
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

          {!splitting && (
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
          )}

          <div className={halfWidthFields === 1 ? "sm:col-span-2" : ""}>
            <label htmlFor={`${formId}-amount`} className={LABEL}>
              {splitting ? t.entries.splitTotal : t.common.value}
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
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={INPUT}
              >
                <option value="">{t.common.none}</option>
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
              {paidByCard && <p className="mt-1.5 text-xs text-[var(--color-muted-2)]">{t.cards.cardMethodHint}</p>}
            </div>
          )}

          {showAccount && (
            <div className={halfWidthFields === 3 ? "sm:col-span-2" : ""}>
              <label htmlFor={`${formId}-account`} className={LABEL}>
                {t.accounts.entryAccount}
              </label>
              <select id={`${formId}-account`} name="accountId" defaultValue={entry?.accountId ?? ""} className={INPUT}>
                <option value="">{t.accounts.noAccount}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isEditing && (
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[var(--color-ink)] sm:col-span-2">
              <input
                type="checkbox"
                name="split"
                checked={split}
                onChange={(e) => {
                  setSplit(e.target.checked);
                  setSplitGap(null);
                }}
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              {t.entries.splitToggle}
            </label>
          )}

          {splitting && (
            <div className="rounded-[14px] bg-[var(--color-inset-2)] p-3.5 sm:col-span-2">
              <div className="flex flex-col gap-2">
                {Array.from({ length: partCount }, (_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      name="splitCategory"
                      required
                      aria-label={`${t.common.category} ${i + 1}`}
                      defaultValue={categories[i % categories.length]?.name}
                      className={`${INPUT} flex-1`}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      name="splitAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      aria-label={`${t.common.amount} ${i + 1}`}
                      placeholder="0.00"
                      className={`${INPUT} w-[130px]`}
                    />
                    <button
                      type="button"
                      disabled={partCount <= 2}
                      aria-label={t.entries.removePart}
                      onClick={() => {
                        setPartCount((n) => Math.max(2, n - 1));
                        setSplitGap(null);
                      }}
                      className="rounded p-1 text-[var(--color-muted-2)] hover:text-[var(--color-rust-text)] disabled:opacity-30"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={partCount >= 8}
                  onClick={() => setPartCount((n) => Math.min(8, n + 1))}
                  className="flex items-center gap-1 text-[12.5px] font-semibold text-[var(--color-brand-text)] disabled:opacity-40"
                >
                  <Plus size={13} /> {t.entries.addPart}
                </button>
                {splitGap !== null && (
                  <span
                    className="font-mono text-[12px]"
                    style={{ color: Math.abs(splitGap) < 0.005 ? "var(--color-positive-text)" : "var(--color-rust-text)" }}
                  >
                    {Math.abs(splitGap) < 0.005 ? t.entries.splitBalanced : t.entries.splitLeft(formatCurrency(splitGap))}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="sm:col-span-2">
            <label htmlFor={`${formId}-tags`} className={LABEL}>
              {t.entries.tags}
            </label>
            <input
              id={`${formId}-tags`}
              name="tags"
              type="text"
              maxLength={200}
              defaultValue={tagsOf(entry?.tags).join(", ")}
              placeholder={t.entries.tagsPlaceholder}
              className={INPUT}
            />
          </div>

          {!isEditing && !splitting && (
            <div className="sm:col-span-2">
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
                <p className="mt-1.5 text-xs text-[var(--color-muted-2)]">{t.entries.installmentsHint}</p>
              )}
            </div>
          )}

          {editingSeries && (
            <div className="sm:col-span-2">
              <p className={LABEL}>{t.entries.applyTo}</p>
              {/* Defaults to this entry alone: a bulk rewrite should always be
                  something the owner picked, never the path of least effort. */}
              <input type="hidden" name="scope" value={scope} />
              <div className="flex flex-wrap gap-2">
                {(["one", "series"] as const).map((option) => {
                  const active = scope === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setScope(option)}
                      className="rounded-full px-4 py-2 text-[13px] font-semibold transition"
                      style={{
                        background: active ? "var(--color-brand-tint)" : "var(--color-inset)",
                        color: active ? "var(--color-brand-text)" : "var(--color-muted)",
                      }}
                    >
                      {option === "one" ? t.entries.applyToOne : t.entries.applyToSeries(seriesCount)}
                    </button>
                  );
                })}
              </div>
              {scope === "series" && (
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--color-muted-2)]">
                  {t.entries.applyToSeriesHint}
                </p>
              )}
            </div>
          )}

          {state.error && <p className="text-sm text-[var(--color-rust-text)] sm:col-span-2">{state.error}</p>}

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
