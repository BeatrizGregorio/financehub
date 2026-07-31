import { prisma } from "@/lib/db";
import { getCategories, getPaymentMethods } from "@/lib/data";
import { EntriesClient } from "./EntriesClient";

export const dynamic = "force-dynamic";

export default async function EntriesPage() {
  const [entries, { expense, income }, paymentMethods] = await Promise.all([
    prisma.entry.findMany({ orderBy: { date: "desc" } }),
    getCategories(),
    getPaymentMethods(),
  ]);

  return (
    <EntriesClient
      entries={entries}
      expenseCategories={expense}
      incomeCategories={income}
      paymentMethods={paymentMethods}
    />
  );
}
