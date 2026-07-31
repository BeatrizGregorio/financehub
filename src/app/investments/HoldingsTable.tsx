"use client";

import { deleteHolding } from "./actions";
import { typeColor, typeIconName, typeLabel, subtypeLabel } from "@/lib/investmentTypes";
import { formatCurrency, formatDate } from "@/lib/format";
import { currentValue, gainLoss, latestPrice, type ReferenceRatesLike } from "@/lib/investments";
import { Icon } from "@/components/CategoryIcon";
import type { Holding } from "./InvestmentsClient";

const GRID_COLS = "1.3fr 160px 150px 170px 130px";

function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteHolding.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm("Delete this holding? Its price history will be deleted too. This can't be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="text-xs font-semibold text-[var(--color-muted-2)] hover:text-[#dc3545]"
      >
        Delete
      </button>
    </form>
  );
}

export function HoldingsTable({
  holdings,
  rates,
  onEdit,
  onView,
}: {
  holdings: Holding[];
  rates: ReferenceRatesLike;
  onEdit: (holding: Holding) => void;
  onView: (holding: Holding) => void;
}) {
  if (holdings.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-[var(--color-muted-2)]">
        No holdings yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-black/[0.07] bg-[var(--color-card)] shadow-[var(--shadow-card)] backdrop-blur-xl">
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div
            className="grid gap-4 border-b border-[var(--color-track)] px-6 py-[15px] font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-muted-2)]"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <span>Name</span>
            <span>Type</span>
            <span className="text-right">Value</span>
            <span className="text-right">Gain/loss</span>
            <span className="text-right">Actions</span>
          </div>

          {holdings.map((holding) => {
            const value = currentValue(holding, rates);
            const gl = gainLoss(holding, rates);
            const priced = latestPrice(holding);
            const subLabel = subtypeLabel(holding.type, holding.subtype);

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
                    className="truncate text-left text-[13.5px] font-semibold text-[var(--color-ink)] hover:underline"
                  >
                    {holding.name}
                  </button>
                  {holding.institution && (
                    <span className="truncate text-[12px] text-[var(--color-muted-2)]">
                      {holding.institution}
                    </span>
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
                    <span className="truncate">{typeLabel(holding.type)}</span>
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
                    {priced ? `manual · ${formatDate(priced.date)}` : "accrual estimate"}
                  </span>
                </span>
                <span
                  className="text-right font-mono text-[13px] font-medium"
                  style={{ color: gl ? (gl.gain >= 0 ? "#0c9e57" : "#dc3545") : "var(--color-muted-2)" }}
                >
                  {gl
                    ? `${gl.gain >= 0 ? "+" : "−"}${formatCurrency(Math.abs(gl.gain))} (${(gl.returnPct * 100).toFixed(1)}%)`
                    : "—"}
                </span>
                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => onEdit(holding)}
                    className="text-xs font-semibold text-[var(--color-muted-2)] hover:text-[var(--color-ink)]"
                  >
                    Edit
                  </button>
                  <DeleteButton id={holding.id} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
