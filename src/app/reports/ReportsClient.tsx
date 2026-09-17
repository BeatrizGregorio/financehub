"use client";

import { useRouter } from "next/navigation";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, Info, Printer } from "lucide-react";
import { formatCurrency, formatCurrencyAxis, formatDate } from "@/lib/format";
import { cycleLabel } from "@/lib/format";
import { typeLabel, subtypeLabel } from "@/lib/investmentTypes";
import { categoryColor } from "@/lib/categories";
import { CARD } from "@/lib/ui";
import { useT } from "@/components/LanguageProvider";
import type { Language } from "@/lib/i18n";
import type { TaxSummary, YearReview } from "@/lib/reports";

const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);

function Pill({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className={`${CARD} min-w-[160px] flex-1 px-5 py-4 print:border print:shadow-none`}>
      <p className="mb-1 font-mono text-[10.5px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase">{label}</p>
      <p
        className="text-2xl leading-none font-extrabold tabular-nums"
        style={{
          color: tone === "positive" ? "var(--color-positive-text)" : tone === "negative" ? "var(--color-rust-text)" : "var(--color-ink)",
        }}
      >
        {value}
      </p>
    </div>
  );
}

const TH = "px-3 py-2 text-left font-mono text-[10.5px] font-medium tracking-[0.08em] text-[var(--color-muted-2)] uppercase";
const TD = "px-3 py-2 text-[13px]";
const NUM = "px-3 py-2 text-right font-mono text-[13px] tabular-nums whitespace-nowrap";

export function ReportsClient({
  year,
  years,
  review,
  tax,
  lang,
}: {
  year: number;
  years: number[];
  review: YearReview;
  tax: TaxSummary;
  lang: Language;
}) {
  const { t } = useT();
  const router = useRouter();

  const chartData = review.months.map((m) => ({
    label: cycleLabel(m.key, lang).split(" ")[0],
    income: m.income,
    expense: m.expense,
    savingsRate: m.savingsRate === null ? null : +(m.savingsRate * 100).toFixed(1),
  }));

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[34px]">{t.reports.title}</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{t.reports.subtitle}</p>
        </div>
        <div className="flex items-center gap-2.5 print:hidden">
          <div className="relative">
            <select
              aria-label={t.reports.chooseYear}
              value={year}
              onChange={(e) => router.push(`/reports?year=${e.target.value}`)}
              className="appearance-none rounded-full border border-[var(--color-border)] bg-[var(--color-card)] py-[9px] pl-4 pr-8 text-[13px] font-semibold text-[var(--color-ink)] outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink)]" />
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-[13px] font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-panel)]"
          >
            <Printer size={15} /> {t.reports.print}
          </button>
        </div>
      </div>

      {/* ── Year in review ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[20px] font-extrabold tracking-tight">{t.reports.yearInReview(year)}</h2>

        {!review.hasData ? (
          <p className={`${CARD} p-6 text-[13px] text-[var(--color-muted-2)]`}>{t.reports.noEntries}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <Pill label={t.reports.income} value={formatCurrency(review.income)} />
              <Pill label={t.reports.expenses} value={formatCurrency(review.expense)} />
              <Pill label={t.reports.netSaved} value={formatCurrency(review.net)} tone={review.net >= 0 ? "positive" : "negative"} />
              <Pill label={t.reports.savingsRate} value={pct(review.savingsRate)} tone={(review.savingsRate ?? 0) >= 0 ? "positive" : "negative"} />
            </div>

            <div className={`${CARD} p-5 print:shadow-none`}>
              <h3 className="mb-1 text-[17px] font-extrabold tracking-tight">{t.reports.monthByMonth}</h3>
              <p className="mb-3 text-[12.5px] text-[var(--color-muted)]">{t.reports.monthByMonthBlurb}</p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-track)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11.5, fill: "var(--color-muted-2)", fontFamily: "var(--font-dm-mono)" }} axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="money"
                      tick={{ fontSize: 11.5, fill: "var(--color-muted-2)", fontFamily: "var(--font-dm-mono)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => formatCurrencyAxis(v)}
                      width={80}
                    />
                    <YAxis
                      yAxisId="rate"
                      orientation="right"
                      tick={{ fontSize: 11.5, fill: "var(--color-muted-2)", fontFamily: "var(--font-dm-mono)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                      width={48}
                    />
                    <Tooltip
                      formatter={(value, name) =>
                        name === t.reports.savingsRate ? [`${Number(value).toFixed(1)}%`, name] : [formatCurrency(Number(value)), name]
                      }
                      contentStyle={{
                        borderRadius: 12,
                        fontSize: 13,
                        fontFamily: "var(--font-jakarta)",
                        background: "var(--color-tooltip-bg)",
                        border: "1px solid var(--color-border)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12.5, fontFamily: "var(--font-jakarta)" }} />
                    <Bar yAxisId="money" dataKey="income" name={t.charts.income} fill="var(--color-positive)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar yAxisId="money" dataKey="expense" name={t.charts.expenses} fill="var(--color-rust)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Line
                      yAxisId="rate"
                      type="monotone"
                      dataKey="savingsRate"
                      name={t.reports.savingsRate}
                      stroke="var(--color-brand)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "var(--color-brand)" }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className={`${CARD} p-5 print:shadow-none`}>
                <h3 className="mb-3 text-[17px] font-extrabold tracking-tight">{t.reports.byCategory(year, year - 1)}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[380px]">
                    <thead>
                      <tr className="border-b border-[var(--color-border)]">
                        <th className={TH}>{t.common.category}</th>
                        <th className={`${TH} text-right`}>{year}</th>
                        <th className={`${TH} text-right`}>{year - 1}</th>
                        <th className={`${TH} text-right`}>{t.reports.change}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {review.categories.map((c) => (
                        <tr key={c.category} className="border-b border-[var(--color-border)] last:border-0">
                          <td className={TD}>
                            <span className="flex items-center gap-2 font-semibold">
                              <span className="h-2 w-2 shrink-0 rounded-[3px]" style={{ backgroundColor: categoryColor(c.category) }} />
                              {c.category}
                            </span>
                          </td>
                          <td className={NUM}>{formatCurrency(c.thisYear)}</td>
                          <td className={`${NUM} text-[var(--color-muted)]`}>{formatCurrency(c.lastYear)}</td>
                          <td
                            className={NUM}
                            style={{
                              color:
                                c.change === null ? "var(--color-muted-2)" : c.change > 0 ? "var(--color-rust-text)" : "var(--color-positive-text)",
                            }}
                          >
                            {c.change === null ? "—" : `${c.change > 0 ? "+" : ""}${(c.change * 100).toFixed(0)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={`${CARD} p-5 print:shadow-none`}>
                <h3 className="mb-1 text-[17px] font-extrabold tracking-tight">{t.reports.byTag}</h3>
                <p className="mb-3 text-[12.5px] text-[var(--color-muted)]">{t.reports.byTagBlurb}</p>
                {review.tags.length === 0 ? (
                  <p className="py-4 text-[13px] text-[var(--color-muted-2)]">{t.reports.noTags}</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-[var(--color-border)]">
                    {review.tags.map((tg) => (
                      <li key={tg.tag} className="flex items-baseline justify-between gap-3 py-2">
                        <span className="min-w-0 truncate font-mono text-[13px] text-[var(--color-brand-text)]">#{tg.tag}</span>
                        <span className="shrink-0 text-[11.5px] text-[var(--color-muted-2)]">{t.reports.entriesCount(tg.count)}</span>
                        <span className="shrink-0 font-mono text-[13px] font-semibold tabular-nums">
                          {formatCurrency(tg.expense)}
                          {tg.income > 0 && (
                            <span className="ml-2 text-[var(--color-positive-text)]">+{formatCurrency(tg.income)}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── Income tax summary ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-4 print:break-before-page">
        <h2 className="text-[20px] font-extrabold tracking-tight">{t.reports.taxTitle(year, year + 1)}</h2>

        <div className="flex items-start gap-3 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-inset)] px-4 py-3">
          <Info size={16} className="mt-0.5 shrink-0 text-[var(--color-muted-2)]" />
          <p className="text-[12.5px] leading-relaxed text-[var(--color-muted)]">{t.reports.taxDisclaimer}</p>
        </div>

        {!tax.hasData ? (
          <p className={`${CARD} p-6 text-[13px] text-[var(--color-muted-2)]`}>{t.reports.noInvestments}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <Pill label={t.reports.exemptIncome} value={formatCurrency(tax.exemptTotal)} />
              <Pill label={t.reports.taxableIncome} value={formatCurrency(tax.taxableTotal)} />
              <Pill label={t.reports.withheld} value={formatCurrency(tax.estimatedWithheld)} />
            </div>

            <div className={`${CARD} p-5 print:shadow-none`}>
              <h3 className="mb-1 text-[17px] font-extrabold tracking-tight">{t.reports.positions}</h3>
              <p className="mb-3 text-[12.5px] text-[var(--color-muted)]">{t.reports.positionsBlurb}</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className={TH}>{t.common.name}</th>
                      <th className={TH}>{t.common.type}</th>
                      <th className={`${TH} text-right`}>{t.reports.costAt(year - 1)}</th>
                      <th className={`${TH} text-right`}>{t.reports.costAt(year)}</th>
                      <th className={`${TH} text-right`}>{t.reports.valueAt(year)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tax.positions.map((p) => {
                      const sub = subtypeLabel(p.type, p.subtype, t);
                      return (
                        <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0">
                          <td className={TD}>
                            <span className="block font-semibold">{p.name}</span>
                            {p.institution && <span className="block text-[11.5px] text-[var(--color-muted-2)]">{p.institution}</span>}
                          </td>
                          <td className={`${TD} text-[var(--color-muted)]`}>
                            {typeLabel(p.type, t)}
                            {sub ? ` · ${sub}` : ""}
                          </td>
                          <td className={NUM}>{formatCurrency(p.costPrevious)}</td>
                          <td className={`${NUM} font-semibold`}>{formatCurrency(p.costCurrent)}</td>
                          <td className={`${NUM} text-[var(--color-muted)]`}>{formatCurrency(p.valueCurrent)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className={`${CARD} p-5 print:shadow-none`}>
                <h3 className="mb-3 text-[17px] font-extrabold tracking-tight">{t.reports.incomeReceived}</h3>
                {tax.income.length === 0 ? (
                  <p className="py-4 text-[13px] text-[var(--color-muted-2)]">{t.reports.noIncome}</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-[var(--color-border)]">
                    {tax.income.map((i) => (
                      <li key={i.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{i.name}</span>
                        <span className="shrink-0 font-mono text-[10px] tracking-wide text-[var(--color-muted-2)] uppercase">
                          {i.kind === "coupon" ? t.reports.coupon : t.reports.redemption} · {i.exempt ? t.reports.exempt : t.reports.taxable}
                        </span>
                        <span className="shrink-0 font-mono text-[13px] tabular-nums">{formatCurrency(i.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={`${CARD} p-5 print:shadow-none`}>
                <h3 className="mb-1 text-[17px] font-extrabold tracking-tight">{t.reports.sells}</h3>
                <p className="mb-3 text-[12.5px] text-[var(--color-muted)]">{t.reports.sellsBlurb}</p>
                {tax.sells.length === 0 ? (
                  <p className="py-4 text-[13px] text-[var(--color-muted-2)]">{t.reports.noSells}</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-[var(--color-border)]">
                    {tax.sells.map((s) => (
                      <li key={s.id} className="flex items-baseline justify-between gap-3 py-2">
                        <span className="w-[92px] shrink-0 font-mono text-[12px] text-[var(--color-muted-2)]">{formatDate(s.date, lang)}</span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{s.name}</span>
                        <span className="shrink-0 font-mono text-[13px] tabular-nums">{formatCurrency(s.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
