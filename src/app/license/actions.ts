"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { normalizeEmail, normalizeKey, verifyLicenseKey } from "@/lib/license";

export type ActionState = { error?: string };

/**
 * Activates this copy. Stores the email and key only after the signature
 * checks out, so the database never holds a licence that wouldn't verify.
 *
 * Errors are returned as dictionary *keys* rather than sentences: this is a
 * server action, and it has no access to the language context that client
 * components use, so the component that renders the message picks the wording.
 */
export async function activateLicense(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const key = normalizeKey(String(formData.get("key") ?? ""));

  if (!email || !key) return { error: "missing" };
  if (!verifyLicenseKey(email, key)) return { error: "invalid" };

  await prisma.license.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", email, key, activatedAt: new Date() },
    update: { email, key, activatedAt: new Date() },
  });

  // The gate lives in the root layout, so every route has to re-render.
  revalidatePath("/", "layout");
  return {};
}
