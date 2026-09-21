"use client";

import { useActionState, useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { AlertTriangle, CreditCard, Gift, Pencil, Plus, Sparkles, Ticket, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { Modal } from "@/components/Modal";
import { RowAction } from "@/components/RowAction";
import { useKeepTypedValues } from "@/components/useKeepTypedValues";
import { useT } from "@/components/LanguageProvider";
import { CARD } from "@/lib/ui";
import { formatCurrency, formatDate, formatShortDate, toDateInputValue } from "@/lib/format";
import {
  EXPIRING_SOON_DAYS,
  STALE_AFTER_DAYS,
  balanceAge,
  balanceTrend,
  daysUntil,
  expiryStatus,
  hasAnyValue,
  impliedValuePer1000,
  pointsValue,
  redemptionSummary,
  sortPrograms,
  totalPoints,
  totalValue,
} from "@/lib/points";
import type { Language } from "@/lib/i18n";
import {
  addRedemption,
  createProgram,
  deleteProgram,
  deleteRedemption,
  setBalance,
  updateProgram,
  type ActionState,
} from "./actions";

export type Snapshot = { id: string; date: Date; balance: number };
export type Redemption = {
  id: string;
  date: Date;
  points: number;
  valueReceived: number | null;
  note: string | null;
};
export type Program = {
  id: string;
  name: string;
  balance: number;
  valuePer1000: number | null;
  expiresOn: Date | null;
  notes: string | null;
  balanceUpdatedAt: Date | null;
  snapshots: Snapshot[];
  redemptions: Redemption[];
};
export type CardOption = { id: string; name: string; pointsProgramId: string | null };

/** The programmes most Brazilian cards feed into — one tap instead of typing. */
const PRESETS = ["Livelo", "Smiles", "LATAM Pass", "Esfera", "TudoAzul"];

const INPUT =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-ink)] focus:bg-[var(--color-surface-raised)]";
const LABEL = "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)]";
const MICRO = "font-mono text-[10px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase";

const formatPoints = (n: number, lang: Language) =>
  new Intl.NumberFormat(lang === "pt" ? "pt-BR" : "en-US", { maximumFractionDigits: 0 }).format(Math.round(n));

function ProgramForm({
  program,
  presetName,
  cards,
  onDone,
}: {
  program?: Program;
  presetName?: string;
  cards: CardOption[];
  onDone: () => void;
}) {
  const { t } = useT();
  const action = program ? updateProgram.bind(null, program.id) : createProgram;
  const [state, formAction] = useActionState(action, {} as ActionState);
  const keep = useKeepTypedValues(state, { resetOnSuccess: false });
  const [submitted, setSubmitted] = useState(0);

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
          defaultValue={program?.name ?? presetName ?? ""}
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

      {/* Which cards earn into this programme. Only credit cards appear. */}
      {cards.length > 0 && (
        <div className="sm:col-span-2">
          <p className={LABEL}>{t.points.earningCards}</p>
          <div className="flex flex-wrap gap-2">
            {cards.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 rounded-full bg-[var(--color-inset)] py-2 pl-3 pr-3.5 text-[13px] font-semibold transition hover:bg-[var(--color-track)]"
              >
                <input
                  type="checkbox"
                  name="cards"
                  value={c.id}
                  defaultChecked={program ? c.pointsProgramId === program.id : false}
                  className="h-3.5 w-3.5 accent-[var(--color-brand)]"
                />
                {c.name}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--color-muted-2)]">{t.points.earningCardsHint}</p>
        </div>
      )}

      {state.error && <p className="text-[13px] text-[var(--color-rust-text)] sm:col-span-2">{state.error}</p>}

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

/** The quick balance update that lives on each card. */
function BalanceForm({ program }: { program: Program }) {
  const { t } = useT();
  const [state, action] = useActionState(setBalance.bind(null, program.id), {} as ActionState);
  const keep = useKeepTypedValues(state, { resetOnSuccess: false });

  return (
    <form action={action} {...keep.formProps} className="flex flex-wrap items-center gap-1.5">
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
    </form>
  );
}

function RedemptionForm({ program, onDone }: { program: Program; onDone: () => void }) {
  const { t } = useT();
  const [state, action] = useActionState(addRedemption.bind(null, program.id), {} as ActionState);
  const keep = useKeepTypedValues(state, { resetOnSuccess: false });
  const [submitted, setSubmitted] = useState(0);

  useEffect(() => {
    if (submitted === 0 || state.error) return;
    onDone();
  }, [state, submitted, onDone]);

  const field =
    "w-full rounded-[10px] bg-[var(--color-inset)] px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-[var(--color-ink)]";

  return (
    <form
      action={action}
      {...keep.formProps}
      onSubmit={() => {
        keep.formProps.onSubmit();
        setSubmitted((n) => n + 1);
      }}
      className="mt-2 flex flex-col gap-2 rounded-[12px] bg-[var(--color-inset-2)] p-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={MICRO}>{t.points.pointsSpent}</span>
          <input name="points" inputMode="numeric" required placeholder="50000" className={`${field} font-mono`} />
        </label>
        <label>
          <span className={MICRO}>{t.points.valueReceived}</span>
          <input name="valueReceived" inputMode="decimal" placeholder={t.points.optional} className={`${field} font-mono`} />
        </label>
        <label>
          <span className={MICRO}>{t.common.date}</span>
          <input name="date" type="date" defaultValue={toDateInputValue(new Date())} className={field} />
        </label>
        <label>
          <span className={MICRO}>{t.points.whatFor}</span>
          <input name="note" maxLength={80} placeholder={t.points.whatForPlaceholder} className={field} />
        </label>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-[var(--color-muted)]">
        <input type="checkbox" name="subtract" defaultChecked className="h-3.5 w-3.5 accent-[var(--color-brand)]" />
        {t.points.subtractFromBalance}
      </label>

      {state.error && <p className="text-[12px] text-[var(--color-rust-text)]">{state.error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-panel)]"
        >
          {t.common.cancel}
        </button>
        <button
          type="submit"
          className="rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:brightness-105 active:scale-95"
          style={{ background: "var(--gradient-brand)" }}
        >
          {t.common.save}
        </button>
      </div>
    </form>
  );
}

function ProgramCard({
  program,
  cards,
  lang,
  today,
  onEdit,
}: {
  program: Program;
  cards: CardOption[];
  lang: Language;
  today: Date;
  onEdit: () => void;
}) {
  const { t } = useT();
  const [redeeming, setRedeeming] = useState(false);

  const status = expiryStatus(program, today);
  const worth = pointsValue(program);
  const age = balanceAge(program.balanceUpdatedAt, today);
  const trend = balanceTrend(program.snapshots);
  const redemptions = redemptionSummary(program.redemptions);
  const linked = cards.filter((c) => c.pointsProgramId === program.id);
  const expiryTone = status === "expired" || status === "soon" ? "var(--color-rust-text)" : "var(--color-muted-2)";

  return (
    <div className={`${CARD} flex flex-col gap-3 p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-extrabold tracking-tight">{program.name}</h2>
          {program.notes && <p className="mt-0.5 truncate text-[12px] text-[var(--color-muted-2)]">{program.notes}</p>}
          {linked.length > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-[var(--color-muted-2)]">
              <CreditCard size={12} className="shrink-0" />
              <span className="truncate">{linked.map((c) => c.name).join(" · ")}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <RowAction label={t.common.edit} icon={Pencil} onClick={onEdit} />
          <form
            action={deleteProgram.bind(null, program.id)}
            onSubmit={(e) => {
              if (!confirm(t.points.confirmDelete(program.name))) e.preventDefault();
            }}
          >
            <RowAction type="submit" label={t.common.delete} icon={Trash2} tone="danger" />
          </form>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className="font-mono text-[26px] leading-none font-extrabold tabular-nums"
          style={{ color: status === "expired" ? "var(--color-muted-2)" : "var(--color-ink)" }}
        >
          {formatPoints(program.balance, lang)}
        </span>
        {worth !== null && status !== "expired" && (
          <span className="text-[13px] font-semibold text-[var(--color-positive-text)]">≈ {formatCurrency(worth)}</span>
        )}
      </div>

      {/* How old the number is. Without this a balance from March reads exactly
          like one typed this morning. */}
      <p className="text-[12px]" style={{ color: age.stale ? "var(--color-rust-text)" : "var(--color-muted-2)" }}>
        {age.days === null
          ? t.points.neverChecked
          : age.days === 0
            ? t.points.checkedToday
            : age.stale
              ? t.points.checkedStale(age.days)
              : t.points.checkedDaysAgo(age.days)}
      </p>

      <p className="flex items-center gap-1.5 text-[12.5px]" style={{ color: expiryTone }}>
        <Sparkles size={13} className="shrink-0" />
        {status === "none"
          ? t.points.noExpiry
          : status === "expired"
            ? t.points.expiredOn(program.name, formatDate(program.expiresOn!, lang))
            : t.points.expiresOnDate(formatDate(program.expiresOn!, lang), daysUntil(today, program.expiresOn!))}
      </p>

      {/* Two snapshots at least a fortnight apart before any trend is claimed. */}
      {trend && (
        <div className="flex items-center gap-3">
          <div className="h-10 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={program.snapshots.map((s) => ({ date: formatShortDate(s.date, lang), balance: s.balance }))}>
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Tooltip
                  formatter={(value) => formatPoints(Number(value), lang)}
                  contentStyle={{
                    borderRadius: 10,
                    fontSize: 12,
                    fontFamily: "var(--font-jakarta)",
                    background: "var(--color-tooltip-bg)",
                    border: "1px solid var(--color-border)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name={t.points.balance}
                  stroke="var(--color-brand)"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "var(--color-brand)" }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <span
            className="flex shrink-0 items-center gap-1 font-mono text-[12px] font-semibold tabular-nums"
            style={{ color: trend.perMonth >= 0 ? "var(--color-positive-text)" : "var(--color-rust-text)" }}
          >
            {trend.perMonth >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {trend.perMonth >= 0 ? "+" : "−"}
            {formatPoints(Math.abs(trend.perMonth), lang)}
            <span className="font-sans font-normal text-[var(--color-muted-2)]">{t.points.perMonth}</span>
          </span>
        </div>
      )}

      {/* What redemptions actually returned — the check on the estimate above. */}
      {redemptions.count > 0 && (
        <div className="rounded-[12px] bg-[var(--color-inset)] px-3 py-2.5">
          <p className="mb-1.5 flex items-center justify-between gap-2">
            <span className={MICRO}>{t.points.redeemed}</span>
            {redemptions.measuredPer1000 !== null && (
              <span className="font-mono text-[11.5px] font-semibold text-[var(--color-brand-text)]">
                {t.points.measuredRate(formatCurrency(redemptions.measuredPer1000))}
              </span>
            )}
          </p>
          <ul className="flex flex-col divide-y divide-[var(--color-border)]">
            {program.redemptions.slice(0, 3).map((r) => {
              const rate = impliedValuePer1000(r);
              return (
                <li key={r.id} className="flex items-baseline justify-between gap-2 py-1.5">
                  <span className="w-[74px] shrink-0 font-mono text-[11.5px] text-[var(--color-muted-2)]">
                    {formatDate(r.date, lang)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px]">{r.note ?? "—"}</span>
                  <span className="shrink-0 font-mono text-[12px] tabular-nums">
                    −{formatPoints(r.points, lang)}
                    {rate !== null && (
                      <span className="ml-1.5 text-[var(--color-positive-text)]">{formatCurrency(rate)}/1k</span>
                    )}
                  </span>
                  <form
                    action={deleteRedemption.bind(null, r.id)}
                    onSubmit={(e) => {
                      if (!confirm(t.points.confirmDeleteRedemption)) e.preventDefault();
                    }}
                    className="shrink-0"
                  >
                    <RowAction type="submit" label={t.common.delete} icon={Trash2} tone="danger" />
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-auto border-t border-[var(--color-border)] pt-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className={MICRO}>{t.points.updateBalance}</p>
          {!redeeming && (
            <button
              type="button"
              onClick={() => setRedeeming(true)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold text-[var(--color-brand-text)] transition hover:bg-[var(--color-panel)]"
            >
              <Ticket size={13} /> {t.points.recordRedemption}
            </button>
          )}
        </div>
        <BalanceForm program={program} />
        {redeeming && <RedemptionForm program={program} onDone={() => setRedeeming(false)} />}
      </div>
    </div>
  );
}

export function PointsClient({
  programs,
  cards,
  lang,
}: {
  programs: Program[];
  cards: CardOption[];
  lang: Language;
}) {
  const { t } = useT();
  const [editing, setEditing] = useState<Program | null>(null);
  // null = closed; a string = open with that name prefilled (blank for a fresh one).
  const [addingName, setAddingName] = useState<string | null>(null);

  const today = new Date();
  const sorted = sortPrograms(programs, today);
  const live = programs.filter((p) => expiryStatus(p, today) !== "expired");
  const expired = programs.filter((p) => expiryStatus(p, today) === "expired");
  const value = totalValue(live);
  const showValue = hasAnyValue(live);
  const attention = sorted.filter((p) => ["expired", "soon"].includes(expiryStatus(p, today)));
  const stale = programs.filter((p) => balanceAge(p.balanceUpdatedAt, today).stale);
  const closeForm = () => {
    setAddingName(null);
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[34px]">{t.points.title}</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{t.points.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setAddingName("")}
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-[13.5px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Plus size={16} /> {t.points.addProgram}
        </button>
      </div>

      {(addingName !== null || editing) && (
        <Modal title={editing ? t.points.editProgram : t.points.addProgram} onClose={closeForm}>
          <ProgramForm
            key={editing?.id ?? `new-${addingName}`}
            program={editing ?? undefined}
            presetName={addingName || undefined}
            cards={cards}
            onDone={closeForm}
          />
        </Modal>
      )}

      {programs.length === 0 ? (
        <div className={`${CARD} flex flex-col items-start gap-3 p-8`}>
          <Gift size={22} className="text-[var(--color-brand-text)]" />
          <h2 className="text-[17px] font-extrabold tracking-tight">{t.points.emptyTitle}</h2>
          <p className="max-w-[46ch] text-[13px] leading-relaxed text-[var(--color-muted)]">{t.points.emptyBlurb}</p>
          {/* One tap to start with the usual suspects, instead of typing. */}
          <div className="mt-1 flex flex-wrap gap-2">
            {PRESETS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setAddingName(name)}
                className="flex items-center gap-1.5 rounded-full bg-[var(--color-inset)] px-3.5 py-2 text-[13px] font-semibold transition hover:bg-[var(--color-track)]"
              >
                <Plus size={13} /> {name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            {showValue && (
              <div className={`${CARD} min-w-[190px] flex-1 px-5 py-4`}>
                <p className={`mb-1 ${MICRO}`}>{t.points.estimatedValue}</p>
                <p className="text-2xl leading-none font-extrabold text-[var(--color-positive-text)] tabular-nums">
                  {formatCurrency(value)}
                </p>
                <p className="mt-1 text-[11.5px] text-[var(--color-muted-2)]">{t.points.estimateNote}</p>
              </div>
            )}
            {/* Points across different programmes aren't interchangeable, so
                this is a raw count and says so — the value above is the figure
                that actually means something. */}
            <div className={`${CARD} min-w-[190px] flex-1 px-5 py-4`}>
              <p className={`mb-1 ${MICRO}`}>{t.points.totalPoints}</p>
              <p className="text-2xl leading-none font-extrabold tabular-nums">{formatPoints(totalPoints(live), lang)}</p>
              <p className="mt-1 text-[11.5px] text-[var(--color-muted-2)]">
                {t.points.acrossProgrammes(live.length)}
                {expired.length > 0 ? ` · ${t.points.expiredExcluded(formatPoints(totalPoints(expired), lang))}` : ""}
              </p>
            </div>
          </div>

          {(attention.length > 0 || stale.length > 0) && (
            <div className="flex items-start gap-3 rounded-[14px] border border-[var(--color-rust)]/30 bg-[var(--color-rust-tint)] px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--color-rust-text)]" />
              <div className="min-w-0 text-[12.5px] leading-relaxed">
                {attention.length > 0 && (
                  <p className="text-[var(--color-muted)]">
                    <span className="font-semibold text-[var(--color-rust-text)]">
                      {t.points.attentionTitle(attention.length)}:
                    </span>{" "}
                    {attention
                      .map((p) =>
                        expiryStatus(p, today) === "expired"
                          ? t.points.expiredOn(p.name, formatDate(p.expiresOn!, lang))
                          : t.points.expiresIn(p.name, daysUntil(today, p.expiresOn!)),
                      )
                      .join(" · ")}
                  </p>
                )}
                {stale.length > 0 && (
                  <p className={attention.length > 0 ? "mt-1 text-[var(--color-muted)]" : "text-[var(--color-muted)]"}>
                    <span className="font-semibold text-[var(--color-rust-text)]">{t.points.staleTitle}:</span>{" "}
                    {t.points.staleBlurb(stale.map((p) => p.name).join(", "), STALE_AFTER_DAYS)}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {sorted.map((p) => (
              <ProgramCard
                key={p.id}
                program={p}
                cards={cards}
                lang={lang}
                today={today}
                onEdit={() => setEditing(p)}
              />
            ))}
          </div>

          <p className="text-[12px] leading-relaxed text-[var(--color-muted-2)]">
            {t.points.footnote(EXPIRING_SOON_DAYS)}
          </p>
        </>
      )}
    </div>
  );
}
