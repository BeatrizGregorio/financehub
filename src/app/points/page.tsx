import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getLanguage, getPointsEnabled } from "@/lib/data";
import { PointsClient } from "./PointsClient";

export const dynamic = "force-dynamic";

export default async function PointsPage() {
  // The tab is optional, so the route has to be closed too — not just hidden
  // from the sidebar. Otherwise an old link or a typed URL reaches a page the
  // owner has switched off.
  if (!(await getPointsEnabled())) notFound();

  const [programs, cards, lang] = await Promise.all([
    prisma.pointsProgram.findMany({
      include: {
        snapshots: { orderBy: { date: "asc" } },
        redemptions: { orderBy: { date: "desc" } },
      },
    }),
    // Only credit cards can earn into a programme, so only they are offered.
    prisma.paymentMethod.findMany({
      where: { isCreditCard: true },
      select: { id: true, name: true, pointsProgramId: true },
      orderBy: { name: "asc" },
    }),
    getLanguage(),
  ]);

  return <PointsClient programs={programs} cards={cards} lang={lang} />;
}
