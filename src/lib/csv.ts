/**
 * CSV parsing for bank and card statement imports.
 *
 * Hand-rolled rather than adding papaparse: this project keeps its dependency
 * list short on purpose, and what a statement needs is a small subset of the
 * format — quoted fields, embedded separators and newlines, doubled quotes.
 *
 * Everything here is pure and free of DOM or Prisma, so it can be compiled and
 * asserted standalone, the same way format.ts and goal.ts are tested.
 */

/** Rows of raw cells. The first row is assumed to be a header. */
export type ParsedCsv = { header: string[]; rows: string[][] };

/**
 * Brazilian exports are usually semicolon-separated, because the comma is the
 * decimal separator. Guess from the header line rather than asking: whichever
 * candidate appears most outside quotes wins, with a comma as the tiebreak.
 */
export function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? text.length : text.indexOf("\n"));
  const candidates = [";", ",", "\t"];
  let best = ",";
  let bestCount = 0;
  for (const d of candidates) {
    let count = 0;
    let inQuotes = false;
    for (const ch of firstLine) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === d && !inQuotes) count++;
    }
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

/** RFC-4180-ish parse: handles quoted fields, doubled quotes, CRLF. */
export function parseCsv(text: string, delimiter?: string): ParsedCsv {
  const d = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip a UTF-8 BOM, which Excel exports routinely carry and which would
  // otherwise become part of the first header cell.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === d) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  // Whatever is left after the last newline, unless the file ended cleanly.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) return { header: [], rows: [] };
  return { header: nonEmpty[0].map((h) => h.trim()), rows: nonEmpty.slice(1) };
}

/**
 * Parse a money cell, coping with both conventions a Brazilian export might use.
 *
 * The hard case is that "1.234" is 1234 in pt-BR and 1.234 in en-US. The rule
 * used here: whichever of "." and "," appears *last* is the decimal separator,
 * because a thousands separator can never follow the decimal one. With only one
 * separator present, a group of exactly three digits after it is read as
 * thousands ("1.234" = 1234) and anything else as a decimal ("12,5" = 12.5).
 * That is the convention every statement in testing followed.
 *
 * Returns null rather than NaN so callers must handle the failure.
 */
export function parseAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;

  // Currency symbols, spaces (including non-breaking), and stray letters.
  s = s.replace(/[R$\s ]/gi, "");

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
 * Parse a date cell into a *local* calendar date.
 *
 * Always constructed with new Date(y, m-1, d) — never new Date(string), which
 * parses as UTC midnight and silently lands on the previous day west of
 * Greenwich. Same rule the rest of this app follows for entry dates.
 *
 * Accepts dd/MM/yyyy and dd-MM-yyyy (what Brazilian exports use), yyyy-MM-dd
 * (ISO), and two-digit years, which are read as 20xx.
 */
export function parseCsvDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return build(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmy) {
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    return build(year, Number(dmy[2]), Number(dmy[1]));
  }
  return null;
}

function build(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  // Rejects impossible dates that JS would otherwise roll forward, e.g. 31/02.
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

export type ColumnMapping = { date: number; description: number; amount: number };

/**
 * Pre-fill the column mapping from the header names, in both languages.
 *
 * A guess, not a decision: the mapping selects are always shown so the owner
 * can correct it. Falls back to the first three columns, which is the order
 * almost every statement uses anyway.
 */
export function guessMapping(header: string[]): ColumnMapping {
  const norm = header.map((h) =>
    h
      .toLowerCase()
      .normalize("NFD")
      // Strip combining accents so "descricao" matches "descrição".
      .replace(/[̀-ͯ]/g, ""),
  );
  const find = (words: string[], fallback: number) => {
    const exact = norm.findIndex((h) => words.includes(h));
    if (exact !== -1) return exact;
    const partial = norm.findIndex((h) => words.some((w) => h.includes(w)));
    return partial !== -1 ? partial : fallback;
  };
  return {
    date: find(["data", "date", "data lancamento", "data da compra"], 0),
    description: find(
      ["descricao", "description", "historico", "lancamento", "estabelecimento", "titulo", "memo"],
      1,
    ),
    amount: find(["valor", "amount", "quantia", "montante", "credito", "debito"], 2),
  };
}

export type MappedRow = {
  date: Date;
  name: string;
  amount: number;
  type: "income" | "expense";
};

export type MapResult = { rows: MappedRow[]; skipped: number };

/**
 * Turn raw cells into entry-shaped rows using the chosen column mapping.
 *
 * Sign decides direction: a negative amount is an expense, a positive one is
 * income, which is how card and account statements are written. `forceType`
 * overrides that for exports which state every amount as a positive number and
 * rely on a separate column, or a file that is all one direction.
 *
 * Rows that cannot produce a valid date and amount are counted in `skipped`
 * rather than imported as zeroes or today's date — a wrong entry is worse than
 * a missing one, and the count tells the owner how many need a second look.
 */
export function mapRows(
  rows: string[][],
  mapping: ColumnMapping,
  forceType?: "income" | "expense",
): MapResult {
  const out: MappedRow[] = [];
  let skipped = 0;

  for (const cells of rows) {
    const date = parseCsvDate(cells[mapping.date] ?? "");
    const amount = parseAmount(cells[mapping.amount] ?? "");
    if (!date || amount === null || amount === 0) {
      skipped++;
      continue;
    }
    const name = (cells[mapping.description] ?? "").trim() || "Imported";
    out.push({
      date,
      name: name.slice(0, 120),
      amount: Math.abs(amount),
      type: forceType ?? (amount < 0 ? "expense" : "income"),
    });
  }

  return { rows: out, skipped };
}
