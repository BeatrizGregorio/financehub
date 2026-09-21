/**
 * Credit card points / rewards programmes (V1.31).
 *
 * Pure and dependency-free, asserted standalone like the other lib/ maths.
 *
 * Deliberately simple: a programme holds a balance the owner types in, an
 * optional expiry date, and an optional "what 1000 points are worth to me".
 * Points are tracked per **programme** (Livelo, Smiles, LATAM Pass…), not per
 * card, because several cards can feed one programme and points also arrive
 * from transfers and promos that have nothing to do with a card.
 *
 * What this deliberately does NOT do: estimate points earned from logged card
 * spending. Real programmes exclude whole categories, run multipliers and
 * change rates, so an estimate would quietly disagree with the statement —
 * worse than no number. That's a separate, later decision.
 */

export type PointsProgramLike = {
  balance: number;
  valuePer1000?: number | null;
  expiresOn?: Date | null;
};

/** Points expiring within this many days count as "soon". */
export const EXPIRING_SOON_DAYS = 60;

export type ExpiryStatus = "none" | "expired" | "soon" | "ok";

function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Whole calendar days from `from` to `to`, ignoring time of day and DST. */
export function daysUntil(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

/**
 * A programme with no expiry date is "none", not "ok" — the difference
 * between "these never expire" and "these are fine for now" matters when the
 * page decides what to warn about.
 */
export function expiryStatus(
  program: PointsProgramLike,
  today: Date = new Date(),
  soonDays: number = EXPIRING_SOON_DAYS,
): ExpiryStatus {
  if (!program.expiresOn) return "none";
  const days = daysUntil(today, program.expiresOn);
  if (days < 0) return "expired";
  return days <= soonDays ? "soon" : "ok";
}

/** What a balance is worth in BRL, or null when no value per 1000 is set. */
export function pointsValue(program: PointsProgramLike): number | null {
  if (program.valuePer1000 == null) return null;
  return (program.balance / 1000) * program.valuePer1000;
}

/** Total points across programmes. Expired ones are still counted — the page
 *  flags them instead, because only the owner knows if they really lapsed. */
export function totalPoints(programs: PointsProgramLike[]): number {
  return programs.reduce((sum, p) => sum + p.balance, 0);
}

/** Total estimated value; programmes with no value set contribute nothing. */
export function totalValue(programs: PointsProgramLike[]): number {
  return programs.reduce((sum, p) => sum + (pointsValue(p) ?? 0), 0);
}

/** True when at least one programme has a value per 1000 set. */
export function hasAnyValue(programs: PointsProgramLike[]): boolean {
  return programs.some((p) => p.valuePer1000 != null);
}

const ORDER: Record<ExpiryStatus, number> = { expired: 0, soon: 1, ok: 2, none: 3 };

/**
 * What needs attention first: expired, then expiring soon (earliest first),
 * then dated, then the ones that never expire — biggest balance first within
 * each group.
 */
export function sortPrograms<T extends PointsProgramLike>(programs: T[], today: Date = new Date()): T[] {
  return [...programs].sort((a, b) => {
    const byStatus = ORDER[expiryStatus(a, today)] - ORDER[expiryStatus(b, today)];
    if (byStatus !== 0) return byStatus;
    if (a.expiresOn && b.expiresOn && dayKey(a.expiresOn) !== dayKey(b.expiresOn)) {
      return a.expiresOn.getTime() - b.expiresOn.getTime();
    }
    return b.balance - a.balance;
  });
}

// ─── Second pass (V1.34): staleness, trend, measured value ──────────────────

/** A balance older than this is worth re-checking before trusting it. */
export const STALE_AFTER_DAYS = 45;

/** Needs this much span before a trend means anything. */
const MIN_TREND_DAYS = 14;

export type SnapshotLike = { date: Date; balance: number };
export type RedemptionLike = { points: number; valueReceived?: number | null; date: Date };

/**
 * How old the balance is, and whether that's old enough to say so.
 *
 * A balance typed six months ago looks exactly as authoritative as one typed
 * today — that is the main way this tab can quietly mislead, so the age is
 * surfaced rather than assumed.
 */
export function balanceAge(
  balanceUpdatedAt: Date | null | undefined,
  today: Date = new Date(),
  staleAfter: number = STALE_AFTER_DAYS,
): { days: number | null; stale: boolean } {
  if (!balanceUpdatedAt) return { days: null, stale: false };
  const days = Math.max(0, daysUntil(balanceUpdatedAt, today));
  return { days, stale: days >= staleAfter };
}

/**
 * Points per month, from the oldest to the newest snapshot.
 *
 * Deliberately the endpoints rather than a fitted line: with a handful of
 * hand-typed checkpoints, "where it started, where it is now, over how long"
 * is honest and explainable, and a regression would imply a precision these
 * numbers don't have. Returns null until there are two snapshots at least
 * MIN_TREND_DAYS apart — anything shorter annualises noise.
 */
export function balanceTrend(snapshots: SnapshotLike[]): { perMonth: number; days: number; from: number; to: number } | null {
  if (snapshots.length < 2) return null;
  const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const days = daysUntil(first.date, last.date);
  if (days < MIN_TREND_DAYS) return null;
  return {
    perMonth: ((last.balance - first.balance) / days) * 30,
    days,
    from: first.balance,
    to: last.balance,
  };
}

/** BRL per 1000 points actually obtained, or null when the reward's value wasn't recorded. */
export function impliedValuePer1000(redemption: RedemptionLike): number | null {
  if (redemption.valueReceived == null || redemption.points <= 0) return null;
  return (redemption.valueReceived / redemption.points) * 1000;
}

/**
 * What redemptions actually returned, across however many have a value on
 * them. The measured rate weights by points rather than averaging the rates,
 * so one tiny redemption at a freak rate can't swing it.
 */
export function redemptionSummary(redemptions: RedemptionLike[]): {
  count: number;
  points: number;
  value: number;
  measuredPer1000: number | null;
} {
  let points = 0;
  let value = 0;
  let pricedPoints = 0;
  for (const r of redemptions) {
    points += r.points;
    if (r.valueReceived != null) {
      value += r.valueReceived;
      pricedPoints += r.points;
    }
  }
  return {
    count: redemptions.length,
    points,
    value,
    measuredPer1000: pricedPoints > 0 ? (value / pricedPoints) * 1000 : null,
  };
}

/** Redemptions dated inside a calendar year — what the yearly report shows. */
export function redemptionsInYear<T extends RedemptionLike>(redemptions: T[], year: number): T[] {
  return redemptions.filter((r) => r.date.getFullYear() === year);
}
