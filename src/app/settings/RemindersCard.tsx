"use client";

import { useRef } from "react";
import Link from "next/link";
import { BellRing } from "lucide-react";
import { updateReminders } from "./actions";
import { CARD } from "@/lib/ui";
import { useT } from "@/components/LanguageProvider";
import type { ReminderMessage } from "@/lib/reminderData";

/**
 * The on/off switch for desktop notifications, plus what is due right now.
 * The list doubles as the reminder in the browser version, where there are no
 * notifications, and shows the owner exactly what the desktop app would say.
 */
export function RemindersCard({ enabled, items }: { enabled: boolean; items: ReminderMessage[] }) {
  const { t } = useT();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className={`${CARD} p-[22px]`}>
      <div className="mb-1 flex items-center gap-2">
        <BellRing size={16} className="shrink-0 text-[var(--color-brand-text)]" />
        <h2 className="text-base font-extrabold tracking-tight">{t.reminders.title}</h2>
      </div>
      <p className="mb-4 text-[12.5px] leading-relaxed text-[var(--color-muted-2)]">{t.reminders.blurb}</p>

      {/* Saves as soon as it's ticked: a single switch doesn't need a Save button. */}
      <form ref={formRef} action={updateReminders}>
        <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-[var(--color-ink)]">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={enabled}
            onChange={() => formRef.current?.requestSubmit()}
            className="h-4 w-4 accent-[var(--color-brand)]"
          />
          {t.reminders.enabled}
        </label>
      </form>

      <h3 className="mt-5 mb-2 font-mono text-[10.5px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase">
        {t.reminders.dueNow}
      </h3>
      {items.length === 0 ? (
        <p className="text-[13px] text-[var(--color-muted-2)]">{t.reminders.none}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--color-border)]">
          {items.map((r) => (
            <li key={r.id} className="py-2">
              <Link href={r.href} className="block rounded-md hover:bg-[var(--color-panel)]">
                <span className="block text-[13px] font-semibold">{r.title}</span>
                <span className="block font-mono text-[12px] text-[var(--color-muted)]">{r.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--color-muted-2)]">{t.reminders.browserNote}</p>
    </div>
  );
}
