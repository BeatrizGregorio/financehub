import { cycleKey } from "@/lib/format";
import { tagsOf } from "@/lib/tags";
import { isIrExempt } from "@/lib/investmentTypes";
import {
  investedAt,
  isMatured,
  taxBreakdown,
  totalCoupons,
  valueAtDate,
  type InvestmentLike,
  type ReferenceRatesLike,
} from "@/lib/investments";

/**
 * Year-scoped reports (V1.28): the year in review, and an income tax (IR)
 * year-end summary. Both are server-computed from data the app already has.
 *
 * A "year" of months means the twelve budget cycles named Jan..Dec of that
 * year, so these figures agree with every monthly view in the app. With the
 * default start day of 10, "Jan 2026" runs 10 Jan – 9 Feb.
 */

// ─── Year in review ─────────────────────────────────────────────────────────

export type ReportEntryLike = {
  amount: number;
  date: Date;
  type: string;
  category: string;
  tags?: string;
};

export type MonthRow = { key: string; income: number; expense: number; net: number; savingsRate: number | null };

export type YearReview = {
  months: MonthRow[];
  income: number;
  expense: number;
  net: number;
  savingsRate: number | null;
  /** Expense per category, this year vs the previous one, biggest first. */
  categories: { category: string; thisYear: number; lastYear: number; change: number | null }[];
  /** Expenses per tag this year, biggest first. */
  tags: { tag: string; expense: number; income: number; count: number }[];
  hasData: boolean;
};

function rate(income: number, net: number): number | null {
  return income > 0 ? net / income : null;
}

export function yearReview(entries: ReportEntryLike[], year: number, startDay: number): YearReview {
  const keys = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const months = new Map(keys.map((k) => [k, { income: 0, expense: 0 }]));
  const catThis = new Map<string, number>();
  const catLast = new Map<string, number>();
  const tagTotals = new Map<string, { expense: number; income: number; count: number }>();

  for (const e of entries) {
    const key = cycleKey(e.date, startDay);
    const y = Number(key.slice(0, 4));
    if (y === year) {
      const m = months.get(key)!;
      if (e.type === "income") m.income += e.amount;
      else m.expense += e.amount;
      if (e.type === "expense") catThis.set(e.category, (catThis.get(e.category) ?? 0) + e.amount);
      for (const tag of tagsOf(e.tags)) {
        const row = tagTotals.get(tag) ?? { expense: 0, income: 0, count: 0 };
        if (e.type === "income") row.income += e.amount;
        else row.expense += e.amount;
        row.count += 1;
        tagTotals.set(tag, row);
      }
    } else if (y === year - 1 && e.type === "expense") {
      catLast.set(e.category, (catLast.get(e.category) ?? 0) + e.amount);
    }
  }

  const monthRows = keys.map((key) => {
    const { income, expense } = months.get(key)!;
    return { key, income, expense, net: income - expense, savingsRate: rate(income, income - expense) };
  });
  const income = monthRows.reduce((s, m) => s + m.income, 0);
  const expense = monthRows.reduce((s, m) => s + m.expense, 0);

  const categoryNames = new Set([...catThis.keys(), ...catLast.keys()]);
  const categories = [...categoryNames]
    .map((category) => {
      const thisYear = catThis.get(category) ?? 0;
      const lastYear = catLast.get(category) ?? 0;
      return { category, thisYear, lastYear, change: lastYear > 0 ? (thisYear - lastYear) / lastYear : null };
    })
    .sort((a, b) => b.thisYear - a.thisYear || b.lastYear - a.lastYear);

  const tags = [...tagTotals.entries()]
    .map(([tag, v]) => ({ tag, ...v }))
    .sort((a, b) => b.expense - a.expense || b.income - a.income);

  return {
    months: monthRows,
    income,
    expense,
    net: income - expense,
    savingsRate: rate(income, income - expense),
    categories,
    tags,
    hasData: income > 0 || expense > 0,
  };
}

// ─── Income tax (IR) year-end summary ───────────────────────────────────────

export type TaxInvestmentLike = InvestmentLike & { institution?: string | null };

export type PositionRow = {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  institution: string | null;
  /** Acquisition cost held at 31 Dec of the previous year — what the form's "situação anterior" asks. */
  costPrevious: number;
  /** Acquisition cost held at 31 Dec of the year. */
  costCurrent: number;
  /** Estimated market value at 31 Dec, for reference only — the form wants cost. */
  valueCurrent: number;
};

export type IncomeRow = { id: string; name: string; amount: number; exempt: boolean; kind: "coupon" | "redemption" };

export type TaxSummary = {
  positions: PositionRow[];
  income: IncomeRow[];
  exemptTotal: number;
  taxableTotal: number;
  /** Estimated IR withheld at source on taxable redemptions (tributação exclusiva). */
  estimatedWithheld: number;
  sells: { id: string; name: string; date: Date; amount: number }[];
  hasData: boolean;
};

const endOfYear = (y: number) => new Date(y, 11, 31, 23, 59, 59);

/** Cost basis held at a date: nothing before purchase, nothing once matured. */
function costHeld(inv: InvestmentLike, at: Date): number {
  if (inv.startDate > at) return 0;
  if (isMatured(inv, at)) return 0;
  return Math.max(0, investedAt(inv, at));
}

/**
 * Figures shaped like what the annual IR declaration asks for. An estimate for
 * personal reference, never filing guidance — the page says so prominently,
 * and brokers' and banks' own statements (informes de rendimentos) are what to
 * file from.
 *
 * - Positions ("Bens e Direitos") are declared at acquisition cost, not market
 *   value, at 31 Dec of the previous year and of this year. Market value is
 *   shown beside it only as a reference.
 * - Coupons received in the year, split exempt/taxable by subtype.
 * - Holdings that matured in the year: gross gain, with IR estimated through
 *   the same taxBreakdown() the holding detail uses. For taxable fixed income
 *   that tax is withheld at source, so it's listed rather than owed.
 * - Sells recorded as transactions are listed by amount only: without lot
 *   tracking the app can't compute the gain on a partial sale honestly.
 */
export function taxSummary(investments: TaxInvestmentLike[], rates: ReferenceRatesLike, year: number): TaxSummary {
  const prevEnd = endOfYear(year - 1);
  const thisEnd = endOfYear(year);
  const yearStart = new Date(year, 0, 1);

  const positions: PositionRow[] = [];
  const income: IncomeRow[] = [];
  let estimatedWithheld = 0;
  const sells: TaxSummary["sells"] = [];

  for (const inv of investments) {
    const costPrevious = costHeld(inv, prevEnd);
    const costCurrent = costHeld(inv, thisEnd);
    if (costPrevious > 0 || costCurrent > 0) {
      positions.push({
        id: inv.id,
        name: inv.name,
        type: inv.type,
        subtype: inv.subtype,
        institution: inv.institution ?? null,
        costPrevious,
        costCurrent,
        valueCurrent: costCurrent > 0 ? valueAtDate(inv, rates, thisEnd) : 0,
      });
    }

    const exempt = isIrExempt(inv.type, inv.subtype);
    const coupons = totalCoupons(inv, thisEnd) - totalCoupons(inv, prevEnd);
    if (coupons > 0) income.push({ id: `${inv.id}-c`, name: inv.name, amount: coupons, exempt, kind: "coupon" });

    if (inv.maturityDate && inv.maturityDate >= yearStart && inv.maturityDate <= thisEnd) {
      const tax = taxBreakdown(inv, rates, inv.maturityDate);
      if (tax.grossGain > 0) {
        income.push({ id: `${inv.id}-r`, name: inv.name, amount: tax.grossGain, exempt, kind: "redemption" });
        if (!exempt) estimatedWithheld += tax.ir + tax.iof;
      }
    }

    for (const tx of inv.transactions ?? []) {
      if (tx.kind === "sell" && tx.date >= yearStart && tx.date <= thisEnd) {
        sells.push({ id: `${inv.id}-${tx.date.getTime()}`, name: inv.name, date: tx.date, amount: tx.amount });
      }
    }
  }

  positions.sort((a, b) => b.costCurrent - a.costCurrent || b.costPrevious - a.costPrevious);
  const exemptTotal = income.filter((i) => i.exempt).reduce((s, i) => s + i.amount, 0);
  const taxableTotal = income.filter((i) => !i.exempt).reduce((s, i) => s + i.amount, 0);

  return {
    positions,
    income,
    exemptTotal,
    taxableTotal,
    estimatedWithheld,
    sells,
    hasData: positions.length > 0 || income.length > 0 || sells.length > 0,
  };
}
