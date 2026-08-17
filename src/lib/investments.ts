import {
  CYCLE_START_DAY,
  addCycles,
  currentCycleKey,
  cycleEndDate,
  cycleLabel,
  toDateInputValue,
} from "@/lib/format";
import { valuation, iofRate as iofRateFor, irRate as irRateFor } from "@/lib/investmentTypes";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n";

export type PricePointLike = { date: Date; price: number };
export type CouponPaymentLike = { date: Date; amount: number };

export type InvestmentLike = {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  indexador: string | null;
  annualRate: number | null;
  spread: number | null;
  adminFee: number | null;
  perfFee: number | null;
  amountInvested: number;
  startDate: Date;
  maturityDate: Date | null;
  symbol: string | null;
  quantity: number | null;
  purchaseRef: number | null;
  expectedReturn: number | null;
  corretagem: number | null;
  prices: PricePointLike[];
  coupons: CouponPaymentLike[];
};

export type ReferenceRatesLike = { cdi: number; selic: number; ipca: number };

function dateKey(date: Date): string {
  return toDateInputValue(date);
}

function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const aMid = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bMid = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bMid - aMid) / MS_PER_DAY);
}

/**
 * The annual % rate used for accrual and projections.
 *
 * The reference spec's own pseudocode only special-cases `type === "renda-fixa"`
 * for indexador-based resolution, which would leave `fundo` holdings with no
 * working rate (they don't have an `expectedReturn` field on the form, and the
 * spec elsewhere — the indexador section and the form-fields table — groups
 * `fundo` with `renda-fixa` for rate purposes). Grouping them here fixes that
 * gap rather than reproducing it.
 */
export function getEffectiveRate(inv: InvestmentLike, rates: ReferenceRatesLike): number {
  const adminFee = inv.adminFee ?? 0;

  if (inv.type === "renda-fixa" || inv.type === "fundo") {
    const r = inv.annualRate ?? 0;
    const idx = inv.indexador ?? "prefixada";
    const sp = inv.spread ?? 0;

    let gross: number;
    if (idx === "cdi-pct") gross = (r / 100) * rates.cdi;
    else if (idx === "cdi-plus") gross = rates.cdi + sp;
    else if (idx === "selic-pct") gross = (r / 100) * rates.selic;
    else if (idx === "ipca-plus") gross = ((1 + rates.ipca / 100) * (1 + sp / 100) - 1) * 100;
    else gross = r; // prefixada

    return Math.max(0, gross - adminFee);
  }

  return Math.max(0, (inv.expectedReturn ?? 0) - adminFee);
}

/** Compound accrual from amountInvested, using the effective rate, as of a given date. */
export function accrualValue(inv: InvestmentLike, rates: ReferenceRatesLike, asOfDate: Date): number {
  const days = daysBetween(inv.startDate, asOfDate);
  if (days <= 0) return inv.amountInvested;
  const rate = getEffectiveRate(inv, rates);
  return inv.amountInvested * Math.pow(1 + rate / 100, days / 365);
}

/** Sum of coupon payments received on or before a given date. */
export function totalCoupons(inv: InvestmentLike, throughDate: Date = new Date()): number {
  const key = dateKey(throughDate);
  return inv.coupons.reduce((sum, c) => (dateKey(c.date) <= key ? sum + c.amount : sum), 0);
}

export function latestPrice(inv: InvestmentLike): PricePointLike | null {
  if (inv.prices.length === 0) return null;
  return [...inv.prices].sort((a, b) => b.date.getTime() - a.date.getTime())[0];
}

function latestPriceOnOrBefore(inv: InvestmentLike, asOfDate: Date): PricePointLike | null {
  const key = dateKey(asOfDate);
  let latest: PricePointLike | null = null;
  for (const p of inv.prices) {
    if (dateKey(p.date) > key) continue;
    if (!latest || p.date.getTime() > latest.date.getTime()) latest = p;
  }
  return latest;
}

/**
 * A holding's value as of any date — manual price/MTM entry when one exists
 * on or before that date, otherwise the type's fallback (flat amountInvested
 * for ação/cripto, compound accrual for everything else). This is the one
 * place that chain lives; currentValue(), the value-over-time chart, and the
 * tax calculations all go through it so they never disagree with each other.
 *
 * Coupon payments (juros semestrais on NTN-F, debêntures, etc.) are cash
 * already paid out to the owner, so they're subtracted from the accrual
 * fallback only — a manual price/MTM entry already reflects the market's
 * current price net of paid coupons, so subtracting again there would
 * double-count. gainLoss()/taxBreakdown() add coupons back so total return
 * still reflects them; only the "how much is still in the holding" figure
 * nets them out.
 *
 * Also doubles as the projection function: called with a future asOfDate it
 * naturally projects accrual forward, while manual-price/flat-fallback
 * holdings (ação, cripto, anything with a price on file) stay flat since no
 * future price point exists to look up — exactly the "no growth assumption
 * for market-driven assets" behavior the projection wants, with no special
 * casing needed here.
 *
 * Live price lookups (brapi/CoinGecko/Tesouro Direto APIs) from the reference
 * spec are intentionally not implemented — every price in this app is entered
 * by hand via the Update Prices screen.
 */
/**
 * True once a holding has reached its maturity date — the money has been paid
 * back and is sitting as cash to reinvest, so it's no longer an active
 * position. Inclusive of the maturity date itself: a CDB maturing today is
 * finalized today.
 *
 * Holdings with no maturity date (stocks, crypto, open-ended funds) never
 * mature.
 */
export function isMatured(inv: InvestmentLike, asOfDate: Date = new Date()): boolean {
  if (!inv.maturityDate) return false;
  return dateKey(asOfDate) >= dateKey(inv.maturityDate);
}

export function valueAtDate(inv: InvestmentLike, rates: ReferenceRatesLike, asOfDate: Date): number {
  const { mode, fallback } = valuation(inv.type, inv.subtype);
  // A matured holding stops earning, so its value freezes at the redemption
  // figure instead of accruing forever. Capping the *date* rather than
  // special-casing the value keeps every branch below (manual price, MTM,
  // accrual, coupons) consistent, and matches what projectPortfolioValue()
  // already did for future dates.
  if (inv.maturityDate && dateKey(asOfDate) > dateKey(inv.maturityDate)) {
    asOfDate = inv.maturityDate;
  }
  const manual = latestPriceOnOrBefore(inv, asOfDate);

  if (manual) {
    return mode === "unit" ? (inv.quantity ?? 0) * manual.price : manual.price;
  }

  if (fallback === "amountInvested") return inv.amountInvested;
  return accrualValue(inv, rates, asOfDate) - totalCoupons(inv, asOfDate);
}

export function currentValue(inv: InvestmentLike, rates: ReferenceRatesLike): number {
  return valueAtDate(inv, rates, new Date());
}

export type TaxBreakdown = {
  grossGain: number;
  holdingDays: number;
  iofRate: number;
  iof: number;
  irRate: number;
  ir: number;
  netGain: number;
  netValue: number;
};

/**
 * Estimated IOF + IR on the gain, per the spec's regressive tables and
 * per-type/subtype exemptions. This is an estimate for personal reference,
 * not tax filing guidance — Fundo come-cotas isn't modeled, and real
 * brokerage statements may differ.
 */
export function taxBreakdown(
  inv: InvestmentLike,
  rates: ReferenceRatesLike,
  asOfDate: Date = new Date(),
): TaxBreakdown {
  const value = valueAtDate(inv, rates, asOfDate);
  // Coupons were subtracted out of `value` above (see valueAtDate) since
  // that cash already left the holding — add it back here so gain/loss
  // reflects total return (price/accrual movement + income received), not
  // just what's still sitting in the holding.
  const grossGain = value + totalCoupons(inv, asOfDate) - inv.amountInvested;
  const holdingDays = Math.max(0, daysBetween(inv.startDate, asOfDate));

  const iRate = iofRateFor(holdingDays);
  const iof = grossGain > 0 ? grossGain * iRate : 0;

  const irBase = grossGain - iof;
  const irR = irRateFor(inv.type, inv.subtype, holdingDays);
  const ir = irBase > 0 ? irBase * irR : 0;

  const netGain = grossGain - iof - ir;

  return {
    grossGain,
    holdingDays,
    iofRate: iRate,
    iof,
    irRate: irR,
    ir,
    netGain,
    netValue: inv.amountInvested + netGain,
  };
}

export function gainLoss(
  inv: InvestmentLike,
  rates: ReferenceRatesLike,
): { gain: number; returnPct: number; tax: TaxBreakdown } | null {
  if (inv.amountInvested <= 0) return null;
  const tax = taxBreakdown(inv, rates);
  return { gain: tax.grossGain, returnPct: tax.grossGain / inv.amountInvested, tax };
}

export type AllocationSlice = { type: string; value: number };

export function allocationByType(investments: InvestmentLike[], rates: ReferenceRatesLike): AllocationSlice[] {
  const totals = new Map<string, number>();
  for (const inv of investments) {
    // Matured holdings are cash awaiting reinvestment, not an allocation to
    // their old asset class — excluded here so this agrees with the
    // active-only totals in portfolioSummary().
    if (isMatured(inv)) continue;
    const value = currentValue(inv, rates);
    if (!value) continue;
    totals.set(inv.type, (totals.get(inv.type) ?? 0) + value);
  }
  return Array.from(totals.entries())
    .map(([type, value]) => ({ type, value }))
    .sort((a, b) => b.value - a.value);
}

export type PortfolioSummary = {
  /** Active (not yet matured) holdings only — see maturedValue. */
  totalValue: number;
  totalInvested: number;
  totalCouponsReceived: number;
  gain: number;
  returnPct: number | null;
  /** Redemption value of matured holdings: cash available to reinvest. */
  maturedValue: number;
  maturedCount: number;
};

/**
 * Portfolio figures for *active* holdings. Matured ones are reported
 * separately (maturedValue/maturedCount) rather than folded into the totals —
 * that money has been paid back and is waiting to be reinvested, so counting
 * it as an open position would overstate what's actually invested. The
 * Investments page surfaces it as a "ready to reinvest" notice instead.
 */
export function portfolioSummary(investments: InvestmentLike[], rates: ReferenceRatesLike): PortfolioSummary {
  const active = investments.filter((inv) => !isMatured(inv));
  const matured = investments.filter((inv) => isMatured(inv));

  const totalValue = active.reduce((sum, inv) => sum + currentValue(inv, rates), 0);
  const totalInvested = active.reduce((sum, inv) => sum + inv.amountInvested, 0);
  const totalCouponsReceived = active.reduce((sum, inv) => sum + totalCoupons(inv), 0);
  // Coupons already left the holding (see valueAtDate), so add them back here
  // for the same reason taxBreakdown() does — gain/loss should reflect total
  // return, not just what's still sitting in the holdings.
  const gain = totalValue + totalCouponsReceived - totalInvested;
  const returnPct = totalInvested > 0 ? gain / totalInvested : null;

  const maturedValue = matured.reduce((sum, inv) => sum + currentValue(inv, rates), 0);

  return {
    totalValue,
    totalInvested,
    totalCouponsReceived,
    gain,
    returnPct,
    maturedValue,
    maturedCount: matured.length,
  };
}

export type PortfolioValuePoint = { date: string; label: string; value: number };

/**
 * A holding's contribution to a historical/monthly value chart at a given
 * date — zero before its startDate (it wasn't owned yet, so it shouldn't
 * count) and zero after its maturityDate (it's matured/redeemed by then, so
 * that cash has left the tracked holding, same reasoning as coupons in
 * valueAtDate()). Otherwise just valueAtDate(). This is deliberately
 * stricter than valueAtDate() itself, which doesn't cap at maturity — that
 * function is also used for *current* value/tax/gain figures, where the
 * owner is expected to update or delete a holding once it actually matures
 * rather than the app silently zeroing it out from under them.
 */
function ownershipValue(inv: InvestmentLike, rates: ReferenceRatesLike, asOfDate: Date): number {
  if (dateKey(asOfDate) < dateKey(inv.startDate)) return 0;
  // Goes through isMatured() rather than its own date comparison so the charts
  // and the summary pills use the exact same boundary — this used to be a `>`
  // against maturityDate while isMatured() is inclusive of it, which meant that
  // on the maturity date itself the totals dropped the holding but the chart's
  // last point still counted it.
  if (isMatured(inv, asOfDate)) return 0;
  return valueAtDate(inv, rates, asOfDate);
}

/**
 * One checkpoint per budget cycle: the last day of each of the past
 * `monthsBack` cycles (see cycleEndDate), plus today for the cycle currently
 * in progress. Cycle-based rather than calendar-based so a point labeled
 * "Aug 2026" covers the same window everywhere else in the app does.
 */
function monthlyCheckpoints(monthsBack: number, startDay: number): { date: Date; key: string }[] {
  const now = new Date();
  const current = currentCycleKey(startDay);
  return Array.from({ length: monthsBack + 1 }, (_, i) => {
    const cyclesAgo = monthsBack - i;
    const key = addCycles(current, -cyclesAgo);
    return { key, date: cyclesAgo === 0 ? now : cycleEndDate(key, startDay) };
  });
}

/**
 * A single holding's value at the end of each of the last `monthsBack`
 * months — zero before its startDate and after its maturityDate, see
 * ownershipValue().
 */
export function monthlyValue(
  inv: InvestmentLike,
  rates: ReferenceRatesLike,
  monthsBack = 12,
  startDay: number = CYCLE_START_DAY,
  lang: Language = DEFAULT_LANGUAGE,
): PortfolioValuePoint[] {
  return monthlyCheckpoints(monthsBack, startDay).map(({ date, key }) => ({
    date: dateKey(date),
    label: cycleLabel(key, lang),
    value: ownershipValue(inv, rates, date),
  }));
}

/** Total portfolio value at the end of each of the last `monthsBack` months. */
export function monthlyPortfolioValue(
  investments: InvestmentLike[],
  rates: ReferenceRatesLike,
  monthsBack = 12,
  startDay: number = CYCLE_START_DAY,
  lang: Language = DEFAULT_LANGUAGE,
): PortfolioValuePoint[] {
  return monthlyCheckpoints(monthsBack, startDay).map(({ date, key }) => ({
    date: dateKey(date),
    label: cycleLabel(key, lang),
    value: investments.reduce((sum, inv) => sum + ownershipValue(inv, rates, date), 0),
  }));
}

export type ProjectionPoint = { label: string; days: number; value: number };

// 90d and "3 months" land on (almost) the same day, so only one is kept —
// the near-term horizons are day-based (30/60/90d) and everything from 6
// months on is calendar-month-based, per the owner's requested list.
// The label is built from `n` + a translated unit suffix rather than stored
// as text, so "1y" becomes "1a" in Portuguese without a second table.
const PROJECTION_HORIZONS: { n: number; unit: "d" | "m" | "y"; days?: number; months?: number }[] = [
  { n: 30, unit: "d", days: 30 },
  { n: 60, unit: "d", days: 60 },
  { n: 90, unit: "d", days: 90 },
  { n: 6, unit: "m", months: 6 },
  { n: 9, unit: "m", months: 9 },
  { n: 1, unit: "y", months: 12 },
  { n: 3, unit: "y", months: 36 },
  { n: 5, unit: "y", months: 60 },
  { n: 10, unit: "y", months: 120 },
  { n: 15, unit: "y", months: 180 },
  { n: 20, unit: "y", months: 240 },
];

export function horizonLabel(
  h: { n: number; unit: "d" | "m" | "y" },
  t: { horizonDays: string; horizonMonths: string; horizonYears: string },
): string {
  const suffix =
    h.unit === "d" ? t.horizonDays : h.unit === "m" ? t.horizonMonths : t.horizonYears;
  return `${h.n}${suffix}`;
}

function addHorizon(base: Date, h: { days?: number; months?: number }): Date {
  const d = new Date(base);
  if (h.days != null) d.setDate(d.getDate() + h.days);
  else d.setMonth(d.getMonth() + (h.months ?? 0));
  return d;
}

/**
 * A single holding's projected value at a future date — reuses valueAtDate()
 * so accrual, coupon deduction, and the "no data = stay flat" behavior for
 * ação/cripto/priced holdings all fall out of that one function for free.
 * The only projection-specific rule is capping at the maturity date: past
 * maturity, a bond isn't accruing anymore, so its value freezes there rather
 * than projecting further (matches "freeze at maturity", not "assume
 * automatic reinvestment").
 */
function projectedInvestmentValue(inv: InvestmentLike, rates: ReferenceRatesLike, targetDate: Date): number {
  const cap = inv.maturityDate && targetDate.getTime() > inv.maturityDate.getTime() ? inv.maturityDate : targetDate;
  return valueAtDate(inv, rates, cap);
}

/**
 * Projected total portfolio value at a fixed set of future horizons. An
 * estimate, not a forecast guarantee — it assumes today's rates hold steady
 * (no CDI/SELIC/IPCA drift) and that matured holdings aren't reinvested; see
 * the disclaimer surfaced next to this chart.
 */
export function projectPortfolioValue(
  investments: InvestmentLike[],
  rates: ReferenceRatesLike,
  units: { horizonDays: string; horizonMonths: string; horizonYears: string } = {
    horizonDays: "d",
    horizonMonths: "m",
    horizonYears: "y",
  },
): ProjectionPoint[] {
  const today = new Date();
  return PROJECTION_HORIZONS.map((h) => {
    const targetDate = addHorizon(today, h);
    const value = investments.reduce((sum, inv) => sum + projectedInvestmentValue(inv, rates, targetDate), 0);
    return { label: horizonLabel(h, units), days: daysBetween(today, targetDate), value };
  });
}
