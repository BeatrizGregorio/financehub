import type { Prisma } from "@/generated/prisma/client";

/**
 * Before a holding's first buy/sell is recorded, write its existing position
 * as an opening buy dated at its startDate.
 *
 * Why: once a holding has any transactions, they replace amountInvested and
 * quantity as the source of truth (see investedAt()/accrualValue()). Without
 * this, recording a R$ 500 top-up on a holding worth R$ 10.000 would make it
 * suddenly worth about R$ 500 — the original capital would simply vanish. The
 * opening buy carries it across, so adding a transaction only ever adds.
 *
 * Idempotent: does nothing if the holding already has transactions. Must run
 * inside the same database transaction as the insert that follows it.
 */
export async function seedOpeningPosition(tx: Prisma.TransactionClient, investmentId: string) {
  const existing = await tx.investmentTransaction.count({ where: { investmentId } });
  if (existing > 0) return;

  const inv = await tx.investment.findUnique({ where: { id: investmentId } });
  if (!inv || inv.amountInvested <= 0) return;

  await tx.investmentTransaction.create({
    data: {
      investmentId,
      date: inv.startDate,
      kind: "buy",
      amount: inv.amountInvested,
      quantity: inv.quantity ?? null,
    },
  });
}
