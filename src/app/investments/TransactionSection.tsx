"use client";

import { useActionState, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Trash2 } from "lucide-react";
import { addTransaction, deleteTransaction, type ActionState } from "./actions";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { showsPosition } from "@/lib/investmentTypes";
import { investedAt, quantityAt } from "@/lib/investments";
import { useT } from "@/components/LanguageProvider";
import type { Holding } from "./InvestmentsClient";

/**
 * Dated buy/sell log for one holding.
 *
 * Extracted as its own component from the start, following what CouponSection
 * had to be refactored into once it needed a second entry point.
 *
 * The banner matters: the first transaction changes how the holding is valued,
 * from the stored amountInvested to the sum of dated flows. Someone recording
 * one should know that, rather than discovering their totals moved.
 */
export function TransactionSection({ holding }: { holding: Holding }) {
  const { t, lang } = useT();
  const [state, formAction] = useActionState(
    addTransaction.bind(null, holding.id),
    {} as ActionState,
  );
  const [kind, setKind] = useState<"buy" | "sell">("buy");

  const txs = [...(holding.transactions ?? [])].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
  // Same rule the add/edit form uses for showing quantity fields, so the units
  // input appears exactly where a unit count is meaningful.
  const perUnit = showsPosition(holding.type, holding.subtype);
  const invested = investedAt(holding);
  const units = quantityAt(holding);

  const inputClass =
    "rounded-[10px] bg-[var(--color-inset)] px-3 py-2 text-[13px] text-[var(--color-ink)] outline-none focus:ring-1 focus:ring-[var(--color-ink)]";

  return (
    <div className="mt-6">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-[15px] font-extrabold tracking-tight">{t.investments.transactions}</h3>
        {txs.length > 0 && (
          <span className="shrink-0 font-mono text-[12px] whitespace-nowrap text-[var(--color-muted)] tabular-nums">
            {t.investments.netInvested} {formatCurrency(invested)}
            {perUnit ? ` · ${units} ${t.investments.units}` : ""}
          </span>
        )}
      </div>
      <p className="mb-3 text-[12px] text-[var(--color-muted-2)]">
        {txs.length === 0 ? t.investments.transactionsEmptyHint : t.investments.transactionsActiveHint}
      </p>

      <form action={formAction} className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-muted-2)]">
            {t.investments.kind}
          </span>
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as "buy" | "sell")}
            className={inputClass}
          >
            <option value="buy">{t.investments.buy}</option>
            <option value="sell">{t.investments.sell}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-muted-2)]">
            {t.common.date}
          </span>
          <input
            type="date"
            name="date"
            required
            defaultValue={toDateInputValue(new Date())}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-muted-2)]">
            {t.common.amount}
          </span>
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0"
            required
            placeholder="0,00"
            className={`${inputClass} w-[120px]`}
          />
        </label>
        {perUnit && (
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-muted-2)]">
              {t.investments.units}
            </span>
            <input
              type="number"
              name="quantity"
              step="any"
              min="0"
              placeholder="0"
              className={`${inputClass} w-[100px]`}
            />
          </label>
        )}
        <button
          type="submit"
          className="rounded-full px-4 py-2 text-[13px] font-semibold text-white transition hover:brightness-105 active:scale-95"
          style={{ background: "var(--gradient-brand)" }}
        >
          {t.common.add}
        </button>
      </form>
      {state.error && <p className="mb-2 text-[12.5px] text-[var(--color-rust-text)]">{state.error}</p>}

      {txs.length === 0 ? (
        <p className="text-[13px] text-[var(--color-muted-2)]">{t.investments.noTransactions}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {txs.map((tx) => {
            const isSell = tx.kind === "sell";
            return (
              <li
                key={tx.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] bg-[var(--color-inset)] px-3 py-2"
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: isSell ? "var(--color-rust-tint)" : "var(--color-positive-tint)",
                    color: isSell ? "var(--color-rust-text)" : "var(--color-positive-text)",
                  }}
                >
                  {isSell ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                </span>
                <span className="font-mono text-[12.5px] whitespace-nowrap text-[var(--color-muted)] tabular-nums">
                  {formatDate(tx.date, lang)}
                </span>
                <span className="text-[12.5px] font-semibold">
                  {isSell ? t.investments.sell : t.investments.buy}
                </span>
                <span className="min-w-0 flex-1" />
                {tx.quantity != null && (
                  <span className="shrink-0 font-mono text-[12px] whitespace-nowrap text-[var(--color-muted-2)] tabular-nums">
                    {tx.quantity} {t.investments.units}
                  </span>
                )}
                <span
                  className="shrink-0 font-mono text-[13px] font-semibold whitespace-nowrap tabular-nums"
                  style={{ color: isSell ? "var(--color-rust-text)" : "var(--color-ink)" }}
                >
                  {isSell ? "−" : "+"}
                  {formatCurrency(tx.amount)}
                </span>
                <form action={deleteTransaction.bind(null, tx.id)} className="flex shrink-0">
                  <button
                    type="submit"
                    aria-label={t.investments.deleteTransaction}
                    className="rounded p-1 text-[var(--color-muted-2)] transition hover:text-[var(--color-rust-text)]"
                  >
                    <Trash2 size={13} />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
