"use client";

import { Clock } from "lucide-react";
import { useT } from "@/components/LanguageProvider";

/**
 * Trial countdown. Sits above the page content rather than covering it — the
 * trial is fully functional, so this is information, not an obstacle.
 */
export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const { t } = useT();
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-brand-tint)] px-4 py-2.5">
      <Clock size={15} className="shrink-0 text-[var(--color-brand)]" />
      <p className="text-[13px] text-[var(--color-ink)]">{t.license.trialBanner(daysLeft)}</p>
    </div>
  );
}
