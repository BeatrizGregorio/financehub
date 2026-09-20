"use client";

import { useEffect, useRef, type RefObject } from "react";

type ErrorState = { error?: string };

/**
 * Keeps what you typed when a form action comes back with an error.
 *
 * **React 19 clears a form's uncontrolled fields once its action finishes —
 * even when that action returned an error.** So a rejected save didn't just
 * fail, it emptied the form, and the error message could be missed entirely:
 * it reads as "I typed something and the field did nothing". On a long form
 * (a holding, an account) that means retyping everything to fix one field.
 *
 * The fix is symmetric with the reset these forms already did on success:
 * snapshot the fields as they are submitted, then put them back if the action
 * reports an error. Writing DOM values in an effect is fine here — it is not
 * setState, which is what this project's lint config rejects.
 *
 *   const keep = useKeepTypedValues(state);
 *   <form action={formAction} ref={keep.ref} onSubmit={keep.onSubmit}>
 *
 * A form that already has its own ref passes it in, and one that already has
 * an onSubmit calls `keep.onSubmit()` from inside it. Pass
 * `resetOnSuccess: false` for a settings form whose fields should keep
 * showing the values that were just saved rather than emptying.
 */
export function useKeepTypedValues(
  state: ErrorState,
  options: { formRef?: RefObject<HTMLFormElement | null>; resetOnSuccess?: boolean } = {},
) {
  const { formRef: externalRef, resetOnSuccess = true } = options;
  const ownRef = useRef<HTMLFormElement>(null);
  const formRef = externalRef ?? ownRef;
  const typed = useRef<{ el: HTMLElement; value: string; checked: boolean }[] | null>(null);
  const submits = useRef(0);

  useEffect(() => {
    // Nothing submitted yet: leave the form's own defaults alone.
    if (submits.current === 0) return;
    const form = formRef.current;
    if (!form) return;

    if (!state.error) {
      typed.current = null;
      if (resetOnSuccess) form.reset();
      return;
    }

    for (const field of typed.current ?? []) {
      if (field.el instanceof HTMLInputElement) {
        // A file input's value can't be set from script — and it's the one
        // field whose contents React's reset leaves alone anyway.
        if (field.el.type === "file") continue;
        if (field.el.type === "checkbox" || field.el.type === "radio") field.el.checked = field.checked;
        else field.el.value = field.value;
      } else if (field.el instanceof HTMLSelectElement || field.el instanceof HTMLTextAreaElement) {
        field.el.value = field.value;
      }
    }
  }, [state, formRef, resetOnSuccess]);

  function onSubmit() {
    submits.current += 1;
    const form = formRef.current;
    typed.current = form
      ? [...form.querySelectorAll<HTMLElement>("input, select, textarea")].map((el) => ({
          el,
          value: (el as HTMLInputElement).value,
          checked: (el as HTMLInputElement).checked,
        }))
      : null;
  }

  return { ref: formRef, onSubmit, formProps: { ref: formRef, onSubmit } };
}
