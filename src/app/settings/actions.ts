"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
} from "@/lib/categories";

export type ActionState = { error?: string };

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/entries");
  revalidatePath("/settings");
}

export async function addCategory(
  type: "income" | "expense",
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a category name." };

  try {
    await prisma.category.create({ data: { name, type } });
  } catch {
    return { error: `"${name}" already exists.` };
  }

  revalidateAll();
  return {};
}

export async function removeCategory(id: string) {
  await prisma.category.delete({ where: { id } });
  revalidateAll();
}

export async function addPaymentMethod(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a payment method name." };

  try {
    await prisma.paymentMethod.create({ data: { name } });
  } catch {
    return { error: `"${name}" already exists.` };
  }

  revalidateAll();
  return {};
}

export async function removePaymentMethod(id: string) {
  await prisma.paymentMethod.delete({ where: { id } });
  revalidateAll();
}

export async function saveBudgets(formData: FormData) {
  const entries = Array.from(formData.entries()).filter(([key]) => key.startsWith("budget:"));

  for (const [key, value] of entries) {
    const category = key.slice("budget:".length);
    const limit = Number(value);

    if (!limit || limit <= 0) {
      await prisma.budget.deleteMany({ where: { category } });
      continue;
    }

    await prisma.budget.upsert({
      where: { category },
      create: { category, limit },
      update: { limit },
    });
  }

  revalidateAll();
}

type BackupEntry = {
  name?: string;
  amount: number;
  date: string;
  type: string;
  category: string;
  note?: string | null;
  method?: string | null;
  groupId?: string | null;
  seriesType?: string | null;
  installmentNum?: number | null;
  installmentTotal?: number | null;
};

type BackupPricePoint = {
  date: string;
  price: number;
};

type BackupCouponPayment = {
  date: string;
  amount: number;
};

type BackupInvestment = {
  name: string;
  type?: string;
  subtype?: string | null;
  indexador?: string | null;
  annualRate?: number | null;
  spread?: number | null;
  adminFee?: number | null;
  perfFee?: number | null;
  amountInvested?: number;
  startDate?: string;
  maturityDate?: string | null;
  symbol?: string | null;
  quantity?: number | null;
  purchaseRef?: number | null;
  expectedReturn?: number | null;
  corretagem?: number | null;
  institution?: string | null;
  notes?: string | null;
  prices?: BackupPricePoint[];
  coupons?: BackupCouponPayment[];
};

type Backup = {
  app?: string;
  entries?: BackupEntry[];
  categories?: { name: string; type: string }[];
  budgets?: { category: string; limit: number }[];
  paymentMethods?: { name: string }[];
  investments?: BackupInvestment[];
  referenceRates?: { cdi: number; selic: number; ipca: number };
};

export async function importBackup(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a backup file." };
  }

  let backup: Backup;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    return { error: "That file isn't valid JSON." };
  }

  if (backup.app !== "FinanceHub" || !Array.isArray(backup.entries)) {
    return { error: "That doesn't look like a FinanceHub backup file." };
  }

  await prisma.entry.deleteMany();
  await prisma.category.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.paymentMethod.deleteMany();
  // Price points/coupons first: SQLite only enforces the ON DELETE CASCADE on
  // Investment when foreign key checks are on for the connection, so don't
  // rely on it here either.
  await prisma.pricePoint.deleteMany();
  await prisma.couponPayment.deleteMany();
  await prisma.investment.deleteMany();

  if (backup.categories?.length) {
    await prisma.category.createMany({
      data: backup.categories.map((c) => ({ name: c.name, type: c.type })),
    });
  }
  if (backup.paymentMethods?.length) {
    await prisma.paymentMethod.createMany({
      data: backup.paymentMethods.map((m) => ({ name: m.name })),
    });
  }
  if (backup.budgets?.length) {
    await prisma.budget.createMany({
      data: backup.budgets.map((b) => ({ category: b.category, limit: b.limit })),
    });
  }
  if (backup.entries.length) {
    await prisma.entry.createMany({
      data: backup.entries.map((e) => ({
        name: e.name?.trim() || e.category,
        amount: e.amount,
        date: new Date(e.date),
        type: e.type,
        category: e.category,
        note: e.note ?? null,
        method: e.method ?? null,
        groupId: e.groupId ?? null,
        seriesType: e.seriesType ?? null,
        installmentNum: e.installmentNum ?? null,
        installmentTotal: e.installmentTotal ?? null,
      })),
    });
  }

  // Only restore investments that match the current (V1.7) schema shape —
  // an older backup's `assetClass`/`quantity`/`avgCost` model has no sensible
  // automatic mapping to type/subtype/amountInvested/startDate, so those are
  // skipped rather than guessed, same as a backup with no `investments` key.
  const restorable = (backup.investments ?? []).filter(
    (inv): inv is BackupInvestment & { type: string; amountInvested: number; startDate: string } =>
      Boolean(inv.type && inv.amountInvested != null && inv.startDate),
  );

  for (const inv of restorable) {
    await prisma.investment.create({
      data: {
        name: inv.name,
        type: inv.type,
        subtype: inv.subtype ?? null,
        indexador: inv.indexador ?? null,
        annualRate: inv.annualRate ?? null,
        spread: inv.spread ?? null,
        adminFee: inv.adminFee ?? null,
        perfFee: inv.perfFee ?? null,
        amountInvested: inv.amountInvested,
        startDate: new Date(inv.startDate),
        maturityDate: inv.maturityDate ? new Date(inv.maturityDate) : null,
        symbol: inv.symbol ?? null,
        quantity: inv.quantity ?? null,
        purchaseRef: inv.purchaseRef ?? null,
        expectedReturn: inv.expectedReturn ?? null,
        corretagem: inv.corretagem ?? null,
        institution: inv.institution ?? null,
        notes: inv.notes ?? null,
        prices: inv.prices?.length
          ? { create: inv.prices.map((p) => ({ date: new Date(p.date), price: p.price })) }
          : undefined,
        coupons: inv.coupons?.length
          ? { create: inv.coupons.map((c) => ({ date: new Date(c.date), amount: c.amount })) }
          : undefined,
      },
    });
  }

  if (backup.referenceRates) {
    await prisma.referenceRates.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...backup.referenceRates },
      update: backup.referenceRates,
    });
  }

  revalidateAll();
  return {};
}

export async function resetDefaults() {
  await prisma.category.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.budget.deleteMany();

  await prisma.category.createMany({
    data: [
      ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ name, type: "expense" })),
      ...DEFAULT_INCOME_CATEGORIES.map((name) => ({ name, type: "income" })),
    ],
  });
  await prisma.paymentMethod.createMany({
    data: DEFAULT_PAYMENT_METHODS.map((name) => ({ name })),
  });

  revalidateAll();
}
