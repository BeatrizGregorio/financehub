"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertTriangle, Gift, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { RowAction } from "@/components/RowAction";
import { useKeepTypedValues } from "@/components/useKeepTypedValues";
import { useT } from "@/components/LanguageProvider";
import { CARD } from "@/lib/ui";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import {
  EXPIRING_SOON_DAYS,
  daysUntil,
  expiryStatus,
  hasAnyValue,
  pointsValue,
  sortPrograms,
  totalPoints,
  totalValue,
} from "@/lib/points";
import type { Language } from "@/lib/i18n";
import { createProgram, deleteProgram, setBalance, updateProgram, type ActionState } from "./actions";

export type Program = {
  id: string;
  name: string;
  balance: number;
  valuePer1000: number | null;
  expiresOn: Date | null;
  notes: string | null;
};

const INPUT =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-ink)] focus:bg-[var(--color-surface-raised)]";
const LABEL = "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)]";

const formatPoints = (n: number, lang: Language) =>
  new Intl.NumberFormat(lang === "pt" ? "pt-BR" : "en-US", { maximumFractionDigits: 0 }).format(n);

function ProgramForm({ program, onDone }: { program?: Program; onDone: () => void }) {
  const { t } = useT();
  const action = program ? updateProgram.bind(null, program.id) : createProgram;
  const [state, formAction] = useActionState(action, {} as ActionState);
  // Success closes the modal; this keeps the fields filled if the save is
  // rejected, instead of React 19 emptying them.
  const keep = useKeepTypedValues(state, { resetOnSuccess: false });
  const [submitted, setSubmitted] = useState(0);

  // Close once a submit comes back without an error. Same pattern as the
  // account and holding modals: the effect only calls the parent's callback,
  // never a local setState.
  useEffect(() => {
    if (submitted === 0 || state.error) return;
    onDone();
  }, [state, submitted, onDone]);

  return (
    <form
      action={formAction}
      {...keep.formProps}
      onSubmit={() => {
        keep.formProps.onSubmit();
        setSubmitted((n) => n + 1);
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label htmlFor="pp-name" className={LABEL}>
          {t.points.programName}
        </label>
        <input
          id="pp-name"
          name="name"
          required
          maxLength={60}
          defaultValue={program?.name ?? ""}
          placeholder={t.points.programNamePlaceholder}
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor="pp-balance" className={LABEL}>
          {t.points.balance}
        </label>
        <input
          id="pp-balance"
          name="balance"
          inputMode="numeric"
          required
          defaultValue={program ? String(program.balance) : ""}
          placeholder="50000"
          className={`${INPUT} font-mono`}
        />
      </div>

      <div>
        <label htmlFor="pp-value" className={LABEL}>
          {t.points.valuePer1000}
        </label>
        <input
          id="pp-value"
          name="valuePer1000"
          inputMode="decimal"
          defaultValue={program?.valuePer1000 != null ? String(program.valuePer1000) : ""}
          placeholder={t.points.optional}
          className={`${INPUT} font-mono`}
        />
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--color-muted-2)]">{t.points.valueHint}</p>
      </div>

      <div>
        <label htmlFor="pp-expires" className={LABEL}>
          {t.points.expiresOn}
        </label>
        <input
          id="pp-expires"
          name="expiresOn"
          type="date"
          defaultValue={program?.expiresOn ? toDateInputValue(program.expiresOn) : ""}
          className={INPUT}
        />
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--color-muted-2)]">{t.points.expiryHint}</p>
      </div>

      <div>
        <label htmlFor="pp-notes" className={LABEL}>
          {t.points.notes}
        </label>
        <input
          id="pp-notes"
          name="notes"
          maxLength={120}
          defaultValue={program?.notes ?? ""}
          placeholder={t.points.notesPlaceholder}
          className={INPUT}
        />
      </div>

      {state.error && (
        <p className="text-[13px] text-[var(--color-rust-text)] sm:col-span-2">{state.error}</p>
      )}

      <div className="flex justify-end gap-2 sm:col-span-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl bg-[var(--color-panel)] px-4 py-2.5 text-[13.5px] font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-track)]"
        >
          {t.common.cancel}
        </button>
        <button
          type="submit"
          className="rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95"
          style={{ background: "var(--gradient-brand)" }}
        >
          {program ? t.common.saveChanges : t.common.add}
        </button>
      </div>
    </form>
  );
}

/** The quick balance update that lives on each row. */
function BalanceForm({ program, lang }: { program: Program; lang: Language }) {
  const { t } = useT();
  const [state, action] = useActionState(setBalance.bind(null, program.id), {} as ActionState);
  const keep = useKeepTypedValues(state, { resetOnSuccess: false });

  return (
    <form action={action} {...keep.formProps} className="flex items-center gap-1.5">
      <input
        name="balance"
        inputMode="numeric"
        defaultValue={String(program.balance)}
        aria-label={t.points.balanceFor(program.name)}
        className="w-[116px] rounded-[10px] bg-[var(--color-inset)] px-3 py-1.5 text-right font-mono text-[13px] tabular-nums outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
      />
      <span className="font-mono text-[11px] text-[var(--color-muted-2)]">{t.points.pts}</span>
      <button
        type="submit"
        className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-[var(--color-brand-text)] transition hover:bg-[var(--color-panel)]"
      >
        {t.common.save}
      </button>
      {state.error && <span className="text-[11.5px] text-[var(--color-rust-text)]">{state.error}</span>}
      <span className="sr-only">{formatPoints(program.balance, lang)}</span>
    </form>
  );
}

export function PointsClient({ programs, lang }: { programs: Program[]; lang: Language }) {
  const { t } = useT();
  const [editing, setEditing] = useState<Program | null>(null);
  const [adding, setAdding] = useState(false);

  const today = new Date();
  const sorted = sortPrograms(programs, today);
  const points = totalPoints(programs);
  const value = totalValue(programs);
  const showValue = hasAnyValue(programs);
  const attention = sorted.filter((p) => ["expired", "soon"].includes(expiryStatus(p, today)));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[34px]">{t.points.title}</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{t.points.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-[13.5px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Plus size={16} /> {t.points.addProgram}
        </button>
      </div>

      {(adding || editing) && (
        <Modal
          title={editing ? t.points.editProgram : t.points.addProgram}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
        >
          <ProgramForm
            key={editing?.id ?? "new"}
            program={editing ?? undefined}
            onDone={() => {
              setAdding(false);
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {programs.length === 0 ? (
        <div className={`${CARD} flex flex-col items-start gap-3 p-8`}>
          <Gift size={22} className="text-[var(--color-brand-text)]" />
          <h2 className="text-[17px] font-extrabold tracking-tight">{t.points.emptyTitle}</h2>
          <p className="max-w-[46ch] text-[13px] leading-relaxed text-[var(--color-muted)]">{t.points.emptyBlurb}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className={`${CARD} min-w-[170px] flex-1 px-5 py-4`}>
              <p className="mb-1 font-mono text-[10.5px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase">
                {t.points.totalPoints}
              </p>
              <p className="text-2xl leading-none font-extrabold tabular-nums">{formatPoints(points, lang)}</p>
            </div>
            {showValue && (
              <div className={`${CARD} min-w-[170px] flex-1 px-5 py-4`}>
                <p className="mb-1 font-mono text-[10.5px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase">
                  {t.points.estimatedValue}
                </p>
                <p className="text-2xl leading-none font-extrabold text-[var(--color-positive-text)] tabular-nums">
                  {formatCurrency(value)}
                </p>
                <p className="mt-1 text-[11.5px] text-[var(--color-muted-2)]">{t.points.estimateNote}</p>
              </div>
            )}
            <div className={`${CARD} min-w-[170px] flex-1 px-5 py-4`}>
              <p className="mb-1 font-mono text-[10.5px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase">
                {t.points.programmes}
              </p>
              <p className="text-2xl leading-none font-extrabold tabular-nums">{programs.length}</p>
            </div>
          </div>

          {attention.length > 0 && (
            <div className="flex items-start gap-3 rounded-[14px] border border-[var(--color-rust)]/30 bg-[var(--color-rust-tint)] px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--color-rust-text)]" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--color-rust-text)]">
                  {t.points.attentionTitle(attention.length)}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
                  {attention
                    .map((p) =>
                      expiryStatus(p, today) === "expired"
                        ? t.points.expiredOn(p.name, formatDate(p.expiresOn!, lang))
                        : t.points.expiresIn(p.name, daysUntil(today, p.expiresOn!)),
                    )
                    .join(" · ")}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {sorted.map((p) => {
              const status = expiryStatus(p, today);
              const worth = pointsValue(p);
              const tone =
                status === "expired" || status === "soon" ? "var(--color-rust-text)" : "var(--color-muted-2)";
              return (
                <div key={p.id} className={`${CARD} flex flex-col gap-3 p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-[17px] font-extrabold tracking-tight">{p.name}</h2>
                      {p.notes && (
                        <p className="mt-0.5 truncate text-[12px] text-[var(--color-muted-2)]">{p.notes}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <RowAction label={t.common.edit} icon={Pencil} onClick={() => setEditing(p)} />
                      <form
                        action={deleteProgram.bind(null, p.id)}
                        onSubmit={(e) => {
                          if (!confirm(t.points.confirmDelete(p.name))) e.preventDefault();
                        }}
                      >
                        <RowAction type="submit" label={t.common.delete} icon={Trash2} tone="danger" />
                      </form>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-[26px] leading-none font-extrabold tabular-nums">
                      {formatPoints(p.balance, lang)}
                    </span>
                    {worth !== null && (
                      <span className="text-[13px] font-semibold text-[var(--color-positive-text)]">
                        ≈ {formatCurrency(worth)}
                      </span>
                    )}
                  </div>

                  <p className="flex items-center gap-1.5 text-[12.5px]" style={{ color: tone }}>
                    <Sparkles size={13} className="shrink-0" />
                    {status === "none"
                      ? t.points.noExpiry
                      : status === "expired"
                        ? t.points.expiredOn(p.name, formatDate(p.expiresOn!, lang))
                        : t.points.expiresOnDate(formatDate(p.expiresOn!, lang), daysUntil(today, p.expiresOn!))}
                  </p>

                  <div className="mt-auto border-t border-[var(--color-border)] pt-3">
                    <p className="mb-1.5 font-mono text-[10px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase">
                      {t.points.updateBalance}
                    </p>
                    <BalanceForm program={p} lang={lang} />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[12px] leading-relaxed text-[var(--color-muted-2)]">
            {t.points.footnote(EXPIRING_SOON_DAYS)}
          </p>
        </>
      )}
    </div>
  );
}
