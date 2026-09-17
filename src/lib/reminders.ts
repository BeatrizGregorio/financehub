import { cardBills, isCardPurchase, type CardConfig, type CardEntryLike, type CardPaymentLike } from "./cards";
import type { SinkingFundLike } from "./sinkingFunds";

/**
 * Bill reminders (V1.28): what's worth a desktop notification today.
 *
 * Pure and dependency-free (relative imports only), asserted standalone like
 * the other lib/ maths. Returns structured items; the /api/reminders route
 * turns them into text in the owner's language, and the Electron shell shows
 * them and remembers which ids it already showed, so each fires once.
 *
 * Three sources, each with its own window:
 * - Expenses dated today or tomorrow — recurring bills are entries already.
 *   Card purchases are left out: they're paid through the card bill, and a
 *   notification per coffee would get the whole feature switched off.
 * - Card bills that have closed and fall due within BILL_DAYS, and bills
 *   that are overdue. The id includes the phase, so an overdue bill gets one
 *   more notification after the "due soon" one.
 * - Yearly bills (sinking funds) due within FUND_DAYS that aren't fully saved.
 */

export const BILL_DAYS = 3;
export const FUND_DAYS = 7;

export type ReminderEntryLike = CardEntryLike & { id: string; name: string };
export type ReminderFundLike = SinkingFundLike & { id: string; name: string };

export type Reminder =
  | { id: string; kind: "entry"; name: string; amount: number; date: Date; days: number }
  | { id: string; kind: "bill"; name: string; amount: number; date: Date; days: number; overdue: boolean }
  | { id: string; kind: "fund"; name: string; amount: number; date: Date; days: number };

function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Whole calendar days from `from` to `to`, ignoring time of day and DST. */
export function daysUntil(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

export function buildReminders(
  input: {
    entries: ReminderEntryLike[];
    cards: CardConfig[];
    payments: CardPaymentLike[];
    funds: ReminderFundLike[];
  },
  today: Date = new Date(),
): Reminder[] {
  const out: Reminder[] = [];
  const cardNames = new Set(input.cards.map((c) => c.name));

  for (const e of input.entries) {
    if (e.type !== "expense" || isCardPurchase(e, cardNames)) continue;
    const days = daysUntil(today, e.date);
    if (days === 0 || days === 1) {
      out.push({ id: `entry:${e.id}`, kind: "entry", name: e.name, amount: e.amount, date: e.date, days });
    }
  }

  for (const card of input.cards) {
    for (const bill of cardBills(card, input.entries, input.payments, today)) {
      const days = daysUntil(today, bill.due);
      if (bill.status === "overdue") {
        out.push({ id: `bill:${card.id}:${bill.key}:overdue`, kind: "bill", name: card.name, amount: bill.remaining, date: bill.due, days, overdue: true });
      } else if (bill.status === "closed" && bill.remaining > 0.005 && days <= BILL_DAYS) {
        out.push({ id: `bill:${card.id}:${bill.key}:due`, kind: "bill", name: card.name, amount: bill.remaining, date: bill.due, days, overdue: false });
      }
    }
  }

  for (const f of input.funds) {
    const left = f.amount - f.savedAmount;
    const days = daysUntil(today, f.dueDate);
    if (left > 0.005 && days >= 0 && days <= FUND_DAYS) {
      out.push({ id: `fund:${f.id}:${dayKey(f.dueDate)}`, kind: "fund", name: f.name, amount: left, date: f.dueDate, days });
    }
  }

  // Most urgent first: overdue bills, then by due date.
  return out.sort((a, b) => a.days - b.days);
}
