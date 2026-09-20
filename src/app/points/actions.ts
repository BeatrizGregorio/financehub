"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export type ActionState = { error?: string };

function revalidateAll() {
  revalidatePath("/points");
  revalidatePath("/settings");
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
  await prisma.pointsProgram.create({ data: parsed.data });
  revalidateAll();
  return {};
}

export async function updateProgram(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseProgramForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  await prisma.pointsProgram.update({ where: { id }, data: parsed.data });
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
  await prisma.pointsProgram.update({ where: { id }, data: { balance } });
  revalidateAll();
  return {};
}

export async function deleteProgram(id: string) {
  await prisma.pointsProgram.delete({ where: { id } });
  revalidateAll();
}
