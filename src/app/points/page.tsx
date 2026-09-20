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

  const [programs, lang] = await Promise.all([
    prisma.pointsProgram.findMany(),
    getLanguage(),
  ]);

  return <PointsClient programs={programs} lang={lang} />;
}
