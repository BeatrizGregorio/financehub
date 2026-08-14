import { prisma } from "@/lib/db";
import { getCycleStartDay, getInvestmentGoal, getReferenceRates } from "@/lib/data";
import { averageMonthlyExpenses } from "@/lib/goal";
import { InvestmentsClient } from "./InvestmentsClient";

export const dynamic = "force-dynamic";

export default async function InvestmentsPage() {
  const [holdings, rates, cycleStartDay, goal, entries] = await Promise.all([
    prisma.investment.findMany({
      include: { prices: true, coupons: true },
      orderBy: { name: "asc" },
    }),
    getReferenceRates(),
    getCycleStartDay(),
    getInvestmentGoal(),
    // Only expenses matter here, and only for the emergency-reserve preset.
    prisma.entry.findMany({ where: { type: "expense" }, select: { type: true, amount: true, date: true } }),
  ]);

  // 6 × average monthly expenses. Null when there's nothing to average, so the
  // preset button hides rather than offering a target of R$ 0.
  const avgExpenses = averageMonthlyExpenses(entries, 6);
  const emergencyReserveTarget = avgExpenses > 0 ? avgExpenses * 6 : null;

  return (
    <InvestmentsClient
      holdings={holdings}
      rates={rates}
      cycleStartDay={cycleStartDay}
      goal={goal}
      emergencyReserveTarget={emergencyReserveTarget}
    />
  );
}
