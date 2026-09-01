"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatCurrencyAxis } from "@/lib/format";
import type { NetWorthPoint } from "@/lib/investments";
import { useT } from "@/components/LanguageProvider";

/**
 * Cash and investments stacked, so the total is the top of the stack and its
 * composition is readable at a glance — the point of putting the two halves on
 * one chart at all. A single total line would hide which half moved.
 */
export function NetWorthChart({ data }: { data: NetWorthPoint[] }) {
  const { t } = useT();

  if (data.length === 0) {
    return (
      <p className="flex h-56 items-center justify-center text-[13px] text-[var(--color-muted-2)]">
        {t.dashboard.noEntriesYet}
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {/* Same right margin as PortfolioValueChart: the last x-axis label is
            centred on the final point, so half of it sits past the plot area. */}
        <AreaChart data={data} margin={{ top: 5, right: 30, bottom: 5, left: 5 }}>
          <defs>
            <linearGradient id="nw-cash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.12} />
            </linearGradient>
            <linearGradient id="nw-inv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-positive)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--color-positive)" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-track)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11.5, fill: "var(--color-muted-2)", fontFamily: "var(--font-dm-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11.5, fill: "var(--color-muted-2)", fontFamily: "var(--font-dm-mono)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatCurrencyAxis(v)}
            width={72}
          />
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
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-jakarta)", paddingTop: 4 }}
          />
          <Area
            type="monotone"
            dataKey="cash"
            stackId="nw"
            name={t.dashboard.cashLogged}
            stroke="var(--color-brand)"
            strokeWidth={2}
            fill="url(#nw-cash)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="investments"
            stackId="nw"
            name={t.dashboard.investmentsSeries}
            stroke="var(--color-positive)"
            strokeWidth={2}
            fill="url(#nw-inv)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
