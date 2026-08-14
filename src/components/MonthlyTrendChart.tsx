"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatCurrencyAxis } from "@/lib/format";

export function MonthlyTrendChart({
  data,
}: {
  data: { label: string; net: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-track)" />
          <XAxis
            dataKey="label"
            tickFormatter={(v: string) => v.split(" ")[0]}
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
            dataKey="net"
            name="Net"
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
