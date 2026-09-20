"use client";

import { useRef } from "react";
import Link from "next/link";
import { Gift } from "lucide-react";
import { updatePointsEnabled } from "./actions";
import { CARD } from "@/lib/ui";
import { useT } from "@/components/LanguageProvider";

/**
 * The switch for the optional credit card points tab. Only the on/off lives
 * here — the programmes themselves are managed on the tab, which has room for
 * them.
 */
export function PointsCard({ enabled, programCount }: { enabled: boolean; programCount: number }) {
  const { t } = useT();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className={`${CARD} p-[22px]`}>
      <div className="mb-1 flex items-center gap-2">
        <Gift size={16} className="shrink-0 text-[var(--color-brand-text)]" />
        <h2 className="text-base font-extrabold tracking-tight">{t.points.settingsTitle}</h2>
      </div>
      <p className="mb-4 text-[12.5px] leading-relaxed text-[var(--color-muted-2)]">{t.points.settingsBlurb}</p>

      {/* Saves as soon as it's ticked: a single switch doesn't need a button. */}
      <form ref={formRef} action={updatePointsEnabled}>
        <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-[var(--color-ink)]">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={enabled}
            onChange={() => formRef.current?.requestSubmit()}
            className="h-4 w-4 accent-[var(--color-brand)]"
          />
          {t.points.settingsEnable}
        </label>
      </form>

      {enabled && (
        <p className="mt-3 text-[12.5px] text-[var(--color-muted)]">
          <Link href="/points" className="font-semibold text-[var(--color-brand-text)] hover:underline">
            {t.points.title}
          </Link>{" "}
          · {t.points.settingsCount(programCount)}
        </p>
      )}
      {/* Switching it off hides the tab but keeps the programmes, so it can be
          turned back on without losing anything. */}
      {!enabled && programCount > 0 && (
        <p className="mt-3 text-[12.5px] text-[var(--color-muted-2)]">{t.points.settingsKept(programCount)}</p>
      )}
    </div>
  );
}
