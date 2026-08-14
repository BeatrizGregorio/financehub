"use client";

import { useMemo, useState } from "react";
import { CalendarClock, ChevronDown, Pencil, Target, TrendingUp, Wallet } from "lucide-react";
import { Modal } from "@/components/Modal";
import { GoalProjectionChart } from "@/components/GoalProjectionChart";
import { GoalForm, type GoalLike } from "./GoalForm";
import { CARD } from "@/lib/ui";
import { formatCurrency } from "@/lib/format";
import {
  SPREAD,
  addMonths,
  annualToMonthly,
  averageMonthlyContribution,
  buildCashFlows,
  goalProjection,
  monthsBetween,
  monthsToGoal,
  requiredPMT,
  xirr,
} from "@/lib/goal";
import type { Holding } from "./InvestmentsClient";

/** Ties the collapse button to the region it opens, for screen readers. */
const BODY_ID = "goal-projection-body";

function monthYear(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function Stat({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-start gap-2.5 rounded-[12px] bg-[var(--color-inset)] px-3.5 py-3">
      <span className="mt-px shrink-0 text-[var(--color-muted-2)]">{icon}</span>
      <div className="min-w-0">
        <p className="mb-0.5 font-mono text-[10.5px] tracking-[0.08em] text-[var(--color-muted-2)] uppercase">
          {label}
        </p>
        <div className="text-[13.5px] leading-snug text-[var(--color-ink)]">{children}</div>
      </div>
    </div>
  );
}

export function GoalProjectionCard({
  goal,
  holdings,
  currentValue,
  emergencyReserveTarget,
}: {
  goal: GoalLike | null;
  holdings: Holding[];
  currentValue: number;
  emergencyReserveTarget: number | null;
}) {
  const [editing, setEditing] = useState(false);
  // Lets "use as the projection rate" preview the real return without saving.
  const [rateOverride, setRateOverride] = useState<number | null>(null);
  // Collapse is per-visit only — deliberately not persisted. Reading
  // localStorage during the first render would disagree with the server-
  // rendered HTML, and this app's lint config rules out the
  // setState-in-an-effect way around that.
  const [open, setOpen] = useState(true);

  const collapsedProgress =
    goal && goal.targetAmount > 0 ? currentValue / goal.targetAmount : null;

  const averageContribution = useMemo(
    () => averageMonthlyContribution(holdings, 6),
    [holdings],
  );

  const realReturn = useMemo(() => {
    const flows = buildCashFlows(holdings, currentValue);
    return xirr(flows);
  }, [holdings, currentValue]);

  const expectedAnnualRate = rateOverride ?? goal?.expectedAnnualRate ?? 0.1;
  const monthlyContribution = goal?.monthlyContribution ?? averageContribution;

  const projection = useMemo(() => {
    if (!goal) return null;
    return goalProjection({
      currentValue,
      monthlyContribution,
      expectedAnnualRate,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate,
    });
  }, [goal, currentValue, monthlyContribution, expectedAnnualRate]);

  return (
    <div className={`${CARD} p-5`}>
      <div className={`flex flex-wrap items-start justify-between gap-3 ${open ? "mb-4" : ""}`}>
        <div className="min-w-0">
          {/* <h2><button> is the standard accordion markup — the heading stays a
              real heading for screen readers, and the button is what gets
              aria-expanded. A <button> can't legally contain an <h2>, so it
              can't be the other way round. */}
          <h2 className="text-[17px] font-extrabold tracking-tight">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls={BODY_ID}
              className="-my-1 -ml-1 flex items-center gap-1.5 rounded px-1 py-1 text-left hover:text-[var(--color-meadow)]"
            >
              Goal &amp; projection
              <ChevronDown
                size={16}
                className={`shrink-0 text-[var(--color-muted-2)] transition-transform ${open ? "" : "-rotate-90"}`}
              />
            </button>
          </h2>
          <p className="mt-0.5 text-[12.5px] text-[var(--color-muted-2)]">
            {open ? (
              "Where your portfolio is heading, and what it takes to hit your goal."
            ) : goal ? (
              // Collapsed still says where you stand, so hiding the block
              // doesn't mean losing the one number you check most.
              <>
                {goal.name} —{" "}
                <span className="font-mono font-semibold text-[var(--color-ink)]">
                  {((collapsedProgress ?? 0) * 100).toFixed(1)}%
                </span>{" "}
                of {formatCurrency(goal.targetAmount)}
              </>
            ) : (
              "No goal set yet."
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--color-panel)] px-3.5 py-2 text-[13px] font-semibold text-[var(--color-ink)] transition hover:brightness-95 active:scale-95"
        >
          <Pencil size={13} />
          {goal ? "Edit goal" : "Set a goal"}
        </button>
      </div>

      {/* Collapsing unmounts the body rather than hiding it with CSS: inside a
          display:none parent Recharts' ResponsiveContainer measures 0 and the
          charts come back collapsed. The Edit-goal button and the modal stay
          outside this block so the goal is still editable while collapsed. */}
      {open && (
        <div id={BODY_ID}>
        {/* Real (money-weighted) return — top of the block, per the brief. */}
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[12px] bg-[var(--color-inset)] px-3.5 py-3">
          <TrendingUp size={15} className="shrink-0 text-[var(--color-muted-2)]" />
          {realReturn === null ? (
            <p className="text-[13px] text-[var(--color-muted)]">
              Actual return:{" "}
              <span className="font-semibold text-[var(--color-ink)]">not enough data yet</span>
            </p>
          ) : (
            <>
              <p className="text-[13.5px] text-[var(--color-ink)]">
                Actual return:{" "}
                <span className="font-mono font-bold">
                  {(realReturn * 100).toFixed(2)}% p.a.
                </span>
              </p>
              <button
                type="button"
                onClick={() => setRateOverride(realReturn)}
                className="rounded-full bg-white/70 px-2.5 py-1 text-[11.5px] font-semibold text-[var(--color-ink)] transition hover:brightness-95"
              >
                Use as the projection rate
              </button>
            </>
          )}
          <p className="w-full text-[11.5px] text-[var(--color-muted-2)]">
            Money-weighted, from your contributions and today&apos;s value — each purchase counts
            from its holding&apos;s start date, so a top-up on an existing holding is attributed to
            that original date.
          </p>
        </div>

        {rateOverride !== null && (
          <p className="mb-4 rounded-[10px] bg-[var(--color-meadow)]/10 px-3 py-2 text-[12px] text-[var(--color-ink)]">
            Previewing at {(rateOverride * 100).toFixed(2)}% p.a. —{" "}
            <button
              type="button"
              onClick={() => setRateOverride(null)}
              className="font-semibold underline underline-offset-2"
            >
              reset
            </button>{" "}
            or save it via Edit goal to keep it.
          </p>
        )}

        {!goal ? (
          <div className="flex flex-col items-start gap-3 rounded-[12px] bg-[var(--color-inset)] px-4 py-6">
            <p className="text-[13.5px] text-[var(--color-muted)]">
              No goal set yet. Add one to see how far along you are and what monthly contribution
              gets you there.
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(12,158,87,0.28)] transition hover:brightness-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #0c9e57, #0a7a43)" }}
            >
              <Target size={14} /> Set a goal
            </button>
          </div>
        ) : (
          <GoalBody
            goal={goal}
            currentValue={currentValue}
            expectedAnnualRate={expectedAnnualRate}
            monthlyContribution={monthlyContribution}
            projection={projection}
          />
        )}
        </div>
      )}

      {editing && (
        <Modal title={goal ? "Edit goal" : "Set a goal"} onClose={() => setEditing(false)}>
          <GoalForm
            goal={
              goal
                ? { ...goal, expectedAnnualRate: rateOverride ?? goal.expectedAnnualRate }
                : null
            }
            averageContribution={averageContribution}
            emergencyReserveTarget={emergencyReserveTarget}
            onDone={() => {
              setEditing(false);
              setRateOverride(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function GoalBody({
  goal,
  currentValue,
  expectedAnnualRate,
  monthlyContribution,
  projection,
}: {
  goal: GoalLike;
  currentValue: number;
  expectedAnnualRate: number;
  monthlyContribution: number;
  projection: ReturnType<typeof goalProjection> | null;
}) {
  const today = new Date();
  const i = annualToMonthly(expectedAnnualRate);
  const n = monthsBetween(today, goal.targetDate);
  const progress = goal.targetAmount > 0 ? currentValue / goal.targetAmount : 0;
  const reached = currentValue >= goal.targetAmount;

  const needed = requiredPMT(goal.targetAmount, currentValue, i, n);
  const monthsNeeded = monthsToGoal(goal.targetAmount, currentValue, monthlyContribution, i);
  const arrival = Number.isFinite(monthsNeeded) ? addMonths(today, monthsNeeded) : null;

  return (
    <>
      <div className="mb-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="flex items-center gap-2">
            <Target size={15} className="shrink-0 text-[var(--color-meadow)]" />
            <span className="text-[14.5px] font-bold text-[var(--color-ink)]">{goal.name}</span>
          </div>
          <span className="font-mono text-[12px] text-[var(--color-muted-2)]">
            by {monthYear(goal.targetDate)}
          </span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-track)]">
          <div
            className="h-full rounded-full transition-[width]"
            style={{
              width: `${Math.min(100, Math.max(0, progress * 100))}%`,
              background: reached
                ? "linear-gradient(90deg, #0c9e57, #10b96a)"
                : "linear-gradient(90deg, #3d6b9e, #5a8bc4)",
            }}
          />
        </div>
        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="font-mono text-[12.5px] font-semibold text-[var(--color-ink)]">
            {(progress * 100).toFixed(1)}%
          </span>
          <span className="font-mono text-[12px] text-[var(--color-muted-2)]">
            {formatCurrency(currentValue)} / {formatCurrency(goal.targetAmount)}
          </span>
        </div>
      </div>

      {/* The two solvers. */}
      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row">
        <Stat icon={<Wallet size={15} />} label="To hit the goal">
          {n <= 0 ? (
            <span className="text-[var(--color-muted)]">
              The target date has already passed — adjust it to see the contribution needed.
            </span>
          ) : needed <= 0 ? (
            <span>At this pace you pass the goal before the target date 🎯</span>
          ) : (
            <span>
              contribute <span className="font-mono font-bold">{formatCurrency(needed)}</span>
              /month to get there by {monthYear(goal.targetDate)}
            </span>
          )}
        </Stat>

        <Stat icon={<CalendarClock size={15} />} label="At your current contribution">
          {reached ? (
            <span>Goal already reached 🎉</span>
          ) : arrival === null ? (
            <span className="text-[var(--color-muted)]">
              the goal isn&apos;t reached at this contribution — raise it or move the date
            </span>
          ) : (
            <span>
              <span className="font-mono font-bold">{formatCurrency(monthlyContribution)}</span>
              /month → arrives {monthYear(arrival)}
            </span>
          )}
        </Stat>
      </div>

      {projection && (
        <GoalProjectionChart
          data={projection.points}
          targetAmount={goal.targetAmount}
          crossingIndex={projection.crossingIndex}
        />
      )}

      <p className="mt-2.5 text-[11.5px] leading-relaxed text-[var(--color-muted-2)]">
        Projected from the assumptions above ({(expectedAnnualRate * 100).toFixed(2)}% p.a., with a
        ±{(SPREAD * 100).toFixed(0)} p.p. band). Past performance doesn&apos;t guarantee future
        results.
      </p>
    </>
  );
}
