"use client";

import type { LucideIcon } from "lucide-react";

/**
 * An icon-only row action (edit, delete, …), shared by every table and list so
 * they can't drift apart.
 *
 * An icon with no text needs its name some other way: `aria-label` gives it to
 * screen readers and `title` shows it on hover, both from the dictionary, so
 * the name is translated like any other string.
 *
 * 28px square clears the 24px WCAG 2.2 minimum on its own, so the negative
 * margin that used to buy hit area from padding isn't needed — but it stays so
 * a taller control doesn't grow the rows it sits in.
 */
export function RowAction({
  label,
  icon: Icon,
  tone = "neutral",
  type = "button",
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  tone?: "neutral" | "danger";
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`-my-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--color-muted-2)] transition hover:bg-[var(--color-panel)] ${
        tone === "danger" ? "hover:text-[var(--color-rust-text)]" : "hover:text-[var(--color-ink)]"
      }`}
    >
      <Icon size={15} />
    </button>
  );
}
