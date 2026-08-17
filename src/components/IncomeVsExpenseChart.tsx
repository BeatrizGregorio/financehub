"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatCurrencyAxis } from "@/lib/format";
import { useT } from "@/components/LanguageProvider";

export function IncomeVsExpenseChart({
  data,
}: {
  data: { label: string; income: number; expense: number }[];
}) {
  const { t } = useT();
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={6}>
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
          <Legend wrapperStyle={{ fontSize: 12.5, fontFamily: "var(--font-jakarta)" }} />
          <Bar dataKey="income" name={t.charts.income} fill="var(--color-positive)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="expense" name={t.charts.expenses} fill="#dc3545" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
