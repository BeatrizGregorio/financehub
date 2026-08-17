"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { ShieldCheck } from "lucide-react";
import { saveInvestmentGoal } from "./actions";
import { formatCurrency, toDateInputValue } from "@/lib/format";
import { useT } from "@/components/LanguageProvider";

export type GoalLike = {
  name: string;
  targetAmount: number;
  targetDate: Date;
  expectedAnnualRate: number;
  monthlyContribution: number | null;
};

const FIELD =
  "w-full rounded-[10px] bg-[var(--color-inset)] px-[13px] py-2.5 text-[13.5px] outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30";
const LABEL = "mb-1.5 block text-[12.5px] font-semibold text-[var(--color-ink)]";

function SaveButton({ onSubmit }: { onSubmit: () => void }) {
  const { t } = useT();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={onSubmit}
      className="rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95 disabled:opacity-50"
      style={{ background: "var(--gradient-brand)" }}
    >
      {pending ? t.common.saving : t.goal.saveGoal}
    </button>
  );
}

export function GoalForm({
  goal,
  averageContribution,
  emergencyReserveTarget,
  onDone,
}: {
  goal: GoalLike | null;
  averageContribution: number;
  /** 6× average monthly expenses, or null when there aren't enough expenses yet. */
  emergencyReserveTarget: number | null;
  onDone: () => void;
}) {
  const { t } = useT();
  const [state, formAction] = useActionState(saveInvestmentGoal, {});
  const [submitCount, setSubmitCount] = useState(0);
  // Controlled so the "Emergency fund" preset can fill them in.
  const [name, setName] = useState(goal?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(goal ? String(goal.targetAmount) : "");

  // Same close-on-success pattern as EntryForm: only act on a submit that
  // actually happened and came back without an error.
  useEffect(() => {
    if (submitCount === 0 || state.error) return;
    onDone();
  }, [state, submitCount, onDone]);

  function applyEmergencyReserve() {
    if (emergencyReserveTarget === null) return;
    setTargetAmount(String(Math.round(emergencyReserveTarget)));
    if (!name.trim()) setName(t.goal.emergencyFund);
  }

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <div>
        <label className={LABEL} htmlFor="goal-name">
          {t.goal.goalName}
        </label>
        <input
          id="goal-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.goal.goalNamePlaceholder}
          className={FIELD}
        />
      </div>

      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <label className={`${LABEL} mb-0`} htmlFor="goal-target">
            {t.goal.targetAmount}
          </label>
          {emergencyReserveTarget !== null && (
            <button
              type="button"
              onClick={applyEmergencyReserve}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--color-panel)] px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap text-[var(--color-ink)] transition hover:brightness-95"
            >
              <ShieldCheck size={12} />
              {t.goal.emergencyFund}
            </button>
          )}
        </div>
        <input
          id="goal-target"
          name="targetAmount"
          type="number"
          min="0"
          step="100"
          required
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          placeholder="30000"
          className={FIELD}
        />
        {emergencyReserveTarget !== null && (
          <p className="mt-1 text-[11.5px] text-[var(--color-muted-2)]">
            {t.goal.emergencyFundHint(formatCurrency(emergencyReserveTarget / 6))}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3.5 sm:flex-row">
        <div className="flex-1">
          <label className={LABEL} htmlFor="goal-date">
            {t.goal.targetDate}
          </label>
          <input
            id="goal-date"
            name="targetDate"
            type="date"
            required
            defaultValue={goal ? toDateInputValue(goal.targetDate) : ""}
            className={FIELD}
          />
        </div>
        <div className="flex-1">
          <label className={LABEL} htmlFor="goal-rate">
            {t.goal.expectedReturn}
          </label>
          <input
            id="goal-rate"
            name="expectedAnnualRate"
            type="number"
            step="0.1"
            required
            defaultValue={goal ? (goal.expectedAnnualRate * 100).toFixed(2) : "10"}
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor="goal-pmt">
          {t.goal.monthlyContribution}
        </label>
        <input
          id="goal-pmt"
          name="monthlyContribution"
          type="number"
          min="0"
          step="50"
          defaultValue={goal?.monthlyContribution ?? ""}
          placeholder={String(Math.round(averageContribution))}
          className={FIELD}
        />
        <p className="mt-1 text-[11.5px] text-[var(--color-muted-2)]">
          {t.goal.contributionHint(formatCurrency(averageContribution))}
        </p>
      </div>

      {state.error && <p className="text-[12.5px] text-[var(--color-rust)]">{state.error}</p>}

      <div className="mt-1 flex justify-end">
        <SaveButton onSubmit={() => setSubmitCount((c) => c + 1)} />
      </div>
    </form>
  );
}
