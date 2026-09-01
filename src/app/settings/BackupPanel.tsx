"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Download, Upload, RotateCcw } from "lucide-react";
import { importBackup, resetDefaults, type ActionState } from "./actions";
import { useT } from "@/components/LanguageProvider";
import type { Dict } from "@/lib/i18n";

function ImportButton({ onClick, t }: { onClick: () => void; t: Dict }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/15 px-3 py-3 text-[13.5px] font-semibold text-white transition hover:bg-white/25 disabled:opacity-50"
    >
      <Upload size={16} /> {pending ? t.common.importing : t.settings.import}
    </button>
  );
}

export function BackupPanel() {
  const initialState: ActionState = {};
  const { t } = useT();
  const [state, formAction] = useActionState(importBackup, initialState);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="rounded-[22px] bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-deep)] p-[22px] text-white shadow-[var(--shadow-brand-panel)]">
      <h2 className="mb-1 text-base font-extrabold tracking-tight">{t.settings.backupRestore}</h2>
      <p className="mb-4 text-[12.5px] text-white/70">
        {t.settings.backupBlurb}
      </p>

      <div className="mb-3 flex gap-2.5">
        <a
          href="/api/backup"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-3 py-3 text-[13.5px] font-bold text-[var(--color-brand-text)] transition hover:opacity-90"
        >
          <Download size={16} /> {t.settings.export}
        </a>

        <form
          ref={formRef}
          action={formAction}
          onSubmit={(e) => {
            if (!confirm(t.settings.confirmImport)) {
              e.preventDefault();
            }
          }}
          className="flex flex-1"
        >
          <input
            ref={fileRef}
            type="file"
            name="file"
            aria-label={t.settings.backupFileLabel}
            accept="application/json"
            required
            className="hidden"
            onChange={() => formRef.current?.requestSubmit()}
          />
          <ImportButton onClick={() => fileRef.current?.click()} t={t} />
        </form>
      </div>
      {state.error && <p className="mb-3 text-sm text-white">{state.error}</p>}

      <form
        action={resetDefaults}
        onSubmit={(e) => {
          if (!confirm(t.settings.confirmRestoreDefaults)) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-transparent py-[11px] text-[12.5px] font-medium text-white/75 transition hover:text-white"
        >
          <RotateCcw size={15} /> {t.settings.restoreDefaults}
        </button>
      </form>
    </div>
  );
}
