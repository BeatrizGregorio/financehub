/**
 * Editing a whole series, and putting back a delete (V1.36).
 *
 * Pure and dependency-free, asserted standalone — both of these touch several
 * rows at once, which is exactly where a quiet mistake is expensive.
 */

/** The fields an entry form produces. `date` is called out on purpose below. */
export type EntryFields = {
  name: string;
  amount: number;
  date: Date;
  type: string;
  category: string;
  note: string | null;
  method: string | null;
  accountId: string | null;
  tags: string;
};

/**
 * What the *other* entries in a series receive when an edit is applied to all
 * of them: everything except the date.
 *
 * The date is what makes each row its own month — copying it would collapse a
 * twelve-month series onto one day, which is never what "apply to all" means.
 * The edited row keeps its own new date; the rest keep theirs.
 *
 * Note for installments: `amount` is per entry, so applying it to the series
 * sets *each* instalment to that amount rather than re-splitting a total. The
 * form says so next to the choice.
 */
export function sharedSeriesFields(fields: EntryFields): Omit<EntryFields, "date"> {
  // Listed one by one rather than spread-minus-date: the Omit<> return type
  // then makes a new field on EntryFields a compile error here, instead of a
  // field that silently stops propagating to the rest of the series.
  return {
    name: fields.name,
    amount: fields.amount,
    type: fields.type,
    category: fields.category,
    note: fields.note,
    method: fields.method,
    accountId: fields.accountId,
    tags: fields.tags,
  };
}

/** A deleted row as stored in the batch payload — dates are JSON strings. */
export type DeletedRow = {
  id: string;
  name: string;
  amount: number;
  date: string;
  type: string;
  category: string;
  note: string | null;
  method: string | null;
  accountId: string | null;
  groupId: string | null;
  seriesType: string | null;
  installmentNum: number | null;
  installmentTotal: number | null;
  splitId: string | null;
  tags: string;
};

export type RestorableRow = Omit<DeletedRow, "date"> & { date: Date };

/**
 * Turn a stored payload back into rows ready to re-create.
 *
 * Ids are kept so a restored split or series is the same group it was, and so
 * restoring twice can't duplicate anything — the caller drops ids that exist
 * again. Rows with an unparseable date are skipped rather than restored to the
 * epoch: a silently wrong date in a finance app is worse than a missing row,
 * and the caller reports the count it actually put back.
 */
export function restorableRows(payload: string): RestorableRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const rows: RestorableRow[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Partial<DeletedRow>;
    if (typeof row.id !== "string" || typeof row.date !== "string") continue;
    const date = new Date(row.date);
    if (Number.isNaN(date.getTime())) continue;
    rows.push({
      id: row.id,
      name: typeof row.name === "string" ? row.name : "",
      amount: typeof row.amount === "number" ? row.amount : 0,
      date,
      type: row.type === "income" ? "income" : "expense",
      category: typeof row.category === "string" ? row.category : "",
      note: row.note ?? null,
      method: row.method ?? null,
      accountId: row.accountId ?? null,
      groupId: row.groupId ?? null,
      seriesType: row.seriesType ?? null,
      installmentNum: row.installmentNum ?? null,
      installmentTotal: row.installmentTotal ?? null,
      splitId: row.splitId ?? null,
      tags: typeof row.tags === "string" ? row.tags : "",
    });
  }
  return rows;
}

/** How long a delete stays undoable. */
export const UNDO_WINDOW_MINUTES = 30;

export function withinUndoWindow(createdAt: Date, now: Date = new Date()): boolean {
  const age = now.getTime() - createdAt.getTime();
  return age >= 0 && age <= UNDO_WINDOW_MINUTES * 60_000;
}
