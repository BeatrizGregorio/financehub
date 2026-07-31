import { monthKey, monthLabel } from "@/lib/format";

export type EntryLike = {
  amount: number;
  date: Date;
  type: string;
  category: string;
};

export function availableMonths(entries: EntryLike[]): { key: string; label: string }[] {
  const map = new Map<string, string>();
  for (const e of entries) {
    map.set(monthKey(e.date), monthLabel(e.date));
  }
  return Array.from(map.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => (a.key < b.key ? 1 : -1));
}

export function categoryBreakdown(entries: EntryLike[], month: string) {
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== "expense" || monthKey(e.date) !== month) continue;
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  }
  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export type BudgetLike = { category: string; limit: number };

export function budgetStatus(entries: EntryLike[], budgets: BudgetLike[], month: string) {
  const spent = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== "expense" || monthKey(e.date) !== month) continue;
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

export function monthlySeries(entries: EntryLike[], monthsBack = 6) {
  const now = new Date();
  const keys: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }

  const totals = new Map(keys.map((k) => [k, { income: 0, expense: 0 }]));
  for (const e of entries) {
    const bucket = totals.get(monthKey(e.date));
    if (!bucket) continue;
    if (e.type === "income") bucket.income += e.amount;
    else bucket.expense += e.amount;
  }

  return keys.map((key) => {
    const [year, month] = key.split("-").map(Number);
    const totalsForKey = totals.get(key)!;
    return {
      key,
      label: monthLabel(new Date(year, month - 1, 1)),
      income: totalsForKey.income,
      expense: totalsForKey.expense,
      net: totalsForKey.income - totalsForKey.expense,
    };
  });
}
