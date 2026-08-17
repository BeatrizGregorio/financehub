import { prisma } from "@/lib/db";
import { CYCLE_START_DAY, clampCycleStartDay } from "@/lib/format";
import { clampAccentColor, type AccentColor } from "@/lib/theme";
import { clampLanguage, type Language } from "@/lib/i18n";

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

/**
 * The chosen brand accent. Clamped for the same reason as the cycle start day:
 * an unrecognized name would reach `data-accent` and match no CSS block.
 */
export async function getAccentColor(): Promise<AccentColor> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  return clampAccentColor(settings?.accentColor);
}

/**
 * The chosen UI language. Clamped for the same reason as the other two
 * settings — an unrecognized value would render an empty dictionary.
 */
export async function getLanguage(): Promise<Language> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  return clampLanguage(settings?.language);
}

/**
 * The savings goal, or null when none is set yet — there's no sensible
 * default target amount or date to invent, so the projector shows an empty
 * state instead of a fabricated goal.
 */
export async function getInvestmentGoal() {
  return prisma.investmentGoal.findUnique({ where: { id: "singleton" } });
}
