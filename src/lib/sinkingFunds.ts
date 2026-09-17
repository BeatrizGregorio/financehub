/**
 * Yearly and irregular bills — IPVA, IPTU, insurance, school fees (V1.28).
 *
 * Pure and dependency-free, asserted standalone like the other lib/ maths.
 *
 * The idea: a big predictable bill shouldn't land as a surprise in one month.
 * Each has a target amount, a due date and what's been set aside so far; the
 * app works out how much to put aside each month from now until it's due.
 * "Saved so far" is a number the owner keeps up to date by hand — the app
 * doesn't pretend to know which pile of money is earmarked for what.
 */

export type SinkingFundLike = {
  amount: number;
  savedAmount: number;
  dueDate: Date;
  repeatsYearly: boolean;
};

export type FundStatus = "done" | "onTrack" | "behind" | "due" | "passed";

function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Months left to save in, counting the current month, never less than 1.
 * Due 20 Jan seen on 17 Sep: Sep, Oct, Nov, Dec, Jan -> 5. If the due day has
 * already passed this month, this month no longer counts.
 */
export function monthsToSave(today: Date, due: Date): number {
  let months = (due.getFullYear() - today.getFullYear()) * 12 + (due.getMonth() - today.getMonth()) + 1;
  if (due.getDate() < today.getDate()) months -= 1;
  return Math.max(1, months);
}

export function remaining(fund: SinkingFundLike): number {
  return Math.max(0, fund.amount - fund.savedAmount);
}

/** How much to set aside each month from now to be ready on the due date. */
export function monthlySetAside(fund: SinkingFundLike, today: Date = new Date()): number {
  if (dayKey(today) > dayKey(fund.dueDate)) return 0;
  return remaining(fund) / monthsToSave(today, fund.dueDate);
}

/**
 * Where the fund stands. "Behind" compares against an even pace over the 12
 * months before the due date — for a bill due in 3 months, you'd expect about
 * three quarters saved. A one-off bill further than a year out is never behind.
 */
export function fundStatus(fund: SinkingFundLike, today: Date = new Date()): FundStatus {
  const t = dayKey(today);
  const due = dayKey(fund.dueDate);
  if (fund.amount > 0 && fund.savedAmount >= fund.amount - 0.005) return "done";
  if (t > due) return "passed";
  if (t === due) return "due";
  const monthsLeft = monthsToSave(today, fund.dueDate);
  const expectedShare = Math.max(0, Math.min(1, (12 - monthsLeft + 1) / 12));
  return fund.savedAmount + 0.005 >= fund.amount * expectedShare ? "onTrack" : "behind";
}

/** Same day and month, one year later — clamped so 29 Feb becomes 28 Feb. */
export function nextYear(date: Date): Date {
  const y = date.getFullYear() + 1;
  const m = date.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(date.getDate(), lastDay));
}

export function totalMonthlySetAside(funds: SinkingFundLike[], today: Date = new Date()): number {
  return funds.reduce((sum, f) => sum + monthlySetAside(f, today), 0);
}
