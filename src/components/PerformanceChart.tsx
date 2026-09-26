"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { useT } from "@/components/LanguageProvider";
import type { PerformanceRow } from "@/lib/investments";

/**
 * Side-by-side performance of the active holdings, one metric at a time.
 *
 * A switcher rather than four charts because the four answers genuinely
 * disagree — a holding can lead on gross return, fall behind once IR is taken
 * off, and still be the one that produced most of the money. Showing them at
 * once invites reading one bar as the whole story.
 *
 * Holdings the active metric can't answer for are dropped from the chart and
 * named underneath. A bar of zero would read as "returned nothing" when the
 * truth is "bought too recently to annualize".
 */

export type Metric = "net" | "gross" | "contracted" | "gain";

const BAR_HEIGHT = 30;
const CHART_PADDING = 40;

export function PerformanceChart({
  rows,
  cdi,
}: {
  rows: PerformanceRow[];
  cdi: number;
}) {
  const { t, lang } = useT();
  const [metric, setMetric] = useState<Metric>("net");

  /**
   * The name axis takes a share of the width rather than a fixed 132px.
   *
   * At 375px a fixed axis left 14px for the bars — the labels were legible and
   * the data was not, which is backwards. The observer only subscribes here;
   * the state is set from its callback, not from the effect body.
   */
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const axisWidth = width > 0 ? Math.min(132, Math.max(70, Math.round(width * 0.32))) : 132;
  const nameLimit = Math.max(8, Math.floor(axisWidth / 6.4));

  const METRICS: { key: Metric; label: string }[] = [
    { key: "net", label: t.investments.metricNet },
    { key: "gross", label: t.investments.metricGross },
    { key: "contracted", label: t.investments.metricContracted },
    { key: "gain", label: t.investments.metricGain },
  ];

  const valueOf = (row: PerformanceRow): number | null => {
    if (metric === "gain") return row.gain;
    if (metric === "net") return row.netRealized;
    return row.realized;
  };

  const { shown, missing } = useMemo(() => {
    const answerable: PerformanceRow[] = [];
    const unanswerable: PerformanceRow[] = [];
    for (const row of rows) {
      // "vs contracted" needs both halves of the comparison to mean anything.
      const usable =
        metric === "contracted"
          ? row.realized !== null && row.contracted !== null
          : valueOf(row) !== null;
      (usable ? answerable : unanswerable).push(row);
    }
    answerable.sort((a, b) => (valueOf(b) ?? 0) - (valueOf(a) ?? 0));
    return { shown: answerable, missing: unanswerable };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, metric]);

  const isMoney = metric === "gain";
  const fmt = (v: number) =>
    isMoney ? formatCurrency(v) : `${v.toFixed(1).replace(".", lang === "pt" ? "," : ".")}%`;

  const data = shown.map((row) => ({
    name: row.name,
    value: valueOf(row) ?? 0,
    contracted: row.contracted ?? 0,
    exempt: row.irExempt,
  }));

  const height = Math.max(180, data.length * BAR_HEIGHT + CHART_PADDING);

  /**
   * The three rate metrics share one scale.
   *
   * Letting Recharts fit the axis to each metric separately made the bars grow
   * when switching to "after tax" — the numbers had shrunk but the axis had
   * shrunk further. Since the point of the switch is to see tax take a bite,
   * an axis that hides it is worse than no chart. Money keeps its own scale;
   * it shares nothing with a percentage.
   */
  const rateDomain = useMemo(() => {
    const values = rows.flatMap((r) =>
      [r.realized, r.netRealized, r.contracted].filter((v): v is number => v !== null),
    );
    if (values.length === 0) return [0, 1] as [number, number];
    const top = Math.max(...values, cdi) * 1.12;
    const bottom = Math.min(0, ...values) * 1.12;
    return [bottom, top] as [number, number];
  }, [rows, cdi]);

  return (
    <div ref={wrapRef}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {METRICS.map((m) => {
          const active = m.key === metric;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetric(m.key)}
              aria-pressed={active}
              className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition"
              style={
                active
                  ? { background: "var(--gradient-brand)", color: "#fff" }
                  : { background: "var(--color-inset)", color: "var(--color-muted)" }
              }
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {data.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-[var(--color-muted-2)]">
          {t.investments.performanceEmpty}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 0 }}>
            <XAxis
              type="number"
              domain={isMoney ? ["auto", "auto"] : rateDomain}
              tick={{ fontSize: 11, fill: "var(--color-muted-2)" }}
              tickFormatter={(v) => (isMoney ? `R$ ${Math.round(Number(v) / 1000)}k` : `${Number(v).toFixed(0)}%`)}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={axisWidth}
              tick={{ fontSize: 11, fill: "var(--color-muted-2)" }}
              tickFormatter={(v: string) => (v.length > nameLimit ? `${v.slice(0, nameLimit - 1)}…` : v)}
            />
            <Tooltip
              cursor={{ fill: "var(--color-inset)" }}
              contentStyle={{
                borderRadius: 12,
                fontSize: 13,
                fontFamily: "var(--font-jakarta)",
                background: "var(--color-tooltip-bg)",
                backdropFilter: "blur(16px)",
                border: "1px solid var(--color-border)",
              }}
              formatter={(value: unknown, key: unknown) => [
                fmt(Number(value)),
                key === "contracted" ? t.investments.contractedRate : METRICS.find((m) => m.key === metric)?.label,
              ]}
            />
            {/* CDI is how a Brazilian rate is read — "is this beating the CDI?"
                is the actual question. Meaningless against a figure in reais. */}
            {!isMoney && (
              <ReferenceLine
                x={cdi}
                stroke="var(--color-muted-2)"
                strokeDasharray="4 3"
                label={{
                  value: `CDI ${cdi.toFixed(2).replace(".", lang === "pt" ? "," : ".")}%`,
                  position: "top",
                  fontSize: 10,
                  fill: "var(--color-muted-2)",
                }}
              />
            )}
            {metric === "contracted" && (
              <Bar dataKey="contracted" fill="var(--color-muted-2)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
            )}
            <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell
                  key={d.name}
                  fill={d.value < 0 ? "var(--color-rust)" : "var(--color-brand)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {missing.length > 0 && (
        <p className="mt-2 text-[12px] text-[var(--color-muted-2)]">
          {t.investments.noHistoryYet(missing.map((r) => r.name).join(", "))}
        </p>
      )}
      {metric === "net" && (
        <p className="mt-1 text-[12px] text-[var(--color-muted-2)]">{t.investments.netEstimateNote}</p>
      )}
    </div>
  );
}
