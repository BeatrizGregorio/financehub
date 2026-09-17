"use client";

import { useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { guessMapping, mapRows, parseCsv, type ColumnMapping } from "@/lib/csv";
import { analyzeCsvRows, importCsvEntries, type CsvRowAnalysis } from "./actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { CARD } from "@/lib/ui";
import { useT } from "@/components/LanguageProvider";

type Option = { id: string; name: string };

/** One reviewed row: whether to import it and which category it gets. */
type Review = CsvRowAnalysis & { include: boolean; category: string | null };

/**
 * Import entries from a bank or card statement, in three steps:
 *   1. pick a file — parsed in the browser, never uploaded;
 *   2. check the column mapping and the defaults;
 *   3. review every row — suggested categories, likely duplicates unticked —
 *      then import only what's ticked.
 *
 * The review step exists because a wrong mapping or a re-imported statement
 * would otherwise silently create hundreds of wrong entries. Deliberately
 * additive: this never replaces existing data, unlike the backup restore.
 */
export function CsvImportCard({
  expenseCategories,
  incomeCategories,
  methods,
  accounts = [],
}: {
  expenseCategories: Option[];
  incomeCategories: Option[];
  methods: Option[];
  accounts?: Option[];
}) {
  const { t, lang } = useT();
  const [fileName, setFileName] = useState<string | null>(null);
  const [header, setHeader] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ date: 0, description: 1, amount: 2 });
  const [forceType, setForceType] = useState<"" | "income" | "expense">("");
  const [expenseCategory, setExpenseCategory] = useState(expenseCategories[0]?.name ?? "");
  const [incomeCategory, setIncomeCategory] = useState(incomeCategories[0]?.name ?? "");
  const [method, setMethod] = useState("");
  const [accountId, setAccountId] = useState("");
  const [review, setReview] = useState<Review[] | null>(null);
  const [busy, setBusy] = useState<"review" | "import" | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setResult(null);
    setError(null);
    setReview(null);
    const parsed = parseCsv(await file.text());
    if (parsed.header.length === 0 || parsed.rows.length === 0) {
      setError(t.settings.csvEmpty);
      setHeader([]);
      setRows([]);
      return;
    }
    setFileName(file.name);
    setHeader(parsed.header);
    setRows(parsed.rows);
    setMapping(guessMapping(parsed.header));
  }

  const mapped = rows.length ? mapRows(rows, mapping, forceType || undefined) : null;
  // Any change to how rows are read invalidates a review done on the old reading.
  const resetReview = () => setReview(null);

  async function doReview() {
    if (!mapped || mapped.rows.length === 0) return;
    setBusy("review");
    setError(null);
    const analysis = await analyzeCsvRows(mapped.rows);
    setBusy(null);
    setReview(
      analysis.map((a) => ({
        ...a,
        include: !a.duplicateOf,
        category: a.suggestion?.category ?? null,
      })),
    );
  }

  async function doImport() {
    if (!mapped || !review) return;
    const chosen = mapped.rows
      .map((r, i) => ({ ...r, category: review[i]?.category ?? undefined, include: review[i]?.include }))
      .filter((r) => r.include)
      .map((r) => ({ date: r.date, name: r.name, amount: r.amount, type: r.type, category: r.category }));
    if (chosen.length === 0) return;
    setBusy("import");
    setError(null);
    const res = await importCsvEntries({
      rows: chosen,
      expenseCategory,
      incomeCategory,
      method: method || null,
      accountId: accountId || null,
    });
    setBusy(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    setResult(t.settings.csvImported(res.imported));
    setHeader([]);
    setRows([]);
    setFileName(null);
    setReview(null);
  }

  const selectClass =
    "rounded-[10px] bg-[var(--color-inset)] px-3 py-2 text-[13px] text-[var(--color-ink)] outline-none focus:ring-1 focus:ring-[var(--color-ink)]";
  const microLabel = "font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-muted-2)]";

  const includedCount = review ? review.filter((r) => r.include).length : 0;
  const duplicateCount = review ? review.filter((r) => r.duplicateOf).length : 0;
  const sourceLabel = (s: "rule" | "history" | "similar") =>
    s === "rule" ? t.settings.csvSourceRule : s === "history" ? t.settings.csvSourceHistory : t.settings.csvSourceSimilar;

  return (
    <div className={`${CARD} p-[22px] md:col-span-2`}>
      <div className="mb-1 flex items-center gap-2">
        <FileSpreadsheet size={16} className="shrink-0 text-[var(--color-brand-text)]" />
        <h2 className="text-base font-extrabold tracking-tight">{t.settings.csvTitle}</h2>
      </div>
      <p className="mb-3.5 text-[12.5px] text-[var(--color-muted-2)]">{t.settings.csvBlurb}</p>

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--color-inset)] px-4 py-2.5 text-[13px] font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-track)]">
        <Upload size={14} />
        {fileName ?? t.settings.csvChooseFile}
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          aria-label={t.settings.csvChooseFile}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
      </label>

      {header.length > 0 && mapped && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(["date", "description", "amount"] as const).map((field) => (
              <label key={field} className="flex flex-col gap-1.5">
                <span className={microLabel}>{t.settings.csvColumn[field]}</span>
                <select
                  className={selectClass}
                  value={mapping[field]}
                  onChange={(e) => {
                    setMapping({ ...mapping, [field]: Number(e.target.value) });
                    resetReview();
                  }}
                >
                  {header.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `#${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className={microLabel}>{t.settings.csvDirection}</span>
              <select
                className={selectClass}
                value={forceType}
                onChange={(e) => {
                  setForceType(e.target.value as "" | "income" | "expense");
                  resetReview();
                }}
              >
                <option value="">{t.settings.csvBySign}</option>
                <option value="expense">{t.settings.csvAllExpenses}</option>
                <option value="income">{t.settings.csvAllIncome}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={microLabel}>{t.settings.csvExpenseCategory}</span>
              <select className={selectClass} value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)}>
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={microLabel}>{t.settings.csvIncomeCategory}</span>
              <select className={selectClass} value={incomeCategory} onChange={(e) => setIncomeCategory(e.target.value)}>
                {incomeCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="-mt-2 text-[11.5px] text-[var(--color-muted-2)]">{t.settings.csvDefaultsHint}</p>

          <div className="flex flex-wrap gap-3">
            {methods.length > 0 && (
              <label className="flex min-w-[200px] flex-col gap-1.5">
                <span className={microLabel}>{t.settings.csvMethod}</span>
                <select className={selectClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="">{t.common.none}</option>
                  {methods.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {accounts.length > 0 && (
              <label className="flex min-w-[200px] flex-col gap-1.5">
                <span className={microLabel}>{t.settings.csvAccount}</span>
                <select className={selectClass} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  <option value="">{t.accounts.noAccount}</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {!review ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void doReview()}
                disabled={busy !== null || mapped.rows.length === 0}
                className="rounded-full px-[19px] py-2.5 text-[13px] font-semibold text-white transition hover:brightness-105 active:scale-95 disabled:opacity-50"
                style={{ background: "var(--gradient-brand)" }}
              >
                {busy === "review" ? t.settings.csvReviewing : t.settings.csvReviewN(mapped.rows.length)}
              </button>
              {mapped.skipped > 0 && (
                <span className="text-[12.5px] text-[var(--color-muted)]">{t.settings.csvSkipped(mapped.skipped)}</span>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className={microLabel}>{t.settings.csvReviewTitle}</p>
                <p className="text-[12px] text-[var(--color-muted)]">
                  {t.settings.csvSelected(includedCount, review.length)}
                  {duplicateCount > 0 ? ` · ${t.settings.csvDuplicatesUnticked(duplicateCount)}` : ""}
                </p>
              </div>
              <div className="max-h-[420px] overflow-auto rounded-[12px] border border-[var(--color-border)]">
                <table className="w-full min-w-[640px] text-[12.5px]">
                  <tbody>
                    {mapped.rows.map((r, i) => {
                      const rv = review[i];
                      if (!rv) return null;
                      const options = r.type === "expense" ? expenseCategories : incomeCategories;
                      const fallback = r.type === "expense" ? expenseCategory : incomeCategory;
                      return (
                        <tr
                          key={i}
                          className="border-b border-[var(--color-border)] last:border-0"
                          style={{ opacity: rv.include ? 1 : 0.55 }}
                        >
                          <td className="py-1.5 pr-2 pl-3">
                            <input
                              type="checkbox"
                              checked={rv.include}
                              aria-label={t.settings.csvIncludeRow(r.name)}
                              onChange={(e) =>
                                setReview(review.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))
                              }
                              className="h-4 w-4 accent-[var(--color-brand)]"
                            />
                          </td>
                          <td className="py-1.5 pr-3 font-mono whitespace-nowrap text-[var(--color-muted)] tabular-nums">
                            {formatDate(r.date, lang)}
                          </td>
                          <td className="max-w-[240px] py-1.5 pr-3">
                            <span className="block truncate text-[var(--color-ink)]">{r.name}</span>
                            {rv.duplicateOf && (
                              <span className="block truncate text-[11px] text-[var(--color-rust-text)]">
                                {t.settings.csvDuplicateOf(rv.duplicateOf)}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 pr-3">
                            <div className="flex items-center gap-1.5">
                              <select
                                aria-label={t.common.category}
                                value={rv.category ?? fallback}
                                onChange={(e) =>
                                  setReview(review.map((x, j) => (j === i ? { ...x, category: e.target.value } : x)))
                                }
                                className="max-w-[150px] rounded-[8px] bg-[var(--color-inset)] px-2 py-1 text-[12px] text-[var(--color-ink)] outline-none"
                              >
                                {options.map((c) => (
                                  <option key={c.id} value={c.name}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                              {rv.suggestion && rv.category === rv.suggestion.category && (
                                <span className="shrink-0 rounded-full bg-[var(--color-brand-tint)] px-1.5 py-px font-mono text-[9.5px] font-bold tracking-wide text-[var(--color-brand-text)] uppercase">
                                  {sourceLabel(rv.suggestion.source)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            className="py-1.5 pr-3 text-right font-mono whitespace-nowrap tabular-nums"
                            style={{ color: r.type === "income" ? "var(--color-positive-text)" : "var(--color-rust-text)" }}
                          >
                            {r.type === "income" ? "+" : "−"}
                            {formatCurrency(r.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void doImport()}
                  disabled={busy !== null || includedCount === 0}
                  className="rounded-full px-[19px] py-2.5 text-[13px] font-semibold text-white transition hover:brightness-105 active:scale-95 disabled:opacity-50"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {busy === "import" ? t.common.importing : t.settings.csvImportN(includedCount)}
                </button>
                <button
                  type="button"
                  onClick={resetReview}
                  className="text-[13px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                >
                  {t.settings.csvBackToMapping}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {result && <p className="mt-3 text-[13px] text-[var(--color-positive-text)]">{result}</p>}
      {error && <p className="mt-3 text-[13px] text-[var(--color-rust-text)]">{error}</p>}
    </div>
  );
}
