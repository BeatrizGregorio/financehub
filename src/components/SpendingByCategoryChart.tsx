"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { categoryColor } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";

export function SpendingByCategoryChart({
  data,
}: {
  data: { category: string; total: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="flex h-56 items-center justify-center text-[13px] text-[var(--color-muted-2)]">
        No expenses this month yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="h-40 w-full shrink-0 sm:w-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.category} fill={categoryColor(d.category)} />
              ))}
            </Pie>
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
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 flex-1 space-y-2.5 text-[13px]">
        {data.map((d) => (
          <li key={d.category} className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 items-start gap-2 font-semibold text-[var(--color-ink)]">
              <span
                className="mt-[5px] h-2 w-2 shrink-0 rounded-[3px]"
                style={{ backgroundColor: categoryColor(d.category) }}
              />
              <span className="min-w-0">{d.category}</span>
            </span>
            <span className="shrink-0 whitespace-nowrap font-mono text-[12.5px] font-medium">
              {formatCurrency(d.total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
