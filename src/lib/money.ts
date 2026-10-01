/**
 * Reading and writing money as text.
 *
 * Every amount in this app is BRL, and the owner types it the way her bank
 * statements print it: `25.500,75`. An `<input type="number">` cannot accept
 * that. It takes the comma as a decimal separator happily enough, but a
 * *thousands* separator is read as the decimal point and the comma is then
 * dropped — `25.500,75` becomes `25.50075`, a thousand times too small, with
 * no error and no visible sign that anything went wrong. That is the worst
 * possible failure for a figure nobody re-reads after saving.
 *
 * So money fields are plain text (`MoneyInput`), and this is the one parser
 * behind all of them. It is the same function the CSV importer uses: a number
 * typed into the app and the same number imported from a statement have to
 * mean the same thing, or the two halves of the app disagree about the
 * owner's money.
 *
 * Pure and dependency-free, so it can be compiled and asserted standalone.
 */

/**
 * Parse a typed amount. Returns null when there is no number in it at all,
 * rather than 0 — a blank field and a zero are different answers, and only
 * the caller knows which of them is acceptable.
 *
 * Accepts both conventions, because both turn up: `1.234,56` (pt-BR) and
 * `1,234.56` (en-US) are the same amount. Whichever of `.` and `,` appears
 * *last* is the decimal separator; with only one separator present, exactly
 * three digits after it reads as thousands.
 */
export function parseMoney(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;

  // Currency symbols, spaces (including non-breaking), and stray letters.
  s = s.replace(/[R$\s ]/gi, "");

  // Accounting negatives: (1.234,56) means -1234.56.
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }

  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");

  if (lastDot !== -1 && lastComma !== -1) {
    // Both present: the later one is the decimal separator.
    const decimalAt = Math.max(lastDot, lastComma);
    const intPart = s.slice(0, decimalAt).replace(/[.,]/g, "");
    const decPart = s.slice(decimalAt + 1);
    s = `${intPart}.${decPart}`;
  } else if (lastDot !== -1 || lastComma !== -1) {
    const at = lastDot !== -1 ? lastDot : lastComma;
    const after = s.slice(at + 1);
    const before = s.slice(0, at).replace(/[.,]/g, "");
    // Exactly three digits after a single separator reads as thousands.
    s = after.length === 3 ? `${before}${after}` : `${before}.${after}`;
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/**
 * The stored value as text for a `MoneyInput`, the counterpart of
 * `toDateInputValue` for `<input type="date">`.
 *
 * Always two decimals, and that is not cosmetic: `String(44511.785)` is
 * `"44511.785"`, which `parseMoney` reads back as **44,511,785** under the
 * three-digits-means-thousands rule. Seeding a field with a value it cannot
 * round-trip would turn simply opening a form and saving it into a silent
 * corruption. `toFixed(2)` can never produce three decimals, so the round
 * trip is closed.
 */
export function toMoneyInputValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return value.toFixed(2);
}
