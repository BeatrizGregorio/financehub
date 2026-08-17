"use client";

import { BadgeCheck, Clock } from "lucide-react";
import { useT } from "@/components/LanguageProvider";
import { CARD } from "@/lib/ui";
import type { LicenseStatus } from "@/lib/data";

/**
 * Read-only status. There's deliberately no "deactivate" button: this is a
 * one-machine, one-file app, so a deactivate flow would only ever be a way to
 * lock yourself out of your own data.
 */
export function LicenseCard({ license }: { license: LicenseStatus }) {
  const { t } = useT();
  const licensed = license.state === "licensed";

  return (
    <div className={`${CARD} p-5`}>
      <h3 className="mb-1 text-[17px] font-extrabold tracking-tight">{t.license.settingsTitle}</h3>
      <p className="mb-3.5 text-[12.5px] text-[var(--color-muted)]">
        {licensed ? t.license.settingsBlurbLicensed : t.license.settingsBlurbTrial}
      </p>

      <div
        className="flex items-center gap-2 rounded-[12px] px-3.5 py-3"
        style={{
          backgroundColor: licensed ? "var(--color-positive-tint)" : "var(--color-brand-tint)",
        }}
      >
        {licensed ? (
          <BadgeCheck size={16} className="shrink-0 text-[var(--color-positive)]" />
        ) : (
          <Clock size={16} className="shrink-0 text-[var(--color-brand)]" />
        )}
        <p className="text-[13px] font-semibold text-[var(--color-ink)]">
          {license.state === "licensed"
            ? t.license.licensedTo(license.email)
            : license.state === "trial"
              ? t.license.trialBanner(license.daysLeft)
              : t.license.gateTitle}
        </p>
      </div>
    </div>
  );
}
