import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getReferenceRates } from "@/lib/data";

export async function GET() {
  const [entries, categories, budgets, paymentMethods, investments, rates] = await Promise.all([
    prisma.entry.findMany(),
    prisma.category.findMany(),
    prisma.budget.findMany(),
    prisma.paymentMethod.findMany(),
    prisma.investment.findMany({ include: { prices: true, coupons: true } }),
    getReferenceRates(),
  ]);

  const backup = {
    app: "FinanceHub",
    version: 3,
    exportedAt: new Date().toISOString(),
    entries,
    categories: categories.map((c) => ({ name: c.name, type: c.type })),
    budgets: budgets.map((b) => ({ category: b.category, limit: b.limit })),
    paymentMethods: paymentMethods.map((m) => ({ name: m.name })),
    investments: investments.map((inv) => ({
      name: inv.name,
      type: inv.type,
      subtype: inv.subtype,
      indexador: inv.indexador,
      annualRate: inv.annualRate,
      spread: inv.spread,
      adminFee: inv.adminFee,
      perfFee: inv.perfFee,
      amountInvested: inv.amountInvested,
      startDate: inv.startDate,
      maturityDate: inv.maturityDate,
      symbol: inv.symbol,
      quantity: inv.quantity,
      purchaseRef: inv.purchaseRef,
      expectedReturn: inv.expectedReturn,
      corretagem: inv.corretagem,
      institution: inv.institution,
      notes: inv.notes,
      prices: inv.prices.map((p) => ({ date: p.date, price: p.price })),
      coupons: inv.coupons.map((c) => ({ date: c.date, amount: c.amount })),
    })),
    referenceRates: { cdi: rates.cdi, selic: rates.selic, ipca: rates.ipca },
  };

  const filename = `financehub-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
