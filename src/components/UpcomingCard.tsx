import { CalendarClock } from "lucide-react";
import { upcomingEntries, type UpcomingEntry } from "@/lib/aggregate";
import { categoryColor, categoryIconName } from "@/lib/categories";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { CARD } from "@/lib/ui";
import { Icon } from "./CategoryIcon";
import type { Dict, Language } from "@/lib/i18n";

/**
 * What is still to come **in the current budget month**.
 *
 * Every row here is a real entry the owner created — almost always part of a
 * recurring series, which generates twelve future-dated rows. Nothing is
 * predicted or inferred, which is the whole reason this card is allowed to
 * exist where the design handoff's invented "upcoming bills" was not.
 *
 * It stops at the cycle's last day rather than running 30 days forward: with a
 * series, a rolling window kept showing next month's installment as the next
 * thing due, which is not what "what's left this month" means (V1.35).
 */
export function UpcomingCard({
  entries,
  until,
  t,
  lang,
}: {
  entries: UpcomingEntry[];
  /** Last day of the current budget cycle — see upcomingEntries(). */
  until: Date;
  t: Dict;
  lang: Language;
}) {
  const upcoming = upcomingEntries(entries, until);
  const shown = upcoming.slice(0, 5);

  // Net of what is scheduled, so a month with a big incoming payment doesn't
  // read as pure outflow.
  const total = upcoming.reduce(
    (sum, e) => sum + (e.type === "income" ? e.amount : -e.amount),
    0,
  );

  return (
    <div className={`${CARD} p-[18px]`}>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight">
          <CalendarClock size={16} className="shrink-0 text-[var(--color-brand-text)]" />
          {t.dashboard.upcoming}
        </span>
        <span className="shrink-0 rounded-full bg-[var(--color-brand-tint)] px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-[var(--color-brand-text)]">
          {t.dashboard.untilDate(formatShortDate(until, lang))}
        </span>
      </div>

      {upcoming.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--color-muted-2)]">
          {t.dashboard.nothingScheduledMonth}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            {shown.map((e) => (
              <div key={e.id} className="flex items-center gap-[11px] py-2">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-white"
                  style={{ backgroundColor: categoryColor(e.category) }}
                >
                  <Icon name={categoryIconName(e.category)} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold">{e.name}</div>
                  <div className="truncate text-[11px] text-[var(--color-muted-2)]">
                    {formatShortDate(e.date, lang)}
                    {e.method ? ` · ${e.method}` : ""}
                  </div>
                </div>
                <span
                  className="shrink-0 font-mono text-[12.5px] font-medium whitespace-nowrap"
                  style={{
                    color: e.type === "income" ? "var(--color-positive-text)" : "var(--color-ink)",
                  }}
                >
                  {e.type === "income" ? "+" : "−"}
                  {formatCurrency(e.amount)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[var(--color-border)] pt-3">
            <span className="text-[12px] text-[var(--color-muted)]">
              {upcoming.length > shown.length
                ? t.dashboard.andMore(upcoming.length - shown.length)
                : t.dashboard.scheduledNet}
            </span>
            <span
              className="shrink-0 font-mono text-[13px] font-bold whitespace-nowrap tabular-nums"
              style={{ color: total >= 0 ? "var(--color-positive-text)" : "var(--color-rust-text)" }}
            >
              {total >= 0 ? "+" : "−"}
              {formatCurrency(Math.abs(total))}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
