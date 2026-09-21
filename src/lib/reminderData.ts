import { prisma } from "@/lib/db";
import { getCardContext, getPointsEnabled } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Dict, Language } from "@/lib/i18n";
import { buildReminders, type Reminder } from "@/lib/reminders";

export type ReminderMessage = { id: string; title: string; body: string; href: string };

export async function getRemindersEnabled(): Promise<boolean> {
  const row = await prisma.appSettings.findUnique({ where: { id: "singleton" }, select: { remindersEnabled: true } });
  return row?.remindersEnabled ?? true;
}

/** Everything due soon, as text in the owner's language. */
export async function loadReminders(t: Dict, lang: Language, today: Date = new Date()): Promise<ReminderMessage[]> {
  // Only a window around today matters: overdue card bills need their past
  // purchases, so entries go back far enough to cover a few billing cycles.
  const from = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
  const [entries, { cards, payments }, funds, points] = await Promise.all([
    prisma.entry.findMany({
      where: { date: { gte: from, lt: to } },
      select: { id: true, name: true, amount: true, date: true, type: true, method: true },
    }),
    getCardContext(),
    prisma.sinkingFund.findMany({ select: { id: true, name: true, amount: true, savedAmount: true, dueDate: true, repeatsYearly: true } }),
    // Only when the optional tab is on: reminding about a feature the owner
    // switched off would be a strange way to find out it still exists.
    (await getPointsEnabled())
      ? prisma.pointsProgram.findMany({ select: { id: true, name: true, balance: true, expiresOn: true } })
      : Promise.resolve([]),
  ]);
  return buildReminders({ entries, cards, payments, funds, points }, today).map((r) => toMessage(r, t, lang));
}

function toMessage(r: Reminder, t: Dict, lang: Language): ReminderMessage {
  const amount = formatCurrency(r.amount);
  const date = formatDate(r.date, lang);
  switch (r.kind) {
    case "entry":
      return { id: r.id, title: t.reminders.entryTitle(r.name, r.days), body: t.reminders.entryBody(amount, date), href: "/entries" };
    case "bill":
      return { id: r.id, title: t.reminders.billTitle(r.name, r.days, r.overdue), body: t.reminders.billBody(amount, date), href: "/cards" };
    case "fund":
      return { id: r.id, title: t.reminders.fundTitle(r.name, r.days), body: t.reminders.fundBody(amount, date), href: "/settings" };
    case "points":
      // Points aren't money: the body shows the balance, not a currency amount.
      return {
        id: r.id,
        title: t.reminders.pointsTitle(r.name, r.days),
        body: t.reminders.pointsBody(
          new Intl.NumberFormat(lang === "pt" ? "pt-BR" : "en-US", { maximumFractionDigits: 0 }).format(r.amount),
          date,
        ),
        href: "/points",
      };
  }
}
