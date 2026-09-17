"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { addMonthsClamped } from "@/lib/format";
import { parseTags, serializeTags } from "@/lib/tags";

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

  await prisma.entry.update({ where: { id }, data: parsed.data });

  revalidateAll();
  return {};
}

export async function deleteEntry(id: string) {
  await prisma.entry.delete({ where: { id } });
  revalidateAll();
}

export async function deleteSplit(splitId: string) {
  await prisma.entry.deleteMany({ where: { splitId } });
  revalidateAll();
}

export async function deleteSeries(groupId: string) {
  await prisma.entry.deleteMany({ where: { groupId } });
  revalidateAll();
}
