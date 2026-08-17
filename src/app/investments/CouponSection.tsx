"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addCoupon, deleteCoupon, updateCoupon, type ActionState } from "./actions";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { totalCoupons } from "@/lib/investments";
import type { Holding } from "./InvestmentsClient";
import { useT } from "@/components/LanguageProvider";

/**
 * Coupon payments (juros semestrais and similar) for one holding: running
 * total, add form, and the editable/deletable list.
 *
 * Lives in its own file so the holding-detail modal and the row's dedicated
 * "Coupon" modal render exactly the same thing — this used to be inline in
 * HoldingDetail, and duplicating it for the second entry point would have
 * meant two copies of the add/edit/delete wiring drifting apart.
 *
 * Callers are responsible for the showsRateFields() gate — coupons only make
 * sense for Renda Fixa/Fundo, not Ação/Cripto/Outro.
 */

function CouponRow({ id, date, amount }: { id: string; date: Date; amount: number }) {
  const { t, lang } = useT();
  const [editing, setEditing] = useState(false);
  const initialState: ActionState = {};
  const [state, formAction] = useActionState(updateCoupon.bind(null, id), initialState);
  const [handledState, setHandledState] = useState(state);

  if (state !== handledState) {
    setHandledState(state);
    if (!state.error) setEditing(false);
  }

  if (editing) {
    return (
      <form action={formAction} className="flex items-center justify-between gap-2 py-1.5">
        <span className="font-mono text-[12px] text-[var(--color-muted-2)]">{formatDate(date, lang)}</span>
        <div className="flex items-center gap-2">
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={amount}
            autoFocus
            aria-label={t.investments.couponAmountFor(formatDate(date, lang))}
            className="w-24 rounded-lg border border-[var(--color-border)] bg-white px-2 py-1 text-right font-mono text-[12.5px] outline-none focus:border-[var(--color-ink)]"
          />
          <button type="submit" className="text-xs font-semibold text-[var(--color-brand)]">
            {t.common.save}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs font-semibold text-[var(--color-muted)]"
          >
            {t.common.cancel}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="font-mono text-[12px] text-[var(--color-muted-2)]">{formatDate(date, lang)}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[12.5px] font-medium text-[var(--color-positive)]">
          +{formatCurrency(amount)}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="-my-1 rounded px-1.5 py-1 text-xs font-semibold text-[var(--color-muted-2)] hover:text-[var(--color-ink)]"
        >
          {t.common.edit}
        </button>
        <form
          action={deleteCoupon.bind(null, id)}
          onSubmit={(e) => {
            if (!confirm(t.investments.confirmDeleteCoupon)) e.preventDefault();
          }}
        >
          <button
            type="submit"
            className="-my-1 rounded px-1.5 py-1 text-xs font-semibold text-[var(--color-muted-2)] hover:text-[#dc3545]"
          >
            {t.common.delete}
          </button>
        </form>
      </div>
    </div>
  );
}

function CouponAddForm({ investmentId }: { investmentId: string }) {
  const { t } = useT();
  const initialState: ActionState = {};
  const [state, formAction] = useActionState(addCoupon.bind(null, investmentId), initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset the uncontrolled date/amount fields after a successful add, same
  // pattern as EntryForm.tsx — only the reset lives in the effect, not any
  // controlled state, so this doesn't hit the set-state-in-effect rule.
  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2 pb-3">
      <div>
        <label
          htmlFor={`coupon-date-${investmentId}`}
          className="mb-1 block text-[10px] font-bold tracking-wide text-[var(--color-muted-2)] uppercase"
        >
          {t.common.date}
        </label>
        <input
          id={`coupon-date-${investmentId}`}
          name="date"
          type="date"
          required
          defaultValue={toDateInputValue(new Date())}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5 text-[12.5px] outline-none focus:border-[var(--color-ink)] focus:bg-white"
        />
      </div>
      <div>
        <label
          htmlFor={`coupon-amount-${investmentId}`}
          className="mb-1 block text-[10px] font-bold tracking-wide text-[var(--color-muted-2)] uppercase"
        >
          {t.common.amount}
        </label>
        <input
          id={`coupon-amount-${investmentId}`}
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="0.00"
          className="w-28 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5 text-[12.5px] outline-none focus:border-[var(--color-ink)] focus:bg-white"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-white"
        style={{ background: "var(--gradient-brand)" }}
      >
        {t.investments.addCoupon}
      </button>
      {state.error && (
        <p className="w-full text-[12px] text-[var(--color-rust)]">{state.error}</p>
      )}
    </form>
  );
}

export function CouponSection({ holding }: { holding: Holding }) {
  const { t } = useT();
  const couponsDesc = [...holding.coupons].sort((a, b) => b.date.getTime() - a.date.getTime());
  const couponsReceived = totalCoupons(holding);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold tracking-wide text-[var(--color-muted-2)] uppercase">
          {t.investments.couponPayments}
        </p>
        {couponsReceived > 0 && (
          <p className="font-mono text-[11.5px] font-medium text-[var(--color-positive)]">
            {formatCurrency(couponsReceived)} {t.investments.totalReceived}
          </p>
        )}
      </div>
      <CouponAddForm investmentId={holding.id} />
      <div className="flex max-h-64 flex-col divide-y divide-black/[0.04] overflow-y-auto">
        {couponsDesc.map((c) => (
          <CouponRow key={c.id} id={c.id} date={c.date} amount={c.amount} />
        ))}
        {couponsDesc.length === 0 && (
          <p className="py-4 text-center text-[13px] text-[var(--color-muted-2)]">
            {t.investments.noCoupons}
          </p>
        )}
      </div>
    </div>
  );
}
