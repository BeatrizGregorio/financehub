"use client";

import { useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { guessMapping, mapRows, parseCsv, type ColumnMapping } from "@/lib/csv";
import { importCsvEntries } from "./actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { CARD } from "@/lib/ui";
import { useT } from "@/components/LanguageProvider";

type Option = { id: string; name: string };

/**
 * Import entries from a bank or card statement.
 *
 * The file is parsed in the browser, never uploaded: the owner sees which
 * columns were detected and a preview of what will be created before anything
 * is written. That matters because a mis-mapped column would otherwise silently
 * produce hundreds of wrong entries, and undoing that by hand is miserable.
 *
 * Deliberately additive — this never replaces existing data, unlike the JSON
 * backup restore that sits beside it.
 */
export function CsvImportCard({
  expenseCategories,
  incomeCategories,
  methods,
}: {
  expenseCategories: Option[];
  incomeCategories: Option[];
  methods: Option[];
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
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setResult(null);
    setError(null);
    const text = await file.text();
    const parsed = parseCsv(text);
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

  async function doImport() {
    if (!mapped || mapped.rows.length === 0) return;
    setBusy(true);
    setError(null);
    const res = await importCsvEntries({
      rows: mapped.rows,
      expenseCategory,
      incomeCategory,
      method: method || null,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setResult(t.settings.csvImported(res.imported));
    setHeader([]);
    setRows([]);
    setFileName(null);
  }

  const selectClass =
    "rounded-[10px] bg-[var(--color-inset)] px-3 py-2 text-[13px] text-[var(--color-ink)] outline-none focus:ring-1 focus:ring-[var(--color-ink)]";

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
                <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-muted-2)]">
                  {t.settings.csvColumn[field]}
                </span>
                <select
                  className={selectClass}
                  value={mapping[field]}
                  onChange={(e) => setMapping({ ...mapping, [field]: Number(e.target.value) })}
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
              <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-muted-2)]">
                {t.settings.csvDirection}
              </span>
              <select
                className={selectClass}
                value={forceType}
                onChange={(e) => setForceType(e.target.value as "" | "income" | "expense")}
              >
                <option value="">{t.settings.csvBySign}</option>
                <option value="expense">{t.settings.csvAllExpenses}</option>
                <option value="income">{t.settings.csvAllIncome}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-muted-2)]">
                {t.settings.csvExpenseCategory}
              </span>
              <select
                className={selectClass}
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
              >
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-muted-2)]">
                {t.settings.csvIncomeCategory}
              </span>
              <select
                className={selectClass}
                value={incomeCategory}
                onChange={(e) => setIncomeCategory(e.target.value)}
              >
                {incomeCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {methods.length > 0 && (
            <label className="flex max-w-[260px] flex-col gap-1.5">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-muted-2)]">
                {t.settings.csvMethod}
              </span>
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

          <div className="overflow-x-auto rounded-[12px] bg-[var(--color-inset)] p-3">
            <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-muted-2)]">
              {t.settings.csvPreview}
            </p>
            <table className="w-full text-[12.5px]">
              <tbody>
                {mapped.rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-1.5 pr-3 font-mono whitespace-nowrap text-[var(--color-muted)] tabular-nums">
                      {formatDate(r.date, lang)}
                    </td>
                    <td className="max-w-[280px] truncate py-1.5 pr-3">{r.name}</td>
                    <td
                      className="py-1.5 text-right font-mono whitespace-nowrap tabular-nums"
                      style={{
                        color:
                          r.type === "income" ? "var(--color-positive)" : "var(--color-rust)",
                      }}
                    >
                      {r.type === "income" ? "+" : "−"}
                      {formatCurrency(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void doImport()}
              disabled={busy || mapped.rows.length === 0}
              className="rounded-full px-[19px] py-2.5 text-[13px] font-semibold text-white transition hover:brightness-105 active:scale-95 disabled:opacity-50"
              style={{ background: "var(--gradient-brand)" }}
            >
              {busy ? t.common.importing : t.settings.csvImportN(mapped.rows.length)}
            </button>
            {mapped.skipped > 0 && (
              <span className="text-[12.5px] text-[var(--color-muted)]">
                {t.settings.csvSkipped(mapped.skipped)}
              </span>
            )}
          </div>
        </div>
      )}

      {result && <p className="mt-3 text-[13px] text-[var(--color-positive-text)]">{result}</p>}
      {error && <p className="mt-3 text-[13px] text-[var(--color-rust-text)]">{error}</p>}
    </div>
  );
}
