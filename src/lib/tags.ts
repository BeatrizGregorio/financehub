/**
 * Entry tags (V1.28): free labels like "trip-2026" or "wedding" that cut
 * across categories.
 *
 * Stored in one text column as ",trip-2026,wedding," — leading and trailing
 * commas included — so "has this tag" is a plain `contains ",tag,"` query in
 * SQLite with no join table, and "trip" can never match "trip-2026". An entry
 * with no tags stores "". Pure; asserted standalone.
 */

/** Lowercase, no accents, spaces to hyphens, and nothing that could break the separator. */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[,#]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

/** "Trip 2026, wedding,  #Trip 2026" -> ["trip-2026", "wedding"] (deduplicated, input order kept). */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  for (const part of input.split(",")) {
    const tag = normalizeTag(part);
    if (tag) seen.add(tag);
  }
  return [...seen].slice(0, 10);
}

export function serializeTags(tags: string[]): string {
  return tags.length ? `,${tags.join(",")},` : "";
}

export function tagsOf(stored: string | null | undefined): string[] {
  return (stored ?? "").split(",").filter(Boolean);
}

/** The substring a query uses to find entries carrying `tag`. */
export function tagNeedle(tag: string): string {
  return `,${normalizeTag(tag)},`;
}
