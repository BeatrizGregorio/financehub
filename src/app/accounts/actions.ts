"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ACCOUNT_KINDS } from "@/lib/accounts";
import { seedOpeningPosition } from "@/lib/holdingTransactions";

export type ActionState = { error?: string };

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/entries");
  revalidatePath("/investments");
  revalidatePath("/cards");
}

/** "YYYY-MM-DD" from a date input, as a local calendar date — never new Date(string). */
function parseLocalDate(raw: FormDataEntryValue | null): Date | null {
  if (typeof raw !== "string" || !raw) return null;
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAccountForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter an account name." } as const;

  const kind = String(formData.get("kind") ?? "checking");
  if (!(ACCOUNT_KINDS as readonly string[]).includes(kind)) return { error: "Choose an account type." } as const;

  // Opening balance may be negative (an overdrawn account) and may be zero.
  const balanceRaw = String(formData.get("openingBalance") ?? "").trim();
  const openingBalance = balanceRaw === "" ? 0 : Number(balanceRaw);
  if (!Number.isFinite(openingBalance)) return { error: "Enter a valid opening balance." } as const;

  const openingDate = parseLocalDate(formData.get("openingDate"));
  if (!openingDate) return { error: "Pick the date that balance was true on." } as const;

  return { data: { name, kind, openingBalance, openingDate } } as const;
}

export async function createAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseAccountForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  try {
    await prisma.account.create({ data: parsed.data });
  } catch {
    return { error: `"${parsed.data.name}" already exists.` };
  }
  revalidateAll();
  return {};
}

export async function updateAccount(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseAccountForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  try {
    await prisma.account.update({ where: { id }, data: parsed.data });
  } catch {
    return { error: `"${parsed.data.name}" already exists.` };
  }
  revalidateAll();
  return {};
}

export async function setAccountArchived(id: string, archived: boolean) {
  await prisma.account.update({ where: { id }, data: { archived } });
  revalidateAll();
}

/**
 * Delete only when nothing references the account. Anything in use is archived
 * instead from the UI — deleting it would silently move those entries' money
 * into "unassigned" and rewrite past balances.
 */
export async function deleteAccount(id: string): Promise<ActionState> {
  const [entries, transfers] = await Promise.all([
    prisma.entry.count({ where: { accountId: id } }),
    prisma.transfer.count({ where: { OR: [{ fromAccountId: id }, { toAccountId: id }] } }),
  ]);
  if (entries + transfers > 0) {
    return { error: "This account is still used by entries or transfers. Archive it instead." };
  }
  await prisma.account.delete({ where: { id } });
  revalidateAll();
  return {};
}

/**
 * Record money moving between the owner's own places.
 *
 * To an investment, it can also record the matching buy on that holding in the
 * same transaction, so the cash leaving the account and the holding growing
 * can never get out of step. Its id is stored so deleting the transfer removes
 * the buy too.
 */
export async function createTransfer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const date = parseLocalDate(formData.get("date"));
  if (!date) return { error: "Pick a date." };

  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter an amount greater than 0." };

  const fromAccountId = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const recordBuy = formData.get("recordBuy") === "on";

  if (!fromAccountId) return { error: "Choose the account the money leaves." };
  if (!to) return { error: "Choose where the money goes." };

  const from = await prisma.account.findUnique({ where: { id: fromAccountId } });
  if (!from) return { error: "That account no longer exists." };

  if (to.startsWith("account:")) {
    const toAccountId = to.slice("account:".length);
    if (toAccountId === fromAccountId) return { error: "Choose two different accounts." };
    if (!(await prisma.account.findUnique({ where: { id: toAccountId } }))) {
      return { error: "That account no longer exists." };
    }
    await prisma.transfer.create({ data: { date, amount, fromAccountId, toAccountId, note } });
  } else if (to.startsWith("investment:")) {
    const toInvestmentId = to.slice("investment:".length);
    if (!(await prisma.investment.findUnique({ where: { id: toInvestmentId } }))) {
      return { error: "That holding no longer exists." };
    }
    await prisma.$transaction(async (tx) => {
      let investmentTransactionId: string | null = null;
      if (recordBuy) {
        await seedOpeningPosition(tx, toInvestmentId);
        const buy = await tx.investmentTransaction.create({
          data: { investmentId: toInvestmentId, date, kind: "buy", amount },
        });
        investmentTransactionId = buy.id;
      }
      await tx.transfer.create({
        data: { date, amount, fromAccountId, toInvestmentId, investmentTransactionId, note },
      });
    });
  } else {
    return { error: "Choose where the money goes." };
  }

  revalidateAll();
  return {};
}

export async function deleteTransfer(id: string) {
  const transfer = await prisma.transfer.findUnique({ where: { id } });
  if (!transfer) return;
  await prisma.$transaction(async (tx) => {
    if (transfer.investmentTransactionId) {
      await tx.investmentTransaction.deleteMany({ where: { id: transfer.investmentTransactionId } });
    }
    await tx.transfer.delete({ where: { id } });
  });
  revalidateAll();
}
