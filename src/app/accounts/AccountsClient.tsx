"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  Banknote,
  Info,
  Landmark,
  Pencil,
  PiggyBank,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { RowAction } from "@/components/RowAction";
import { AccountForm, TransferForm, type EditableAccount } from "./AccountForms";
import { deleteAccount, deleteTransfer, setAccountArchived } from "./actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { CARD } from "@/lib/ui";
import { useT } from "@/components/LanguageProvider";

type AccountRow = EditableAccount & {
  archived: boolean;
  balance: number;
  inflow: number;
  outflow: number;
};

type TransferRow = {
  id: string;
  date: Date;
  amount: number;
  fromAccountId: string;
  toAccountId: string | null;
  toInvestmentId: string | null;
  investmentTransactionId: string | null;
  note: string | null;
};

const KIND_ICON = { checking: Landmark, savings: PiggyBank, cash: Banknote, other: Wallet } as const;

export function AccountsClient({
  accounts,
  transfers,
  investments,
  unassigned,
}: {
  accounts: AccountRow[];
  transfers: TransferRow[];
  investments: { id: string; name: string }[];
  unassigned: { net: number; count: number };
}) {
  const { t, lang } = useT();
  const [editing, setEditing] = useState<EditableAccount | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);
  const visible = showArchived ? accounts : active;
  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  const accountName = (id: string | null) =>
    id ? (accounts.find((a) => a.id === id)?.name ?? t.accounts.deletedAccount) : "";
  const investmentName = (id: string | null) =>
    id ? (investments.find((i) => i.id === id)?.name ?? t.accounts.deletedHolding) : "";

  function closeAccountForm() {
    setEditing(null);
    setShowAccountForm(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[34px]">{t.accounts.title}</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{t.accounts.subtitle}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowTransfer(true)}
            className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-[13.5px] font-semibold text-[var(--color-ink)] backdrop-blur-xl transition hover:bg-[var(--color-panel)]"
          >
            <ArrowLeftRight size={15} /> {t.accounts.newTransfer}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowAccountForm(true);
            }}
            className="flex items-center gap-2 rounded-xl px-5 py-3 text-[13.5px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Plus size={16} /> {t.accounts.addAccount}
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className={`${CARD} flex flex-col items-start gap-2 p-6`}>
          <p className="text-[15px] font-bold text-[var(--color-ink)]">{t.accounts.empty}</p>
          <p className="max-w-xl text-[13px] leading-relaxed text-[var(--color-muted)]">{t.accounts.emptyExplainer}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className={`${CARD} min-w-[190px] flex-1 px-5 py-4`}>
              <p className="mb-1 font-mono text-[10.5px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase">
                {t.accounts.totalBalance}
              </p>
              <p
                className="text-2xl leading-none font-extrabold"
                style={{ color: total < 0 ? "var(--color-rust-text)" : "var(--color-ink)" }}
              >
                {formatCurrency(total)}
              </p>
            </div>
          </div>

          {unassigned.count > 0 && (
            <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5 rounded-[14px] bg-[var(--color-inset)] px-4 py-3">
              <Info size={15} className="mt-0.5 shrink-0 text-[var(--color-muted-2)]" />
              <p className="min-w-[220px] flex-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
                {t.accounts.unassigned(unassigned.count, formatCurrency(unassigned.net))}
              </p>
              <Link
                href="/entries?account=none"
                className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-bold text-[var(--color-brand-text)]"
              >
                {t.accounts.reviewUnassigned} <ArrowRight size={13} />
              </Link>
            </div>
          )}

          {error && <p className="text-[13px] text-[var(--color-rust-text)]">{error}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((a) => {
              const Icon = KIND_ICON[a.kind as keyof typeof KIND_ICON] ?? Wallet;
              return (
                <div key={a.id} className={`${CARD} flex flex-col gap-3 p-5 ${a.archived ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-white"
                        style={{ background: "var(--gradient-brand)" }}
                      >
                        <Icon size={17} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-bold text-[var(--color-ink)]">{a.name}</p>
                        <p className="text-[11.5px] text-[var(--color-muted-2)]">
                          {t.accounts.kinds[a.kind] ?? a.kind}
                          {a.archived ? ` · ${t.accounts.archived}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p
                    className="font-mono text-[22px] leading-none font-bold tabular-nums"
                    style={{ color: a.balance < 0 ? "var(--color-rust-text)" : "var(--color-ink)" }}
                  >
                    {formatCurrency(a.balance)}
                  </p>

                  <div className="flex flex-col gap-0.5 text-[11.5px] text-[var(--color-muted-2)]">
                    <span className="font-mono">
                      {t.accounts.thisMonth(formatCurrency(a.inflow), formatCurrency(a.outflow))}
                    </span>
                    <span>{t.accounts.since(formatDate(a.openingDate, lang), formatCurrency(a.openingBalance))}</span>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--color-border)] pt-3">
                    <RowAction
                      label={t.common.edit}
                      icon={Pencil}
                      onClick={() => {
                        setEditing(a);
                        setShowAccountForm(true);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void setAccountArchived(a.id, !a.archived)}
                      className="-my-1 rounded px-1.5 py-1 text-xs font-semibold text-[var(--color-muted-2)] hover:text-[var(--color-ink)]"
                    >
                      {a.archived ? t.accounts.unarchive : t.accounts.archive}
                    </button>
                    <RowAction
                      label={t.common.delete}
                      icon={Trash2}
                      tone="danger"
                      onClick={async () => {
                        if (!confirm(t.accounts.confirmDeleteAccount)) return;
                        const res = await deleteAccount(a.id);
                        setError(res.error ?? null);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {archived.length > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="self-start text-[12.5px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            >
              {showArchived ? t.accounts.hideArchived : t.accounts.showArchived(archived.length)}
            </button>
          )}
        </>
      )}

      <div className={`${CARD} p-5`}>
        <h2 className="text-[17px] font-extrabold tracking-tight">{t.accounts.transfers}</h2>
        <p className="mb-3 text-[12.5px] text-[var(--color-muted)]">{t.accounts.transfersBlurb}</p>
        {transfers.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[var(--color-muted-2)]">{t.accounts.noTransfers}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--color-border)]">
            {transfers.slice(0, 50).map((tr) => (
              <li key={tr.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <span className="w-[92px] shrink-0 font-mono text-[12px] text-[var(--color-muted-2)] tabular-nums">
                  {formatDate(tr.date, lang)}
                </span>
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-[13px] font-semibold text-[var(--color-ink)]">
                  <span className="truncate">{accountName(tr.fromAccountId)}</span>
                  <ArrowRight size={13} className="shrink-0 text-[var(--color-muted-2)]" />
                  <span className="truncate">
                    {tr.toAccountId ? accountName(tr.toAccountId) : investmentName(tr.toInvestmentId)}
                  </span>
                  {tr.note && (
                    <span className="w-full truncate text-[12px] font-normal text-[var(--color-muted-2)]">{tr.note}</span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-[13px] font-semibold whitespace-nowrap text-[var(--color-ink)] tabular-nums">
                  {formatCurrency(tr.amount)}
                </span>
                <button
                  type="button"
                  aria-label={t.common.delete}
                  onClick={() => {
                    if (confirm(t.accounts.confirmDeleteTransfer)) void deleteTransfer(tr.id);
                  }}
                  className="shrink-0 rounded p-1 text-[var(--color-muted-2)] transition hover:text-[var(--color-rust-text)]"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showAccountForm && (
        <Modal title={editing ? t.accounts.editAccount : t.accounts.addAccount} onClose={closeAccountForm}>
          <AccountForm key={editing?.id ?? "new"} account={editing ?? undefined} onDone={closeAccountForm} />
        </Modal>
      )}

      {showTransfer && (
        <Modal title={t.accounts.newTransfer} onClose={() => setShowTransfer(false)}>
          <TransferForm
            accounts={active.map((a) => ({ id: a.id, name: a.name }))}
            investments={investments}
            onDone={() => setShowTransfer(false)}
          />
        </Modal>
      )}
    </div>
  );
}
