import Link from "next/link";
import { CalendarHeart } from "lucide-react";
import { fundStatus, monthlySetAside, totalMonthlySetAside, type SinkingFundLike } from "@/lib/sinkingFunds";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { CARD } from "@/lib/ui";
import type { Dict, Language } from "@/lib/i18n";

type Fund = SinkingFundLike & { id: string; name: string };

/**
 * Dashboard view of yearly/irregular bills: how much to set aside this month
 * in total, and how far along each one is. Rendered only when at least one
 * exists — an empty "set aside" card on every dashboard would be noise.
 * Managed in Settings.
 */
export function SetAsideCard({ funds, t, lang }: { funds: Fund[]; t: Dict; lang: Language }) {
  const today = new Date();
  const sorted = [...funds].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const total = totalMonthlySetAside(funds, today);

  return (
    <div className={`${CARD} p-[18px]`}>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight">
          <CalendarHeart size={16} className="shrink-0 text-[var(--color-brand-text)]" />
          {t.dashboard.setAside}
        </span>
        <Link href="/settings" className="shrink-0 text-xs font-bold text-[var(--color-brand-text)]">
          {t.dashboard.manage}
        </Link>
      </div>

      <div className="flex flex-col gap-3.5">
        {sorted.slice(0, 5).map((f) => {
          const status = fundStatus(f, today);
          const pct = f.amount > 0 ? Math.min(100, (f.savedAmount / f.amount) * 100) : 0;
          const warn = status === "behind" || status === "passed";
          return (
            <div key={f.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13.5px] font-bold">{f.name}</span>
                <span className="shrink-0 font-mono text-[11.5px] whitespace-nowrap text-[var(--color-muted-2)]">
                  {formatShortDate(f.dueDate, lang)} · {formatCurrency(f.amount)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-track)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: warn ? "var(--color-rust)" : "var(--color-positive)",
                  }}
                />
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-2 text-[11px]">
                <span style={{ color: warn ? "var(--color-rust-text)" : "var(--color-muted-2)" }}>
                  {t.settings.fundStatus[status]}
                </span>
                <span className="font-mono text-[var(--color-muted-2)]">
                  {status === "done" ? formatCurrency(f.savedAmount) : t.settings.fundPerMonth(formatCurrency(monthlySetAside(f, today)))}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
        <span className="text-[12px] text-[var(--color-muted)]">{t.dashboard.setAsideTotal}</span>
        <span className="font-mono text-[13px] font-bold text-[var(--color-ink)] tabular-nums">
          {t.settings.fundPerMonth(formatCurrency(total))}
        </span>
      </div>
    </div>
  );
}
