import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { getBudgets, getPaymentMethods, getReferenceRates } from "@/lib/data";
import { availableMonths, monthlySeries } from "@/lib/aggregate";
import { monthKey } from "@/lib/format";
import { formatCurrency } from "@/lib/format";
import { BudgetsCard } from "@/components/BudgetsCard";
import { RecentEntriesCard } from "@/components/RecentEntriesCard";
import { SpendingByCategoryCard } from "@/components/SpendingByCategoryCard";
import { PaymentMethodsCard } from "@/components/PaymentMethodsCard";
import { IncomeVsExpenseChart } from "@/components/IncomeVsExpenseChart";
import { MonthlyTrendChart } from "@/components/MonthlyTrendChart";
import { AllocationCard } from "@/components/AllocationCard";
import { PortfolioValueChart } from "@/components/PortfolioValueChart";
import { allocationByType, monthlyPortfolioValue } from "@/lib/investments";
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
        style={{ color: positive === undefined ? "#9ca3af" : positive ? "#0c9e57" : "#dc3545" }}
      >
        {positive === true && <ArrowUpRight size={12} />}
        {positive === false && <ArrowDownRight size={12} />}
        <span>{sub}</span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const [entries, budgets, methods, investments, rates] = await Promise.all([
    prisma.entry.findMany(),
    getBudgets(),
    getPaymentMethods(),
    prisma.investment.findMany({ include: { prices: true, coupons: true } }),
    getReferenceRates(),
  ]);

  if (entries.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Welcome to FinanceHub</h1>
        <p className="mt-2 max-w-sm text-sm text-[var(--color-muted)]">
          Log your first income or expense to start seeing your spending here.
        </p>
        <Link
          href="/entries"
          className="mt-6 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(12,158,87,0.28)] transition hover:brightness-105 active:scale-95"
          style={{ background: "linear-gradient(135deg, #0c9e57, #0a7a43)" }}
        >
          <Plus size={16} /> Add an entry
        </Link>
      </div>
    );
  }

  const now = new Date();
  const currentMonthKey = monthKey(now);
  const months = availableMonths(entries);
  const defaultMonth = months[0]?.key ?? currentMonthKey;

  const currentMonthEntries = entries.filter((e) => monthKey(e.date) === currentMonthKey);
  const income = currentMonthEntries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);
  const expense = currentMonthEntries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);
  const net = income - expense;

  const series = monthlySeries(entries, 4);
  const prevExpense = series.length >= 2 ? series[series.length - 2].expense : 0;
  const prevNet = series.length >= 2 ? series[series.length - 2].net : 0;
  const expenseDelta = expense - prevExpense;
  const netDelta = net - prevNet;

  const allocation = allocationByType(investments, rates);
  const portfolioSeries = monthlyPortfolioValue(investments, rates, 12);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-ink)]">Welcome back</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            Here&apos;s your financial snapshot for{" "}
            <span className="font-medium text-[var(--color-ink)]">{months[0]?.label ?? "this month"}</span>
          </p>
        </div>
        <Link
          href="/entries"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_4px_16px_rgba(12,158,87,0.28)] transition hover:brightness-105 active:scale-95"
          style={{ background: "linear-gradient(135deg, #0c9e57, #0a7a43)" }}
        >
          <Plus size={15} strokeWidth={2.5} /> Add entry
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatPill label="Income" value={formatCurrency(income)} sub="this month" positive />
        <StatPill
          label="Expenses"
          value={formatCurrency(expense)}
          sub={`${expenseDelta >= 0 ? "+" : "−"}${formatCurrency(Math.abs(expenseDelta))} vs. last month`}
          positive={expenseDelta <= 0}
        />
        <StatPill
          label="Net savings"
          value={formatCurrency(net)}
          sub={`${netDelta >= 0 ? "+" : "−"}${formatCurrency(Math.abs(netDelta))} vs. last month`}
          positive={netDelta >= 0}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5">
          <BudgetsCard entries={entries} budgets={budgets} />
          <RecentEntriesCard entries={entries} />
        </div>

        <div className="flex flex-col gap-5">
          <SpendingByCategoryCard entries={entries} defaultMonth={defaultMonth} />
          <div className={`${CARD} p-5`}>
            <h2 className="mb-3 text-[17px] font-extrabold tracking-tight">Income vs. expenses</h2>
            <IncomeVsExpenseChart data={series} />
          </div>
          <AllocationCard data={allocation} />
        </div>

        <div className="flex flex-col gap-5">
          <div className={`${CARD} p-5`}>
            <h2 className="mb-3 text-[17px] font-extrabold tracking-tight">Month-over-month net</h2>
            <MonthlyTrendChart data={series} />
          </div>
          <PaymentMethodsCard methods={methods} />
          <div className={`${CARD} p-5`}>
            <h2 className="mb-3 text-[17px] font-extrabold tracking-tight">Monthly value</h2>
            <PortfolioValueChart data={portfolioSeries} />
          </div>
        </div>
      </div>
    </div>
  );
}
