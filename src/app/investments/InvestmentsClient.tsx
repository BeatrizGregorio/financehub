"use client";

import { useState } from "react";
import { PartyPopper, Plus, RefreshCw } from "lucide-react";
import { Modal } from "@/components/Modal";
import { HoldingForm } from "./HoldingForm";
import { HoldingsTable } from "./HoldingsTable";
import { CouponSection } from "./CouponSection";
import { UpdatePricesModal } from "./UpdatePricesModal";
import { HoldingDetail } from "./HoldingDetail";
import { ProjectionChart } from "@/components/ProjectionChart";
import { GoalProjectionCard } from "./GoalProjectionCard";
import type { GoalLike } from "./GoalForm";
import { PortfolioValueChart } from "@/components/PortfolioValueChart";
import {
  currentValue,
  isMatured,
  monthlyPortfolioValue,
  portfolioSummary,
  projectPortfolioValue,
  type ReferenceRatesLike,
} from "@/lib/investments";
import { formatCurrency, formatDate } from "@/lib/format";
import { CARD } from "@/lib/ui";

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
        style={{ color: positive === undefined ? "var(--color-ink)" : positive ? "#0c9e57" : "#dc3545" }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="mt-1 font-mono text-xs"
          style={{ color: positive === undefined ? "var(--color-muted-2)" : positive ? "#0c9e57" : "#dc3545" }}
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
  cycleStartDay,
  goal,
  emergencyReserveTarget,
}: {
  holdings: Holding[];
  rates: ReferenceRatesLike;
  cycleStartDay: number;
  goal: GoalLike | null;
  emergencyReserveTarget: number | null;
}) {
  const [editing, setEditing] = useState<Holding | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPrices, setShowPrices] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [couponForId, setCouponForId] = useState<string | null>(null);

  const summary = portfolioSummary(holdings, rates);
  const maturedHoldings = holdings.filter((h) => isMatured(h));
  const projection = projectPortfolioValue(holdings, rates);
  const monthly = monthlyPortfolioValue(holdings, rates, 12, cycleStartDay);
  // Derive from the live `holdings` prop (not a frozen snapshot) so editing or
  // deleting a price point inside the detail view updates it immediately.
  const viewing = viewingId ? (holdings.find((h) => h.id === viewingId) ?? null) : null;
  // Derived from the live `holdings` prop by id rather than held as a frozen
  // object, so a coupon added in the modal shows up immediately — same
  // reasoning as `viewing` above.
  const couponFor = couponForId ? (holdings.find((h) => h.id === couponForId) ?? null) : null;

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
          <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[34px]">Investments</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {holdings.length} holding{holdings.length === 1 ? "" : "s"} · gain/loss figures are
            estimates, not tax guidance
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPrices(true)}
            className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-[var(--color-card)] px-4 py-3 text-[13.5px] font-semibold text-[var(--color-ink)] backdrop-blur-xl transition hover:bg-[var(--color-panel)]"
          >
            <RefreshCw size={15} /> Update prices
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 rounded-xl px-5 py-3 text-[13.5px] font-semibold text-white shadow-[0_4px_16px_rgba(12,158,87,0.28)] transition hover:brightness-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #0c9e57, #0a7a43)" }}
          >
            <Plus size={16} /> Add holding
          </button>
        </div>
      </div>

      {maturedHoldings.length > 0 && (
        <div className="flex flex-col gap-2 rounded-[18px] border border-[#0c9e57]/25 bg-[#0c9e57]/[0.07] px-5 py-4">
          <div className="flex items-start gap-2.5">
            <PartyPopper size={17} className="mt-px shrink-0 text-[#0c9e57]" />
            <p className="text-[13.5px] leading-snug text-[var(--color-ink)]">
              {maturedHoldings.length === 1
                ? "Your investment is finalized — you have "
                : `${maturedHoldings.length} investments are finalized — you have `}
              <span className="font-mono font-bold">{formatCurrency(summary.maturedValue)}</span> to
              reinvest!
            </p>
          </div>
          <ul className="flex flex-col gap-1 pl-[27px]">
            {maturedHoldings.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[12.5px]"
              >
                <span className="font-semibold text-[var(--color-ink)]">{h.name}</span>
                <span className="font-mono text-[var(--color-muted)]">
                  matured {h.maturityDate ? formatDate(h.maturityDate) : ""} ·{" "}
                  {formatCurrency(currentValue(h, rates))}
                </span>
              </li>
            ))}
          </ul>
          <p className="pl-[27px] text-[11.5px] text-[var(--color-muted)]">
            These are no longer counted in your totals below. They stay here until you delete them,
            so nothing is lost.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <SummaryPill label="Total value" value={formatCurrency(summary.totalValue)} />
        <SummaryPill label="Total invested" value={formatCurrency(summary.totalInvested)} />
        {summary.returnPct != null && (
          <SummaryPill
            label="Total gain/loss"
            value={`${summary.gain >= 0 ? "+" : "−"}${formatCurrency(Math.abs(summary.gain))}`}
            sub={`${summary.returnPct >= 0 ? "+" : "−"}${(Math.abs(summary.returnPct) * 100).toFixed(1)}%`}
            positive={summary.gain >= 0}
          />
        )}
        {summary.totalCouponsReceived > 0 && (
          <SummaryPill label="Coupons received" value={formatCurrency(summary.totalCouponsReceived)} positive />
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className={`${CARD} p-5`}>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold tracking-tight">Monthly value</h2>
            <span className="text-[11px] text-[var(--color-muted-2)]">last 12 months</span>
          </div>
          <p className="mb-3 text-[12.5px] text-[var(--color-muted)]">
            Total portfolio value at the end of each month.
          </p>
          <PortfolioValueChart data={monthly} />
        </div>

        <div className={`${CARD} p-5`}>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[17px] font-extrabold tracking-tight">Projection</h2>
            <span className="text-[11px] text-[var(--color-muted-2)]">30d → 20y</span>
          </div>
          <p className="mb-3 text-[12.5px] text-[var(--color-muted)]">
            An estimate, not a forecast — assumes today&apos;s rates hold steady and each holding
            stops growing at its maturity date rather than being automatically reinvested.
          </p>
          <ProjectionChart data={projection} />
        </div>
      </div>

      <GoalProjectionCard
        goal={goal}
        holdings={holdings}
        currentValue={summary.totalValue}
        emergencyReserveTarget={emergencyReserveTarget}
      />

      {showForm && (
        <Modal title={editing ? "Edit holding" : "Add holding"} onClose={closeForm}>
          <HoldingForm key={editing?.id ?? "new"} holding={editing ?? undefined} onDone={closeForm} />
        </Modal>
      )}

      {showPrices && (
        <Modal title="Update prices" onClose={() => setShowPrices(false)}>
          <UpdatePricesModal holdings={holdings} onDone={() => setShowPrices(false)} />
        </Modal>
      )}

      {viewing && (
        <Modal title={viewing.name} onClose={() => setViewingId(null)}>
          <HoldingDetail holding={viewing} rates={rates} cycleStartDay={cycleStartDay} />
        </Modal>
      )}

      {couponFor && (
        <Modal title={`Coupons — ${couponFor.name}`} onClose={() => setCouponForId(null)}>
          <CouponSection holding={couponFor} />
        </Modal>
      )}

      <HoldingsTable
        holdings={holdings}
        rates={rates}
        onEdit={startEdit}
        onView={(h) => setViewingId(h.id)}
        onAddCoupon={(h) => setCouponForId(h.id)}
      />
    </div>
  );
}
