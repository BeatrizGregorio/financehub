"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { INVESTMENT_TYPES } from "@/lib/investmentTypes";

export type ActionState = { error?: string };

type ParsedHolding = {
  name: string;
  type: string;
  subtype: string | null;
  indexador: string | null;
  annualRate: number | null;
  spread: number | null;
  adminFee: number | null;
  perfFee: number | null;
  amountInvested: number;
  startDate: Date;
  maturityDate: Date | null;
  symbol: string | null;
  quantity: number | null;
  purchaseRef: number | null;
  expectedReturn: number | null;
  corretagem: number | null;
  institution: string | null;
  notes: string | null;
};

const VALID_TYPES = new Set<string>(INVESTMENT_TYPES.map((t) => t.value));

function parseLocalDate(raw: FormDataEntryValue | null): Date | null {
  if (typeof raw !== "string" || !raw) return null;
  const [year, month, day] = raw.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptionalNumber(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

function parseOptionalString(raw: FormDataEntryValue | null): string | null {
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function parseHoldingForm(formData: FormData): ActionState & { data?: ParsedHolding } {
  const name = formData.get("name");
  const type = formData.get("type");
  const amountInvestedRaw = formData.get("amountInvested");
  const startDate = parseLocalDate(formData.get("startDate"));

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Enter a name." };
  }

  if (typeof type !== "string" || !VALID_TYPES.has(type)) {
    return { error: "Choose a type." };
  }

  const amountInvested = Number(amountInvestedRaw);
  if (!amountInvestedRaw || Number.isNaN(amountInvested) || amountInvested <= 0) {
    return { error: "Enter an amount invested greater than 0." };
  }

  if (!startDate) {
    return { error: "Pick a start date." };
  }

  return {
    data: {
      name: name.trim(),
      type,
      subtype: parseOptionalString(formData.get("subtype")),
      indexador: parseOptionalString(formData.get("indexador")),
      annualRate: parseOptionalNumber(formData.get("annualRate")),
      spread: parseOptionalNumber(formData.get("spread")),
      adminFee: parseOptionalNumber(formData.get("adminFee")),
      perfFee: parseOptionalNumber(formData.get("perfFee")),
      amountInvested,
      startDate,
      maturityDate: parseLocalDate(formData.get("maturityDate")),
      symbol: parseOptionalString(formData.get("symbol")),
      quantity: parseOptionalNumber(formData.get("quantity")),
      purchaseRef: parseOptionalNumber(formData.get("purchaseRef")),
      expectedReturn: parseOptionalNumber(formData.get("expectedReturn")),
      corretagem: parseOptionalNumber(formData.get("corretagem")),
      institution: parseOptionalString(formData.get("institution")),
      notes: parseOptionalString(formData.get("notes")),
    },
  };
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/investments");
  revalidatePath("/settings");
}

export async function createHolding(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseHoldingForm(formData);
  if (parsed.error || !parsed.data) return { error: parsed.error };

  await prisma.investment.create({ data: parsed.data });

  revalidateAll();
  return {};
}

export async function updateHolding(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseHoldingForm(formData);
  if (parsed.error || !parsed.data) return { error: parsed.error };

  await prisma.investment.update({ where: { id }, data: parsed.data });

  revalidateAll();
  return {};
}

export async function deleteHolding(id: string) {
  // Delete price/coupon history explicitly rather than relying solely on the
  // DB-level ON DELETE CASCADE, since SQLite only enforces foreign keys when
  // the connection has PRAGMA foreign_keys = ON — this guarantees the
  // cascade regardless of that setting.
  await prisma.$transaction([
    prisma.pricePoint.deleteMany({ where: { investmentId: id } }),
    prisma.couponPayment.deleteMany({ where: { investmentId: id } }),
    prisma.investment.delete({ where: { id } }),
  ]);
  revalidateAll();
}

export async function savePrices(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const date = parseLocalDate(formData.get("date"));
  if (!date) return { error: "Pick a valid date." };

  const entries = Array.from(formData.entries()).filter(([key]) => key.startsWith("price:"));

  for (const [key, value] of entries) {
    const investmentId = key.slice("price:".length);
    const price = Number(value);
    if (!value || Number.isNaN(price) || price <= 0) continue;

    await prisma.pricePoint.upsert({
      where: { investmentId_date: { investmentId, date } },
      create: { investmentId, date, price },
      update: { price },
    });
  }

  revalidateAll();
  return {};
}

export async function updatePricePoint(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const priceRaw = formData.get("price");
  const price = Number(priceRaw);
  if (!priceRaw || Number.isNaN(price) || price <= 0) {
    return { error: "Enter a price greater than 0." };
  }

  await prisma.pricePoint.update({ where: { id }, data: { price } });

  revalidateAll();
  return {};
}

export async function deletePricePoint(id: string) {
  await prisma.pricePoint.delete({ where: { id } });
  revalidateAll();
}

export async function addCoupon(
  investmentId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const date = parseLocalDate(formData.get("date"));
  if (!date) return { error: "Pick a valid date." };

  const amountRaw = formData.get("amount");
  const amount = Number(amountRaw);
  if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
    return { error: "Enter an amount greater than 0." };
  }

  await prisma.couponPayment.create({ data: { investmentId, date, amount } });

  revalidateAll();
  return {};
}

export async function updateCoupon(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const amountRaw = formData.get("amount");
  const amount = Number(amountRaw);
  if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
    return { error: "Enter an amount greater than 0." };
  }

  await prisma.couponPayment.update({ where: { id }, data: { amount } });

  revalidateAll();
  return {};
}

export async function deleteCoupon(id: string) {
  await prisma.couponPayment.delete({ where: { id } });
  revalidateAll();
}

/**
 * The savings goal shown by the Investments projector. `expectedAnnualRate`
 * arrives from the form as a percentage (10 = 10% a.a.) and is stored as a
 * decimal, which is what the projection math in src/lib/goal.ts expects.
 * A blank monthly contribution is stored as null, meaning "use the recent
 * average" — computed at render time rather than frozen here, so it keeps up
 * as new holdings are added.
 */
export async function saveInvestmentGoal(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = parseOptionalString(formData.get("name")) ?? "My goal";
  const targetAmount = Number(formData.get("targetAmount"));
  const targetDate = parseLocalDate(formData.get("targetDate"));
  const ratePercent = Number(formData.get("expectedAnnualRate"));
  const monthlyContribution = parseOptionalNumber(formData.get("monthlyContribution"));

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return { error: "Enter a target amount greater than 0." };
  }
  if (!targetDate) {
    return { error: "Choose a target date." };
  }
  if (!Number.isFinite(ratePercent)) {
    return { error: "Enter an expected annual return." };
  }
  if (monthlyContribution !== null && monthlyContribution < 0) {
    return { error: "The monthly contribution can't be negative." };
  }

  const data = {
    name,
    targetAmount,
    targetDate,
    expectedAnnualRate: ratePercent / 100,
    monthlyContribution,
  };

  await prisma.investmentGoal.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  revalidateAll();
  return {};
}
