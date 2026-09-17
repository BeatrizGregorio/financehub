import { prisma } from "@/lib/db";
import { getCycleStartDay } from "@/lib/data";
import { accountBalance, unassignedTotal } from "@/lib/accounts";
import { currentCycleKey, cycleRange } from "@/lib/format";
import { AccountsClient } from "./AccountsClient";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [accounts, entries, transfers, investments, cycleStartDay] = await Promise.all([
    prisma.account.findMany({ orderBy: [{ archived: "asc" }, { name: "asc" }] }),
    prisma.entry.findMany({ select: { amount: true, date: true, type: true, accountId: true, method: true } }),
    prisma.transfer.findMany({ orderBy: { date: "desc" } }),
    prisma.investment.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getCycleStartDay(),
  ]);

  // "This month" follows the owner's budget cycle, like everything else.
  const { start, endExclusive } = cycleRange(currentCycleKey(cycleStartDay), cycleStartDay);
  const inCycle = (d: Date) => d >= start && d < endExclusive;

  const rows = accounts.map((a) => {
    let inflow = 0;
    let outflow = 0;
    for (const e of entries) {
      if (e.accountId !== a.id || !inCycle(e.date)) continue;
      if (e.type === "income") inflow += e.amount;
      else outflow += e.amount;
    }
    for (const t of transfers) {
      if (!inCycle(t.date)) continue;
      if (t.toAccountId === a.id) inflow += t.amount;
      if (t.fromAccountId === a.id) outflow += t.amount;
    }
    return { ...a, balance: accountBalance(a, entries, transfers), inflow, outflow };
  });

  const unassigned = accounts.length
    ? unassignedTotal(entries, accounts.map((a) => a.id))
    : { net: 0, count: 0 };

  return (
    <AccountsClient
      accounts={rows}
      transfers={transfers}
      investments={investments}
      unassigned={unassigned}
    />
  );
}
