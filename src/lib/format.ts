const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

const currencyAxisFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** Compact currency for chart axis ticks — no decimals, still "R$ 12.000" / "-R$ 12.000". */
export function formatCurrencyAxis(amount: number): string {
  return currencyAxisFormatter.format(amount);
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// en-US to match formatDate/monthLabel — only formatCurrency uses pt-BR, since
// the owner asked for BRL currency, not a Portuguese-language UI.
const shortDateFormatter = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" });

export function formatShortDate(date: Date): string {
  return shortDateFormatter.format(date);
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

// ─── Budget cycles ──────────────────────────────────────────────────────────
// Every "month" the app reports on runs from the 10th to the 9th of the
// following month, and is named for the month it *starts* in — so
// 10 Aug – 9 Sep is "Aug 2026". A date on or after the 10th belongs to that
// month's cycle; the 1st–9th belong to the previous month's cycle.
//
// Cycle keys keep the same `YYYY-MM` shape calendar months used before, so
// they still sort lexicographically and stay readable in the month pickers —
// but a key now means "the cycle starting on the 10th of that month", not
// the calendar month. Everything that buckets entries into months goes
// through cycleKey() so the two can't drift apart; deriving a label straight
// from an entry date (rather than from its cycle key) is the mistake to
// avoid, since a 3 Sep entry belongs to the "Aug 2026" cycle.
//
// Changing the cycle boundary is a one-line change here — every date range,
// bucket, and label in the app derives from this constant.

export const CYCLE_START_DAY = 10;

function keyOf(year: number, monthIndex: number): string {
  const d = new Date(year, monthIndex, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Which cycle (`YYYY-MM`) a given date falls in. */
export function cycleKey(date: Date): string {
  const monthIndex = date.getMonth() - (date.getDate() < CYCLE_START_DAY ? 1 : 0);
  return keyOf(date.getFullYear(), monthIndex);
}

export function currentCycleKey(): string {
  return cycleKey(new Date());
}

/** "Aug 2026" for the cycle key "2026-08". Takes a key, never a raw date. */
export function cycleLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return monthLabel(new Date(year, month - 1, 1));
}

/** Shift a cycle key by N cycles (negative = earlier). */
export function addCycles(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  return keyOf(year, month - 1 + delta);
}

/** The half-open range `[start, endExclusive)` of dates a cycle covers. */
export function cycleRange(key: string): { start: Date; endExclusive: Date } {
  const [year, month] = key.split("-").map(Number);
  return {
    start: new Date(year, month - 1, CYCLE_START_DAY),
    endExclusive: new Date(year, month, CYCLE_START_DAY),
  };
}

/** The last day a cycle includes — the day before the next cycle starts. */
export function cycleEndDate(key: string): Date {
  const { endExclusive } = cycleRange(key);
  return new Date(endExclusive.getFullYear(), endExclusive.getMonth(), CYCLE_START_DAY - 1);
}

export function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDayOfTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDayOfTargetMonth));
  return target;
}
