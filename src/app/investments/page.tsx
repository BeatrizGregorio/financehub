import { prisma } from "@/lib/db";
import { getCycleStartDay, getReferenceRates } from "@/lib/data";
import { InvestmentsClient } from "./InvestmentsClient";

export const dynamic = "force-dynamic";

export default async function InvestmentsPage() {
  const [holdings, rates, cycleStartDay] = await Promise.all([
    prisma.investment.findMany({
      include: { prices: true, coupons: true },
      orderBy: { name: "asc" },
    }),
    getReferenceRates(),
    getCycleStartDay(),
  ]);

  return <InvestmentsClient holdings={holdings} rates={rates} cycleStartDay={cycleStartDay} />;
}
