/**
 * Day grouping for the entries register.
 *
 * A flat list of fifty rows is hard to scan. Breaking it into days, each with
 * its own subtotal, is how a bank statement or a paper ledger reads — and the
 * subtotal answers "what did I spend on Tuesday" without any arithmetic.
 *
 * Pure and dependency-free, so it can be compiled and asserted standalone like
 * the rest of lib/.
 */

export type DayGroupable = { date: Date; amount: number; type: string };

export type DayGroup<T> = {
  /** Local calendar day, YYYY-MM-DD — stable to sort and to use as a key. */
  key: string;
  /** The first row's own date, for formatting the heading in the UI's locale. */
  date: Date;
  /** Income minus expenses for this day only. */
  net: number;
  rows: T[];
};

/** Local calendar day, never UTC — the same rule every date in this app follows. */
function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Split rows into consecutive runs of the same day.
 *
 * **It starts a new group when the day changes rather than bucketing into a
 * map, so it can never reorder anything.** The rows arrive already sorted by
 * the server — ascending or descending — and this has to preserve that exactly;
 * a map-and-sort would impose its own order and could silently disagree with
 * the sort the owner picked.
 *
 * The consequence is that it is only meaningful for a date-sorted list. Sorted
 * by name, the same day appears in several places and you get one group per
 * row, which is why the caller only groups when the sort column is the date.
 */
export function groupByDay<T extends DayGroupable>(rows: T[]): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const row of rows) {
    const key = dayKey(row.date);
    const current = groups[groups.length - 1];
    if (current && current.key === key) {
      current.rows.push(row);
      current.net += signed(row);
    } else {
      groups.push({ key, date: row.date, net: signed(row), rows: [row] });
    }
  }
  return groups;
}

function signed(row: DayGroupable): number {
  return row.type === "income" ? row.amount : -row.amount;
}
