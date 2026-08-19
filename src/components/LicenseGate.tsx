"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, Download } from "lucide-react";
import { activateLicense, type ActionState } from "@/app/license/actions";
import { useT } from "@/components/LanguageProvider";
import { CARD } from "@/lib/ui";

/**
 * Shown instead of the app once the trial has run out.
 *
 * Two deliberate choices:
 * - **"Export my data" is always available here.** Someone whose trial lapsed
 *   still owns every number they typed in, and refusing to hand it back would
 *   be holding their data hostage to a sale. The link hits the backup Route
 *   Handler, which is not behind this gate.
 * - **Nothing is deleted or hidden on expiry.** Activating later brings the app
 *   back exactly as it was, which is also what the copy promises.
 */
function ActivateButton() {
  const { pending } = useFormStatus();
  const { t } = useT();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95 disabled:opacity-50"
      style={{ background: "var(--gradient-brand)" }}
    >
      {pending ? t.license.activating : t.license.activate}
    </button>
  );
}

export function LicenseGate({ showExport }: { showExport: boolean }) {
  const { t } = useT();
  const [state, formAction] = useActionState<ActionState, FormData>(activateLicense, {});

  const FIELD =
    "w-full rounded-[10px] bg-[var(--color-inset)] px-[13px] py-2.5 text-[13.5px] outline-none focus:ring-2 focus:ring-[var(--color-brand)]/30";
  const LABEL = "mb-1.5 block text-[12.5px] font-semibold text-[var(--color-ink)]";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center px-6 py-16">
      <span
        className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-brand-logo)]"
        style={{ background: "var(--gradient-brand)" }}
      >
        <KeyRound size={22} />
      </span>

      <h1 className="text-center text-2xl font-extrabold tracking-tight">{t.license.gateTitle}</h1>
      <p className="mt-2 mb-6 text-center text-sm leading-relaxed text-[var(--color-muted)]">
        {t.license.gateBody}
      </p>

      <form action={formAction} className={`${CARD} flex w-full flex-col gap-3.5 p-5`}>
        <div>
          <label className={LABEL} htmlFor="license-email">
            {t.license.email}
          </label>
          <input
            id="license-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="license-key">
            {t.license.key}
          </label>
          {/* A textarea, not an input: the key is ~100 characters and pasting it
              into a single-line field makes it impossible to eyeball. */}
          <textarea
            id="license-key"
            name="key"
            required
            rows={3}
            spellCheck={false}
            placeholder={t.license.keyPlaceholder}
            className={`${FIELD} resize-none font-mono text-[12px] leading-relaxed`}
          />
        </div>

        {state.error && (
          <p className="text-[12.5px] text-[var(--color-rust)]">
            {state.error === "missing" ? t.license.missing : t.license.invalid}
          </p>
        )}

        <div className="mt-1 flex justify-end">
          <ActivateButton />
        </div>
      </form>

      {/* Hidden on a fresh install, where there is nothing to export yet. */}
      {showExport && (
        <div className="mt-6 flex flex-col items-center gap-1.5">
          <a
            href="/api/backup"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-brand)]"
          >
            <Download size={14} /> {t.license.exportFirst}
          </a>
          <p className="text-[11.5px] text-[var(--color-muted-2)]">{t.license.exportHint}</p>
        </div>
      )}
    </div>
  );
}
