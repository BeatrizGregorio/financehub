"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatCurrencyAxis } from "@/lib/format";
import type { PortfolioValuePoint } from "@/lib/investments";

export function PortfolioValueChart({ data }: { data: PortfolioValuePoint[] }) {
  if (data.length === 0) {
    return (
      <p className="flex h-56 items-center justify-center text-[13px] text-[var(--color-muted-2)]">
        No price history yet.
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
            tick={{ fontSize: 11.5, fill: "#6b7280", fontFamily: "var(--font-dm-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11.5, fill: "#6b7280", fontFamily: "var(--font-dm-mono)" }}
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
            stroke="#0c9e57"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#0c9e57" }}
            activeDot={{ r: 5, fill: "#10b96a" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
