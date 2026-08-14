"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarRange } from "lucide-react";
import { updateCycleStartDay } from "./actions";
import {
  MAX_CYCLE_START_DAY,
  clampCycleStartDay,
  currentCycleKey,
  cycleLabel,
  cycleRangeLabel,
} from "@/lib/format";
import { CARD } from "@/lib/ui";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_4px_16px_rgba(12,158,87,0.28)] transition hover:brightness-105 active:scale-95 disabled:opacity-50"
      style={{ background: "linear-gradient(135deg, #0c9e57, #0a7a43)" }}
    >
      {pending ? "Saving…" : "Save start day"}
    </button>
  );
}

export function CycleSettingsCard({ cycleStartDay }: { cycleStartDay: number }) {
  const [state, formAction] = useActionState(updateCycleStartDay, {});
  // Local so the preview updates as the number changes, before saving.
  const [day, setDay] = useState(cycleStartDay);

  const safeDay = clampCycleStartDay(day);
  const previewKey = currentCycleKey(safeDay);

  return (
    <div className={`${CARD} p-[22px]`}>
      <h2 className="mb-1 text-base font-extrabold tracking-tight">Month start day</h2>
      <p className="mb-3.5 text-[12.5px] text-[var(--color-muted-2)]">
        The day each month begins for totals, budgets and charts. Use 1 for normal calendar months.
      </p>

      <form action={formAction}>
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="cycleStartDay"
            className="text-[13.5px] font-semibold text-[var(--color-ink)]"
          >
            Starts on day
          </label>
          {/* py sits on the input, not the wrapper, so the field itself is a
              28px target while the pill keeps its size (same as BudgetEditor). */}
          <div className="flex items-center gap-1.5 rounded-[10px] bg-[var(--color-inset)] px-[13px] py-1">
            <input
              id="cycleStartDay"
              type="number"
              name="cycleStartDay"
              min="1"
              max={MAX_CYCLE_START_DAY}
              step="1"
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-16 bg-transparent py-1 text-right font-mono text-[13px] outline-none"
            />
            <span className="font-mono text-xs text-[var(--color-muted-2)]">of the month</span>
          </div>
        </div>

        <div className="mt-3.5 flex items-start gap-2.5 rounded-[10px] bg-[var(--color-inset)] px-[13px] py-2.5">
          <CalendarRange size={15} className="mt-px shrink-0 text-[var(--color-muted-2)]" />
          <p className="text-[12.5px] leading-relaxed text-[var(--color-muted)]">
            Right now that means{" "}
            <span className="font-semibold text-[var(--color-ink)]">{cycleLabel(previewKey)}</span>{" "}
            runs{" "}
            <span className="font-mono text-[12px] font-semibold text-[var(--color-ink)]">
              {cycleRangeLabel(previewKey, safeDay)}
            </span>
            .
          </p>
        </div>

        {state.error && <p className="mt-2.5 text-[12.5px] text-[var(--color-rust)]">{state.error}</p>}

        <SaveButton />
      </form>

      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--color-muted-2)]">
        Days 29–31 aren&apos;t available because they don&apos;t exist in every month — the boundary
        would drift in February and leave gaps between months.
      </p>
    </div>
  );
}
