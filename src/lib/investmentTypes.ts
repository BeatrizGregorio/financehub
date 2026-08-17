import type { Dict } from "@/lib/i18n";

// Investment taxonomy, tax tables, and per-subtype behavior flags, transcribed
// from the "Controle Financeiro" investment system spec. Excludes anything
// related to live price APIs (brapi/CoinGecko/BCB/Tesouro Direto) — every
// current-value/price input in this app is manual, per the owner's choice.

export type InvestmentTypeValue = "renda-fixa" | "fundo" | "acao" | "cripto" | "outro";

export const INVESTMENT_TYPES: { value: InvestmentTypeValue; color: string }[] = [
  { value: "renda-fixa", color: "#2e7d50" },
  { value: "fundo", color: "#3d6b9e" },
  { value: "acao", color: "#8C2D3F" },
  { value: "cripto", color: "#a87b3a" },
  { value: "outro", color: "#7a6855" },
];

/**
 * Display labels live in the dictionary (src/lib/i18n.ts), keyed by the same
 * `value` that's persisted in Investment.type/subtype — so a label can be
 * translated without touching a single stored row. Falling back to the raw
 * key means a holding saved under a value we no longer know still renders
 * something identifiable rather than blank.
 */
export function typeLabel(type: string, t: Dict): string {
  return t.types[type] ?? type;
}

export function typeColor(type: string): string {
  return INVESTMENT_TYPES.find((t) => t.value === type)?.color ?? "#7a6855";
}

const TYPE_ICONS: Record<InvestmentTypeValue, string> = {
  "renda-fixa": "landmark",
  fundo: "layers",
  acao: "trending-up",
  cripto: "bitcoin",
  outro: "package",
};

export function typeIconName(type: string): string {
  return TYPE_ICONS[type as InvestmentTypeValue] ?? "package";
}

/**
 * How a holding's current value is determined once live-price lookups are
 * excluded (see currentValue() in investments.ts for the full chain):
 * - "unit": manual price × quantity (per-unit price — shares, coins, TD titles)
 * - "direct": the manual entry *is* the current total value (MTM balance)
 * Both fall back to accrual (or, for "unit" on ação/cripto specifically, to
 * flat amountInvested) when no manual value has ever been entered.
 */
export type ValuationMode = "unit" | "direct";

export type SubtypeConfig = {
  value: string;
  irExempt: boolean;
  valuationMode: ValuationMode;
  /** Tesouro Direto titles fall back to accrual, not flat amountInvested, when unpriced. */
  fallback: "amountInvested" | "accrual";
};

export const RENDA_FIXA_SUBTYPES: SubtypeConfig[] = [
  { value: "cdb", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "lci", irExempt: true, valuationMode: "direct", fallback: "accrual" },
  { value: "lca", irExempt: true, valuationMode: "direct", fallback: "accrual" },
  { value: "poupanca", irExempt: true, valuationMode: "direct", fallback: "accrual" },
  { value: "tesouro-selic", irExempt: false, valuationMode: "unit", fallback: "accrual" },
  { value: "tesouro-ipca", irExempt: false, valuationMode: "unit", fallback: "accrual" },
  { value: "tesouro-pre", irExempt: false, valuationMode: "unit", fallback: "accrual" },
  { value: "tesouro-renda", irExempt: false, valuationMode: "unit", fallback: "accrual" },
  { value: "tesouro-educa", irExempt: false, valuationMode: "unit", fallback: "accrual" },
  { value: "ntn-f", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "debenture-incent", irExempt: true, valuationMode: "direct", fallback: "accrual" },
  { value: "debenture-comum", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "cri", irExempt: true, valuationMode: "direct", fallback: "accrual" },
  { value: "cra", irExempt: true, valuationMode: "direct", fallback: "accrual" },
  { value: "outro-rf", irExempt: false, valuationMode: "direct", fallback: "accrual" },
];

export const FUNDO_SUBTYPES: SubtypeConfig[] = [
  { value: "fidc", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "fidc-sub", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "fii-fechado", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "fi-infra", irExempt: true, valuationMode: "direct", fallback: "accrual" },
  { value: "fi-agro", irExempt: true, valuationMode: "direct", fallback: "accrual" },
  { value: "fundo-rf", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "fundo-mm", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "fundo-acoes", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "outro-fundo", irExempt: false, valuationMode: "direct", fallback: "accrual" },
];

export function subtypesForType(type: string): SubtypeConfig[] {
  if (type === "renda-fixa") return RENDA_FIXA_SUBTYPES;
  if (type === "fundo") return FUNDO_SUBTYPES;
  return [];
}

export function subtypeConfig(type: string, subtype: string | null | undefined): SubtypeConfig | null {
  if (!subtype) return null;
  return subtypesForType(type).find((s) => s.value === subtype) ?? null;
}

export function subtypeLabel(
  type: string,
  subtype: string | null | undefined,
  t: Dict,
): string | null {
  if (!subtypeConfig(type, subtype)) return null;
  return t.subtypes[subtype as string] ?? subtype ?? null;
}

export function indexadorLabel(value: string, t: Dict): string {
  return t.indexadores[value] ?? value;
}

const TESOURO_SUBTYPES = new Set([
  "tesouro-selic",
  "tesouro-ipca",
  "tesouro-pre",
  "tesouro-renda",
  "tesouro-educa",
]);

export function isTesouroDireto(subtype: string | null | undefined): boolean {
  return Boolean(subtype && TESOURO_SUBTYPES.has(subtype));
}

/** Valuation mode + no-manual-value fallback for a given holding's type/subtype. */
export function valuation(type: string, subtype: string | null | undefined): { mode: ValuationMode; fallback: "amountInvested" | "accrual" } {
  if (type === "acao" || type === "cripto") return { mode: "unit", fallback: "amountInvested" };
  const cfg = subtypeConfig(type, subtype);
  if (cfg) return { mode: cfg.valuationMode, fallback: cfg.fallback };
  // fundo (all subtypes) and outro/renda-fixa without a recognized subtype yet.
  return { mode: "direct", fallback: "accrual" };
}

/** Whether the add/edit form shows the Quantidade + Preço de compra fields. */
export function showsPosition(type: string, subtype: string | null | undefined): boolean {
  if (type === "acao" || type === "cripto" || type === "fundo") return true;
  return isTesouroDireto(subtype);
}

/** Whether the add/edit form shows the indexador/taxa/spread rate fields. */
export function showsRateFields(type: string): boolean {
  return type === "renda-fixa" || type === "fundo";
}

export function showsAdminFee(type: string): boolean {
  return type === "renda-fixa" || type === "fundo" || type === "acao";
}

export function showsPerfFee(type: string): boolean {
  return type === "fundo";
}

export function showsMaturityDate(type: string): boolean {
  return type === "renda-fixa" || type === "fundo";
}

export function showsSymbol(type: string): boolean {
  return type === "acao" || type === "cripto";
}

export function showsExpectedReturn(type: string): boolean {
  return type === "outro";
}

export function showsCorretagem(type: string): boolean {
  return type === "acao" || type === "cripto";
}

export function isIrExempt(type: string, subtype: string | null | undefined): boolean {
  return subtypeConfig(type, subtype)?.irExempt ?? false;
}

export const INDEXADOR_OPTIONS: { value: string }[] = [
  { value: "prefixada" },
  { value: "cdi-pct" },
  { value: "cdi-plus" },
  { value: "ipca-plus" },
  { value: "selic-pct" },
];

export function rateFieldLabel(indexador: string | null | undefined, t: Dict): string {
  if (indexador === "cdi-pct") return t.indexadores["cdi-pct"];
  if (indexador === "selic-pct") return t.indexadores["selic-pct"];
  return t.indexadores.rateLabel;
}

export function showsSpreadField(indexador: string | null | undefined): boolean {
  return indexador === "cdi-plus" || indexador === "ipca-plus";
}

export function showsRateField(indexador: string | null | undefined): boolean {
  return !showsSpreadField(indexador);
}

// ─── Tax tables ─────────────────────────────────────────────────────────────
// Estimates only — not tax filing guidance. See the disclaimer surfaced next
// to gain/loss figures wherever these are used.

/** Regressive IOF %, indexed by day held (index 0 = day 1) for the first 30 days. */
export const IOF_TABLE = [
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20,
  16, 13, 10, 6, 3, 0,
];

export function iofRate(holdingDays: number): number {
  if (holdingDays >= 30) return 0;
  const index = Math.min(29, Math.max(0, Math.floor(holdingDays)));
  return IOF_TABLE[index] / 100;
}

/** IR % on the gain, given type/subtype/holding period. */
export function irRate(type: string, subtype: string | null | undefined, holdingDays: number): number {
  if (isIrExempt(type, subtype)) return 0;
  if (type === "acao" || type === "cripto") return 0.15;
  if (type === "fundo") return 0; // simplified — come-cotas not modeled
  if (holdingDays <= 180) return 0.225;
  if (holdingDays <= 360) return 0.2;
  if (holdingDays <= 720) return 0.175;
  return 0.15;
}
