"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { availableMonths, categoryBreakdown, type EntryLike } from "@/lib/aggregate";
import { CARD } from "@/lib/ui";
import { SpendingByCategoryChart } from "./SpendingByCategoryChart";

export function SpendingByCategoryCard({
  entries,
  defaultMonth,
}: {
  entries: EntryLike[];
  defaultMonth: string;
}) {
  const [month, setMonth] = useState(defaultMonth);
  const months = useMemo(() => availableMonths(entries), [entries]);
  const data = useMemo(() => categoryBreakdown(entries, month), [entries, month]);

  return (
    <div className={`${CARD} p-5`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[17px] font-extrabold tracking-tight">Spending by category</span>
        <div className="relative">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="appearance-none rounded-full bg-[var(--color-panel)] py-1.5 pl-3 pr-7 text-xs font-semibold text-[var(--color-ink)] outline-none"
          >
            {months.length === 0 && <option value={month}>{month}</option>}
            {months.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink)]"
          />
        </div>
      </div>
      <SpendingByCategoryChart data={data} />
    </div>
  );
}
