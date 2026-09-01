"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { addCategory, removeCategory, renameCategory, type ActionState } from "./actions";
import { categoryColor } from "@/lib/categories";
import { CARD } from "@/lib/ui";
import { useT } from "@/components/LanguageProvider";

/**
 * One category chip: the name renames, the × deletes.
 *
 * The name is a button rather than the whole chip being a delete target, which
 * is what it used to be — renaming is the safer and far more common intent, so
 * it gets the bigger hit area and delete keeps the small explicit ×.
 */
function CategoryChip({ category }: { category: { id: string; name: string } }) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(
    renameCategory.bind(null, category.id),
    {} as ActionState,
  );

  // No close-on-success effect: the parent keys this component on the category
  // name, so a successful rename revalidates, the key changes, and the chip
  // remounts closed. A failed rename leaves the name alone, so the key holds
  // and the form stays open with its error — which is what you want. This also
  // sidesteps the set-state-in-effect rule rather than working around it.
  if (editing) {
    return (
      <form action={formAction} className="flex items-center gap-1.5">
        <input
          name="name"
          type="text"
          maxLength={40}
          defaultValue={category.name}
          autoFocus
          aria-label={t.settings.newNameFor(category.name)}
          className="w-[130px] rounded-full bg-[var(--color-inset)] px-3.5 py-[7px] text-[13px] outline-none focus:bg-[var(--color-surface-raised)] focus:ring-1 focus:ring-[var(--color-ink)]"
        />
        <button
          type="submit"
          className="rounded-full px-3 py-[7px] text-[12px] font-semibold text-white transition hover:brightness-105 active:scale-95"
          style={{ background: "var(--gradient-brand)" }}
        >
          {t.common.save}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-full px-2.5 py-[7px] text-[12px] font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
        >
          {t.common.cancel}
        </button>
        {state.error && (
          <span className="text-[12px] text-[var(--color-rust-text)]">{state.error}</span>
        )}
      </form>
    );
  }

  return (
    <span className="flex items-center gap-[7px] rounded-full bg-[var(--color-inset)] py-[7px] pl-3 pr-2.5 text-[13px] font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-track)]">
      <span className="h-2 w-2 shrink-0 rounded-[3px]" style={{ backgroundColor: categoryColor(category.name) }} />
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={t.settings.renameCategoryLabel(category.name)}
        className="cursor-pointer"
      >
        {category.name}
      </button>
      <form action={removeCategory.bind(null, category.id)} className="flex">
        <button
          type="submit"
          aria-label={t.settings.deleteCategoryLabel(category.name)}
          className="cursor-pointer opacity-40 transition hover:opacity-100"
        >
          <X size={13} />
        </button>
      </form>
    </span>
  );
}

export function CategoryManager({
  type,
  title,
  subtitle,
  categories,
}: {
  type: "income" | "expense";
  title: string;
  subtitle: string;
  categories: { id: string; name: string }[];
}) {
  const action = addCategory.bind(null, type);
  const initialState: ActionState = {};
  const { t } = useT();
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const submitCount = useRef(0);

  useEffect(() => {
    if (submitCount.current === 0) return;
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <div className={`${CARD} p-[22px]`}>
      <h2 className="mb-1 text-base font-extrabold tracking-tight">{title}</h2>
      <p className="mb-3.5 text-[12.5px] text-[var(--color-muted-2)]">{subtitle}</p>

      <div className="mb-3.5 flex flex-wrap gap-2">
        {categories.map((c) => (
          // Keyed on the name too: a successful rename remounts the chip closed.
          <CategoryChip key={`${c.id}-${c.name}`} category={c} />
        ))}
        {categories.length === 0 && (
          <p className="text-[13px] text-[var(--color-muted-2)]">{t.settings.noCategories}</p>
        )}
      </div>

      <form
        ref={formRef}
        action={formAction}
        onSubmit={() => (submitCount.current += 1)}
        className="flex gap-2"
      >
        <input
          name="name"
          type="text"
          maxLength={40}
          // Placeholder alone isn't an accessible name — with two of these
          // cards on the page, `title` also disambiguates expense vs income.
          aria-label={`New ${type} category name`}
          placeholder={t.settings.newCategory}
          className="flex-1 rounded-full bg-[var(--color-inset)] px-4 py-2.5 text-[13px] outline-none focus:bg-[var(--color-surface-raised)] focus:ring-1 focus:ring-[var(--color-ink)]"
        />
        <button
          type="submit"
          className="rounded-full px-[19px] text-[13px] font-semibold text-white transition hover:brightness-105 active:scale-95"
          style={{ background: "var(--gradient-brand)" }}
        >
          {t.common.add}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-[var(--color-rust-text)]">{state.error}</p>}
    </div>
  );
}
