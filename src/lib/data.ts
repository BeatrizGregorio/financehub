import { prisma } from "@/lib/db";
import { CYCLE_START_DAY, clampCycleStartDay } from "@/lib/format";

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

/**
 * The day of the month reporting periods start on. Falls back to the default
 * when no settings row exists yet, and clamps whatever is stored, so a bad
 * value can never produce a nonsensical date range downstream.
 */
export async function getCycleStartDay(): Promise<number> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  return clampCycleStartDay(settings?.cycleStartDay ?? CYCLE_START_DAY);
}
