"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CreditCard, Plus, Settings2, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { deleteCardPayment, payBill, removeCardSetup, setUpCard, updateCard, type ActionState } from "./actions";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { localeOf } from "@/lib/i18n";
import { CARD } from "@/lib/ui";
import { useT } from "@/components/LanguageProvider";
import type { Bill, BillStatus } from "@/lib/cards";

type CardView = {
  id: string;
  name: string;
  closingDay: number;
  dueDay: number;
  bills: Bill[];
  payments: { id: string; billKey: string; amount: number; date: Date; fromAccountId: string | null }[];
};

const INPUT =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-ink)] focus:bg-[var(--color-surface-raised)]";
const LABEL = "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)]";

/** Status is shown in form (a pill) as well as color, so it reads without color. */
const STATUS_STYLE: Record<BillStatus, { bg: string; fg: string }> = {
  upcoming: { bg: "var(--color-inset)", fg: "var(--color-muted)" },
  open: { bg: "var(--color-brand-tint)", fg: "var(--color-brand-text)" },
  closed: { bg: "var(--color-inset)", fg: "var(--color-ink)" },
  overdue: { bg: "var(--color-rust-tint)", fg: "var(--color-rust-text)" },
  paid: { bg: "var(--color-positive-tint)", fg: "var(--color-positive-text)" },
};

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

function useCloseOnSuccess(state: ActionState, onDone: () => void) {
  const [submitted, setSubmitted] = useState(0);
  useEffect(() => {
    if (submitted === 0 || state.error) return;
    onDone();
  }, [state, submitted, onDone]);
  return () => setSubmitted((n) => n + 1);
}

function StatusPill({ status }: { status: BillStatus }) {
  const { t } = useT();
  const s = STATUS_STYLE[status];
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide whitespace-nowrap uppercase"
      style={{ background: s.bg, color: s.fg }}
    >
      {t.cards.status[status]}
    </span>
  );
}

function CardSetupForm({
  card,
  methods,
  onDone,
}: {
  card?: CardView;
  methods: { id: string; name: string; isCreditCard: boolean }[];
  onDone: () => void;
}) {
  const { t } = useT();
  const action = card ? updateCard.bind(null, card.id) : setUpCard;
  const [state, formAction] = useActionState(action, {} as ActionState);
  const markSubmitted = useCloseOnSuccess(state, onDone);
  const candidates = methods.filter((m) => !m.isCreditCard);

  return (
    <form action={formAction} onSubmit={markSubmitted} className="grid gap-4 sm:grid-cols-2">
      {!card && (
        <>
          <div>
            <label htmlFor="card-method" className={LABEL}>{t.cards.method}</label>
            {candidates.length ? (
              <select id="card-method" name="methodId" defaultValue={candidates[0].id} className={INPUT}>
                <option value="">—</option>
                {candidates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[12.5px] text-[var(--color-muted-2)]">{t.cards.noMethodsToSetUp}</p>
            )}
          </div>
          <div>
            <label htmlFor="card-new" className={LABEL}>{t.cards.newMethodName}</label>
            <input id="card-new" name="newName" maxLength={40} placeholder={t.cards.newMethodPlaceholder} className={INPUT} />
          </div>
        </>
      )}
      <div>
        <label htmlFor="card-closing" className={LABEL}>{t.cards.closingDay}</label>
        <input id="card-closing" name="closingDay" type="number" min="1" max="28" required defaultValue={card?.closingDay ?? ""} className={INPUT} />
      </div>
      <div>
        <label htmlFor="card-due" className={LABEL}>{t.cards.dueDay}</label>
        <input id="card-due" name="dueDay" type="number" min="1" max="28" required defaultValue={card?.dueDay ?? ""} className={INPUT} />
      </div>
      <p className="text-xs leading-relaxed text-[var(--color-muted-2)] sm:col-span-2">{t.cards.daysHint}</p>

      {state.error && <p className="text-sm text-[var(--color-rust-text)] sm:col-span-2">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Submit label={t.cards.saveCard} />
        <button type="button" onClick={onDone} className="text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          {t.common.cancel}
        </button>
        {card && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm(t.cards.confirmRemoveSetup)) return;
              await removeCardSetup(card.id);
              onDone();
            }}
            className="ml-auto text-sm font-semibold text-[var(--color-muted-2)] hover:text-[var(--color-rust-text)]"
          >
            {t.cards.removeSetup}
          </button>
        )}
      </div>
    </form>
  );
}

function PayBillForm({
  card,
  bill,
  accounts,
  onDone,
}: {
  card: CardView;
  bill: Bill;
  accounts: { id: string; name: string }[];
  onDone: () => void;
}) {
  const { t } = useT();
  const [state, formAction] = useActionState(payBill.bind(null, card.id, bill.key), {} as ActionState);
  const markSubmitted = useCloseOnSuccess(state, onDone);

  return (
    <form action={formAction} onSubmit={markSubmitted} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="pay-amount" className={LABEL}>{t.common.amount}</label>
        <input
          id="pay-amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={bill.remaining > 0 ? bill.remaining.toFixed(2) : ""}
          className={INPUT}
        />
      </div>
      <div>
        <label htmlFor="pay-date" className={LABEL}>{t.common.date}</label>
        <input id="pay-date" name="date" type="date" required defaultValue={toDateInputValue(new Date())} className={INPUT} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="pay-from" className={LABEL}>{t.cards.paymentFrom}</label>
        <select id="pay-from" name="fromAccountId" defaultValue={accounts[0]?.id ?? ""} className={INPUT}>
          <option value="">{t.cards.noAccountOption}</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      {state.error && <p className="text-sm text-[var(--color-rust-text)] sm:col-span-2">{state.error}</p>}
      <div className="flex items-center gap-4 sm:col-span-2">
        <Submit label={t.cards.savePayment} />
        <button type="button" onClick={onDone} className="text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}

export function CardsClient({
  cards,
  debt,
  methods,
  accounts,
  doubleCount,
}: {
  cards: CardView[];
  debt: number;
  methods: { id: string; name: string; isCreditCard: boolean }[];
  accounts: { id: string; name: string }[];
  doubleCount: { count: number; total: number };
}) {
  const { t, lang } = useT();
  const [setupOpen, setSetupOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [paying, setPaying] = useState<{ cardId: string; billKey: string } | null>(null);

  const billMonth = (bill: Bill) =>
    t.cards.billName(new Intl.DateTimeFormat(localeOf(lang), { month: "long", year: "numeric" }).format(bill.due));

  // Derived from props by id so an edit or payment is reflected immediately.
  const editingCard = editingCardId ? cards.find((c) => c.id === editingCardId) ?? null : null;
  const payingCard = paying ? cards.find((c) => c.id === paying.cardId) ?? null : null;
  const payingBill = payingCard && paying ? payingCard.bills.find((b) => b.key === paying.billKey) ?? null : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[34px]">{t.cards.title}</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{t.cards.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setSetupOpen(true)}
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-[13.5px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Plus size={16} /> {t.cards.setUpCard}
        </button>
      </div>

      {doubleCount.count > 0 && (
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5 rounded-[14px] border border-[var(--color-rust)]/25 bg-[var(--color-rust-tint)] px-4 py-3">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--color-rust-text)]" />
          <div className="min-w-[220px] flex-1">
            <p className="text-[13px] font-bold text-[var(--color-ink)]">{t.cards.doubleCountTitle}</p>
            <p className="text-[12.5px] leading-relaxed text-[var(--color-muted)]">
              {t.cards.doubleCount(doubleCount.count, formatCurrency(doubleCount.total))}
            </p>
          </div>
          <Link href="/entries?q=fatura" className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-bold text-[var(--color-brand-text)]">
            {t.cards.reviewThem} <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {cards.length === 0 ? (
        <div className={`${CARD} flex flex-col items-start gap-2 p-6`}>
          <p className="text-[15px] font-bold text-[var(--color-ink)]">{t.cards.empty}</p>
          <p className="max-w-xl text-[13px] leading-relaxed text-[var(--color-muted)]">{t.cards.emptyExplainer}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className={`${CARD} min-w-[190px] flex-1 px-5 py-4`}>
              <p className="mb-1 font-mono text-[10.5px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase">
                {t.cards.owedOnCards}
              </p>
              <p className="text-2xl leading-none font-extrabold" style={{ color: debt > 0 ? "var(--color-rust-text)" : "var(--color-ink)" }}>
                {formatCurrency(debt)}
              </p>
            </div>
          </div>

          {cards.map((card) => {
            const today = new Date();
            const current =
              card.bills.find((b) => b.status === "open") ?? card.bills.find((b) => b.status !== "upcoming") ?? card.bills[0];
            const upcoming = card.bills.filter((b) => b.status === "upcoming").reverse();
            const past = card.bills.filter((b) => b !== current && b.status !== "upcoming").slice(0, 8);

            return (
              <section key={card.id} className={`${CARD} flex flex-col gap-4 p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-white" style={{ background: "var(--gradient-brand)" }}>
                      <CreditCard size={17} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-[17px] font-extrabold tracking-tight">{card.name}</h2>
                      <p className="font-mono text-[11.5px] text-[var(--color-muted-2)]">
                        {t.cards.closesDueLine(card.closingDay, card.dueDay)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingCardId(card.id)}
                    className="flex items-center gap-1.5 rounded-xl bg-[var(--color-panel)] px-3.5 py-2 text-[13px] font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-track)]"
                  >
                    <Settings2 size={14} /> {t.cards.editCard}
                  </button>
                </div>

                {current && (
                  <div className="rounded-[16px] bg-[var(--color-inset)] p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10.5px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase">
                          {t.cards.currentBill}
                        </span>
                        <span className="text-[14.5px] font-bold text-[var(--color-ink)]">{billMonth(current)}</span>
                        <StatusPill status={current.status} />
                      </div>
                      <span className="font-mono text-[11.5px] text-[var(--color-muted-2)]">
                        {(today < current.closes ? t.cards.closes : t.cards.closed)(formatDate(current.closes, lang))} ·{" "}
                        {t.cards.due(formatDate(current.due, lang))}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div className="flex flex-wrap gap-x-7 gap-y-2">
                        <div>
                          <p className="font-mono text-[10px] tracking-wide text-[var(--color-muted-2)] uppercase">{t.cards.total}</p>
                          <p className="font-mono text-[22px] leading-tight font-bold text-[var(--color-ink)] tabular-nums">{formatCurrency(current.total)}</p>
                          <p className="text-[11.5px] text-[var(--color-muted-2)]">{t.cards.purchases(current.purchases)}</p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] tracking-wide text-[var(--color-muted-2)] uppercase">{t.cards.paid}</p>
                          <p className="font-mono text-[15px] font-semibold text-[var(--color-positive-text)] tabular-nums">{formatCurrency(current.paid)}</p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] tracking-wide text-[var(--color-muted-2)] uppercase">{t.cards.remaining}</p>
                          <p className="font-mono text-[15px] font-semibold text-[var(--color-ink)] tabular-nums">{formatCurrency(current.remaining)}</p>
                        </div>
                      </div>
                      {current.remaining > 0.005 && (
                        <button
                          type="button"
                          onClick={() => setPaying({ cardId: card.id, billKey: current.key })}
                          className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95"
                          style={{ background: "var(--gradient-brand)" }}
                        >
                          {t.cards.payBill}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <div>
                    <p className="mb-1.5 font-mono text-[10.5px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase">{t.cards.pastBills}</p>
                    {past.length === 0 ? (
                      <p className="py-3 text-[13px] text-[var(--color-muted-2)]">{t.cards.noPastBills}</p>
                    ) : (
                      <ul className="flex flex-col divide-y divide-[var(--color-border)]">
                        {past.map((b) => (
                          <li key={b.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--color-ink)]">{billMonth(b)}</span>
                            <StatusPill status={b.status} />
                            <span className="w-[108px] shrink-0 text-right font-mono text-[13px] text-[var(--color-ink)] tabular-nums">
                              {formatCurrency(b.total)}
                            </span>
                            {b.remaining > 0.005 ? (
                              <button
                                type="button"
                                onClick={() => setPaying({ cardId: card.id, billKey: b.key })}
                                className="-my-1 rounded px-1.5 py-1 text-xs font-semibold text-[var(--color-brand-text)]"
                              >
                                {t.cards.payBill}
                              </button>
                            ) : (
                              <span className="w-[62px]" />
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    {upcoming.length > 0 && (
                      <div>
                        <p className="mb-1.5 font-mono text-[10.5px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase">{t.cards.upcomingBills}</p>
                        <ul className="flex flex-col divide-y divide-[var(--color-border)]">
                          {upcoming.slice(0, 6).map((b) => (
                            <li key={b.key} className="flex items-center justify-between gap-3 py-2">
                              <span className="truncate text-[13px] font-semibold text-[var(--color-ink)]">{billMonth(b)}</span>
                              <span className="shrink-0 font-mono text-[13px] text-[var(--color-muted)] tabular-nums">{formatCurrency(b.total)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {card.payments.length > 0 && (
                      <div>
                        <p className="mb-1.5 font-mono text-[10.5px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase">{t.cards.payments}</p>
                        <ul className="flex flex-col divide-y divide-[var(--color-border)]">
                          {card.payments.slice(0, 6).map((p) => {
                            const bill = card.bills.find((b) => b.key === p.billKey);
                            return (
                              <li key={p.id} className="flex items-center gap-3 py-2">
                                <span className="w-[92px] shrink-0 font-mono text-[12px] text-[var(--color-muted-2)]">{formatDate(p.date, lang)}</span>
                                <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--color-muted)]">{bill ? billMonth(bill) : p.billKey}</span>
                                <span className="shrink-0 font-mono text-[13px] font-semibold text-[var(--color-ink)] tabular-nums">{formatCurrency(p.amount)}</span>
                                <button
                                  type="button"
                                  aria-label={t.cards.deletePayment}
                                  onClick={() => {
                                    if (confirm(t.cards.confirmDeletePayment)) void deleteCardPayment(p.id);
                                  }}
                                  className="shrink-0 rounded p-1 text-[var(--color-muted-2)] hover:text-[var(--color-rust-text)]"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </>
      )}

      {setupOpen && (
        <Modal title={t.cards.setUpCard} onClose={() => setSetupOpen(false)}>
          <CardSetupForm methods={methods} onDone={() => setSetupOpen(false)} />
        </Modal>
      )}
      {editingCard && (
        <Modal title={`${t.cards.editCard} — ${editingCard.name}`} onClose={() => setEditingCardId(null)}>
          <CardSetupForm card={editingCard} methods={methods} onDone={() => setEditingCardId(null)} />
        </Modal>
      )}
      {payingCard && payingBill && (
        <Modal title={`${t.cards.payBill} — ${billMonth(payingBill)}`} onClose={() => setPaying(null)}>
          <PayBillForm card={payingCard} bill={payingBill} accounts={accounts} onDone={() => setPaying(null)} />
        </Modal>
      )}
    </div>
  );
}
