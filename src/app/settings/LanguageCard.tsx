"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Languages } from "lucide-react";
import { updateLanguage } from "./actions";
import { LANGUAGES, type Language } from "@/lib/i18n";
import { useT } from "@/components/LanguageProvider";
import { CARD } from "@/lib/ui";

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
      {pending ? t.common.saving : t.settings.saveLanguage}
    </button>
  );
}

export function LanguageCard({ language }: { language: Language }) {
  const { t } = useT();
  const [state, formAction] = useActionState(updateLanguage, {});
  const [selected, setSelected] = useState<Language>(language);

  return (
    <div className={`${CARD} p-[22px]`}>
      <h2 className="mb-1 text-base font-extrabold tracking-tight">{t.settings.language}</h2>
      <p className="mb-3.5 text-[12.5px] text-[var(--color-muted-2)]">{t.settings.languageBlurb}</p>

      <form action={formAction}>
        {/* Same radiogroup shape as the color picker, so the two settings
            cards behave identically for keyboard and screen-reader users.
            Each option is written in its own language — "Português" is not
            translated to "Portuguese", since someone looking for their
            language recognises its own name fastest. */}
        <div role="radiogroup" aria-label={t.settings.language} className="flex flex-wrap gap-2.5">
          {LANGUAGES.map((option) => {
            const active = selected === option.value;
            return (
              <label key={option.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="language"
                  value={option.value}
                  checked={active}
                  onChange={() => setSelected(option.value)}
                  className="sr-only"
                />
                <span
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold transition"
                  style={{
                    background: active ? "var(--color-brand-tint)" : "var(--color-inset)",
                    color: active ? "var(--color-brand)" : "var(--color-muted)",
                    boxShadow: active ? "inset 0 0 0 1.5px var(--color-brand)" : "none",
                  }}
                >
                  {active ? <Check size={14} strokeWidth={3} /> : <Languages size={14} />}
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>

        {state.error && <p className="mt-2.5 text-[12.5px] text-[var(--color-rust)]">{state.error}</p>}

        <SaveButton changed={selected !== language} />
      </form>

      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--color-muted-2)]">
        {t.settings.languageFootnote}
      </p>
    </div>
  );
}
