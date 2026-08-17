"use client";

import { deleteHolding } from "./actions";
import { typeColor, typeIconName, typeLabel, subtypeLabel, showsRateFields } from "@/lib/investmentTypes";
import { formatCurrency, formatDate } from "@/lib/format";
import { currentValue, gainLoss, isMatured, latestPrice, type ReferenceRatesLike } from "@/lib/investments";
import { Icon } from "@/components/CategoryIcon";
import type { Holding } from "./InvestmentsClient";
import { useT } from "@/components/LanguageProvider";
import type { Dict } from "@/lib/i18n";

// Column widths are measured, not guessed. Actions needs 276 to fit four
// actions on one line (View more 73 + Add coupon 83 + Edit 35 + Delete 51 +
// three 10px gaps = 272); at 250 they wrapped onto two lines. That extra width
// is paid for by trimming Type and Value, which were over-allocated — their
// widest real content is 100px and 101px against 160/150 allocated. Net effect
// is a *narrower* floor than a naive widening would give, so it still fits
// without a horizontal scrollbar at 1280px (969px of usable width, measured)
// and at the desktop app's 1360px window. The Name column absorbs the
// remainder and truncates with an ellipsis. Re-measure before changing these.
const GRID_COLS = "1.3fr 140px 120px 165px 276px";

function DeleteButton({ id, t }: { id: string; t: Dict }) {
  return (
    <form
      action={deleteHolding.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm(t.investments.confirmDeleteHolding)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        // 24px minimum hit area (was 16px of bare text); the negative margin
        // keeps the row height unchanged. Same pattern as EntryTable.
        className="-my-1 rounded px-1.5 py-1 text-xs font-semibold text-[var(--color-muted-2)] hover:text-[#dc3545]"
      >
        {t.common.delete}
      </button>
    </form>
  );
}

export function HoldingsTable({
  holdings,
  rates,
  onEdit,
  onView,
  onAddCoupon,
}: {
  holdings: Holding[];
  rates: ReferenceRatesLike;
  onEdit: (holding: Holding) => void;
  onView: (holding: Holding) => void;
  onAddCoupon: (holding: Holding) => void;
}) {
  const { t, lang } = useT();

  if (holdings.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-[var(--color-muted-2)]">
        {t.investments.noHoldings}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-black/[0.07] bg-[var(--color-card)] shadow-[var(--shadow-card)] backdrop-blur-xl">
      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          <div
            className="grid gap-4 border-b border-[var(--color-track)] px-6 py-[15px] font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-muted-2)]"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <span>{t.common.name}</span>
            <span>{t.common.type}</span>
            <span className="text-right">{t.common.value}</span>
            <span className="text-right">{t.investments.gainLoss}</span>
            <span className="text-right">{t.common.actions}</span>
          </div>

          {holdings.map((holding) => {
            const value = currentValue(holding, rates);
            const gl = gainLoss(holding, rates);
            const priced = latestPrice(holding);
            const subLabel = subtypeLabel(holding.type, holding.subtype, t);
            const matured = isMatured(holding);

            return (
              <div
                key={holding.id}
                className="grid items-center gap-4 border-b border-black/[0.04] px-6 py-[15px] last:border-0"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => onView(holding)}
                    // -my-0.5 offsets the added padding so the row keeps its
                    // height while the name reaches a 24px hit area.
                    className="-my-0.5 truncate py-0.5 text-left text-[13.5px] font-semibold text-[var(--color-ink)] hover:underline"
                  >
                    {holding.name}
                  </button>
                  {matured ? (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-[var(--color-positive)]/12 px-1.5 py-px font-mono text-[9.5px] font-bold tracking-wide text-[var(--color-positive)] uppercase">
                        {t.investments.matured}
                      </span>
                      {holding.institution && (
                        <span className="truncate text-[12px] text-[var(--color-muted-2)]">
                          {holding.institution}
                        </span>
                      )}
                    </span>
                  ) : (
                    holding.institution && (
                      <span className="truncate text-[12px] text-[var(--color-muted-2)]">
                        {holding.institution}
                      </span>
                    )
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-[7px] text-[13px] font-medium">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: typeColor(holding.type) }}
                    >
                      <Icon name={typeIconName(holding.type)} size={12} />
                    </span>
                    <span className="truncate">{typeLabel(holding.type, t)}</span>
                  </span>
                  {subLabel && (
                    <span className="truncate text-[11px] text-[var(--color-muted-2)]">{subLabel}</span>
                  )}
                </span>
                <span className="text-right">
                  <span className="block font-mono text-[13px] font-medium text-[var(--color-ink)]">
                    {formatCurrency(value)}
                  </span>
                  <span className="block font-mono text-[10.5px] text-[var(--color-muted-2)]">
                    {matured
                      ? t.investments.finalValue
                      : priced
                        ? t.investments.manualOn(formatDate(priced.date, lang))
                        : t.investments.accrualEstimate}
                  </span>
                </span>
                <span
                  className="text-right font-mono text-[13px] font-medium"
                  style={{ color: gl ? (gl.gain >= 0 ? "var(--color-positive)" : "#dc3545") : "var(--color-muted-2)" }}
                >
                  {gl
                    ? `${gl.gain >= 0 ? "+" : "−"}${formatCurrency(Math.abs(gl.gain))} (${(gl.returnPct * 100).toFixed(1)}%)`
                    : "—"}
                </span>
                <div className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1">
                  <button
                    type="button"
                    onClick={() => onView(holding)}
                    className="-my-1 rounded px-1.5 py-1 text-xs font-semibold text-[var(--color-muted-2)] hover:text-[var(--color-ink)]"
                  >
                    {t.investments.viewMore}
                  </button>
                  {/* Coupons only exist for Renda Fixa/Fundo — the same gate
                      HoldingDetail uses, so this button doesn't offer a
                      meaningless action on Ação/Cripto/Outro. */}
                  {showsRateFields(holding.type) && (
                    <button
                      type="button"
                      onClick={() => onAddCoupon(holding)}
                      className="-my-1 rounded px-1.5 py-1 text-xs font-semibold text-[var(--color-muted-2)] hover:text-[var(--color-brand)]"
                    >
                      {t.investments.addCoupon}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEdit(holding)}
                    className="-my-1 rounded px-1.5 py-1 text-xs font-semibold text-[var(--color-muted-2)] hover:text-[var(--color-ink)]"
                  >
                    {t.common.edit}
                  </button>
                  <DeleteButton id={holding.id} t={t} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
