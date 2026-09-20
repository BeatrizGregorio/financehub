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
