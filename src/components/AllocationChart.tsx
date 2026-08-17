"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { typeColor, typeLabel } from "@/lib/investmentTypes";
import { formatCurrency } from "@/lib/format";
import type { AllocationSlice } from "@/lib/investments";
import { useT } from "@/components/LanguageProvider";


export function AllocationChart({ data }: { data: AllocationSlice[] }) {
  const { t } = useT();

  if (data.length === 0) {
    return (
      <p className="flex h-56 items-center justify-center text-[13px] text-[var(--color-muted-2)]">
        {t.investments.noHoldings}
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
              dataKey="value"
              nameKey="type"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.type} fill={typeColor(d.type)} />
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
          // flex-wrap + no min-w-0 on the label: the value drops to its own
          // line when the row is too narrow, instead of the label (the only
          // shrinkable item, since the value is shrink-0) being crushed
          // below its text width. min-w-0 here would suppress the wrap —
          // it removes the min-width:auto that triggers it — and without a
          // matching `truncate` the label's text then overflows its box and
          // paints straight over the amount. break-words handles a single
          // category name longer than the whole legend column.
          <li
            key={d.type}
            className="flex flex-wrap items-start justify-between gap-x-3 gap-y-0.5"
          >
            <span className="flex items-start gap-2 font-semibold text-[var(--color-ink)]">
              <span
                className="mt-[5px] h-2 w-2 shrink-0 rounded-[3px]"
                style={{ backgroundColor: typeColor(d.type) }}
              />
              <span className="break-words">{typeLabel(d.type, t)}</span>
            </span>
            <span className="shrink-0 whitespace-nowrap font-mono text-[12.5px] font-medium">
              {formatCurrency(d.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
