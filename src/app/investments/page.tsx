import { prisma } from "@/lib/db";
import { getReferenceRates } from "@/lib/data";
import { InvestmentsClient } from "./InvestmentsClient";

export const dynamic = "force-dynamic";

export default async function InvestmentsPage() {
  const [holdings, rates] = await Promise.all([
    prisma.investment.findMany({
      include: { prices: true, coupons: true },
      orderBy: { name: "asc" },
    }),
    getReferenceRates(),
  ]);

  return <InvestmentsClient holdings={holdings} rates={rates} />;
}
