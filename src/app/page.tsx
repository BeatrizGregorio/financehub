import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  getBudgets,
  getCycleStartDay,
  getLanguage,
  getPaymentMethods,
  getReferenceRates,
} from "@/lib/data";
import { dict } from "@/lib/i18n";
import { monthlySeries } from "@/lib/aggregate";
import { currentCycleKey, cycleKey, cycleLabel } from "@/lib/format";
import { formatCurrency } from "@/lib/format";
import { BudgetsCard } from "@/components/BudgetsCard";
import { RecentEntriesCard } from "@/components/RecentEntriesCard";
import { UpcomingCard } from "@/components/UpcomingCard";
import { SpendingByCategoryCard } from "@/components/SpendingByCategoryCard";
import { PaymentMethodsCard } from "@/components/PaymentMethodsCard";
import { IncomeVsExpenseChart } from "@/components/IncomeVsExpenseChart";
import { MonthlyTrendChart } from "@/components/MonthlyTrendChart";
import { AllocationCard } from "@/components/AllocationCard";
import { PortfolioValueChart } from "@/components/PortfolioValueChart";
import { allocationByType, monthlyPortfolioValue, netWorthOverTime } from "@/lib/investments";
import { NetWorthCard } from "@/components/NetWorthCard";
import { CARD } from "@/lib/ui";

export const dynamic = "force-dynamic";

function StatPill({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub: string;
  positive?: boolean;
}) {
  return (
    <div className={`${CARD} min-w-[190px] flex-1 px-5 py-4`}>
      <p className="mb-1 font-mono text-[10.5px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase">
        {label}
      </p>
      <p className="mb-1 text-2xl leading-none font-extrabold text-[var(--color-ink)]">{value}</p>
      <div
        className="flex items-center gap-1 font-mono text-xs"
        style={{ color: positive === undefined ? "#6b7280" : positive ? "var(--color-positive)" : "#dc3545" }}
      >
        {positive === true && <ArrowUpRight size={12} />}
        {positive === false && <ArrowDownRight size={12} />}
        <span>{sub}</span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const [entries, budgets, methods, investments, rates, cycleStartDay, lang] = await Promise.all([
    prisma.entry.findMany(),
    getBudgets(),
    getPaymentMethods(),
    prisma.investment.findMany({ include: { prices: true, coupons: true, transactions: true } }),
    getReferenceRates(),
    getCycleStartDay(),
    getLanguage(),
  ]);
  const t = dict(lang);

  if (entries.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">{t.dashboard.welcomeTitle}</h1>
        <p className="mt-2 max-w-sm text-sm text-[var(--color-muted)]">
          {t.dashboard.welcomeBody}
        </p>
        <Link
          href="/entries"
          className="mt-6 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Plus size={16} /> {t.dashboard.addAnEntry}
        </Link>
      </div>
    );
  }

  const currentMonthKey = currentCycleKey(cycleStartDay);
  const defaultMonth = currentMonthKey;

  const currentMonthEntries = entries.filter(
    (e) => cycleKey(e.date, cycleStartDay) === currentMonthKey,
  );
  const income = currentMonthEntries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);
  const expense = currentMonthEntries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);
  const net = income - expense;

  const series = monthlySeries(entries, 4, cycleStartDay, lang);
  const prevExpense = series.length >= 2 ? series[series.length - 2].expense : 0;
  const prevNet = series.length >= 2 ? series[series.length - 2].net : 0;
  const expenseDelta = expense - prevExpense;
  const netDelta = net - prevNet;

  const allocation = allocationByType(investments, rates);
  const portfolioSeries = monthlyPortfolioValue(investments, rates, 12, cycleStartDay, lang);
  // The two halves of the app on one timeline - see netWorthOverTime().
  const netWorth = netWorthOverTime(entries, investments, rates, 12, cycleStartDay, lang);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-ink)]">{t.dashboard.welcomeBack}</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            {t.dashboard.snapshotFor}{" "}
            <span className="font-medium text-[var(--color-ink)]">
              {cycleLabel(currentMonthKey, lang)}
            </span>
          </p>
        </div>
        <Link
          href="/entries"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Plus size={15} strokeWidth={2.5} /> {t.dashboard.addEntry}
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatPill
          label={t.dashboard.income}
          value={formatCurrency(income)}
          sub={t.dashboard.thisMonth}
          positive
        />
        <StatPill
          label={t.dashboard.expenses}
          value={formatCurrency(expense)}
          sub={`${expenseDelta >= 0 ? "+" : "−"}${formatCurrency(Math.abs(expenseDelta))} ${t.dashboard.vsLastMonth}`}
          positive={expenseDelta <= 0}
        />
        <StatPill
          label={t.dashboard.netSavings}
          value={formatCurrency(net)}
          sub={`${netDelta >= 0 ? "+" : "−"}${formatCurrency(Math.abs(netDelta))} ${t.dashboard.vsLastMonth}`}
          positive={netDelta >= 0}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5">
          <BudgetsCard entries={entries} budgets={budgets} cycleStartDay={cycleStartDay} t={t} />
          {/* Real future-dated entries only - see upcomingEntries(). */}
          <UpcomingCard entries={entries} t={t} lang={lang} />
          <RecentEntriesCard entries={entries} t={t} />
        </div>

        <div className="flex flex-col gap-5">
          <SpendingByCategoryCard
            entries={entries}
            defaultMonth={defaultMonth}
            cycleStartDay={cycleStartDay}
          />
          <div className={`${CARD} p-5`}>
            <h2 className="mb-3 text-[17px] font-extrabold tracking-tight">{t.dashboard.incomeVsExpenses}</h2>
            <IncomeVsExpenseChart data={series} />
          </div>
          <AllocationCard data={allocation} t={t} />
        </div>

        <div className="flex flex-col gap-5">
          <div className={`${CARD} p-5`}>
            <h2 className="mb-3 text-[17px] font-extrabold tracking-tight">{t.dashboard.monthOverMonthNet}</h2>
            <MonthlyTrendChart data={series} />
          </div>
          <NetWorthCard data={netWorth} t={t} />
          <PaymentMethodsCard methods={methods} t={t} />
          <div className={`${CARD} p-5`}>
            <h2 className="mb-3 text-[17px] font-extrabold tracking-tight">{t.dashboard.monthlyValue}</h2>
            <PortfolioValueChart data={portfolioSeries} />
          </div>
        </div>
      </div>
    </div>
  );
}
