"use client";

import { useActionState, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { deletePricePoint, updatePricePoint, type ActionState } from "./actions";
import { CouponSection } from "./CouponSection";
import { formatCurrency, formatDate, formatShortDate } from "@/lib/format";
import { typeLabel, subtypeLabel, showsRateFields } from "@/lib/investmentTypes";
import { currentValue, monthlyValue, taxBreakdown, type ReferenceRatesLike } from "@/lib/investments";
import type { Holding } from "./InvestmentsClient";

function PriceRow({ id, date, price }: { id: string; date: Date; price: number }) {
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
        <span className="font-mono text-[12px] text-[var(--color-muted-2)]">{formatDate(date)}</span>
        <div className="flex items-center gap-2">
          <input
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={price}
            autoFocus
            className="w-24 rounded-lg border border-[var(--color-border)] bg-white px-2 py-1 text-right font-mono text-[12.5px] outline-none focus:border-[var(--color-ink)]"
          />
          <button type="submit" className="text-xs font-semibold text-[#0c9e57]">
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs font-semibold text-[var(--color-muted)]"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="font-mono text-[12px] text-[var(--color-muted-2)]">{formatDate(date)}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[12.5px] font-medium text-[var(--color-ink)]">
          {formatCurrency(price)}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-[var(--color-muted-2)] hover:text-[var(--color-ink)]"
        >
          Edit
        </button>
        <form
          action={deletePricePoint.bind(null, id)}
          onSubmit={(e) => {
            if (!confirm("Delete this price point?")) e.preventDefault();
          }}
        >
          <button
            type="submit"
            className="text-xs font-semibold text-[var(--color-muted-2)] hover:text-[#dc3545]"
          >
            Delete
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
  const chartData = [...holding.prices]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((p) => ({ label: formatShortDate(p.date), price: p.price }));

  const sortedDesc = [...holding.prices].sort((a, b) => b.date.getTime() - a.date.getTime());
  const monthlyData = monthlyValue(holding, rates, 12, cycleStartDay);
  const value = currentValue(holding, rates);
  const tax = taxBreakdown(holding, rates);
  const sub = subtypeLabel(holding.type, holding.subtype);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-[var(--color-muted)]">
        {typeLabel(holding.type)}
        {sub ? ` · ${sub}` : ""}
        {holding.institution ? ` · ${holding.institution}` : ""}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="font-mono text-[10px] tracking-wide text-[var(--color-muted-2)] uppercase">Current value</p>
          <p className="font-mono text-sm font-semibold text-[var(--color-ink)]">{formatCurrency(value)}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-wide text-[var(--color-muted-2)] uppercase">Invested</p>
          <p className="font-mono text-sm font-semibold text-[var(--color-ink)]">
            {formatCurrency(holding.amountInvested)}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-wide text-[var(--color-muted-2)] uppercase">Gross gain</p>
          <p
            className="font-mono text-sm font-semibold"
            style={{ color: tax.grossGain >= 0 ? "#0c9e57" : "#dc3545" }}
          >
            {tax.grossGain >= 0 ? "+" : "−"}
            {formatCurrency(Math.abs(tax.grossGain))}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-wide text-[var(--color-muted-2)] uppercase">Net gain*</p>
          <p
            className="font-mono text-sm font-semibold"
            style={{ color: tax.netGain >= 0 ? "#0c9e57" : "#dc3545" }}
          >
            {tax.netGain >= 0 ? "+" : "−"}
            {formatCurrency(Math.abs(tax.netGain))}
          </p>
        </div>
      </div>

      {(tax.iof > 0 || tax.ir > 0) && (
        <p className="text-[11px] text-[var(--color-muted-2)]">
          *Estimated after IOF ({formatCurrency(tax.iof)}) and IR ({formatCurrency(tax.ir)}, {(tax.irRate * 100).toFixed(1)}%
          on {tax.holdingDays}d held) — an estimate for personal reference, not tax filing guidance.
        </p>
      )}

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-bold tracking-wide text-[var(--color-muted-2)] uppercase">
            Monthly value
          </p>
          <span className="text-[11px] text-[var(--color-muted-2)]">last 12 months</span>
        </div>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-track)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10.5, fill: "#6b7280", fontFamily: "var(--font-dm-mono)" }}
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
                  background: "rgba(255,255,255,0.96)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name="Value"
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
          Manual price entries
        </p>
        {chartData.length > 0 ? (
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-track)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10.5, fill: "#6b7280", fontFamily: "var(--font-dm-mono)" }}
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
                    background: "rgba(255,255,255,0.96)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  name="Price"
                  stroke="#0c9e57"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#0c9e57" }}
                  activeDot={{ r: 5, fill: "#10b96a" }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-6 text-center text-[13px] text-[var(--color-muted-2)]">No price history yet.</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold tracking-wide text-[var(--color-muted-2)] uppercase">
          Price history
        </p>
        <div className="flex max-h-64 flex-col divide-y divide-black/[0.04] overflow-y-auto">
          {sortedDesc.map((p) => (
            <PriceRow key={p.id} id={p.id} date={p.date} price={p.price} />
          ))}
          {sortedDesc.length === 0 && (
            <p className="py-4 text-center text-[13px] text-[var(--color-muted-2)]">No prices recorded.</p>
          )}
        </div>
      </div>

      {showsRateFields(holding.type) && <CouponSection holding={holding} />}

    </div>
  );
}
