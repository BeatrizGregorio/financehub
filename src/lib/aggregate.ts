import { CYCLE_START_DAY, addCycles, currentCycleKey, cycleKey, cycleLabel } from "@/lib/format";

export type EntryLike = {
  amount: number;
  date: Date;
  type: string;
  category: string;
};

export function availableMonths(
  entries: EntryLike[],
  startDay: number = CYCLE_START_DAY,
): { key: string; label: string }[] {
  const keys = new Set<string>();
  for (const e of entries) {
    keys.add(cycleKey(e.date, startDay));
  }
  return Array.from(keys)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((key) => ({ key, label: cycleLabel(key) }));
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
      label: cycleLabel(key),
      income: totalsForKey.income,
      expense: totalsForKey.expense,
      net: totalsForKey.income - totalsForKey.expense,
    };
  });
}
