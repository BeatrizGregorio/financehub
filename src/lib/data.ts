import { prisma } from "@/lib/db";

export async function getCategories() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return {
    expense: categories.filter((c) => c.type === "expense"),
    income: categories.filter((c) => c.type === "income"),
  };
}

export async function getPaymentMethods() {
  return prisma.paymentMethod.findMany({ orderBy: { name: "asc" } });
}

export async function getBudgets() {
  return prisma.budget.findMany();
}

const DEFAULT_RATES = { cdi: 12.65, selic: 13.25, ipca: 5.5 };

export async function getReferenceRates() {
  const rates = await prisma.referenceRates.findUnique({ where: { id: "singleton" } });
  return rates ?? { id: "singleton", ...DEFAULT_RATES, updatedAt: null };
}
