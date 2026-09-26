"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { addMonthsClamped } from "@/lib/format";
import { parseTags, serializeTags } from "@/lib/tags";
import { restorableRows, sharedSeriesFields } from "@/lib/entryEdits";

export type ActionState = { error?: string };

type ParsedEntry = {
  name: string;
  amount: number;
  date: Date;
  type: string;
  category: string;
  note: string | null;
  method: string | null;
  accountId: string | null;
  tags: string;
};

function parseEntryForm(formData: FormData): ActionState & { data?: ParsedEntry } {
  const name = formData.get("name");
  const amountRaw = formData.get("amount");
  const dateRaw = formData.get("date");
  const type = formData.get("type");
  const category = formData.get("category");
  const note = formData.get("note");
  const method = formData.get("method");
  const accountRaw = formData.get("accountId");

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Enter a name." };
  }

  const amount = Number(amountRaw);
  if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
    return { error: "Enter an amount greater than 0." };
  }

  if (typeof dateRaw !== "string" || !dateRaw) {
    return { error: "Pick a date." };
  }
  const [year, month, day] = dateRaw.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day);
  if (!year || !month || !day || Number.isNaN(date.getTime())) {
    return { error: "Pick a valid date." };
  }

  if (type !== "income" && type !== "expense") {
    return { error: "Choose income or expense." };
  }

  // While splitting, the categories are per part (checked in createEntry).
  const splitting = formData.get("split") === "on";
  if (!splitting && (typeof category !== "string" || !category.trim())) {
    return { error: "Choose a category." };
  }

  const noteValue = typeof note === "string" && note.trim() ? note.trim() : null;
  const methodValue = typeof method === "string" && method.trim() ? method.trim() : null;
  const accountId = typeof accountRaw === "string" && accountRaw.trim() ? accountRaw.trim() : null;

  return {
    data: {
      name: name.trim(),
      amount,
      date,
      type,
      category: typeof category === "string" && category.trim() ? category.trim() : String(formData.get("splitCategory") ?? ""),
      note: noteValue,
      method: methodValue,
      accountId,
      tags: serializeTags(parseTags(String(formData.get("tags") ?? ""))),
    },
  };
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/entries");
  revalidatePath("/accounts");
}

export async function createEntry(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseEntryForm(formData);
  if (parsed.error || !parsed.data) return { error: parsed.error };
  const { data } = parsed;

  // Split across categories: one entry per part, sharing a splitId. Not
  // combinable with repetition — the form hides those options while splitting.
  if (formData.get("split") === "on") {
    const categories = formData.getAll("splitCategory").map((c) => String(c).trim());
    const amounts = formData.getAll("splitAmount").map((a) => Number(a));
    if (categories.length < 2) return { error: "A split needs at least two parts." };
    if (categories.some((c) => !c)) return { error: "Choose a category for every part." };
    if (amounts.some((a) => !Number.isFinite(a) || a <= 0)) return { error: "Enter an amount greater than 0 for every part." };
    const sum = Math.round(amounts.reduce((x, y) => x + y, 0) * 100);
    if (sum !== Math.round(data.amount * 100)) {
      return { error: `The parts add up to ${(sum / 100).toFixed(2)}, but the total is ${data.amount.toFixed(2)}.` };
    }
    const splitId = crypto.randomUUID();
    await prisma.entry.createMany({
      data: categories.map((category, i) => ({ ...data, category, amount: amounts[i], splitId })),
    });
    revalidateAll();
    return {};
  }

  const seriesType = formData.get("seriesType");
  const installmentsRaw = Number(formData.get("installments"));
  const installments = data.type === "expense" && installmentsRaw > 1 ? Math.floor(installmentsRaw) : 1;

  if (seriesType === "fixed") {
    const groupId = crypto.randomUUID();
    await prisma.entry.createMany({
      data: Array.from({ length: 12 }, (_, i) => ({
        ...data,
        date: addMonthsClamped(data.date, i),
        groupId,
        seriesType: "fixed",
      })),
    });
  } else if (installments > 1) {
    const groupId = crypto.randomUUID();
    const perInstallment = Math.round((data.amount / installments) * 100) / 100;
    await prisma.entry.createMany({
      data: Array.from({ length: installments }, (_, i) => ({
        ...data,
        amount: perInstallment,
        date: addMonthsClamped(data.date, i),
        groupId,
        seriesType: "installment",
        installmentNum: i + 1,
        installmentTotal: installments,
      })),
    });
  } else {
    await prisma.entry.create({ data });
  }

  revalidateAll();
  return {};
}

export async function updateEntry(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseEntryForm(formData);
  if (parsed.error || !parsed.data) return { error: parsed.error };

  // "Apply to the whole series" is opt-in per save: the form defaults to this
  // entry alone, so an ordinary edit can never quietly rewrite twelve rows.
  const wholeSeries = formData.get("scope") === "series";
  const current = await prisma.entry.findUnique({ where: { id }, select: { groupId: true } });

  await prisma.entry.update({ where: { id }, data: parsed.data });

  if (wholeSeries && current?.groupId) {
    // Everything but the date — see sharedSeriesFields() for why.
    await prisma.entry.updateMany({
      where: { groupId: current.groupId, id: { not: id } },
      data: sharedSeriesFields(parsed.data),
    });
  }

  revalidateAll();
  return {};
}

/**
 * Keep the rows that are about to be deleted, so the banner on the entries
 * page can put them back. Only the newest batch is ever offered, so the older
 * ones are cleared here rather than accumulating forever.
 */
async function recordDeletion(rows: { id: string; name: string }[]) {
  if (rows.length === 0) return;
  await prisma.deletedEntryBatch.deleteMany();
  await prisma.deletedEntryBatch.create({
    data: {
      label: rows[0].name,
      count: rows.length,
      payload: JSON.stringify(rows),
    },
  });
}

export async function deleteEntry(id: string) {
  const row = await prisma.entry.findUnique({ where: { id } });
  if (!row) return;
  await recordDeletion([row]);
  await prisma.entry.delete({ where: { id } });
  revalidateAll();
}

export async function deleteSplit(splitId: string) {
  const rows = await prisma.entry.findMany({ where: { splitId }, orderBy: { date: "asc" } });
  await recordDeletion(rows);
  await prisma.entry.deleteMany({ where: { splitId } });
  revalidateAll();
}

export async function deleteSeries(groupId: string) {
  const rows = await prisma.entry.findMany({ where: { groupId }, orderBy: { date: "asc" } });
  await recordDeletion(rows);
  await prisma.entry.deleteMany({ where: { groupId } });
  revalidateAll();
}

/**
 * Put the last deleted batch back, exactly as it was — same ids, so a restored
 * split or series is still the same group.
 *
 * Ids that exist again are skipped rather than overwritten: if the owner
 * re-created something by hand in the meantime, her version wins and undo
 * restores only what is genuinely missing.
 */
export async function undoDelete(batchId: string) {
  const batch = await prisma.deletedEntryBatch.findUnique({ where: { id: batchId } });
  if (!batch) return;

  const rows = restorableRows(batch.payload);
  if (rows.length > 0) {
    const existing = await prisma.entry.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      select: { id: true },
    });
    const taken = new Set(existing.map((e) => e.id));
    const missing = rows.filter((r) => !taken.has(r.id));
    if (missing.length > 0) await prisma.entry.createMany({ data: missing });
  }

  await prisma.deletedEntryBatch.delete({ where: { id: batchId } });
  revalidateAll();
}

/** Dismiss the banner without restoring — the rows stay deleted. */
export async function dismissDeletedBatch(batchId: string) {
  await prisma.deletedEntryBatch.deleteMany({ where: { id: batchId } });
  revalidateAll();
}
