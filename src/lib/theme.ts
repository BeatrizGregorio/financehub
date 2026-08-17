/**
 * The brand accent colors the owner can choose from in Settings.
 *
 * The actual color values live in `globals.css` under `:root[data-accent=…]`
 * — this module only knows the *names*, plus a swatch hex for the Settings
 * picker itself (a `<span>` can't read a CSS variable that only exists under a
 * different `data-accent` than the page currently has). Keep the two in sync:
 * adding a color means one entry here and one block there.
 *
 * This is the app's *brand* color only. Income/gain green and expense/loss red
 * are money semantics, not branding, and stay fixed whatever is chosen here —
 * see the note above `--color-positive` in globals.css.
 */
export const ACCENT_COLORS = [
  { value: "green", label: "Green", swatch: "#0c9e57" },
  { value: "blue", label: "Blue", swatch: "#2563eb" },
  { value: "violet", label: "Violet", swatch: "#7c3aed" },
  { value: "teal", label: "Teal", swatch: "#0d9488" },
  { value: "amber", label: "Amber", swatch: "#b45309" },
] as const;

export type AccentColor = (typeof ACCENT_COLORS)[number]["value"];

export const DEFAULT_ACCENT: AccentColor = "green";

/**
 * Anything unrecognized falls back to the default rather than reaching the
 * `data-accent` attribute — an unknown value there would match no CSS block
 * and silently leave the app on whatever `:root` defines, which looks like
 * "my setting didn't save" rather than an error.
 */
export function clampAccentColor(value: string | null | undefined): AccentColor {
  return ACCENT_COLORS.some((c) => c.value === value) ? (value as AccentColor) : DEFAULT_ACCENT;
}
