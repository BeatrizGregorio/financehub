"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Download, Upload, RotateCcw } from "lucide-react";
import { importBackup, resetDefaults, type ActionState } from "./actions";

function ImportButton({ onClick }: { onClick: () => void }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/15 px-3 py-3 text-[13.5px] font-semibold text-white transition hover:bg-white/25 disabled:opacity-50"
    >
      <Upload size={16} /> {pending ? "Importing…" : "Import"}
    </button>
  );
}

export function BackupPanel() {
  const initialState: ActionState = {};
  const [state, formAction] = useActionState(importBackup, initialState);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="rounded-[22px] bg-gradient-to-br from-[#0c9e57] to-[#0a7a43] p-[22px] text-white shadow-[0_16px_34px_-20px_rgba(12,158,87,0.7)]">
      <h2 className="mb-1 text-base font-extrabold tracking-tight">Backup &amp; restore</h2>
      <p className="mb-4 text-[12.5px] text-white/70">
        Your data lives locally. Export a JSON copy or restore from one.
      </p>

      <div className="mb-3 flex gap-2.5">
        <a
          href="/api/backup"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-3 py-3 text-[13.5px] font-bold text-[#0c9e57] transition hover:opacity-90"
        >
          <Download size={16} /> Export
        </a>

        <form
          ref={formRef}
          action={formAction}
          onSubmit={(e) => {
            if (!confirm("Importing will replace all current data with the backup file. Continue?")) {
              e.preventDefault();
            }
          }}
          className="flex flex-1"
        >
          <input
            ref={fileRef}
            type="file"
            name="file"
            aria-label="Backup file to import"
            accept="application/json"
            required
            className="hidden"
            onChange={() => formRef.current?.requestSubmit()}
          />
          <ImportButton onClick={() => fileRef.current?.click()} />
        </form>
      </div>
      {state.error && <p className="mb-3 text-sm text-white">{state.error}</p>}

      <form
        action={resetDefaults}
        onSubmit={(e) => {
          if (!confirm("Restore default categories and payment methods? Custom ones will be removed.")) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-transparent py-[11px] text-[12.5px] font-medium text-white/75 transition hover:text-white"
        >
          <RotateCcw size={15} /> Restore default categories
        </button>
      </form>
    </div>
  );
}
