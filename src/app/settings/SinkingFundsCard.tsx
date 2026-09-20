"use client";

import { useActionState, useState } from "react";
import { CalendarHeart, Check, Trash2 } from "lucide-react";
import { createFund, deleteFund, markFundPaid, setFundSaved, type ActionState } from "./fundActions";
import { fundStatus, monthlySetAside } from "@/lib/sinkingFunds";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { CARD } from "@/lib/ui";
import { useT } from "@/components/LanguageProvider";
import { useKeepTypedValues } from "@/components/useKeepTypedValues";

export type FundRow = {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  repeatsYearly: boolean;
  savedAmount: number;
  category: string | null;
};

const FIELD =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-[13px] outline-none transition focus:border-[var(--color-ink)] focus:bg-[var(--color-surface-raised)]";
const MICRO = "mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-muted-2)]";

function SavedForm({ fund }: { fund: FundRow }) {
  const { t } = useT();
  const [state, action] = useActionState(setFundSaved.bind(null, fund.id), {} as ActionState);
  return (
    // Keyed by the saved value in the parent, so a successful save remounts
    // this with the new number rather than leaving a stale input behind.
    <form action={action} className="flex items-center gap-1.5">
      <div className="flex items-center gap-1 rounded-[10px] bg-[var(--color-inset)] px-2.5 py-0.5">
        <span className="font-mono text-[11px] text-[var(--color-muted-2)]">R$</span>
        <input
          name="savedAmount"
          type="number"
          step="0.01"
          min="0"
          defaultValue={fund.savedAmount}
          aria-label={t.settings.fundSavedFor(fund.name)}
          className="w-20 bg-transparent py-1 text-right font-mono text-[12.5px] outline-none"
        />
      </div>
      <button type="submit" className="text-xs font-semibold text-[var(--color-brand-text)]">
        {t.common.save}
      </button>
      {state.error && <span className="text-[11px] text-[var(--color-rust-text)]">{state.error}</span>}
    </form>
  );
}

export function SinkingFundsCard({ funds, expenseCategories }: { funds: FundRow[]; expenseCategories: { id: string; name: string }[] }) {
  const { t, lang } = useT();
  const [state, action] = useActionState(createFund, {} as ActionState);
  const [adding, setAdding] = useState(false);
  // The key on the form below clears it on success; this keeps what was typed
  // when the server rejects it.
  const keepAdd = useKeepTypedValues(state, { resetOnSuccess: false });
  const today = new Date();

  return (
    <div className={`${CARD} p-[22px] md:col-span-2`}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarHeart size={16} className="shrink-0 text-[var(--color-brand-text)]" />
          <h2 className="text-base font-extrabold tracking-tight">{t.settings.fundsTitle}</h2>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full px-4 py-2 text-[13px] font-semibold text-white transition hover:brightness-105 active:scale-95"
            style={{ background: "var(--gradient-brand)" }}
          >
            {t.settings.fundsAdd}
          </button>
        )}
      </div>
      <p className="mb-3.5 text-[12.5px] text-[var(--color-muted-2)]">{t.settings.fundsBlurb}</p>

      {adding && (
        // Keyed on the fund count so a successful add clears the form.
        <form
          key={funds.length}
          action={action}
          {...keepAdd.formProps}
          className="mb-4 grid grid-cols-1 gap-3 rounded-[14px] bg-[var(--color-inset-2)] p-3.5 sm:grid-cols-2 lg:grid-cols-5"
        >
          <label className="lg:col-span-2">
            <span className={MICRO}>{t.common.name}</span>
            <input name="name" required maxLength={60} placeholder={t.settings.fundNamePlaceholder} className={FIELD} />
          </label>
          <label>
            <span className={MICRO}>{t.common.amount}</span>
            <input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" className={FIELD} />
          </label>
          <label>
            <span className={MICRO}>{t.settings.fundDue}</span>
            <input name="dueDate" type="date" required defaultValue={toDateInputValue(today)} className={FIELD} />
          </label>
          <label>
            <span className={MICRO}>{t.settings.fundSavedSoFar}</span>
            <input name="savedAmount" type="number" step="0.01" min="0" placeholder="0.00" className={FIELD} />
          </label>
          <label className="sm:col-span-2 lg:col-span-2">
            <span className={MICRO}>{t.settings.fundCategory}</span>
            <select name="category" defaultValue="" className={FIELD}>
              <option value="">{t.common.none}</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-[13px] text-[var(--color-ink)] lg:col-span-2">
            <input type="checkbox" name="repeatsYearly" defaultChecked className="h-4 w-4 accent-[var(--color-brand)]" />
            {t.settings.fundRepeats}
          </label>
          <div className="flex items-center gap-3 self-end pb-1">
            <button type="submit" className="rounded-xl px-4 py-2 text-[13px] font-semibold text-white" style={{ background: "var(--gradient-brand)" }}>
              {t.common.add}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="text-[13px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              {t.common.cancel}
            </button>
          </div>
          {state.error && <p className="text-[12.5px] text-[var(--color-rust-text)] sm:col-span-2 lg:col-span-5">{state.error}</p>}
        </form>
      )}

      {funds.length === 0 ? (
        <p className="text-[13px] text-[var(--color-muted-2)]">{t.settings.fundsEmpty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--color-border)]">
          {funds.map((f) => {
            const status = fundStatus(f, today);
            const monthly = monthlySetAside(f, today);
            return (
              <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <div className="min-w-[180px] flex-1">
                  <p className="text-[13.5px] font-bold text-[var(--color-ink)]">{f.name}</p>
                  <p className="text-[11.5px] text-[var(--color-muted-2)]">
                    {t.settings.fundDueLine(formatDate(f.dueDate, lang), formatCurrency(f.amount))}
                    {f.repeatsYearly ? ` · ${t.settings.fundYearly}` : ""}
                    {f.category ? ` · ${f.category}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <span className="font-mono text-[13px] font-semibold text-[var(--color-ink)] tabular-nums">
                    {status === "done" ? t.settings.fundStatus.done : t.settings.fundPerMonth(formatCurrency(monthly))}
                  </span>
                  <span
                    className="font-mono text-[10px] tracking-wide uppercase"
                    style={{
                      color:
                        status === "behind" || status === "passed"
                          ? "var(--color-rust-text)"
                          : status === "done"
                            ? "var(--color-positive-text)"
                            : "var(--color-muted-2)",
                    }}
                  >
                    {t.settings.fundStatus[status]}
                  </span>
                </div>
                <SavedForm key={`${f.id}-${f.savedAmount}`} fund={f} />
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void markFundPaid(f.id)}
                    title={f.repeatsYearly ? t.settings.fundPaidYearlyHint : t.settings.fundPaidOnceHint}
                    className="flex items-center gap-1 rounded-full bg-[var(--color-panel)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-track)]"
                  >
                    <Check size={12} /> {t.settings.fundPaid}
                  </button>
                  <button
                    type="button"
                    aria-label={t.common.delete}
                    onClick={() => {
                      if (confirm(t.settings.fundConfirmDelete)) void deleteFund(f.id);
                    }}
                    className="rounded p-1 text-[var(--color-muted-2)] hover:text-[var(--color-rust-text)]"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
