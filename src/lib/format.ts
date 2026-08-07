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
// Every "month" the app reports on runs from a configurable day-of-month to
// the day before it in the following month, and is named for the month it
// *starts* in — with the default of 10, 10 Aug – 9 Sep is "Aug 2026". A date
// on or after the start day belongs to that month's cycle; earlier days
// belong to the previous month's cycle. A start day of 1 gives plain
// calendar months, which is what the app did before V1.14.
//
// The day is owner-configurable in Settings (stored on the AppSettings
// singleton), so every function here takes it as an argument rather than
// reading a constant. It has to be threaded explicitly because these run in
// client components too, where there's no database access — and a module-level
// mutable "current setting" would be shared across concurrently-rendering
// requests on the server, which is exactly the kind of bug that only shows up
// under load. Verbose, but it can't silently disagree with itself.
//
// Cycle keys keep the same `YYYY-MM` shape calendar months used before, so
// they still sort lexicographically and stay readable in the month pickers —
// but a key means "the cycle starting on the start day of that month", not
// the calendar month. Everything that buckets entries goes through cycleKey()
// so the two can't drift apart; deriving a label straight from an entry date
// (rather than from its cycle key) is the mistake to avoid, since with a
// start day of 10 a 3 Sep entry belongs to the "Aug 2026" cycle.

/** Used when no setting has been saved yet, and as the schema default. */
export const CYCLE_START_DAY = 10;

/**
 * Cycle boundaries are capped at 28 so the day exists in every month —
 * a 31st boundary would silently shift in February and in 30-day months,
 * leaving gaps or overlaps between consecutive cycles.
 */
export const MAX_CYCLE_START_DAY = 28;

export function clampCycleStartDay(day: number | null | undefined): number {
  if (!Number.isFinite(day as number)) return CYCLE_START_DAY;
  return Math.min(MAX_CYCLE_START_DAY, Math.max(1, Math.trunc(day as number)));
}

function keyOf(year: number, monthIndex: number): string {
  const d = new Date(year, monthIndex, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Which cycle (`YYYY-MM`) a given date falls in. */
export function cycleKey(date: Date, startDay: number = CYCLE_START_DAY): string {
  const day = clampCycleStartDay(startDay);
  const monthIndex = date.getMonth() - (date.getDate() < day ? 1 : 0);
  return keyOf(date.getFullYear(), monthIndex);
}

export function currentCycleKey(startDay: number = CYCLE_START_DAY): string {
  return cycleKey(new Date(), startDay);
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
export function cycleRange(
  key: string,
  startDay: number = CYCLE_START_DAY,
): { start: Date; endExclusive: Date } {
  const day = clampCycleStartDay(startDay);
  const [year, month] = key.split("-").map(Number);
  return {
    start: new Date(year, month - 1, day),
    endExclusive: new Date(year, month, day),
  };
}

/** The last day a cycle includes — the day before the next cycle starts. */
export function cycleEndDate(key: string, startDay: number = CYCLE_START_DAY): Date {
  const { endExclusive } = cycleRange(key, startDay);
  return new Date(endExclusive.getFullYear(), endExclusive.getMonth(), endExclusive.getDate() - 1);
}

/** "10 Aug – 9 Sep" — the cycle's span, for explaining the setting in the UI. */
export function cycleRangeLabel(key: string, startDay: number = CYCLE_START_DAY): string {
  const { start } = cycleRange(key, startDay);
  return `${formatShortDate(start)} – ${formatShortDate(cycleEndDate(key, startDay))}`;
}

export function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDayOfTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDayOfTargetMonth));
  return target;
}
