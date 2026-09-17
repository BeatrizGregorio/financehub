"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { clampCardDay } from "@/lib/cards";

export type ActionState = { error?: string };

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/cards");
  revalidatePath("/accounts");
  revalidatePath("/entries");
  revalidatePath("/settings");
}

function parseDays(formData: FormData) {
  const closing = Number(formData.get("closingDay"));
  const due = Number(formData.get("dueDay"));
  if (!Number.isFinite(closing) || closing < 1 || closing > 31) return { error: "Enter a closing day between 1 and 28." };
  if (!Number.isFinite(due) || due < 1 || due > 31) return { error: "Enter a due day between 1 and 28." };
  return { closingDay: clampCardDay(closing), dueDay: clampCardDay(due) };
}

/** Mark an existing payment method as a credit card, or create one that is. */
export async function setUpCard(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const days = parseDays(formData);
  if ("error" in days) return { error: days.error };

  const methodId = String(formData.get("methodId") ?? "");
  const newName = String(formData.get("newName") ?? "").trim();

  if (newName) {
    const existing = await prisma.paymentMethod.findUnique({ where: { name: newName } });
    if (existing) {
      await prisma.paymentMethod.update({ where: { id: existing.id }, data: { isCreditCard: true, ...days } });
    } else {
      await prisma.paymentMethod.create({ data: { name: newName, isCreditCard: true, ...days } });
    }
  } else if (methodId) {
    const method = await prisma.paymentMethod.findUnique({ where: { id: methodId } });
    if (!method) return { error: "That payment method no longer exists." };
    await prisma.paymentMethod.update({ where: { id: methodId }, data: { isCreditCard: true, ...days } });
  } else {
    return { error: "Choose a payment method or type a new name." };
  }

  revalidateAll();
  return {};
}

export async function updateCard(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const days = parseDays(formData);
  if ("error" in days) return { error: days.error };
  await prisma.paymentMethod.update({ where: { id }, data: days });
  revalidateAll();
  return {};
}

/**
 * Stop treating a method as a card. Its bill payments go too: once the
 * purchases count as spent the moment they happen, keeping payments that also
 * reduce cash would count the same money leaving twice.
 */
export async function removeCardSetup(id: string) {
  await prisma.$transaction([
    prisma.cardPayment.deleteMany({ where: { paymentMethodId: id } }),
    prisma.paymentMethod.update({ where: { id }, data: { isCreditCard: false, closingDay: null, dueDay: null } }),
  ]);
  revalidateAll();
}

export async function payBill(
  paymentMethodId: string,
  billKey: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter an amount greater than 0." };

  const dateRaw = String(formData.get("date") ?? "");
  const [y, m, d] = dateRaw.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d);
  if (!y || !m || !d || Number.isNaN(date.getTime())) return { error: "Pick a date." };

  const fromRaw = String(formData.get("fromAccountId") ?? "");
  const fromAccountId = fromRaw || null;
  if (fromAccountId && !(await prisma.account.findUnique({ where: { id: fromAccountId } }))) {
    return { error: "That account no longer exists." };
  }

  if (!/^\d{4}-\d{2}$/.test(billKey)) return { error: "That bill couldn't be found." };
  const card = await prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } });
  if (!card?.isCreditCard) return { error: "That card is no longer set up." };

  await prisma.cardPayment.create({ data: { paymentMethodId, billKey, amount, date, fromAccountId } });
  revalidateAll();
  return {};
}

export async function deleteCardPayment(id: string) {
  await prisma.cardPayment.delete({ where: { id } });
  revalidateAll();
}
