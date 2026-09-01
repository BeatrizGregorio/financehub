"use client";

import { AlertTriangle } from "lucide-react";
import { adoptOrphanCategory, removeOrphanBudget } from "./actions";
import { CARD } from "@/lib/ui";
import { useT } from "@/components/LanguageProvider";
import type { OrphanReport } from "@/lib/data";

/**
 * Surfaces entries and budgets pointing at categories that no longer exist.
 *
 * Renders nothing when there's nothing wrong — this is a warning, not a
 * permanent section, and a card saying "no problems" every day trains people to
 * stop reading it.
 *
 * Neither fix is applied automatically. Adding a category back and deleting a
 * stale budget are both destructive-ish in opposite directions, and only the
 * owner knows whether an orphan is a typo or a category she meant to retire.
 */
export function OrphanCategoriesCard({ report }: { report: OrphanReport }) {
  const { t } = useT();

  if (report.entryCategories.length === 0 && report.budgetCategories.length === 0) {
    return null;
  }

  return (
    <div className={`${CARD} p-[22px] md:col-span-2`}>
      <div className="mb-1 flex items-center gap-2">
        <AlertTriangle size={16} className="shrink-0 text-[var(--color-rust-text)]" />
        <h2 className="text-base font-extrabold tracking-tight">{t.settings.orphanTitle}</h2>
      </div>
      <p className="mb-3.5 text-[12.5px] text-[var(--color-muted-2)]">{t.settings.orphanBlurb}</p>

      <ul className="flex flex-col gap-2.5">
        {report.entryCategories.map((o) => (
          <li
            key={`${o.type}-${o.name}`}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[12px] bg-[var(--color-inset)] px-3.5 py-3"
          >
            <span className="min-w-[200px] flex-1 text-[13px] text-[var(--color-ink)]">
              {t.settings.orphanEntries(o.count, o.name)}
            </span>
            <form action={adoptOrphanCategory.bind(null, o.name, o.type)} className="shrink-0">
              <button
                type="submit"
                className="rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:brightness-105 active:scale-95"
                style={{ background: "var(--gradient-brand)" }}
              >
                {t.settings.orphanAdopt}
              </button>
            </form>
          </li>
        ))}

        {report.budgetCategories.map((name) => (
          <li
            key={`budget-${name}`}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[12px] bg-[var(--color-inset)] px-3.5 py-3"
          >
            <span className="min-w-[200px] flex-1 text-[13px] text-[var(--color-ink)]">
              {t.settings.orphanBudget(name)}
            </span>
            <form action={removeOrphanBudget.bind(null, name)} className="shrink-0">
              <button
                type="submit"
                className="rounded-full bg-[var(--color-inset)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--color-rust-text)] ring-1 ring-[var(--color-border)] transition hover:bg-[var(--color-track)]"
              >
                {t.settings.orphanRemoveBudget}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
