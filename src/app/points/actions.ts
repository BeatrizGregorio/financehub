"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export type ActionState = { error?: string };

function revalidateAll() {
  revalidatePath("/points");
  revalidatePath("/settings");
  // The yearly report shows redemptions, and cards can be linked to a programme.
  revalidatePath("/reports");
  revalidatePath("/cards");
}

/**
 * Record what the balance is on a date, so the page can show a direction
 * rather than only a number. One row per day per programme: checking twice in
 * an afternoon corrects the day rather than adding a second point.
 */
async function recordSnapshot(programId: string, balance: number, when: Date = new Date()) {
  const day = new Date(when.getFullYear(), when.getMonth(), when.getDate());
  const existing = await prisma.pointsSnapshot.findFirst({ where: { programId, date: day } });
  if (existing) await prisma.pointsSnapshot.update({ where: { id: existing.id }, data: { balance } });
  else await prisma.pointsSnapshot.create({ data: { programId, date: day, balance } });
}

/** Which credit cards were ticked as earning into this programme. */
function pickedCardIds(formData: FormData): string[] {
  return formData.getAll("cards").map((c) => String(c)).filter(Boolean);
}

/**
 * Point the chosen cards at this programme and release any that were
 * unticked. Cards are only ever *linked*, never owned: deleting a programme
 * leaves the card alone with a dangling id, which reads as "unlinked".
 */
async function linkCards(programId: string, cardIds: string[]) {
  await prisma.paymentMethod.updateMany({
    where: { pointsProgramId: programId, id: { notIn: cardIds } },
    data: { pointsProgramId: null },
  });
  if (cardIds.length > 0) {
    await prisma.paymentMethod.updateMany({ where: { id: { in: cardIds } }, data: { pointsProgramId: programId } });
  }
}

/** "YYYY-MM-DD" from a date input, as a local calendar date — never new Date(string). */
function parseLocalDate(raw: FormDataEntryValue | null): Date | null {
  if (typeof raw !== "string" || !raw) return null;
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * A points balance is typed in from a statement, so it's accepted with
 * thousands separators in either convention ("50.000" and "50,000" are both
 * fifty thousand points — no programme deals in fractions of a point).
 */
function parsePoints(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const n = Number(text.replace(/[.,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function parseProgramForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter the programme's name." } as const;

  const balance = parsePoints(formData.get("balance"));
  if (balance === null) return { error: "Enter the points balance as a whole number." } as const;

  // Both optional: a balance is worth tracking without a price on it, and
  // plenty of programmes never expire.
  const valueRaw = String(formData.get("valuePer1000") ?? "").trim();
  const valuePer1000 = valueRaw === "" ? null : Number(valueRaw.replace(",", "."));
  if (valuePer1000 !== null && (!Number.isFinite(valuePer1000) || valuePer1000 < 0)) {
    return { error: "Enter what 1000 points are worth, or leave it blank." } as const;
  }

  const expiryRaw = String(formData.get("expiresOn") ?? "").trim();
  const expiresOn = expiryRaw === "" ? null : parseLocalDate(formData.get("expiresOn"));
  if (expiryRaw !== "" && !expiresOn) return { error: "Pick a valid expiry date, or leave it blank." } as const;

  const notes = String(formData.get("notes") ?? "").trim() || null;

  return { data: { name, balance, valuePer1000, expiresOn, notes } } as const;
}

export async function createProgram(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseProgramForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  const created = await prisma.pointsProgram.create({
    data: { ...parsed.data, balanceUpdatedAt: new Date() },
  });
  await recordSnapshot(created.id, created.balance);
  await linkCards(created.id, pickedCardIds(formData));
  revalidateAll();
  return {};
}

export async function updateProgram(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseProgramForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  // Only a changed balance counts as "checked" — editing a note or an expiry
  // date shouldn't make a months-old balance look freshly confirmed.
  const before = await prisma.pointsProgram.findUnique({ where: { id }, select: { balance: true } });
  const changed = before ? before.balance !== parsed.data.balance : true;
  await prisma.pointsProgram.update({
    where: { id },
    data: changed ? { ...parsed.data, balanceUpdatedAt: new Date() } : parsed.data,
  });
  if (changed) await recordSnapshot(id, parsed.data.balance);
  await linkCards(id, pickedCardIds(formData));
  revalidateAll();
  return {};
}

/**
 * The quick "I just checked my balance" update from the programme's row —
 * everything else about the programme stays as it is.
 */
export async function setBalance(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const balance = parsePoints(formData.get("balance"));
  if (balance === null) return { error: "Enter the points balance as a whole number." };
  // Re-typing the same number still counts as checking it: the point of the
  // date is "I confirmed this today", not "it changed today".
  await prisma.pointsProgram.update({ where: { id }, data: { balance, balanceUpdatedAt: new Date() } });
  await recordSnapshot(id, balance);
  revalidateAll();
  return {};
}

/**
 * Log what a redemption bought. Subtracting it from the balance is optional
 * and ticked by default — the balance may already have been updated from the
 * statement, and silently double-counting would be worse than asking.
 */
export async function addRedemption(programId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const points = parsePoints(formData.get("points"));
  if (points === null || points <= 0) return { error: "Enter how many points you spent." };

  const valueRaw = String(formData.get("valueReceived") ?? "").trim();
  const valueReceived = valueRaw === "" ? null : Number(valueRaw.replace(",", "."));
  if (valueReceived !== null && (!Number.isFinite(valueReceived) || valueReceived < 0)) {
    return { error: "Enter what it was worth in R$, or leave it blank." };
  }

  const date = parseLocalDate(formData.get("date")) ?? new Date();
  const note = String(formData.get("note") ?? "").trim() || null;

  await prisma.pointsRedemption.create({ data: { programId, date, points, valueReceived, note } });

  if (formData.get("subtract") === "on") {
    const program = await prisma.pointsProgram.findUnique({ where: { id: programId }, select: { balance: true } });
    if (program) {
      const balance = Math.max(0, program.balance - points);
      await prisma.pointsProgram.update({ where: { id: programId }, data: { balance, balanceUpdatedAt: new Date() } });
      await recordSnapshot(programId, balance);
    }
  }

  revalidateAll();
  return {};
}

export async function deleteRedemption(id: string) {
  await prisma.pointsRedemption.delete({ where: { id } });
  revalidateAll();
}

export async function deleteProgram(id: string) {
  // Explicit deletes rather than trusting the cascade, the same rule this
  // project follows for holdings: SQLite only enforces foreign keys when the
  // connection sets PRAGMA foreign_keys = ON, which this app doesn't rely on.
  await prisma.$transaction([
    prisma.pointsSnapshot.deleteMany({ where: { programId: id } }),
    prisma.pointsRedemption.deleteMany({ where: { programId: id } }),
    prisma.pointsProgram.delete({ where: { id } }),
  ]);
  await prisma.paymentMethod.updateMany({ where: { pointsProgramId: id }, data: { pointsProgramId: null } });
  revalidateAll();
}
