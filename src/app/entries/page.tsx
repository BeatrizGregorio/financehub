import { prisma } from "@/lib/db";
import { getCategories, getCycleStartDay, getPaymentMethods } from "@/lib/data";
import { EntriesClient } from "./EntriesClient";

export const dynamic = "force-dynamic";

export default async function EntriesPage() {
  const [entries, { expense, income }, paymentMethods, cycleStartDay] = await Promise.all([
    prisma.entry.findMany({ orderBy: { date: "desc" } }),
    getCategories(),
    getPaymentMethods(),
    getCycleStartDay(),
  ]);

  return (
    <EntriesClient
      entries={entries}
      expenseCategories={expense}
      incomeCategories={income}
      paymentMethods={paymentMethods}
      cycleStartDay={cycleStartDay}
    />
  );
}
