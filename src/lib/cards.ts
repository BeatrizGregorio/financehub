/**
 * Credit card bills (faturas), V1.28.
 *
 * Pure and dependency-free, like accounts.ts, so it can be asserted standalone.
 *
 * How a Brazilian card bill works, which is what this models:
 * - Each card has a closing day and a due day.
 * - A purchase made BEFORE the closing day lands on the bill that closes this
 *   month; ON or after the closing day it lands on next month's bill. (The
 *   closing day itself is the "melhor dia de compra" for that reason.)
 * - The bill is due on the due day: in the same month when it falls after the
 *   closing day, otherwise the month after.
 * - Banks name a bill by the month it's due ("fatura de outubro").
 *
 * Installment purchases need nothing special: the app already stores one
 * entry per month, so each installment lands on its own bill.
 *
 * Card purchases are expenses, but they don't leave any account until the
 * bill is paid. Paying is a CardPayment, not an expense — logging the bill
 * payment as an expense as well would count every purchase twice.
 */

export const MAX_CARD_DAY = 28;

export type CardConfig = { id: string; name: string; closingDay: number; dueDay: number };
export type CardEntryLike = { amount: number; date: Date; type: string; method: string | null };
export type CardPaymentLike = {
  paymentMethodId: string;
  billKey: string;
  amount: number;
  date: Date;
  fromAccountId: string | null;
};

/** Same reasoning as the budget cycle: day 29–31 doesn't exist every month. */
export function clampCardDay(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_CARD_DAY, Math.max(1, Math.round(n)));
}

function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "YYYY-MM" of the month the bill containing `date` closes in. */
export function billKeyFor(date: Date, closingDay: number): string {
  const day = clampCardDay(closingDay);
  const close = date.getDate() < day
    ? new Date(date.getFullYear(), date.getMonth(), 1)
    : new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return `${close.getFullYear()}-${String(close.getMonth() + 1).padStart(2, "0")}`;
}

/** Purchases dated in [opens, closes) belong to this bill. */
export function billPeriod(key: string, closingDay: number): { opens: Date; closes: Date } {
  const [y, m] = key.split("-").map(Number);
  const day = clampCardDay(closingDay);
  return { opens: new Date(y, m - 2, day), closes: new Date(y, m - 1, day) };
}

export function billDueDate(key: string, closingDay: number, dueDay: number): Date {
  const [y, m] = key.split("-").map(Number);
  const close = clampCardDay(closingDay);
  const due = clampCardDay(dueDay);
  return due > close ? new Date(y, m - 1, due) : new Date(y, m, due);
}

export type BillStatus = "upcoming" | "open" | "closed" | "overdue" | "paid";

export type Bill = {
  key: string;
  opens: Date;
  closes: Date;
  due: Date;
  total: number;
  paid: number;
  remaining: number;
  purchases: number;
  status: BillStatus;
};

const CENT = 0.005;

export function isCardPurchase(e: CardEntryLike, cardNames: Set<string>): boolean {
  return e.type === "expense" && !!e.method && cardNames.has(e.method);
}

/**
 * Every bill that has purchases or payments, newest first, plus the bill
 * that's currently open even when it's still empty.
 */
export function cardBills(
  card: CardConfig,
  entries: CardEntryLike[],
  payments: CardPaymentLike[],
  today: Date = new Date(),
): Bill[] {
  const totals = new Map<string, { total: number; purchases: number }>();
  for (const e of entries) {
    if (e.type !== "expense" || e.method !== card.name) continue;
    const key = billKeyFor(e.date, card.closingDay);
    const row = totals.get(key) ?? { total: 0, purchases: 0 };
    row.total += e.amount;
    row.purchases += 1;
    totals.set(key, row);
  }
  const paidByKey = new Map<string, number>();
  for (const p of payments) {
    if (p.paymentMethodId !== card.id) continue;
    paidByKey.set(p.billKey, (paidByKey.get(p.billKey) ?? 0) + p.amount);
  }

  const keys = new Set<string>([...totals.keys(), ...paidByKey.keys(), billKeyFor(today, card.closingDay)]);
  const t = dayKey(today);

  return [...keys]
    .sort((a, b) => (a < b ? 1 : -1))
    .map((key) => {
      const { opens, closes } = billPeriod(key, card.closingDay);
      const due = billDueDate(key, card.closingDay, card.dueDay);
      const total = totals.get(key)?.total ?? 0;
      const purchases = totals.get(key)?.purchases ?? 0;
      const paid = paidByKey.get(key) ?? 0;
      const remaining = Math.max(0, total - paid);

      let status: BillStatus;
      if (t < dayKey(opens)) status = "upcoming";
      else if (total > CENT && remaining <= CENT) status = "paid";
      else if (t < dayKey(closes)) status = "open";
      else if (remaining <= CENT) status = "paid";
      else if (t <= dayKey(due)) status = "closed";
      else status = "overdue";

      return { key, opens, closes, due, total, paid, remaining, purchases, status };
    });
}

/**
 * What's owed across all cards at the end of `asOf`: card purchases made by
 * then, minus bill payments made by then. Future installments aren't debt yet.
 * Can go negative if a card was overpaid — that's a credit, so it's kept.
 */
export function cardDebt(
  cards: CardConfig[],
  entries: CardEntryLike[],
  payments: CardPaymentLike[],
  asOf: Date = new Date(),
): number {
  const end = dayKey(asOf);
  const names = new Set(cards.map((c) => c.name));
  const ids = new Set(cards.map((c) => c.id));
  let debt = 0;
  for (const e of entries) {
    if (isCardPurchase(e, names) && dayKey(e.date) <= end) debt += e.amount;
  }
  for (const p of payments) {
    if (ids.has(p.paymentMethodId) && dayKey(p.date) <= end) debt -= p.amount;
  }
  return debt;
}
