import { prisma } from "@/lib/db";
import { getCardContext, getCycleStartDay } from "@/lib/data";
import { isCardPurchase } from "@/lib/cards";
import { accountBalance, unassignedTotal } from "@/lib/accounts";
import { currentCycleKey, cycleRange } from "@/lib/format";
import { AccountsClient } from "./AccountsClient";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [accounts, allEntries, directTransfers, investments, cycleStartDay, { cards, payments }] = await Promise.all([
    prisma.account.findMany({ orderBy: [{ archived: "asc" }, { name: "asc" }] }),
    prisma.entry.findMany({ select: { amount: true, date: true, type: true, accountId: true, method: true } }),
    prisma.transfer.findMany({ orderBy: { date: "desc" } }),
    prisma.investment.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getCycleStartDay(),
    getCardContext(),
  ]);

  // Card purchases don't touch an account until the bill is paid; the bill
  // payment is what leaves the account, so it's folded in like a transfer.
  const cardNames = new Set(cards.map((c) => c.name));
  const entries = allEntries.filter((e) => !isCardPurchase(e, cardNames));
  const transfers = [
    ...directTransfers,
    ...payments
      .filter((p) => p.fromAccountId)
      .map((p) => ({ date: p.date, amount: p.amount, fromAccountId: p.fromAccountId!, toAccountId: null, toInvestmentId: null })),
  ];

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
      transfers={directTransfers}
      investments={investments}
      unassigned={unassigned}
    />
  );
}
