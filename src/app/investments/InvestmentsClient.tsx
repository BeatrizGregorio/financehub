"use client";

import { useActionState, useState } from "react";
import { PartyPopper, Plus, RefreshCw } from "lucide-react";
import { Modal } from "@/components/Modal";
import { HoldingForm } from "./HoldingForm";
import { HoldingsTable } from "./HoldingsTable";
import { CouponSection } from "./CouponSection";
import { TransactionSection } from "./TransactionSection";
import { UpdatePricesModal } from "./UpdatePricesModal";
import { HoldingDetail } from "./HoldingDetail";
import { redeemToAccount, type ActionState } from "./actions";
import { ProjectionChart } from "@/components/ProjectionChart";
import { GoalProjectionCard } from "./GoalProjectionCard";
import type { GoalLike } from "./GoalForm";
import { PortfolioValueChart } from "@/components/PortfolioValueChart";
import { PerformanceChart } from "@/components/PerformanceChart";
import {
  MAX_PROJECTED_RATE,
  MAX_REALIZED_PROJECTION_YEARS,
  currentValue,
  isAccrualValued,
  isMatured,
  monthlyPortfolioValue,
  portfolioSummary,
  projectPortfolioValue,
  type ReferenceRatesLike,
} from "@/lib/investments";
import { formatCurrency, formatDate } from "@/lib/format";
import { CARD } from "@/lib/ui";
import { useT } from "@/components/LanguageProvider";

export type Holding = {
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
  institution: string | null;
  notes: string | null;
  prices: { id: string; date: Date; price: number }[];
  coupons: { id: string; date: Date; amount: number }[];
  transactions: { id: string; date: Date; kind: string; amount: number; quantity: number | null }[];
};

function SummaryPill({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className={`${CARD} min-w-[190px] flex-1 px-5 py-4`}>
      <p className="mb-1 font-mono text-[10.5px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase">
        {label}
      </p>
      <p
        className="text-2xl leading-none font-extrabold"
        style={{ color: positive === undefined ? "var(--color-ink)" : positive ? "var(--color-positive-text)" : "var(--color-rust-text)" }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="mt-1 font-mono text-xs"
          style={{ color: positive === undefined ? "var(--color-muted-2)" : positive ? "var(--color-positive-text)" : "var(--color-rust-text)" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export function InvestmentsClient({
  holdings,
  rates,
  ratesUpdatedAt,
  cycleStartDay,
  goal,
  emergencyReserveTarget,
  goalCardOpen,
  accounts,
}: {
  holdings: Holding[];
  rates: ReferenceRatesLike;
  // Passed separately rather than widening ReferenceRatesLike, which is the
  // shape the pure maths in lib/investments.ts takes — the timestamp is a
  // presentation concern and has no business in the valuation functions.
  ratesUpdatedAt: Date | null;
  cycleStartDay: number;
  goal: GoalLike | null;
  emergencyReserveTarget: number | null;
  goalCardOpen: boolean;
  accounts: { id: string; name: string }[];
}) {
  const { t, lang } = useT();
  const [editing, setEditing] = useState<Holding | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPrices, setShowPrices] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [couponForId, setCouponForId] = useState<string | null>(null);
  const [withdrawForId, setWithdrawForId] = useState<string | null>(null);

  const summary = portfolioSummary(holdings, rates);
  // Matured *and* still holding something. Moving one into an account
  // records a sell for its whole value, so it leaves this list by itself —
  // no "redeemed" flag to keep in step with the money.
  const maturedHoldings = holdings.filter((h) => isMatured(h) && currentValue(h, rates) > 0.005);
  // Only worth mentioning the reference rates when something actually depends
  // on them — a portfolio of stocks with manual prices doesn't use them at all.
  const hasAccrualHoldings = holdings.some((h) => !isMatured(h) && isAccrualValued(h, rates));
  const projection = projectPortfolioValue(holdings, rates, t.charts);
  const monthly = monthlyPortfolioValue(holdings, rates, 12, cycleStartDay, lang);
  // Derive from the live `holdings` prop (not a frozen snapshot) so editing or
  // deleting a price point inside the detail view updates it immediately.
  const viewing = viewingId ? (holdings.find((h) => h.id === viewingId) ?? null) : null;
  // Derived from the live `holdings` prop by id rather than held as a frozen
  // object, so a coupon added in the modal shows up immediately — same
  // reasoning as `viewing` above.
  const couponFor = couponForId ? (holdings.find((h) => h.id === couponForId) ?? null) : null;
  // Derived from the live list by id, like couponFor — so a withdrawal
  // recorded inside the modal shows up in its own list without closing it.
  const withdrawFor = withdrawForId ? (holdings.find((h) => h.id === withdrawForId) ?? null) : null;

  function startEdit(holding: Holding) {
    setEditing(holding);
    setShowForm(true);
  }

  function closeForm() {
    setEditing(null);
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[34px]">{t.investments.title}</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {t.investments.holdingCount(holdings.length)} · {t.investments.estimatesNotice}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPrices(true)}
            className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-[var(--color-card)] px-4 py-3 text-[13.5px] font-semibold text-[var(--color-ink)] backdrop-blur-xl transition hover:bg-[var(--color-panel)]"
          >
            <RefreshCw size={15} /> {t.investments.updatePrices}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-xl px-5 py-3 text-[13.5px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Plus size={16} /> {t.investments.addHolding}
          </button>
        </div>
      </div>

      {maturedHoldings.length > 0 && (
        <div className="flex flex-col gap-2 rounded-[18px] border border-[var(--color-positive)]/25 bg-[var(--color-positive)]/[0.07] px-5 py-4">
          <div className="flex items-start gap-2.5">
            <PartyPopper size={17} className="mt-px shrink-0 text-[var(--color-positive-text)]" />
            <p className="text-[13.5px] leading-snug text-[var(--color-ink)]">
              {t.investments.maturedBanner(maturedHoldings.length)}
              <span className="font-mono font-bold">{formatCurrency(summary.maturedValue)}</span>{" "}
              {t.investments.toReinvest}
            </p>
          </div>
          <ul className="flex flex-col gap-1 pl-[27px]">
            {maturedHoldings.map((h) => (
              <MaturedRow key={h.id} holding={h} rates={rates} accounts={accounts} />
            ))}
          </ul>
          <p className="pl-[27px] text-[11.5px] text-[var(--color-muted)]">
            {t.investments.maturedFootnote}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <SummaryPill label={t.investments.totalValue} value={formatCurrency(summary.totalValue)} />
        <SummaryPill label={t.investments.totalInvested} value={formatCurrency(summary.totalInvested)} />
        {summary.returnPct != null && (
          <SummaryPill
            label={t.investments.totalGainLoss}
            value={`${summary.gain >= 0 ? "+" : "−"}${formatCurrency(Math.abs(summary.gain))}`}
            sub={`${summary.returnPct >= 0 ? "+" : "−"}${(Math.abs(summary.returnPct) * 100).toFixed(1)}%`}
            positive={summary.gain >= 0}
          />
        )}
        {summary.totalCouponsReceived > 0 && (
          <SummaryPill label={t.investments.couponsReceived} value={formatCurrency(summary.totalCouponsReceived)} positive />
        )}
      </div>

      {/* The CDI/SELIC/IPCA rates drive every accrual figure on this page but
          have no editor (removed in V1.9), so they can only go stale. Saying
          so is the difference between an estimate and a number that looks
          firmer than it is. */}
      {hasAccrualHoldings && (
        <p className="-mt-2 flex flex-wrap gap-x-1.5 gap-y-0.5 text-[12px] text-[var(--color-muted)]">
          <span>
            {t.investments.ratesNote(
              `${rates.cdi.toFixed(2)}%`,
              `${rates.selic.toFixed(2)}%`,
              `${rates.ipca.toFixed(2)}%`,
            )}
          </span>
          <span className={ratesUpdatedAt ? undefined : "text-[var(--color-rust-text)]"}>
            {ratesUpdatedAt
              ? t.investments.ratesUpdated(formatDate(ratesUpdatedAt, lang))
              : t.investments.ratesNeverUpdated}
          </span>
        </p>
      )}

      {/* First content block on the page, per the owner's request: the
          question "which of these is actually working" comes before the
          timeline charts and the holdings list. */}
      {holdings.length > 0 && (
        <div className={`${CARD} p-5`}>
          <h2 className="text-[17px] font-extrabold tracking-tight">{t.investments.performance}</h2>
          <p className="mt-1 mb-3 text-[12.5px] text-[var(--color-muted)]">
            {t.investments.performanceBlurb}
          </p>
          <PerformanceChart investments={holdings} rates={rates} cycleStartDay={cycleStartDay} />
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className={`${CARD} p-5`}>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold tracking-tight">{t.investments.monthlyValue}</h2>
            <span className="text-[11px] text-[var(--color-muted-2)]">{t.common.lastMonths(12)}</span>
          </div>
          <p className="mb-3 text-[12.5px] text-[var(--color-muted)]">
            {t.investments.monthlyValueBlurb}
          </p>
          <PortfolioValueChart data={monthly} />
        </div>

        <div className={`${CARD} p-5`}>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold tracking-tight">{t.investments.projection}</h2>
            <span className="text-[11px] text-[var(--color-muted-2)]">
              {projection[0]?.label} → {projection[projection.length - 1]?.label}
            </span>
          </div>
          <p className="mb-3 text-[12.5px] text-[var(--color-muted)]">
            {t.investments.projectionBlurb(String(MAX_PROJECTED_RATE), String(MAX_REALIZED_PROJECTION_YEARS))}
          </p>
          <ProjectionChart data={projection} />
        </div>
      </div>

      <GoalProjectionCard
        goal={goal}
        holdings={holdings}
        currentValue={summary.totalValue}
        emergencyReserveTarget={emergencyReserveTarget}
        initialOpen={goalCardOpen}
      />

      {showForm && (
        <Modal title={editing ? t.investments.editHolding : t.investments.addHolding} onClose={closeForm}>
          <HoldingForm key={editing?.id ?? "new"} holding={editing ?? undefined} onDone={closeForm} />
        </Modal>
      )}

      {showPrices && (
        <Modal title={t.investments.updatePrices} onClose={() => setShowPrices(false)}>
          <UpdatePricesModal holdings={holdings} onDone={() => setShowPrices(false)} />
        </Modal>
      )}

      {viewing && (
        <Modal title={viewing.name} onClose={() => setViewingId(null)}>
          <HoldingDetail holding={viewing} rates={rates} cycleStartDay={cycleStartDay} accounts={accounts} />
        </Modal>
      )}

      {couponFor && (
        <Modal title={`${t.investments.couponPayments} — ${couponFor.name}`} onClose={() => setCouponForId(null)}>
          <CouponSection holding={couponFor} />
        </Modal>
      )}

      {withdrawFor && (
        <Modal title={`${t.investments.withdraw} — ${withdrawFor.name}`} onClose={() => setWithdrawForId(null)}>
          {/* The same component the detail view uses, in its withdraw
              presentation — one set of add/delete wiring, two framings. */}
          <TransactionSection holding={withdrawFor} mode="withdraw" accounts={accounts} />
        </Modal>
      )}

      <HoldingsTable
        holdings={holdings}
        rates={rates}
        onEdit={startEdit}
        onView={(h) => setViewingId(h.id)}
        onAddCoupon={(h) => setCouponForId(h.id)}
        onWithdraw={(h) => setWithdrawForId(h.id)}
      />
    </div>
  );
}

/**
 * One matured holding in the banner, with somewhere to put the money.
 *
 * A matured holding contributes nothing to the portfolio totals or to net
 * worth (V1.20), so until the cash is recorded in an account it has simply
 * dropped out of the app. This is the one place that is obvious, which is
 * why the control lives here rather than in the table.
 *
 * Not automatic: only the owner knows which account the money landed in.
 */
function MaturedRow({
  holding,
  rates,
  accounts,
}: {
  holding: Holding;
  rates: ReferenceRatesLike;
  accounts: { id: string; name: string }[];
}) {
  const { t, lang } = useT();
  const [state, formAction] = useActionState(redeemToAccount.bind(null, holding.id), {} as ActionState);

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12.5px]">
      <span className="font-semibold text-[var(--color-ink)]">{holding.name}</span>
      <span className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:w-auto sm:flex-1">
        <span className="font-mono text-[var(--color-muted)]">
          {t.investments.maturedOn} {holding.maturityDate ? formatDate(holding.maturityDate, lang) : ""} ·{" "}
          {formatCurrency(currentValue(holding, rates))}
        </span>
        {accounts.length > 0 && (
          <form action={formAction} className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:w-auto sm:flex-1 sm:flex-nowrap">
            <select
              name="toAccountId"
              defaultValue=""
              required
              aria-label={t.investments.moveToAccountFor(holding.name)}
              // A floor rather than min-w-0: with nothing to stop it the select
              // shrank to a crushed "Es..." instead of pushing the button onto a
              // second line, which is the V1.8 trap exactly.
              className="min-w-[150px] flex-1 rounded-[9px] bg-[var(--color-surface-raised)] px-2 py-1 text-[12px] text-[var(--color-ink)] outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
            >
              <option value="" disabled>
                {t.investments.chooseAccount}
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold whitespace-nowrap text-white transition hover:brightness-105 active:scale-95"
              style={{ background: "var(--gradient-brand)" }}
            >
              {t.investments.moveToAccount}
            </button>
          </form>
        )}
      </span>
      {state.error && (
        <span className="w-full text-[12px] text-[var(--color-rust-text)]">{state.error}</span>
      )}
    </li>
  );
}
