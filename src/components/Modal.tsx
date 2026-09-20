"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useT } from "@/components/LanguageProvider";

/**
 * Reusable popup dialog. Rendered through a portal into document.body rather
 * than in place — this is load-bearing, not tidiness.
 *
 * The overlay is `position: fixed`, which normally positions against the
 * viewport. But an ancestor with `backdrop-filter` (or transform/filter/
 * perspective/contain) becomes the containing block for fixed descendants
 * instead, and this app's glass `CARD` style uses `backdrop-blur-xl`. So a
 * <Modal> rendered anywhere inside a card would size and centre itself
 * against that card instead of the screen — which is exactly what happened
 * to the "Definir meta" dialog inside the Meta & Projeção card. Portalling to
 * body puts the overlay outside every card, so it can't happen again no
 * matter where a future caller renders it.
 */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useT();
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // createPortal needs a real DOM node, which doesn't exist while rendering on
  // the server. Checked at render time rather than via a mounted flag in an
  // effect: no extra render, and no setState-in-effect (which this project's
  // lint config rejects). Safe for hydration because a portal contributes
  // nothing at this position in the tree either way — its children mount into
  // document.body. In practice callers only render <Modal> from state that
  // starts false, so it never renders server-side at all.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/15 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* The card never grows past the viewport; its body scrolls instead, so
          the header (title + close) is always reachable. Scrolling the overlay
          itself doesn't work here: a centred flex item taller than its
          container overflows past the *top* edge, which no scrollbar can
          reach — that's how a tall holding's detail view lost its heading. */}
      <div
        className="flex max-h-full w-full max-w-xl flex-col rounded-[22px] border border-black/[0.07] bg-[var(--color-modal)] shadow-[var(--shadow-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-base font-bold text-[var(--color-ink)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.closeDialog}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-muted)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)]"
          >
            <X size={16} />
          </button>
        </div>
        {/* min-h-0 lets this shrink below its content so overflow-y-auto can
            actually scroll — without it a flex child keeps its full height. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
