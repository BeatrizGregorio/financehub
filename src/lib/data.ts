import { prisma } from "@/lib/db";
import { CYCLE_START_DAY, clampCycleStartDay } from "@/lib/format";
import { clampAccentColor, type AccentColor } from "@/lib/theme";
import { clampLanguage, type Language } from "@/lib/i18n";
import { verifyLicenseKey } from "@/lib/license";

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

/**
 * How many days the app is fully usable before a license is required.
 * Set to 0 for a hard gate (activation required on first launch).
 */
export const TRIAL_DAYS = 14;

export type LicenseStatus =
  | { state: "licensed"; email: string }
  | { state: "trial"; daysLeft: number }
  | { state: "expired" };

/**
 * Whether the app is licensed, still in its trial, or locked.
 *
 * Re-verifies the stored key against the embedded public key on every call
 * rather than trusting an `activated` boolean in the database — otherwise
 * flipping one column by hand would be enough to unlock the app, which makes
 * the signature check pointless.
 */
export async function getLicenseStatus(): Promise<LicenseStatus> {
  const row = await prisma.license.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });

  if (row.email && row.key && verifyLicenseKey(row.email, row.key)) {
    return { state: "licensed", email: row.email };
  }

  const daysElapsed = Math.floor((Date.now() - row.firstRunAt.getTime()) / 86_400_000);
  const daysLeft = TRIAL_DAYS - daysElapsed;
  return daysLeft > 0 ? { state: "trial", daysLeft } : { state: "expired" };
}
