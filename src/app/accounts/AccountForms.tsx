"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { createAccount, createTransfer, updateAccount, type ActionState } from "./actions";
import { ACCOUNT_KINDS } from "@/lib/accounts";
import { toDateInputValue } from "@/lib/format";
import { useT } from "@/components/LanguageProvider";

export const INPUT =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-ink)] focus:bg-[var(--color-surface-raised)]";
export const LABEL = "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)]";

function Submit({ label }: { label: string }) {
  const { t } = useT();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95 disabled:opacity-50"
      style={{ background: "var(--gradient-brand)" }}
    >
      {pending ? t.common.saving : label}
    </button>
  );
}

/**
 * Close on a successful submit. Same submitCount pattern as EntryForm: the
 * effect only calls the parent's callback, never a local setState.
 */
function useCloseOnSuccess(state: ActionState, onDone: () => void) {
  const [submitted, setSubmitted] = useState(0);
  useEffect(() => {
    if (submitted === 0 || state.error) return;
    onDone();
  }, [state, submitted, onDone]);
  return () => setSubmitted((n) => n + 1);
}

export type EditableAccount = {
  id: string;
  name: string;
  kind: string;
  openingBalance: number;
  openingDate: Date;
};

export function AccountForm({ account, onDone }: { account?: EditableAccount; onDone: () => void }) {
  const { t } = useT();
  const action = account ? updateAccount.bind(null, account.id) : createAccount;
  const [state, formAction] = useActionState(action, {} as ActionState);
  const markSubmitted = useCloseOnSuccess(state, onDone);

  return (
    <form action={formAction} onSubmit={markSubmitted} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="acc-name" className={LABEL}>{t.accounts.name}</label>
        <input
          id="acc-name"
          name="name"
          required
          maxLength={60}
          defaultValue={account?.name}
          placeholder={t.accounts.namePlaceholder}
          className={INPUT}
        />
      </div>
      <div>
        <label htmlFor="acc-kind" className={LABEL}>{t.accounts.kind}</label>
        <select id="acc-kind" name="kind" defaultValue={account?.kind ?? "checking"} className={INPUT}>
          {ACCOUNT_KINDS.map((k) => (
            <option key={k} value={k}>
              {t.accounts.kinds[k]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="acc-balance" className={LABEL}>{t.accounts.openingBalance}</label>
        <input
          id="acc-balance"
          name="openingBalance"
          type="number"
          step="0.01"
          defaultValue={account?.openingBalance ?? ""}
          placeholder="0.00"
          className={INPUT}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="acc-date" className={LABEL}>{t.accounts.openingDate}</label>
        <input
          id="acc-date"
          name="openingDate"
          type="date"
          required
          defaultValue={toDateInputValue(account?.openingDate ?? new Date())}
          className={`${INPUT} sm:max-w-[220px]`}
        />
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-muted-2)]">{t.accounts.openingHint}</p>
      </div>

      {state.error && <p className="text-sm text-[var(--color-rust-text)] sm:col-span-2">{state.error}</p>}
      <div className="flex items-center gap-4 sm:col-span-2">
        <Submit label={t.accounts.saveAccount} />
        <button
          type="button"
          onClick={onDone}
          className="text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}

export function TransferForm({
  accounts,
  investments,
  onDone,
}: {
  accounts: { id: string; name: string }[];
  investments: { id: string; name: string }[];
  onDone: () => void;
}) {
  const { t } = useT();
  const [state, formAction] = useActionState(createTransfer, {} as ActionState);
  const markSubmitted = useCloseOnSuccess(state, onDone);
  const [to, setTo] = useState(accounts[1] ? `account:${accounts[1].id}` : "");

  if (accounts.length === 0) {
    return <p className="py-4 text-[13px] text-[var(--color-muted-2)]">{t.accounts.addAccountFirst}</p>;
  }

  return (
    <form action={formAction} onSubmit={markSubmitted} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="tr-from" className={LABEL}>{t.accounts.from}</label>
        <select id="tr-from" name="from" required defaultValue={accounts[0].id} className={INPUT}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="tr-to" className={LABEL}>{t.accounts.to}</label>
        <select id="tr-to" name="to" required value={to} onChange={(e) => setTo(e.target.value)} className={INPUT}>
          <option value="" disabled>
            —
          </option>
          <optgroup label={t.accounts.toAccountsGroup}>
            {accounts.map((a) => (
              <option key={a.id} value={`account:${a.id}`}>
                {a.name}
              </option>
            ))}
          </optgroup>
          {investments.length > 0 && (
            <optgroup label={t.accounts.toInvestmentsGroup}>
              {investments.map((i) => (
                <option key={i.id} value={`investment:${i.id}`}>
                  {i.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>
      <div>
        <label htmlFor="tr-date" className={LABEL}>{t.common.date}</label>
        <input id="tr-date" name="date" type="date" required defaultValue={toDateInputValue(new Date())} className={INPUT} />
      </div>
      <div>
        <label htmlFor="tr-amount" className={LABEL}>{t.common.amount}</label>
        <input id="tr-amount" name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" className={INPUT} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="tr-note" className={LABEL}>{t.accounts.note}</label>
        <input id="tr-note" name="note" maxLength={120} placeholder={t.accounts.notePlaceholder} className={INPUT} />
      </div>
      {to.startsWith("investment:") && (
        <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[var(--color-ink)] sm:col-span-2">
          <input type="checkbox" name="recordBuy" defaultChecked className="h-4 w-4 accent-[var(--color-brand)]" />
          {t.accounts.recordBuy}
        </label>
      )}

      {state.error && <p className="text-sm text-[var(--color-rust-text)] sm:col-span-2">{state.error}</p>}
      <div className="flex items-center gap-4 sm:col-span-2">
        <Submit label={t.accounts.saveTransfer} />
        <button
          type="button"
          onClick={onDone}
          className="text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}
