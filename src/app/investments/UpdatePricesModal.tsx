"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { savePrices, type ActionState } from "./actions";
import { latestPrice } from "@/lib/investments";
import { valuation } from "@/lib/investmentTypes";
import { formatCurrency, toDateInputValue } from "@/lib/format";
import type { Holding } from "./InvestmentsClient";

const LABEL = "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)]";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_4px_16px_rgba(12,158,87,0.28)] transition hover:brightness-105 active:scale-95 disabled:opacity-50"
      style={{ background: "linear-gradient(135deg, #0c9e57, #0a7a43)" }}
    >
      {pending ? "Saving…" : "Save prices"}
    </button>
  );
}

export function UpdatePricesModal({ holdings, onDone }: { holdings: Holding[]; onDone: () => void }) {
  const formId = useId();
  const initialState: ActionState = {};
  const [state, formAction] = useActionState(savePrices, initialState);
  const [submitCount, setSubmitCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (submitCount === 0 || state.error) return;
    onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={() => setSubmitCount((c) => c + 1)}
      className="flex flex-col gap-4"
    >
      <div>
        <label htmlFor={`${formId}-date`} className={LABEL}>
          Date
        </label>
        <input
          id={`${formId}-date`}
          name="date"
          type="date"
          required
          defaultValue={toDateInputValue(new Date())}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-ink)] focus:bg-white sm:w-56"
        />
      </div>

      <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
        {holdings.map((h) => {
          const latest = latestPrice(h);
          const mode = valuation(h.type, h.subtype).mode;
          return (
            <div
              key={h.id}
              className="flex items-center gap-3 rounded-xl bg-[var(--color-panel)] px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[var(--color-ink)]">{h.name}</p>
                <p className="text-[11px] text-[var(--color-muted-2)]">
                  {latest ? `Last: ${formatCurrency(latest.price)}` : "No manual value yet"}
                  {" · "}
                  {mode === "unit" ? "price per unit" : "current total value"}
                </p>
              </div>
              <input
                name={`price:${h.id}`}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-28 rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-right font-mono text-[13px] outline-none focus:border-[var(--color-ink)]"
              />
            </div>
          );
        })}
        {holdings.length === 0 && (
          <p className="py-4 text-center text-[13px] text-[var(--color-muted-2)]">Add a holding first.</p>
        )}
      </div>

      {state.error && <p className="text-sm text-[#dc3545]">{state.error}</p>}

      <div className="flex items-center gap-4">
        <SubmitButton />
        <button
          type="button"
          onClick={onDone}
          className="text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
