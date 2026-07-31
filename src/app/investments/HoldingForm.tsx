"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createHolding, updateHolding, type ActionState } from "./actions";
import { toDateInputValue } from "@/lib/format";
import {
  INVESTMENT_TYPES,
  INDEXADOR_OPTIONS,
  subtypesForType,
  showsPosition,
  showsRateFields,
  showsAdminFee,
  showsPerfFee,
  showsMaturityDate,
  showsSymbol,
  showsExpectedReturn,
  showsCorretagem,
  showsSpreadField,
  showsRateField,
  rateFieldLabel,
  type InvestmentTypeValue,
} from "@/lib/investmentTypes";
import type { Holding } from "./InvestmentsClient";

const INPUT =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[var(--color-ink)] focus:bg-white";
const LABEL = "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)]";
const SECTION_LABEL = "mb-2 text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase";

function positionLabels(type: InvestmentTypeValue) {
  if (type === "fundo") return { quantity: "Nº de cotas", price: "Cotação na compra" };
  if (type === "renda-fixa") return { quantity: "Quantidade de títulos", price: "PU na compra" };
  return { quantity: "Quantidade", price: "Preço médio de compra" };
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_4px_16px_rgba(12,158,87,0.28)] transition hover:brightness-105 active:scale-95 disabled:opacity-50"
      style={{ background: "linear-gradient(135deg, #0c9e57, #0a7a43)" }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function HoldingForm({ holding, onDone }: { holding?: Holding; onDone?: () => void }) {
  const isEditing = Boolean(holding);
  const formId = useId();

  const [type, setType] = useState<InvestmentTypeValue>(
    (holding?.type as InvestmentTypeValue) ?? "renda-fixa",
  );
  const [subtype, setSubtype] = useState(
    holding?.subtype ?? subtypesForType((holding?.type as InvestmentTypeValue) ?? "renda-fixa")[0]?.value ?? "",
  );
  const [indexador, setIndexador] = useState(holding?.indexador ?? "prefixada");
  const [quantity, setQuantity] = useState(holding?.quantity != null ? String(holding.quantity) : "");
  const [purchaseRef, setPurchaseRef] = useState(
    holding?.purchaseRef != null ? String(holding.purchaseRef) : "",
  );
  const [amountInvested, setAmountInvested] = useState(
    holding?.amountInvested != null ? String(holding.amountInvested) : "",
  );
  const [amountTouched, setAmountTouched] = useState(false);

  const subtypes = subtypesForType(type);
  const labels = positionLabels(type);

  function recalcAmount(nextQuantity: string, nextPurchaseRef: string) {
    if (amountTouched) return;
    const q = Number(nextQuantity);
    const p = Number(nextPurchaseRef);
    if (nextQuantity && nextPurchaseRef && !Number.isNaN(q) && !Number.isNaN(p)) {
      setAmountInvested(String(Math.round(q * p * 100) / 100));
    }
  }

  const action = isEditing ? updateHolding.bind(null, holding!.id) : createHolding;
  const initialState: ActionState = {};
  const [state, formAction] = useActionState(action, initialState);
  const [submitCount, setSubmitCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (submitCount === 0 || state.error) return;
    onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={() => setSubmitCount((c) => c + 1)}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label htmlFor={`${formId}-name`} className={LABEL}>
          Nome
        </label>
        <input
          id={`${formId}-name`}
          name="name"
          type="text"
          maxLength={80}
          required
          defaultValue={holding?.name}
          placeholder="e.g. CDB Nubank 12 meses"
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-type`} className={LABEL}>
          Tipo
        </label>
        <select
          id={`${formId}-type`}
          name="type"
          required
          value={type}
          onChange={(e) => {
            const nextType = e.target.value as InvestmentTypeValue;
            setType(nextType);
            setSubtype(subtypesForType(nextType)[0]?.value ?? "");
          }}
          className={INPUT}
        >
          {INVESTMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${formId}-startDate`} className={LABEL}>
          Data de início
        </label>
        <input
          id={`${formId}-startDate`}
          name="startDate"
          type="date"
          required
          defaultValue={toDateInputValue(holding?.startDate ?? new Date())}
          className={INPUT}
        />
      </div>

      {subtypes.length > 0 && (
        <div>
          <label htmlFor={`${formId}-subtype`} className={LABEL}>
            Subtipo
          </label>
          <select
            id={`${formId}-subtype`}
            name="subtype"
            required
            value={subtype}
            onChange={(e) => setSubtype(e.target.value)}
            className={INPUT}
          >
            {subtypes.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {showsSymbol(type) && (
        <div>
          <label htmlFor={`${formId}-symbol`} className={LABEL}>
            Ticker / símbolo
          </label>
          <input
            id={`${formId}-symbol`}
            name="symbol"
            type="text"
            maxLength={20}
            defaultValue={holding?.symbol ?? ""}
            placeholder={type === "cripto" ? "e.g. bitcoin" : "e.g. PETR4"}
            className={INPUT}
          />
        </div>
      )}

      {showsMaturityDate(type) && (
        <div>
          <label htmlFor={`${formId}-maturityDate`} className={LABEL}>
            Data de vencimento (opcional)
          </label>
          <input
            id={`${formId}-maturityDate`}
            name="maturityDate"
            type="date"
            defaultValue={holding?.maturityDate ? toDateInputValue(holding.maturityDate) : ""}
            className={INPUT}
          />
        </div>
      )}

      {showsRateFields(type) && (
        <div className="rounded-xl bg-[var(--color-inset-2)] p-3.5 sm:col-span-2">
          <p className={SECTION_LABEL}>Rendimento</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <div className="w-full sm:w-auto sm:flex-1">
              <label htmlFor={`${formId}-indexador`} className={LABEL}>
                Indexador
              </label>
              <select
                id={`${formId}-indexador`}
                name="indexador"
                required
                value={indexador}
                onChange={(e) => setIndexador(e.target.value)}
                className={INPUT}
              >
                {INDEXADOR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {showsRateField(indexador) && (
              <div className="w-full sm:w-auto sm:flex-1">
                <label htmlFor={`${formId}-annualRate`} className={LABEL}>
                  {rateFieldLabel(indexador)}
                </label>
                <input
                  id={`${formId}-annualRate`}
                  name="annualRate"
                  type="number"
                  step="0.01"
                  defaultValue={holding?.annualRate ?? ""}
                  placeholder="0.00"
                  className={INPUT}
                />
              </div>
            )}

            {showsSpreadField(indexador) && (
              <div className="w-full sm:w-auto sm:flex-1">
                <label htmlFor={`${formId}-spread`} className={LABEL}>
                  Spread (% a.a.)
                </label>
                <input
                  id={`${formId}-spread`}
                  name="spread"
                  type="number"
                  step="0.01"
                  defaultValue={holding?.spread ?? ""}
                  placeholder="0.00"
                  className={INPUT}
                />
              </div>
            )}

            {showsPerfFee(type) && (
              <div className="w-full sm:w-auto sm:flex-1">
                <label htmlFor={`${formId}-perfFee`} className={LABEL}>
                  Performance (%)
                </label>
                <input
                  id={`${formId}-perfFee`}
                  name="perfFee"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={holding?.perfFee ?? ""}
                  placeholder="0.00"
                  className={INPUT}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {showsAdminFee(type) && (
        <div>
          <label htmlFor={`${formId}-adminFee`} className={LABEL}>
            Taxa de administração (% a.a., opcional)
          </label>
          <input
            id={`${formId}-adminFee`}
            name="adminFee"
            type="number"
            step="0.01"
            min="0"
            defaultValue={holding?.adminFee ?? ""}
            placeholder="0.00"
            className={INPUT}
          />
        </div>
      )}

      {showsPosition(type, subtype) && (
        <>
          <div>
            <label htmlFor={`${formId}-quantity`} className={LABEL}>
              {labels.quantity}
            </label>
            <input
              id={`${formId}-quantity`}
              name="quantity"
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                recalcAmount(e.target.value, purchaseRef);
              }}
              placeholder="0"
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor={`${formId}-purchaseRef`} className={LABEL}>
              {labels.price}
            </label>
            <input
              id={`${formId}-purchaseRef`}
              name="purchaseRef"
              type="number"
              step="0.01"
              min="0"
              value={purchaseRef}
              onChange={(e) => {
                setPurchaseRef(e.target.value);
                recalcAmount(quantity, e.target.value);
              }}
              placeholder="0.00"
              className={INPUT}
            />
          </div>
        </>
      )}

      <div>
        <label htmlFor={`${formId}-amountInvested`} className={LABEL}>
          Valor investido (R$)
        </label>
        <input
          id={`${formId}-amountInvested`}
          name="amountInvested"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={amountInvested}
          onChange={(e) => {
            setAmountTouched(true);
            setAmountInvested(e.target.value);
          }}
          placeholder="0.00"
          className={INPUT}
        />
      </div>

      {showsExpectedReturn(type) && (
        <div>
          <label htmlFor={`${formId}-expectedReturn`} className={LABEL}>
            Retorno esperado (% a.a.)
          </label>
          <input
            id={`${formId}-expectedReturn`}
            name="expectedReturn"
            type="number"
            step="0.01"
            defaultValue={holding?.expectedReturn ?? ""}
            placeholder="0.00"
            className={INPUT}
          />
        </div>
      )}

      {showsCorretagem(type) && (
        <div>
          <label htmlFor={`${formId}-corretagem`} className={LABEL}>
            Corretagem estimada (R$, opcional)
          </label>
          <input
            id={`${formId}-corretagem`}
            name="corretagem"
            type="number"
            step="0.01"
            min="0"
            defaultValue={holding?.corretagem ?? ""}
            placeholder="0.00"
            className={INPUT}
          />
        </div>
      )}

      <div>
        <label htmlFor={`${formId}-institution`} className={LABEL}>
          Instituição (opcional)
        </label>
        <input
          id={`${formId}-institution`}
          name="institution"
          type="text"
          maxLength={80}
          defaultValue={holding?.institution ?? ""}
          placeholder="e.g. XP, Nubank"
          className={INPUT}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`${formId}-notes`} className={LABEL}>
          Observações (opcional)
        </label>
        <input
          id={`${formId}-notes`}
          name="notes"
          type="text"
          maxLength={200}
          defaultValue={holding?.notes ?? ""}
          placeholder="e.g. long-term hold"
          className={INPUT}
        />
      </div>

      {state.error && <p className="text-sm text-[#dc3545] sm:col-span-2">{state.error}</p>}

      <div className="flex items-center gap-4 sm:col-span-2">
        <SubmitButton
          label={isEditing ? "Save changes" : "Add holding"}
          pendingLabel={isEditing ? "Saving…" : "Adding…"}
        />
        <button
          type="button"
          onClick={onDone}
          className="text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
