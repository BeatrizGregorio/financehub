"use client";

import { useActionState, useEffect, useRef } from "react";
import { CreditCard, X } from "lucide-react";
import { addPaymentMethod, removePaymentMethod, type ActionState } from "./actions";
import { CARD } from "@/lib/ui";
import { useT } from "@/components/LanguageProvider";

export function PaymentMethodManager({
  methods,
}: {
  methods: { id: string; name: string }[];
}) {
  const initialState: ActionState = {};
  const { t } = useT();
  const [state, formAction] = useActionState(addPaymentMethod, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const submitCount = useRef(0);

  useEffect(() => {
    if (submitCount.current === 0) return;
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <div className={`${CARD} p-[22px]`}>
      <h2 className="mb-1 text-base font-extrabold tracking-tight">{t.settings.paymentMethods}</h2>
      <p className="mb-3.5 text-[12.5px] text-[var(--color-muted-2)]">
        {t.settings.paymentMethodsBlurb}
      </p>

      <div className="mb-3.5 flex flex-wrap gap-2">
        {methods.map((m) => (
          <form key={m.id} action={removePaymentMethod.bind(null, m.id)}>
            <button
              type="submit"
              className="flex items-center gap-[7px] rounded-full bg-[var(--color-inset)] py-[7px] pl-3 pr-2.5 text-[13px] font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-track)]"
            >
              <CreditCard size={14} className="opacity-50" />
              {m.name}
              <X size={13} className="opacity-40" />
            </button>
          </form>
        ))}
        {methods.length === 0 && <p className="text-[13px] text-[var(--color-muted-2)]">{t.settings.noMethods}</p>}
      </div>

      <form
        ref={formRef}
        action={formAction}
        onSubmit={() => (submitCount.current += 1)}
        className="flex gap-2"
      >
        <input
          name="name"
          type="text"
          maxLength={40}
          aria-label={t.settings.newMethodName}
          placeholder={t.settings.newMethodPlaceholder}
          className="flex-1 rounded-full bg-[var(--color-inset)] px-4 py-2.5 text-[13px] outline-none focus:bg-[var(--color-surface-raised)] focus:ring-1 focus:ring-[var(--color-ink)]"
        />
        <button
          type="submit"
          className="rounded-full px-[19px] text-[13px] font-semibold text-white transition hover:brightness-105 active:scale-95"
          style={{ background: "var(--gradient-brand)" }}
        >
          {t.common.add}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-[var(--color-rust-text)]">{state.error}</p>}
    </div>
  );
}
