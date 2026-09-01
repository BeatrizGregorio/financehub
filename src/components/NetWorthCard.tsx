import { formatCurrency } from "@/lib/format";
import { CARD } from "@/lib/ui";
import { NetWorthChart } from "./NetWorthChart";
import type { NetWorthPoint } from "@/lib/investments";
import type { Dict } from "@/lib/i18n";

/**
 * Cash and investments on one timeline, plus the current split.
 *
 * The blurb is doing real work: the cash figure is cumulative logged entries
 * starting from zero, not a bank balance, and saying so is the difference
 * between a useful number and a misleading one. Don't shorten it away.
 */
export function NetWorthCard({ data, t }: { data: NetWorthPoint[]; t: Dict }) {
  const latest = data.length ? data[data.length - 1] : null;

  return (
    <div className={`${CARD} p-5`}>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-[17px] font-extrabold tracking-tight">{t.dashboard.netWorth}</h2>
        {latest && (
          <span
            className="shrink-0 font-mono text-[15px] font-bold whitespace-nowrap tabular-nums"
            style={{ color: latest.total >= 0 ? "var(--color-ink)" : "var(--color-rust)" }}
          >
            {formatCurrency(latest.total)}
          </span>
        )}
      </div>
      <p className="mb-3 text-[12.5px] text-[var(--color-muted)]">{t.dashboard.netWorthBlurb}</p>

      <NetWorthChart data={data} />

      {latest && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-[var(--color-border)] pt-3">
          <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-muted)]">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand)]" />
            {t.dashboard.cashLogged}
            <span className="font-mono font-semibold text-[var(--color-ink)] tabular-nums">
              {formatCurrency(latest.cash)}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-muted)]">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-positive)]" />
            {t.dashboard.investmentsSeries}
            <span className="font-mono font-semibold text-[var(--color-ink)] tabular-nums">
              {formatCurrency(latest.investments)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
