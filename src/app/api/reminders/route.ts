import { NextResponse } from "next/server";
import { getLanguage } from "@/lib/data";
import { dict } from "@/lib/i18n";
import { getRemindersEnabled, loadReminders } from "@/lib/reminderData";

export const dynamic = "force-dynamic";

/**
 * Polled by the Electron shell (electron/main.cjs), which shows each item as
 * a desktop notification once. The server only listens on 127.0.0.1, so
 * nothing outside this computer can read it.
 */
export async function GET() {
  if (!(await getRemindersEnabled())) return NextResponse.json({ enabled: false, items: [] });
  const lang = await getLanguage();
  const items = await loadReminders(dict(lang), lang);
  return NextResponse.json({ enabled: true, items });
}
