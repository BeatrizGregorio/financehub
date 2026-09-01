"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatCurrencyAxis } from "@/lib/format";
import type { PortfolioValuePoint } from "@/lib/investments";
import { useT } from "@/components/LanguageProvider";

export function PortfolioValueChart({ data }: { data: PortfolioValuePoint[] }) {
  const { t } = useT();
  if (data.length === 0) {
    return (
      <p className="flex h-56 items-center justify-center text-[13px] text-[var(--color-muted-2)]">
        {t.investments.noPriceHistory}
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {/* right margin: the final x-axis label ("Aug 2026") is centred on the
            last data point, so roughly half its width sits past the plot area
            and was clipping. 30 ≈ half of the widest "MMM YYYY" label. */}
        <LineChart data={data} margin={{ top: 5, right: 30, bottom: 5, left: 5 }}>
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
          <Line
            type="monotone"
            dataKey="value"
            name={t.charts.value}
            stroke="var(--color-brand)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--color-brand)" }}
            activeDot={{ r: 5, fill: "var(--color-brand-deep)" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
