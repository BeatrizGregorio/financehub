"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LANGUAGE, dict, type Dict, type Language } from "@/lib/i18n";

/**
 * Makes the chosen language available to client components.
 *
 * A context rather than the explicit prop-threading used for `cycleStartDay`:
 * the dictionary is needed by nearly every component, and threading it through
 * every intermediate layer would bury the real props. This is safe in a way a
 * module-level `let currentLanguage` would not be (see the warning in
 * CLAUDE.md under V1.15) — a context value belongs to one render tree, so two
 * concurrently-rendering requests can't see each other's language, whereas a
 * module-level global on the server is shared process-wide.
 *
 * Server components don't use this. They call `getLanguage()` + `dict()`
 * directly, since they can read the database.
 */
const LanguageContext = createContext<{ lang: Language; t: Dict }>({
  lang: DEFAULT_LANGUAGE,
  t: dict(DEFAULT_LANGUAGE),
});

export function LanguageProvider({
  lang,
  children,
}: {
  lang: Language;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ lang, t: dict(lang) }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** `const { t, lang } = useT();` then `t.common.save`. */
export function useT() {
  return useContext(LanguageContext);
}
