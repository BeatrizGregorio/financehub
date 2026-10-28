"use client";

import { ChevronDown } from "lucide-react";
import { INVESTMENT_TYPES, typeColor, typeLabel } from "@/lib/investmentTypes";
import { useT } from "@/components/LanguageProvider";
import type { Holding } from "./InvestmentsClient";

/**
 * Which holdings the page is looking at.
 *
 * Two controls that compose rather than override each other: `types` is a
 * coarse cut ("just the fixed income"), `hidden` is the precise one ("all of
 * it except that one"). An empty `types` means every type, so the default
 * state is genuinely "no filter" rather than "all five ticked" — nothing to
 * keep in step when a new type is added.
 */
export type HoldingFilter = { types: Set<string>; hidden: Set<string> };

export const NO_FILTER: HoldingFilter = { types: new Set(), hidden: new Set() };

export function isFiltered(filter: HoldingFilter): boolean {
  return filter.types.size > 0 || filter.hidden.size > 0;
}

/** The holdings a filter leaves visible, in the order they came in. */
export function applyHoldingFilter<T extends { id: string; type: string }>(
  holdings: T[],
  filter: HoldingFilter,
): T[] {
  return holdings.filter(
    (h) => (filter.types.size === 0 || filter.types.has(h.type)) && !filter.hidden.has(h.id),
  );
}

function toggled(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function HoldingsFilter({
  holdings,
  filter,
  onChange,
}: {
  holdings: Holding[];
  filter: HoldingFilter;
  onChange: (filter: HoldingFilter) => void;
}) {
  const { t } = useT();

  // Only types actually held are offered — a pill for Cripto on a portfolio
  // with no crypto filters to nothing, which is a dead end, not a control.
  const presentTypes = INVESTMENT_TYPES.filter((type) =>
    holdings.some((h) => h.type === type.value),
  );

  // The checklist lists what the type pills left, so the two read as one
  // narrowing rather than two filters disagreeing.
  const inScope = holdings.filter(
    (h) => filter.types.size === 0 || filter.types.has(h.type),
  );
  const shown = applyHoldingFilter(holdings, filter);

  const pill =
    "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition whitespace-nowrap";

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      {presentTypes.length > 1 &&
        presentTypes.map((type) => {
          const active = filter.types.has(type.value);
          return (
            <button
              key={type.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ ...filter, types: toggled(filter.types, type.value) })}
              className={pill}
              style={
                active
                  ? { background: typeColor(type.value), color: "#fff" }
                  : { background: "var(--color-inset)", color: "var(--color-muted)" }
              }
            >
              {typeLabel(type.value, t)}
            </button>
          );
        })}

      {/* A native <details> rather than a popover: no click-outside handling,
          no focus trap, and it is keyboard-operable for free. */}
      <details>
        <summary
          className={`${pill} flex cursor-pointer list-none items-center gap-1.5`}
          style={{ background: "var(--color-inset)", color: "var(--color-ink)" }}
        >
          {t.investments.filterHoldings}
          <span className="font-mono text-[11px] text-[var(--color-muted-2)]">
            {shown.length}/{holdings.length}
          </span>
          <ChevronDown size={13} className="shrink-0" />
        </summary>
        {/* Solid --color-surface-raised, not the translucent --color-panel: a
            menu floating over a chart has to hide what is behind it, or the
            lines read straight through the list. Same reasoning as the Modal
            card in V1.9. */}
        <div className="absolute top-full right-0 left-0 z-20 mt-1.5 max-h-[320px] overflow-y-auto sm:right-auto sm:w-[260px] rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2 shadow-[var(--shadow-card)]">
          <div className="flex gap-1.5 px-1.5 pt-1 pb-2">
            <button
              type="button"
              onClick={() => onChange({ ...filter, hidden: new Set() })}
              className="-m-1 p-1 text-[12px] font-semibold text-[var(--color-brand-text)] underline underline-offset-2"
            >
              {t.investments.selectAll}
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({ ...filter, hidden: new Set(inScope.map((h) => h.id)) })
              }
              className="-m-1 p-1 text-[12px] font-semibold text-[var(--color-muted)] underline underline-offset-2"
            >
              {t.investments.selectNone}
            </button>
          </div>
          {inScope.map((h) => (
            <label
              key={h.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-[9px] px-1.5 py-1.5 hover:bg-[var(--color-inset)]"
            >
              <input
                type="checkbox"
                checked={!filter.hidden.has(h.id)}
                onChange={() => onChange({ ...filter, hidden: toggled(filter.hidden, h.id) })}
                className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-brand)]"
              />
              <span className="truncate text-[12.5px] text-[var(--color-ink)]">{h.name}</span>
            </label>
          ))}
        </div>
      </details>

      {isFiltered(filter) && (
        <button
          type="button"
          onClick={() => onChange(NO_FILTER)}
          className="text-[12.5px] font-semibold text-[var(--color-muted)] underline underline-offset-2"
        >
          {t.investments.clearFilter}
        </button>
      )}
    </div>
  );
}
