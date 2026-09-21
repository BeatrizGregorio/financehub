import { prisma } from "@/lib/db";
import { getCycleStartDay, getLanguage, getPointsEnabled, getReferenceRates } from "@/lib/data";
import { taxSummary, yearReview } from "@/lib/reports";
import { cycleKey } from "@/lib/format";
import { redemptionsInYear } from "@/lib/points";
import { ReportsClient } from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams;
  const pointsEnabled = await getPointsEnabled();
  const [entries, investments, rates, cycleStartDay, lang, redemptions] = await Promise.all([
    prisma.entry.findMany({ select: { amount: true, date: true, type: true, category: true, tags: true } }),
    prisma.investment.findMany({ include: { prices: true, coupons: true, transactions: true } }),
    getReferenceRates(),
    getCycleStartDay(),
    getLanguage(),
    // Only when the optional tab is on, and only what's needed: the points a
    // redemption cost and what it was worth.
    pointsEnabled
      ? prisma.pointsRedemption.findMany({
          select: { id: true, date: true, points: true, valueReceived: true, note: true, program: { select: { name: true } } },
          orderBy: { date: "desc" },
        })
      : Promise.resolve([]),
  ]);

  // Years that have anything to report, newest first, always including this one.
  const currentYear = new Date().getFullYear();
  const years = new Set<number>([currentYear]);
  for (const e of entries) years.add(Number(cycleKey(e.date, cycleStartDay).slice(0, 4)));
  for (const inv of investments) {
    years.add(inv.startDate.getFullYear());
    if (inv.maturityDate) years.add(inv.maturityDate.getFullYear());
  }
  const yearList = [...years].filter((y) => y <= currentYear).sort((a, b) => b - a);

  // The tax summary defaults to last year: that's the declaration people file
  // in March-May. The year view defaults to the same year so the page stays one
  // coherent "year", switchable with one control.
  const requested = Number(sp.year);
  const year = yearList.includes(requested) ? requested : currentYear - 1 >= Math.min(...yearList) ? currentYear - 1 : currentYear;

  return (
    <ReportsClient
      year={year}
      years={yearList.includes(year) ? yearList : [year, ...yearList]}
      review={yearReview(entries, year, cycleStartDay)}
      tax={taxSummary(investments, rates, year)}
      redemptions={redemptionsInYear(redemptions, year).map((r) => ({
        id: r.id,
        date: r.date,
        points: r.points,
        valueReceived: r.valueReceived,
        note: r.note,
        program: r.program.name,
      }))}
      lang={lang}
    />
  );
}
