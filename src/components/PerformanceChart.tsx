"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PALETTE } from "@/lib/categories";
import { useT } from "@/components/LanguageProvider";
import type { MonthlyPerformancePoint } from "@/lib/investments";

/**
 * Each holding's cumulative return, month by month.
 *
 * Lines rather than a ranked snapshot: a single number says which holding is
 * ahead today and hides that one has climbed steadily while another spiked
 * once and has drifted since. The shape is the useful part.
 *
 * Percent rather than reais, so holdings of very different sizes share an
 * axis. A line starts at the month its holding was bought — before that there
 * is no return to draw, and a zero would read as "flat" rather than "not
 * held".
 */
export function PerformanceChart({
  points,
  holdings,
}: {
  points: MonthlyPerformancePoint[];
  holdings: { id: string; name: string }[];
}) {
  const { t, lang } = useT();
  // Clicking a legend entry isolates that holding; clicking it again brings
  // the rest back. With a dozen lines that is the difference between a chart
  // and a plate of spaghetti.
  const [focused, setFocused] = useState<string | null>(null);

  // Walk the palette by index rather than hashing each name through
  // categoryColor(): hashing gave two of five holdings the same purple here,
  // and on a line chart two identical colours are two lines you cannot tell
  // apart. Index assignment keeps them distinct until the palette runs out.
  const colorFor = (index: number) => PALETTE[index % PALETTE.length];

  const pct = (v: number) => `${v.toFixed(1).replace(".", lang === "pt" ? "," : ".")}%`;
  const nameOf = (key: unknown) =>
    holdings.find((h) => h.id === String(key))?.name ?? String(key);

  if (holdings.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-[var(--color-muted-2)]">
        {t.investments.performanceEmpty}
      </p>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={points} margin={{ top: 6, right: 20, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--color-muted-2)" }}
            tickMargin={8}
          />
          <YAxis
            width={56}
            tick={{ fontSize: 11, fill: "var(--color-muted-2)" }}
            tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
          />
          {/* Break-even. Below this line a holding is worth less than what went
              into it, which is worth seeing at a glance. */}
          <ReferenceLine y={0} stroke="var(--color-muted-2)" strokeDasharray="4 3" />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              fontSize: 13,
              fontFamily: "var(--font-jakarta)",
              background: "var(--color-tooltip-bg)",
              backdropFilter: "blur(16px)",
              border: "1px solid var(--color-border)",
            }}
            formatter={(value: unknown, key: unknown) => [pct(Number(value)), nameOf(key)]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(key) => nameOf(key)}
            onClick={(entry) => {
              const key = String((entry as { dataKey?: string }).dataKey ?? "");
              setFocused((current) => (current === key ? null : key));
            }}
          />
          {holdings.map((holding, index) => {
            const dimmed = focused !== null && focused !== holding.id;
            return (
              <Line
                key={holding.id}
                type="monotone"
                dataKey={holding.id}
                name={holding.id}
                stroke={colorFor(index)}
                strokeWidth={focused === holding.id ? 2.5 : 1.8}
                strokeOpacity={dimmed ? 0.15 : 1}
                dot={false}
                // A holding bought mid-window has nulls before it; this stops
                // the line being drawn back to the axis.
                connectNulls={false}
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[12px] text-[var(--color-muted-2)]">{t.investments.performanceHint}</p>
    </div>
  );
}
