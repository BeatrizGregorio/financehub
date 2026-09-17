/**
 * Category suggestions and duplicate detection for CSV imports (V1.28).
 *
 * Pure and dependency-free so it can be asserted standalone, like csv.ts.
 *
 * Suggestions come from three sources, strongest first:
 *   1. rule     — an explicit "name contains X → category" the owner set.
 *   2. history  — this exact merchant was categorized before.
 *   3. similar  — a merchant starting with the same word was categorized
 *                 before ("UBER *TRIP 8812" learns from "Uber Eats").
 * Nothing is ever applied silently: suggestions pre-fill a dropdown the owner
 * can change per row before importing.
 */

export type RuleLike = { pattern: string; category: string; type: string };
export type HistoryEntryLike = { name: string; category: string; type: string; date: Date };
export type ExistingEntryLike = { name: string; amount: number; type: string; date: Date };
export type ImportRowLike = { name: string; amount: number; type: string; date: Date };

export type SuggestionSource = "rule" | "history" | "similar";
export type Suggestion = { category: string; source: SuggestionSource } | null;

/**
 * Collapse a statement description into a stable merchant key: lowercase, no
 * accents, no digits or punctuation. Card statements append ids and dates
 * ("UBER *TRIP 8812", "PADARIA-CENTRO 03/09"), and the key has to survive that.
 */
export function normalizeMerchant(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[0-9]/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstWord(key: string): string {
  return key.split(" ")[0] ?? "";
}

/**
 * Build the lookup tables once per import. Where a merchant was filed under
 * different categories over time, the most recent choice wins — the owner's
 * latest decision is the best guess at their current intent.
 */
export function buildMatcher(rules: RuleLike[], history: HistoryEntryLike[], validCategories: Record<string, Set<string>>) {
  const isValid = (type: string, category: string) => validCategories[type]?.has(category) ?? false;

  const sortedRules = rules
    .map((r) => ({ ...r, key: normalizeMerchant(r.pattern) }))
    .filter((r) => r.key && isValid(r.type, r.category))
    // Longest pattern first, so "uber eats" beats "uber".
    .sort((a, b) => b.key.length - a.key.length);

  const exact = new Map<string, { category: string; date: number }>();
  const byFirstWord = new Map<string, { category: string; date: number }>();
  for (const h of history) {
    if (!isValid(h.type, h.category)) continue;
    const key = normalizeMerchant(h.name);
    if (!key) continue;
    const t = h.date.getTime();
    const exactKey = `${h.type}|${key}`;
    if ((exact.get(exactKey)?.date ?? -Infinity) < t) exact.set(exactKey, { category: h.category, date: t });
    const word = firstWord(key);
    // Short first words ("de", "pg", "ted") say nothing about the merchant.
    if (word.length >= 4) {
      const wordKey = `${h.type}|${word}`;
      if ((byFirstWord.get(wordKey)?.date ?? -Infinity) < t) byFirstWord.set(wordKey, { category: h.category, date: t });
    }
  }

  return function suggest(row: { name: string; type: string }): Suggestion {
    const key = normalizeMerchant(row.name);
    if (!key) return null;
    for (const r of sortedRules) {
      if (r.type === row.type && key.includes(r.key)) return { category: r.category, source: "rule" };
    }
    const hit = exact.get(`${row.type}|${key}`);
    if (hit) return { category: hit.category, source: "history" };
    const word = firstWord(key);
    if (word.length >= 4) {
      const near = byFirstWord.get(`${row.type}|${word}`);
      if (near) return { category: near.category, source: "similar" };
    }
    return null;
  };
}

function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * For each import row, the existing entry it most likely duplicates, or null.
 *
 * A match needs the same calendar day, the same amount to the cent, the same
 * direction, and merchant names that agree (equal, or one containing the other
 * — an entry typed by hand as "Uber" should still catch "UBER TRIP"). Amount +
 * day alone would flag two different R$ 10 coffees on the same day.
 *
 * Each existing entry can only be claimed once, so a statement legitimately
 * containing two identical charges doesn't hide the second one.
 */
export function findDuplicates(rows: ImportRowLike[], existing: ExistingEntryLike[]): (string | null)[] {
  const pool = new Map<string, { name: string; key: string; used: boolean }[]>();
  for (const e of existing) {
    const k = `${e.type}|${dayKey(e.date)}|${Math.round(e.amount * 100)}`;
    const list = pool.get(k) ?? [];
    list.push({ name: e.name, key: normalizeMerchant(e.name), used: false });
    pool.set(k, list);
  }

  return rows.map((r) => {
    const k = `${r.type}|${dayKey(r.date)}|${Math.round(r.amount * 100)}`;
    const candidates = pool.get(k);
    if (!candidates) return null;
    const key = normalizeMerchant(r.name);
    const match = candidates.find(
      (c) => !c.used && c.key && key && (c.key === key || c.key.includes(key) || key.includes(c.key)),
    );
    if (!match) return null;
    match.used = true;
    return match.name;
  });
}
