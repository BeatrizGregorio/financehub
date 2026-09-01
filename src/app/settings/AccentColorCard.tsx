"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { updateAccentColor } from "./actions";
import { ACCENT_COLORS, type AccentColor } from "@/lib/theme";
import { CARD } from "@/lib/ui";
import { useT } from "@/components/LanguageProvider";

function SaveButton({ changed }: { changed: boolean }) {
  const { t } = useT();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !changed}
      className="mt-4 rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[var(--shadow-brand)] transition hover:brightness-105 active:scale-95 disabled:opacity-50"
      style={{ background: "var(--gradient-brand)" }}
    >
      {pending ? t.common.saving : t.settings.saveColor}
    </button>
  );
}

export function AccentColorCard({ accentColor }: { accentColor: AccentColor }) {
  const { t } = useT();
  const [state, formAction] = useActionState(updateAccentColor, {});
  const [selected, setSelected] = useState<AccentColor>(accentColor);

  return (
    <div className={`${CARD} p-[22px]`}>
      <h2 className="mb-1 text-base font-extrabold tracking-tight">{t.settings.appColor}</h2>
      <p className="mb-3.5 text-[12.5px] text-[var(--color-muted-2)]">
        {t.settings.appColorBlurb}
      </p>

      <form action={formAction}>
        {/* A radiogroup rather than five buttons: arrow keys move between the
            swatches, and only the checked one is a tab stop. */}
        <div role="radiogroup" aria-label={t.settings.appColor} className="flex flex-wrap gap-2.5">
          {ACCENT_COLORS.map((color) => {
            const active = selected === color.value;
            return (
              <label
                key={color.value}
                className="flex cursor-pointer flex-col items-center gap-1.5"
              >
                <input
                  type="radio"
                  name="accentColor"
                  value={color.value}
                  checked={active}
                  onChange={() => setSelected(color.value)}
                  className="sr-only"
                />
                {/* The swatch is an explicit hex from theme.ts, not a CSS
                    variable: --color-brand only ever holds the *current*
                    theme's value, so every swatch would render the same color. */}
                <span
                  aria-hidden
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white transition"
                  style={{
                    backgroundColor: color.swatch,
                    boxShadow: active
                      ? `0 0 0 2px var(--background), 0 0 0 4px ${color.swatch}`
                      : "none",
                  }}
                >
                  {active && <Check size={15} strokeWidth={3} />}
                </span>
                <span
                  className={`text-[11.5px] ${active ? "font-bold text-[var(--color-ink)]" : "text-[var(--color-muted-2)]"}`}
                >
                  {color.label}
                </span>
              </label>
            );
          })}
        </div>

        {state.error && <p className="mt-2.5 text-[12.5px] text-[var(--color-rust-text)]">{state.error}</p>}

        <SaveButton changed={selected !== accentColor} />
      </form>

      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--color-muted-2)]">
        {t.settings.appColorFootnote}
      </p>
    </div>
  );
}
