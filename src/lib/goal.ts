// Goal + projection math for the Investments projector.
//
// Pure functions only — no database access, no formatting — so the same code
// runs on the server for the initial render and in the browser while the
// owner drags numbers around in the goal modal.
//
// Rates here are DECIMALS (0.10 = 10% a.a.), which is what the compounding
// formulas want. That differs from ReferenceRates/`annualRate` elsewhere in
// the app, which are percentages (12.65 = 12.65%) — the conversion happens at
// the form boundary, not in here.

import { cycleLabel, cycleKey, addCycles } from "@/lib/format";

/** Gap applied either side of the expected rate to build the scenario band. */
export const SPREAD = 0.03;

// ─── Core formulas ──────────────────────────────────────────────────────────

/** Annual rate → monthly rate. */
export function annualToMonthly(a: number): number {
  return Math.pow(1 + a, 1 / 12) - 1;
}

/** Future value: P0 initial, PMT monthly contribution, i monthly rate, n months. */
export function fv(P0: number, PMT: number, i: number, n: number): number {
  if (i === 0) return P0 + PMT * n;
  const f = Math.pow(1 + i, n);
  return P0 * f + PMT * ((f - 1) / i);
}

/** Monthly contribution needed to reach M in n months. <= 0 means already on track. */
export function requiredPMT(M: number, P0: number, i: number, n: number): number {
  if (n <= 0) return Infinity;
  if (i === 0) return (M - P0) / n;
  const f = Math.pow(1 + i, n);
  return ((M - P0 * f) * i) / (f - 1);
}

/** Months to reach M given P0, contribution PMT and monthly rate i. */
export function monthsToGoal(M: number, P0: number, PMT: number, i: number): number {
  if (P0 >= M) return 0;
  if (i === 0) return PMT > 0 ? (M - P0) / PMT : Infinity;
  const num = M * i + PMT,
    den = P0 * i + PMT;
  if (den <= 0 || num / den <= 0) return Infinity;
  const n = Math.log(num / den) / Math.log(1 + i);
  return n > 0 ? n : Infinity;
}

export type CashFlow = { date: Date; amount: number };

/**
 * Money-weighted return (XIRR) by bisection. Contributions are negative,
 * today's portfolio value is the final positive flow. Returns an annual
 * decimal rate, or null when the flows can't bracket a solution (too few
 * flows, or no sign change — e.g. a portfolio currently worth less than the
 * bisection window allows).
 */
export function xirr(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null;
  const t0 = flows[0].date.getTime();
  const yf = (d: Date) => (d.getTime() - t0) / (365 * 24 * 3600 * 1000);
  const npv = (r: number) => flows.reduce((s, f) => s + f.amount / Math.pow(1 + r, yf(f.date)), 0);
  let lo = -0.9999,
    hi = 10,
    fLo = npv(lo);
  if (fLo * npv(hi) > 0) return null;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2,
      fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLo * fMid < 0) hi = mid;
    else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

// ─── Adapting the app's data to those formulas ──────────────────────────────
//
// Holdings that have recorded buy/sell transactions use them directly: each is
// a genuine dated cash flow, which is exactly what XIRR needs.
//
// Holdings without transactions fall back to the single dated purchase this app
// has always had — `startDate` + `amountInvested`. That fallback carries the
// old limitation: topping one up raises `amountInvested` without recording a
// date, so the money is attributed to the original startDate and XIRR reads
// slightly low. Recording the top-up as a transaction is now the fix, rather
// than the limitation being unavoidable.

export type TransactionLike = { date: Date; kind: string; amount: number };
export type ContributionLike = {
  amountInvested: number;
  startDate: Date;
  transactions?: TransactionLike[];
};
export type CouponLike = { date: Date; amount: number };

/**
 * A holding's contributions as dated flows: real transactions when recorded,
 * otherwise the single startDate purchase. Sells are positive — that cash came
 * back out — which is the same treatment coupons get.
 */
function contributionFlows(h: ContributionLike): CashFlow[] {
  const txs = h.transactions ?? [];
  if (txs.length > 0) {
    return txs
      .filter((tx) => tx.amount > 0)
      .map((tx) => ({ date: tx.date, amount: tx.kind === "sell" ? tx.amount : -tx.amount }));
  }
  return h.amountInvested > 0 ? [{ date: h.startDate, amount: -h.amountInvested }] : [];
}

/**
 * Flows for xirr(): each holding's purchase as a negative flow on its
 * startDate, each coupon as a positive flow (that cash came back out), and
 * the whole portfolio's current value as a positive flow today.
 */
export function buildCashFlows(
  holdings: (ContributionLike & { coupons: CouponLike[] })[],
  currentPortfolioValue: number,
  today: Date = new Date(),
): CashFlow[] {
  const flows: CashFlow[] = [];

  for (const h of holdings) {
    flows.push(...contributionFlows(h));
    for (const c of h.coupons) flows.push({ date: c.date, amount: c.amount });
  }

  flows.sort((a, b) => a.date.getTime() - b.date.getTime());
  // Only meaningful with at least one real contribution before today.
  if (flows.length === 0) return [];
  flows.push({ date: today, amount: currentPortfolioValue });
  return flows;
}

/**
 * Average monthly contribution over the last `months` months, used as the
 * default when the owner hasn't pinned an explicit monthly amount. Divides by
 * the full window (not just months that had a contribution) so a single lump
 * sum doesn't read as a sustainable monthly rate.
 */
export function averageMonthlyContribution(
  holdings: ContributionLike[],
  months = 6,
  today: Date = new Date(),
): number {
  const cutoff = new Date(today);
  cutoff.setMonth(cutoff.getMonth() - months);
  // Uses the same dated flows as XIRR, so a top-up recorded as a transaction
  // counts in the month it happened rather than the month the holding opened.
  const total = holdings.reduce((sum, h) => {
    for (const f of contributionFlows(h)) {
      if (f.amount < 0 && f.date >= cutoff) sum += -f.amount;
    }
    return sum;
  }, 0);
  return months > 0 ? total / months : 0;
}

/** Whole months from `from` to `to`, rounded to the nearest month; negative if past. */
export function monthsBetween(from: Date, to: Date): number {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  // Partial month: count it once the day-of-month is reached.
  return to.getDate() >= from.getDate() ? months : months - 1;
}

export type Scenarios = { pessimistic: number; realistic: number; optimistic: number };

/** The three scenario rates derived from the expected rate. */
export function scenarioRates(expectedAnnualRate: number): Scenarios {
  return {
    pessimistic: expectedAnnualRate - SPREAD,
    realistic: expectedAnnualRate,
    optimistic: expectedAnnualRate + SPREAD,
  };
}

export type GoalProjectionPoint = {
  label: string;
  monthIndex: number;
  realistic: number;
  /** [pessimistic, optimistic] — Recharts renders a two-value dataKey as a band. */
  band: [number, number];
};

/**
 * Month-by-month projection from today out to the target date (or +6 months,
 * whichever is further), plus where the realistic line first reaches the goal.
 */
export function goalProjection({
  currentValue,
  monthlyContribution,
  expectedAnnualRate,
  targetAmount,
  targetDate,
  today = new Date(),
}: {
  currentValue: number;
  monthlyContribution: number;
  expectedAnnualRate: number;
  targetAmount: number;
  targetDate: Date;
  today?: Date;
}): { points: GoalProjectionPoint[]; crossingIndex: number | null } {
  const rates = scenarioRates(expectedAnnualRate);
  const iP = annualToMonthly(rates.pessimistic);
  const iR = annualToMonthly(rates.realistic);
  const iO = annualToMonthly(rates.optimistic);

  const horizon = Math.max(6, monthsBetween(today, targetDate));
  const startKey = cycleKey(today);

  const points: GoalProjectionPoint[] = [];
  let crossingIndex: number | null = null;

  for (let n = 0; n <= horizon; n++) {
    const realistic = fv(currentValue, monthlyContribution, iR, n);
    points.push({
      label: cycleLabel(addCycles(startKey, n)),
      monthIndex: n,
      realistic,
      band: [
        fv(currentValue, monthlyContribution, iP, n),
        fv(currentValue, monthlyContribution, iO, n),
      ],
    });
    if (crossingIndex === null && realistic >= targetAmount) crossingIndex = n;
  }

  return { points, crossingIndex };
}

/** Average monthly *expenses* over the last `months` — for the emergency-reserve preset. */
export function averageMonthlyExpenses(
  entries: { type: string; amount: number; date: Date }[],
  months = 6,
  today: Date = new Date(),
): number {
  const cutoff = new Date(today);
  cutoff.setMonth(cutoff.getMonth() - months);
  const total = entries
    .filter((e) => e.type === "expense" && e.date >= cutoff && e.date <= today)
    .reduce((sum, e) => sum + e.amount, 0);
  return months > 0 ? total / months : 0;
}

/** Date `n` months after `from`, for turning a month count back into a date. */
export function addMonths(from: Date, n: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + Math.round(n));
  return d;
}
