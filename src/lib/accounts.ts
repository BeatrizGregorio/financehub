/**
 * Account balances and cash position (V1.28).
 *
 * Pure and dependency-free, like goal.ts and csv.ts, so it runs on the server
 * for the first render and can be compiled and asserted on its own.
 *
 * The model in one paragraph: an account's opening balance is what it held on
 * its opening date. Entries and transfers dated on or after that date move it;
 * anything earlier is already inside the opening figure. That's what lets the
 * owner start using accounts today without re-entering history.
 */

export const ACCOUNT_KINDS = ["checking", "savings", "cash", "other"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export type AccountLike = {
  id: string;
  name: string;
  kind: string;
  openingBalance: number;
  openingDate: Date;
  archived: boolean;
};

export type AccountEntryLike = {
  amount: number;
  date: Date;
  type: string;
  accountId: string | null;
  /** Credit-card purchases don't leave any account until the bill is paid. */
  method?: string | null;
};

export type TransferLike = {
  date: Date;
  amount: number;
  fromAccountId: string;
  toAccountId: string | null;
  toInvestmentId: string | null;
};

/** Local calendar day, so a transfer "today" is compared as a day, not an instant. */
function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function signed(e: { type: string; amount: number }): number {
  return e.type === "income" ? e.amount : -e.amount;
}

/**
 * Balance of one account at the end of `asOf`. Zero before its opening date:
 * the account wasn't being tracked yet, so it contributes nothing to a
 * historical chart rather than appearing to have always held its opening sum.
 */
export function accountBalance(
  account: AccountLike,
  entries: AccountEntryLike[],
  transfers: TransferLike[],
  asOf: Date = new Date(),
): number {
  const open = dayKey(account.openingDate);
  const end = dayKey(asOf);
  if (end < open) return 0;

  let balance = account.openingBalance;
  for (const e of entries) {
    if (e.accountId !== account.id) continue;
    const k = dayKey(e.date);
    if (k >= open && k <= end) balance += signed(e);
  }
  for (const t of transfers) {
    const k = dayKey(t.date);
    if (k < open || k > end) continue;
    if (t.fromAccountId === account.id) balance -= t.amount;
    if (t.toAccountId === account.id) balance += t.amount;
  }
  return balance;
}

export type CashOptions = {
  /** Entries that don't touch cash at all — credit-card purchases (see cards.ts). */
  isOffCash?: (e: AccountEntryLike) => boolean;
};

/**
 * Everything the owner holds as cash at the end of `asOf`: every account's
 * balance, plus entries not assigned to any account.
 *
 * With no accounts defined this reduces to "the running total of everything
 * logged", which is exactly what the app showed before accounts existed — one
 * formula for both, so turning accounts on can't make the number jump for any
 * reason other than the opening balances the owner typed.
 */
export function cashPosition(
  accounts: AccountLike[],
  entries: AccountEntryLike[],
  transfers: TransferLike[],
  asOf: Date = new Date(),
  options: CashOptions = {},
): number {
  const end = dayKey(asOf);
  const onCash = options.isOffCash ? entries.filter((e) => !options.isOffCash!(e)) : entries;

  let total = 0;
  for (const a of accounts) total += accountBalance(a, onCash, transfers, asOf);
  // "Unassigned" includes entries pointing at an account that no longer exists.
  // Skipping those would make money silently vanish from the total.
  const known = new Set(accounts.map((a) => a.id));
  for (const e of onCash) {
    if (e.accountId && known.has(e.accountId)) continue;
    if (dayKey(e.date) <= end) total += signed(e);
  }
  return total;
}

/** Net of entries not assigned to an account — shown so nothing silently falls outside the accounts view. */
export function unassignedTotal(
  entries: AccountEntryLike[],
  accountIds: string[],
  asOf: Date = new Date(),
): { net: number; count: number } {
  const end = dayKey(asOf);
  const known = new Set(accountIds);
  let net = 0;
  let count = 0;
  for (const e of entries) {
    if ((e.accountId && known.has(e.accountId)) || dayKey(e.date) > end) continue;
    net += signed(e);
    count++;
  }
  return { net, count };
}
