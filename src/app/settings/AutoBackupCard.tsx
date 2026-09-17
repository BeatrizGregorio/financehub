"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FolderSync, ShieldCheck } from "lucide-react";
import { backUpNow, updateBackupSettings, type ActionState } from "./actions";
import { CARD } from "@/lib/ui";
import { formatDate } from "@/lib/format";
import { useT } from "@/components/LanguageProvider";

type BackupFileInfo = { name: string; size: number; modifiedAt: Date };

function PendingButton({
  idle,
  pending,
  variant = "primary",
}: {
  idle: string;
  pending: string;
  variant?: "primary" | "secondary";
}) {
  const { pending: isPending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={isPending}
      className={
        variant === "primary"
          ? "rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95 disabled:opacity-50"
          : "flex items-center gap-2 rounded-xl bg-[var(--color-panel)] px-4 py-2.5 text-[13.5px] font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-track)] disabled:opacity-50"
      }
      style={variant === "primary" ? { background: "var(--gradient-brand)" } : undefined}
    >
      {variant === "secondary" && <ShieldCheck size={15} />}
      {isPending ? pending : idle}
    </button>
  );
}

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Automatic backup settings, plus "Back up now" and a short list of what's on
 * disk. Showing the actual folder and the actual last files is the point:
 * a backup setting you can't see working is one you can't trust.
 */
export function AutoBackupCard({
  enabled,
  dir,
  customDir,
  defaultDir,
  keep,
  lastAt,
  files,
}: {
  enabled: boolean;
  dir: string;
  customDir: string | null;
  defaultDir: string;
  keep: number;
  lastAt: Date | null;
  files: BackupFileInfo[];
}) {
  const { t, lang } = useT();
  const [settingsState, settingsAction] = useActionState(updateBackupSettings, {} as ActionState);
  const [nowState, nowAction] = useActionState(backUpNow, {} as ActionState & { file?: string });

  const time = (d: Date) =>
    `${formatDate(d, lang)} ${d.toLocaleTimeString(lang === "pt" ? "pt-BR" : "en-US", { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <div className={`${CARD} p-[22px] md:col-span-2`}>
      <div className="mb-1 flex items-center gap-2">
        <FolderSync size={16} className="shrink-0 text-[var(--color-brand-text)]" />
        <h2 className="text-base font-extrabold tracking-tight">{t.settings.autoBackupTitle}</h2>
      </div>
      <p className="mb-4 text-[12.5px] text-[var(--color-muted-2)]">{t.settings.autoBackupBlurb}</p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <form action={settingsAction} className="flex flex-col gap-3.5">
          <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-[var(--color-ink)]">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={enabled}
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
            {t.settings.autoBackupEnabled}
          </label>

          <div>
            <label
              htmlFor="backup-dir"
              className="mb-1.5 block text-[11px] font-bold tracking-wide text-[var(--color-muted-2)] uppercase"
            >
              {t.settings.autoBackupFolder}
            </label>
            <input
              id="backup-dir"
              name="dir"
              type="text"
              defaultValue={customDir ?? ""}
              placeholder={defaultDir}
              spellCheck={false}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2.5 font-mono text-[12.5px] outline-none transition focus:border-[var(--color-ink)] focus:bg-[var(--color-surface-raised)]"
            />
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--color-muted-2)]">
              {t.settings.autoBackupFolderHint}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label htmlFor="backup-keep" className="text-[13.5px] font-semibold text-[var(--color-ink)]">
              {t.settings.autoBackupKeep}
            </label>
            <div className="flex items-center gap-1.5 rounded-[10px] bg-[var(--color-inset)] px-[13px] py-1">
              <input
                id="backup-keep"
                name="keep"
                type="number"
                min="1"
                max="365"
                defaultValue={keep}
                className="w-14 bg-transparent py-1 text-right font-mono text-[13px] outline-none"
              />
              <span className="font-mono text-xs text-[var(--color-muted-2)]">
                {t.settings.autoBackupKeepSuffix}
              </span>
            </div>
          </div>

          {settingsState.error && (
            <p className="text-[12.5px] text-[var(--color-rust-text)]">{settingsState.error}</p>
          )}
          <div>
            <PendingButton idle={t.settings.saveBackupSettings} pending={t.common.saving} />
          </div>
        </form>

        <div className="flex flex-col gap-3">
          <div className="rounded-[12px] bg-[var(--color-inset)] px-3.5 py-3 text-[12.5px]">
            <p className="font-semibold text-[var(--color-ink)]">
              {lastAt ? t.settings.lastBackup(time(lastAt)) : t.settings.noBackupYet}
            </p>
            <p className="mt-1 text-[var(--color-muted)]">
              {t.settings.savingTo}{" "}
              <span className="font-mono text-[11.5px] break-all text-[var(--color-ink)]">{dir}</span>
            </p>
          </div>

          <form action={nowAction} className="flex flex-wrap items-center gap-3">
            <PendingButton idle={t.settings.backUpNow} pending={t.settings.backingUp} variant="secondary" />
            {nowState.file && (
              <span className="text-[12px] text-[var(--color-positive-text)] break-all">
                {t.settings.backedUpTo(nowState.file.split(/[\\/]/).pop() ?? "")}
              </span>
            )}
            {nowState.error && (
              <span className="text-[12px] text-[var(--color-rust-text)]">{nowState.error}</span>
            )}
          </form>

          {files.length > 0 && (
            <div>
              <p className="mb-1.5 font-mono text-[10.5px] tracking-[0.1em] text-[var(--color-muted-2)] uppercase">
                {t.settings.recentBackups}
              </p>
              <ul className="flex flex-col divide-y divide-[var(--color-border)]">
                {files.slice(0, 5).map((f) => (
                  <li key={f.name} className="flex items-baseline justify-between gap-3 py-1.5">
                    <span className="min-w-0 truncate font-mono text-[11.5px] text-[var(--color-ink)]">
                      {f.name}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] whitespace-nowrap text-[var(--color-muted-2)]">
                      {sizeLabel(f.size)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11.5px] leading-relaxed text-[var(--color-muted-2)]">{t.settings.restoreHint}</p>
        </div>
      </div>
    </div>
  );
}
