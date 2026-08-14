"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/15 px-4 py-10 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-[22px] border border-black/[0.07] bg-white p-6 shadow-[var(--shadow-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--color-ink)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-muted)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)]"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
