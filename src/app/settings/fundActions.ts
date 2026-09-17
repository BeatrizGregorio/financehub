"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { nextYear } from "@/lib/sinkingFunds";

export type ActionState = { error?: string };

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/settings");
}

function parseLocalDate(raw: FormDataEntryValue | null): Date | null {
  if (typeof raw !== "string" || !raw) return null;
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createFund(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a name, e.g. IPVA." };
  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter an amount greater than 0." };
  const dueDate = parseLocalDate(formData.get("dueDate"));
  if (!dueDate) return { error: "Pick the due date." };
  const savedRaw = String(formData.get("savedAmount") ?? "").trim();
  const savedAmount = savedRaw === "" ? 0 : Number(savedRaw);
  if (!Number.isFinite(savedAmount) || savedAmount < 0) return { error: "Enter a valid amount saved so far." };

  await prisma.sinkingFund.create({
    data: {
      name,
      amount,
      dueDate,
      savedAmount,
      repeatsYearly: formData.get("repeatsYearly") === "on",
      category: String(formData.get("category") ?? "") || null,
    },
  });
  revalidateAll();
  return {};
}

/** Set "saved so far" to a new total — the number the owner reads off their savings. */
export async function setFundSaved(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const saved = Number(formData.get("savedAmount"));
  if (!Number.isFinite(saved) || saved < 0) return { error: "Enter a valid amount." };
  await prisma.sinkingFund.update({ where: { id }, data: { savedAmount: saved } });
  revalidateAll();
  return {};
}

/**
 * The bill has been paid. A yearly one starts over for next year with nothing
 * saved; a one-off is done, so it's removed.
 */
export async function markFundPaid(id: string) {
  const fund = await prisma.sinkingFund.findUnique({ where: { id } });
  if (!fund) return;
  if (fund.repeatsYearly) {
    await prisma.sinkingFund.update({
      where: { id },
      data: { savedAmount: 0, dueDate: nextYear(fund.dueDate) },
    });
  } else {
    await prisma.sinkingFund.delete({ where: { id } });
  }
  revalidateAll();
}

export async function deleteFund(id: string) {
  await prisma.sinkingFund.delete({ where: { id } });
  revalidateAll();
}
