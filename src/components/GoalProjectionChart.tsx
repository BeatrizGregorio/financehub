"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatCurrencyAxis } from "@/lib/format";
import type { GoalProjectionPoint } from "@/lib/goal";
import { useT } from "@/components/LanguageProvider";

/**
 * Projection out to the goal: a shaded band between the pessimistic and
 * optimistic scenarios, the realistic line through the middle, a dashed line
 * at the target, and a dot where the realistic line first reaches it.
 *
 * The band is a single Area whose dataKey holds a [low, high] pair — Recharts
 * renders a two-value key as a range rather than stacking two Areas, which
 * would need an opaque fill and hide the grid behind it.
 */
export function GoalProjectionChart({
  data,
  targetAmount,
  crossingIndex,
}: {
  data: GoalProjectionPoint[];
  targetAmount: number;
  crossingIndex: number | null;
}) {
  const { t } = useT();
  if (data.length === 0) {
    return (
      <p className="flex h-56 items-center justify-center text-[13px] text-[var(--color-muted-2)]">
        {t.goal.chartEmpty}
      </p>
    );
  }

  const crossing = crossingIndex !== null ? data[crossingIndex] : null;
  // Only label every Nth tick — a multi-year horizon is otherwise unreadable.
  const tickStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-track)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11.5, fill: "#6b7280", fontFamily: "var(--font-dm-mono)" }}
            axisLine={false}
            tickLine={false}
            interval={tickStep - 1}
          />
          <YAxis
            tick={{ fontSize: 11.5, fill: "#6b7280", fontFamily: "var(--font-dm-mono)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatCurrencyAxis(v)}
            // Wider than the other charts (72) on purpose: a projection runs
            // years out, so ticks reach 6–7 figures and get clipped at 72.
            width={92}
          />
          <Tooltip
            formatter={(value, name) => {
              if (Array.isArray(value)) {
                return [
                  `${formatCurrency(Number(value[0]))} – ${formatCurrency(Number(value[1]))}`,
                  "Pessimistic – optimistic",
                ];
              }
              return [formatCurrency(Number(value)), name];
            }}
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

          <Area
            dataKey="band"
            name={t.charts.projected}
            stroke="none"
            fill="#3d6b9e"
            fillOpacity={0.13}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="realistic"
            name={t.charts.projected}
            stroke="#3d6b9e"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: "#5a8bc4" }}
            isAnimationActive={false}
          />

          <ReferenceLine
            y={targetAmount}
            stroke="var(--color-brand)"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{
              value: t.goal.goalLine,
              position: "insideTopLeft",
              fill: "var(--color-brand)",
              fontSize: 11.5,
              fontFamily: "var(--font-dm-mono)",
            }}
          />
          {crossing && (
            <ReferenceDot
              x={crossing.label}
              y={targetAmount}
              r={5}
              fill="var(--color-brand)"
              stroke="#fff"
              strokeWidth={2}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
