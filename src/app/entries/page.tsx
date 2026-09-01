import { prisma } from "@/lib/db";
import { getCategories, getCycleStartDay, getPaymentMethods } from "@/lib/data";
import { cycleKey, cycleLabel, cycleRange } from "@/lib/format";
import { getLanguage } from "@/lib/data";
import { EntriesClient } from "./EntriesClient";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

/**
 * Rows per page. The table used to render every entry ever logged, because the
 * page fetched all of them and filtered in the browser — invisible at 25
 * entries, a slow page and a large payload after a few years of daily logging.
 */
export const PAGE_SIZE = 50;

type Search = { q?: string; month?: string; type?: string; page?: string };

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const cycleStartDay = await getCycleStartDay();

  const q = (sp.q ?? "").trim();
  const month = sp.month && sp.month !== "all" ? sp.month : "all";
  const type = sp.type === "income" || sp.type === "expense" ? sp.type : "all";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.EntryWhereInput = {};
  if (type !== "all") where.type = type;
  if (month !== "all") {
    // The same cycle-aware date range the sidebar's IN/OUT query uses, rather
    // than bucketing in memory — those two agreeing is the useful end-to-end
    // check that the range and the bucketing haven't drifted apart.
    const { start, endExclusive } = cycleRange(month, cycleStartDay);
    where.date = { gte: start, lt: endExclusive };
  }
  if (q) {
    // SQLite's LIKE is case-insensitive for ASCII by default, which is what
    // Prisma's `contains` compiles to. Prisma's `mode: "insensitive"` is
    // Postgres-only, so it isn't an option here. Practical consequence: "cafe"
    // finds "Cafe" but not "Café" — accented characters still match only in
    // the case they were typed. Fixing that properly needs a raw LOWER() query
    // with a collation, which isn't worth it for one person's search box.
    where.OR = [{ name: { contains: q } }, { note: { contains: q } }];
  }

  const [rows, total, sums, allDates, { expense, income }, paymentMethods, lang] =
    await Promise.all([
      prisma.entry.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.entry.count({ where }),
      // Net is for the whole filtered set, not just the visible page — a total
      // that changed as you paged would be worse than useless.
      prisma.entry.groupBy({ by: ["type"], where, _sum: { amount: true } }),
      // One column for every entry, purely to build the month picker. Far
      // lighter than the full rows this page used to load, and it keeps the
      // picker showing every month rather than only those on the current page.
      prisma.entry.findMany({ select: { date: true } }),
      getCategories(),
      getPaymentMethods(),
      getLanguage(),
    ]);

  // Series counts only for the groups actually on this page, so "Delete series"
  // can still say how many entries it will remove.
  const groupIds = [...new Set(rows.map((r) => r.groupId).filter((g): g is string => !!g))];
  const groupRows = groupIds.length
    ? await prisma.entry.groupBy({
        by: ["groupId"],
        where: { groupId: { in: groupIds } },
        _count: { _all: true },
      })
    : [];
  const groupCounts: Record<string, number> = {};
  for (const g of groupRows) {
    if (g.groupId) groupCounts[g.groupId] = g._count._all;
  }

  const monthKeys = [...new Set(allDates.map((e) => cycleKey(e.date, cycleStartDay)))]
    .sort((a, b) => (a < b ? 1 : -1))
    .map((key) => ({ key, label: cycleLabel(key, lang) }));

  const net = sums.reduce(
    (acc, s) => acc + (s.type === "income" ? 1 : -1) * (s._sum.amount ?? 0),
    0,
  );

  return (
    <EntriesClient
      entries={rows}
      months={monthKeys}
      groupCounts={groupCounts}
      total={total}
      net={net}
      page={page}
      pageSize={PAGE_SIZE}
      filters={{ q, month, type }}
      expenseCategories={expense}
      incomeCategories={income}
      paymentMethods={paymentMethods}
    />
  );
}
