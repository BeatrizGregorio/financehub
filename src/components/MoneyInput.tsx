"use client";

import { toMoneyInputValue } from "@/lib/money";

/**
 * A field for an amount of money.
 *
 * Text, not `type="number"`, because a number input silently mangles the way
 * the owner actually writes money: `25.500,75` comes out as `25.50075`. See
 * money.ts for the full story. `inputMode="decimal"` still brings up a numeric
 * keypad on a phone, so nothing is lost.
 *
 * The cost of leaving `type="number"` behind is the browser's own `min` and
 * `step` validation, which never applied to a text field. Every server action
 * that reads one of these already rejects a missing or non-positive amount
 * with a visible error, so the check moved rather than disappeared — but if
 * you add a new money field, make sure its action validates, because nothing
 * else will.
 *
 * `defaultValue` takes a number and formats it, so a stored amount can be
 * passed straight in without each call site remembering the round-trip rule.
 */
export function MoneyInput({
  defaultValue,
  ...rest
}: Omit<React.ComponentPropsWithoutRef<"input">, "type" | "defaultValue"> & {
  defaultValue?: number | string | null;
}) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      // Browsers offer street addresses and the like for an unrecognised text
      // field, which is noise over an amount.
      autoComplete="off"
      defaultValue={
        typeof defaultValue === "number" ? toMoneyInputValue(defaultValue) : (defaultValue ?? undefined)
      }
    />
  );
}
