/**
 * Sorting the entries table by any of its columns (V1.37).
 *
 * Pure and dependency-free, asserted standalone. The sort lives in the query
 * string like the filters do (V1.27): the server does the ordering, so it has
 * to survive the round trip, and a sorted view stays shareable and
 * back-buttonable.
 */

export const SORT_COLUMNS = ["date", "name", "category", "method", "amount"] as const;
export type SortColumn = (typeof SORT_COLUMNS)[number];
export type SortDir = "asc" | "desc";
export type Sort = { column: SortColumn; dir: SortDir };

/** Newest first — what the table has always shown. */
export const DEFAULT_SORT: Sort = { column: "date", dir: "desc" };

function isColumn(value: unknown): value is SortColumn {
  return typeof value === "string" && (SORT_COLUMNS as readonly string[]).includes(value);
}

/**
 * Read a sort out of the query string, falling back rather than throwing:
 * a hand-edited or stale URL should show the default table, not an error.
 */
export function parseSort(column: unknown, dir: unknown): Sort {
  if (!isColumn(column)) return DEFAULT_SORT;
  return { column, dir: dir === "asc" ? "asc" : dir === "desc" ? "desc" : defaultDirFor(column) };
}

/**
 * Which direction a column starts in when you first click it.
 *
 * Dates and amounts open at their biggest — newest first, largest first, which
 * is what "sort by amount" is nearly always asked for. Text opens A→Z.
 */
export function defaultDirFor(column: SortColumn): SortDir {
  return column === "date" || column === "amount" ? "desc" : "asc";
}

/** Clicking the active column flips it; clicking a new one starts fresh. */
export function nextSort(current: Sort, column: SortColumn): Sort {
  if (current.column !== column) return { column, dir: defaultDirFor(column) };
  return { column, dir: current.dir === "asc" ? "desc" : "asc" };
}

/** True when this sort is the default, so the URL can leave it out entirely. */
export function isDefaultSort(sort: Sort): boolean {
  return sort.column === DEFAULT_SORT.column && sort.dir === DEFAULT_SORT.dir;
}

type OrderBy = Record<string, "asc" | "desc">;

/**
 * Prisma `orderBy`, always ending in a **unique** tiebreaker.
 *
 * With server-side paging this is not cosmetic: rows that compare equal have
 * no defined order, so without a stable last key the same entry can appear on
 * two pages or on neither as the database re-plans the query. Date gets a
 * secondary key too, so entries sharing a day keep a steady order.
 */
export function toOrderBy(sort: Sort): OrderBy[] {
  const primary: OrderBy = { [sort.column]: sort.dir };
  if (sort.column === "date") return [primary, { id: "asc" }];
  // Within the same name/category/method/amount, show newest first.
  return [primary, { date: "desc" }, { id: "asc" }];
}

// ─── Text columns need a real collation ─────────────────────────────────────

/**
 * SQLite compares text byte by byte, so ordering by name in the database puts
 * "aluguel" *after* "Zebra" (lowercase letters sit above uppercase in ASCII)
 * and "Água" after both. Prisma can't express COLLATE NOCASE in `orderBy`, and
 * changing the column's collation would quietly change every `=` comparison in
 * the app too.
 *
 * So text columns are ordered in JS with `Intl.Collator`, which is
 * case-insensitive *and* accent-aware in the owner's own language — "Água"
 * lands with the A's, where she'd look for it. Dates and amounts keep sorting
 * in SQL, where byte order and numeric order already agree.
 */
export const TEXT_COLUMNS = ["name", "category", "method"] as const;

export function isTextColumn(column: SortColumn): boolean {
  return (TEXT_COLUMNS as readonly string[]).includes(column);
}

export type TextSortRow = {
  id: string;
  date: Date;
  name?: string | null;
  category?: string | null;
  method?: string | null;
};

/**
 * Order rows by a text column, with the same tiebreakers toOrderBy() uses so
 * both paths agree: newest first within equal values, then id.
 *
 * Blanks (an entry with no payment method) always sort **last**, in either
 * direction — an absent value isn't "smallest", and burying the filled-in rows
 * under a block of empties is never what sorting was for.
 */
export function sortRowsByText<T extends TextSortRow>(rows: T[], sort: Sort, locale: string): T[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const key = (row: T) => {
    const value = row[sort.column as "name" | "category" | "method"];
    return typeof value === "string" ? value.trim() : "";
  };
  return [...rows].sort((a, b) => {
    const left = key(a);
    const right = key(b);
    if (left === "" || right === "") {
      if (left !== right) return left === "" ? 1 : -1;
    } else {
      const byText = collator.compare(left, right);
      if (byText !== 0) return sort.dir === "asc" ? byText : -byText;
    }
    const byDate = b.date.getTime() - a.date.getTime();
    if (byDate !== 0) return byDate;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
