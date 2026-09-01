"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
} from "@/lib/categories";
import { MAX_CYCLE_START_DAY, clampCycleStartDay } from "@/lib/format";
import { ACCENT_COLORS, clampAccentColor } from "@/lib/theme";
import { LANGUAGES, clampLanguage } from "@/lib/i18n";

export type ActionState = { error?: string };

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/entries");
  revalidatePath("/settings");
}

/**
 * The day of the month reporting periods start on. Clamped to 1–28 so the
 * boundary exists in every month (see clampCycleStartDay) — a 31st boundary
 * would drift in February, leaving gaps between consecutive cycles.
 * Revalidates /investments too, since its charts are cycle-based as well.
 */
export async function updateCycleStartDay(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = Number(formData.get("cycleStartDay"));
  if (!Number.isFinite(raw) || raw < 1 || raw > MAX_CYCLE_START_DAY) {
    return { error: `Pick a day between 1 and ${MAX_CYCLE_START_DAY}.` };
  }

  const cycleStartDay = clampCycleStartDay(raw);
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", cycleStartDay },
    update: { cycleStartDay },
  });

  revalidateAll();
  revalidatePath("/investments");
  return {};
}

/**
 * The brand accent color. Revalidates /investments as well as revalidateAll()'s
 * three routes — the accent is applied in the root layout, so every route has
 * to re-render, not just the ones that own data.
 */
export async function updateAccentColor(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = String(formData.get("accentColor") ?? "");
  if (!ACCENT_COLORS.some((c) => c.value === raw)) return { error: "Pick one of the colors." };

  const accentColor = clampAccentColor(raw);
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", accentColor },
    update: { accentColor },
  });

  revalidateAll();
  revalidatePath("/investments");
  return {};
}

/**
 * The UI language. Like the accent, this is applied in the root layout, so
 * every route has to re-render — hence the extra /investments revalidate.
 */
export async function updateLanguage(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = String(formData.get("language") ?? "");
  if (!LANGUAGES.some((l) => l.value === raw)) return { error: "Pick one of the languages." };

  const language = clampLanguage(raw);
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", language },
    update: { language },
  });

  revalidateAll();
  revalidatePath("/investments");
  return {};
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

/**
 * Rename a category and carry its entries and budget along with it.
 *
 * Without this, renaming means deleting and re-adding, which silently orphans
 * every entry filed under the old name — the V1.9 "budgets all read R$ 0" bug.
 * Entries and budgets reference categories by name with no foreign key, so the
 * rewrite has to be explicit; it runs in one transaction so a half-renamed
 * state can't survive a failure partway through.
 */
export async function renameCategory(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const newName = String(formData.get("name") ?? "").trim();
  if (!newName) return { error: "Enter a category name." };

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return { error: "That category no longer exists." };
  if (category.name === newName) return {};

  const clash = await prisma.category.findFirst({
    where: { name: newName, type: category.type },
  });
  if (clash) return { error: `"${newName}" already exists.` };

  const oldName = category.name;

  await prisma.$transaction(async (tx) => {
    await tx.category.update({ where: { id }, data: { name: newName } });
    await tx.entry.updateMany({
      where: { category: oldName, type: category.type },
      data: { category: newName },
    });

    // Budget.category is unique, so a budget already sitting under the new
    // name would collide. Keep that one and drop the old row rather than
    // failing the rename — the target's limit is the more recent intent.
    if (category.type === "expense") {
      const target = await tx.budget.findUnique({ where: { category: newName } });
      if (target) {
        await tx.budget.deleteMany({ where: { category: oldName } });
      } else {
        await tx.budget.updateMany({
          where: { category: oldName },
          data: { category: newName },
        });
      }
    }
  });

  revalidateAll();
  return {};
}

/** Recreate a category that entries still reference — see getOrphanCategories(). */
export async function adoptOrphanCategory(name: string, type: string) {
  if (type !== "income" && type !== "expense") return;
  const existing = await prisma.category.findFirst({ where: { name, type } });
  if (!existing) await prisma.category.create({ data: { name, type } });
  revalidateAll();
}

/** Drop a budget whose category no longer exists, so it can never fill. */
export async function removeOrphanBudget(category: string) {
  await prisma.budget.deleteMany({ where: { category } });
  revalidateAll();
}

/** Enough for years of statements; a guard against a mis-mapped giant file. */
const MAX_CSV_ROWS = 5000;

export type CsvImportRow = {
  date: Date;
  name: string;
  amount: number;
  type: "income" | "expense";
};

/**
 * Create entries from a parsed CSV.
 *
 * The parsing and column mapping happen in the browser (see lib/csv.ts) so the
 * owner can see a preview and fix the mapping before anything is written. This
 * action receives already-mapped rows and does the one thing the browser can't.
 *
 * Unlike importBackup, this is **additive** — it never wipes existing data.
 * Importing a statement twice will duplicate its entries; there's no dedupe,
 * because a statement has no stable per-row id and two genuinely identical
 * charges on the same day are perfectly possible.
 */
export async function importCsvEntries(payload: {
  rows: CsvImportRow[];
  expenseCategory: string;
  incomeCategory: string;
  method: string | null;
}): Promise<{ imported: number; error?: string }> {
  const { rows, expenseCategory, incomeCategory, method } = payload;

  if (!Array.isArray(rows) || rows.length === 0) {
    return { imported: 0, error: "Nothing to import." };
  }
  if (rows.length > MAX_CSV_ROWS) {
    return { imported: 0, error: `That file has more than ${MAX_CSV_ROWS} rows.` };
  }

  // Entry.category is required, and a CSV almost never carries one, so the
  // owner picks a default per direction. Verify they still exist rather than
  // writing entries that would immediately show up as orphans.
  const needsExpense = rows.some((r) => r.type === "expense");
  const needsIncome = rows.some((r) => r.type === "income");
  if (needsExpense && !expenseCategory) return { imported: 0, error: "Choose an expense category." };
  if (needsIncome && !incomeCategory) return { imported: 0, error: "Choose an income category." };

  const now = new Date();
  await prisma.entry.createMany({
    data: rows.map((r) => ({
      name: r.name,
      amount: Math.abs(r.amount),
      date: new Date(r.date),
      type: r.type,
      category: r.type === "expense" ? expenseCategory : incomeCategory,
      method: r.type === "expense" ? method : null,
      createdAt: now,
      updatedAt: now,
    })),
  });

  revalidateAll();
  return { imported: rows.length };
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

type BackupTransaction = {
  date: string;
  kind: string;
  amount: number;
  quantity?: number | null;
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
  transactions?: BackupTransaction[];
};

type Backup = {
  app?: string;
  entries?: BackupEntry[];
  categories?: { name: string; type: string }[];
  budgets?: { category: string; limit: number }[];
  paymentMethods?: { name: string }[];
  investments?: BackupInvestment[];
  referenceRates?: { cdi: number; selic: number; ipca: number };
  settings?: { cycleStartDay?: number; accentColor?: string; language?: string };
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

  // NOTE: `License` is deliberately absent from this wipe, and from the backup
  // export. A backup is for moving the owner's own data between machines;
  // carrying the licence inside it would make "send me your backup file" a way
  // to hand someone a paid copy, and wiping it here would deactivate the app
  // every time someone restored a backup.
  await prisma.entry.deleteMany();
  await prisma.category.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.paymentMethod.deleteMany();
  // Price points/coupons first: SQLite only enforces the ON DELETE CASCADE on
  // Investment when foreign key checks are on for the connection, so don't
  // rely on it here either.
  await prisma.pricePoint.deleteMany();
  await prisma.couponPayment.deleteMany();
  await prisma.investmentTransaction.deleteMany();
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
        transactions: inv.transactions?.length
          ? {
              create: inv.transactions.map((tx) => ({
                date: new Date(tx.date),
                kind: tx.kind === "sell" ? "sell" : "buy",
                amount: tx.amount,
                quantity: tx.quantity ?? null,
              })),
            }
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

  // Pre-V1.15 backups have no `settings` key — leave the current start day
  // alone rather than silently resetting it to the default.
  if (backup.settings?.cycleStartDay != null) {
    const cycleStartDay = clampCycleStartDay(backup.settings.cycleStartDay);
    await prisma.appSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", cycleStartDay },
      update: { cycleStartDay },
    });
  }

  // Same reasoning for the accent: absent means "leave it as it is", not
  // "reset to green".
  if (backup.settings?.accentColor != null) {
    const accentColor = clampAccentColor(backup.settings.accentColor);
    await prisma.appSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", accentColor },
      update: { accentColor },
    });
  }

  if (backup.settings?.language != null) {
    const language = clampLanguage(backup.settings.language);
    await prisma.appSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", language },
      update: { language },
    });
  }

  revalidateAll();
  revalidatePath("/investments");
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
