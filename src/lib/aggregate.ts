import { CYCLE_START_DAY, addCycles, currentCycleKey, cycleKey, cycleLabel } from "@/lib/format";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n";

export type EntryLike = {
  amount: number;
  date: Date;
  type: string;
  category: string;
};

export function availableMonths(
  entries: EntryLike[],
  startDay: number = CYCLE_START_DAY,
  lang: Language = DEFAULT_LANGUAGE,
): { key: string; label: string }[] {
  const keys = new Set<string>();
  for (const e of entries) {
    keys.add(cycleKey(e.date, startDay));
  }
  return Array.from(keys)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((key) => ({ key, label: cycleLabel(key, lang) }));
}

export function categoryBreakdown(
  entries: EntryLike[],
  month: string,
  startDay: number = CYCLE_START_DAY,
) {
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== "expense" || cycleKey(e.date, startDay) !== month) continue;
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  }
  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export type BudgetLike = { category: string; limit: number };

export function budgetStatus(
  entries: EntryLike[],
  budgets: BudgetLike[],
  month: string,
  startDay: number = CYCLE_START_DAY,
) {
  const spent = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== "expense" || cycleKey(e.date, startDay) !== month) continue;
    spent.set(e.category, (spent.get(e.category) ?? 0) + e.amount);
  }

  const limitByCategory = new Map(budgets.map((b) => [b.category, b.limit]));
  const categories = new Set([...spent.keys(), ...limitByCategory.keys()]);

  return Array.from(categories)
    .map((category) => ({
      category,
      spent: spent.get(category) ?? 0,
      limit: limitByCategory.get(category) ?? 0,
    }))
    .sort((a, b) => b.spent - a.spent);
}

export function monthlySeries(
  entries: EntryLike[],
  monthsBack = 6,
  startDay: number = CYCLE_START_DAY,
  lang: Language = DEFAULT_LANGUAGE,
) {
  const current = currentCycleKey(startDay);
  const keys: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    keys.push(addCycles(current, -i));
  }

  const totals = new Map(keys.map((k) => [k, { income: 0, expense: 0 }]));
  for (const e of entries) {
    const bucket = totals.get(cycleKey(e.date, startDay));
    if (!bucket) continue;
    if (e.type === "income") bucket.income += e.amount;
    else bucket.expense += e.amount;
  }

  return keys.map((key) => {
    const totalsForKey = totals.get(key)!;
    return {
      key,
      label: cycleLabel(key, lang),
      income: totalsForKey.income,
      expense: totalsForKey.expense,
      net: totalsForKey.income - totalsForKey.expense,
    };
  });
}

export type UpcomingEntry = EntryLike & {
  id: string;
  name: string;
  note: string | null;
  method: string | null;
};

/**
 * Entries dated after today, up to and including `until`.
 *
 * The V1.2 design handoff asked for an "Upcoming bills" card and it was
 * deliberately left unbuilt, because the mock filled it with invented
 * obligations ("Netflix due Aug 03") that no feature backed. Nothing about that
 * judgement has changed — but the data has: recurring entries generate twelve
 * future-dated rows sharing a groupId, so a genuine answer to "what is coming"
 * is now a query over real entries rather than a fabrication.
 *
 * **The window is the current budget cycle, not a rolling 30 days** (V1.35).
 * A series generates a row every month, so a rolling window kept pulling *next*
 * month's installment into "what's still to come this month" as soon as it fell
 * inside 30 days — the card answered "what's next" when the owner was asking
 * "what's left". Callers pass the cycle's last day, so this follows whatever
 * start day is configured instead of assuming calendar months.
 *
 * Compares on calendar day, not timestamp, so something dated today is already
 * "now" rather than upcoming, and something dated on `until` still counts.
 */
export function upcomingEntries<T extends UpcomingEntry>(
  entries: T[],
  until: Date,
  now: Date = new Date(),
): T[] {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  // Exclusive end at midnight after `until`, so an entry dated on the cycle's
  // last day is included whatever time of day it carries.
  const end = new Date(until.getFullYear(), until.getMonth(), until.getDate() + 1);
  return entries
    .filter((e) => e.date >= start && e.date < end)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
