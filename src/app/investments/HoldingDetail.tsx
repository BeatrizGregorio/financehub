"use client";

import { useActionState, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { deletePricePoint, updatePricePoint, type ActionState } from "./actions";
import { CouponSection } from "./CouponSection";
import { TransactionSection } from "./TransactionSection";
import { formatCurrency, formatDate, formatShortDate } from "@/lib/format";
import { typeLabel, subtypeLabel, showsRateFields } from "@/lib/investmentTypes";
import { currentValue, monthlyValue, taxBreakdown, type ReferenceRatesLike } from "@/lib/investments";
import type { Holding } from "./InvestmentsClient";
import { useT } from "@/components/LanguageProvider";
import type { Dict, Language } from "@/lib/i18n";

function PriceRow({
  id,
  date,
  price,
  t,
  lang,
}: {
  id: string;
  date: Date;
  price: number;
  t: Dict;
  lang: Language;
}) {
  const [editing, setEditing] = useState(false);
  const initialState: ActionState = {};
  const [state, formAction] = useActionState(updatePricePoint.bind(null, id), initialState);
  const [handledState, setHandledState] = useState(state);

  // Close edit mode once the action succeeds, without an effect: compare the
  // action-state reference during render and adjust local state accordingly
  // (React's documented alternative to a setState-in-effect for this exact
  // "close on success" case — see the set-state-in-effect gotcha in CLAUDE.md).
  if (state !== handledState) {
    setHandledState(state);
    if (!state.error) setEditing(false);
  }

  if (editing) {
    return (
      <form action={formAction} className="flex items-center justify-between gap-2 py-1.5">
        <span className="font-mono text-[12px] text-[var(--color-muted-2)]">{formatDate(date, lang)}</span>
        <div className="flex items-center gap-2">
          <input
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={price}
            autoFocus
            className="w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 py-1 text-right font-mono text-[12.5px] outline-none focus:border-[var(--color-ink)]"
          />
          <button type="submit" className="text-xs font-semibold text-[var(--color-brand-text)]">
            {t.common.save}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs font-semibold text-[var(--color-muted)]"
          >
            {t.common.cancel}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="font-mono text-[12px] text-[var(--color-muted-2)]">{formatDate(date, lang)}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[12.5px] font-medium text-[var(--color-ink)]">
          {formatCurrency(price)}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-[var(--color-muted-2)] hover:text-[var(--color-ink)]"
        >
          {t.common.edit}
        </button>
        <form
          action={deletePricePoint.bind(null, id)}
          onSubmit={(e) => {
            if (!confirm(t.investments.confirmDeletePrice)) e.preventDefault();
          }}
        >
          <button
            type="submit"
            className="text-xs font-semibold text-[var(--color-muted-2)] hover:text-[var(--color-rust-text)]"
          >
            {t.common.delete}
          </button>
        </form>
      </div>
    </div>
  );
}

export function HoldingDetail({
  holding,
  rates,
  cycleStartDay,
}: {
  holding: Holding;
  rates: ReferenceRatesLike;
  cycleStartDay: number;
}) {
  const { t, lang } = useT();
  const chartData = [...holding.prices]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((p) => ({ label: formatShortDate(p.date, lang), price: p.price }));

  const sortedDesc = [...holding.prices].sort((a, b) => b.date.getTime() - a.date.getTime());
  const monthlyData = monthlyValue(holding, rates, 12, cycleStartDay, lang);
  const value = currentValue(holding, rates);
  const tax = taxBreakdown(holding, rates);
  const sub = subtypeLabel(holding.type, holding.subtype, t);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-[var(--color-muted)]">
        {typeLabel(holding.type, t)}
        {sub ? ` · ${sub}` : ""}
        {holding.institution ? ` · ${holding.institution}` : ""}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="font-mono text-[10px] tracking-wide text-[var(--color-muted-2)] uppercase">{t.investments.currentValue}</p>
          <p className="font-mono text-sm font-semibold text-[var(--color-ink)]">{formatCurrency(value)}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-wide text-[var(--color-muted-2)] uppercase">{t.investments.invested}</p>
          <p className="font-mono text-sm font-semibold text-[var(--color-ink)]">
            {formatCurrency(holding.amountInvested)}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-wide text-[var(--color-muted-2)] uppercase">{t.investments.grossGain}</p>
          <p
            className="font-mono text-sm font-semibold"
            style={{ color: tax.grossGain >= 0 ? "var(--color-positive-text)" : "var(--color-rust-text)" }}
          >
            {tax.grossGain >= 0 ? "+" : "−"}
            {formatCurrency(Math.abs(tax.grossGain))}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-wide text-[var(--color-muted-2)] uppercase">{t.investments.netGain}</p>
          <p
            className="font-mono text-sm font-semibold"
            style={{ color: tax.netGain >= 0 ? "var(--color-positive-text)" : "var(--color-rust-text)" }}
          >
            {tax.netGain >= 0 ? "+" : "−"}
            {formatCurrency(Math.abs(tax.netGain))}
          </p>
        </div>
      </div>

      {(tax.iof > 0 || tax.ir > 0) && (
        <p className="text-[11px] text-[var(--color-muted-2)]">
          {t.investments.taxNote(
            formatCurrency(tax.iof),
            formatCurrency(tax.ir),
            (tax.irRate * 100).toFixed(1),
            tax.holdingDays,
          )}
        </p>
      )}

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-bold tracking-wide text-[var(--color-muted-2)] uppercase">
            {t.investments.monthlyValue}
          </p>
          <span className="text-[11px] text-[var(--color-muted-2)]">{t.common.lastMonths(12)}</span>
        </div>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-track)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10.5, fill: "var(--color-muted-2)", fontFamily: "var(--font-dm-mono)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  borderRadius: 12,
                  fontSize: 13,
                  fontFamily: "var(--font-jakarta)",
                  background: "var(--color-tooltip-bg)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={t.charts.value}
                stroke="#3d6b9e"
                strokeWidth={2}
                dot={{ r: 3, fill: "#3d6b9e" }}
                activeDot={{ r: 5, fill: "#5a8bc4" }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold tracking-wide text-[var(--color-muted-2)] uppercase">
          {t.investments.manualPriceEntries}
        </p>
        {chartData.length > 0 ? (
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-track)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10.5, fill: "var(--color-muted-2)", fontFamily: "var(--font-dm-mono)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    borderRadius: 12,
                    fontSize: 13,
                    fontFamily: "var(--font-jakarta)",
                    background: "var(--color-tooltip-bg)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid var(--color-border)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  name={t.charts.price}
                  stroke="var(--color-brand)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-brand)" }}
                  activeDot={{ r: 5, fill: "var(--color-brand-deep)" }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-6 text-center text-[13px] text-[var(--color-muted-2)]">{t.investments.noPriceHistory}</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold tracking-wide text-[var(--color-muted-2)] uppercase">
          {t.investments.priceHistory}
        </p>
        <div className="flex max-h-64 flex-col divide-y divide-black/[0.04] overflow-y-auto">
          {sortedDesc.map((p) => (
            <PriceRow key={p.id} id={p.id} date={p.date} price={p.price} t={t} lang={lang} />
          ))}
          {sortedDesc.length === 0 && (
            <p className="py-4 text-center text-[13px] text-[var(--color-muted-2)]">{t.investments.noPricesRecorded}</p>
          )}
        </div>
      </div>

      {showsRateFields(holding.type) && <CouponSection holding={holding} />}

      {/* Applies to every type: renda fixa gets topped up too, and that is the
          case where attributing money to the original startDate is wrong. */}
      <TransactionSection holding={holding} />
    </div>
  );
}
