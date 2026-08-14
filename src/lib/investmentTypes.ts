// Investment taxonomy, tax tables, and per-subtype behavior flags, transcribed
// from the "Controle Financeiro" investment system spec. Excludes anything
// related to live price APIs (brapi/CoinGecko/BCB/Tesouro Direto) — every
// current-value/price input in this app is manual, per the owner's choice.

export type InvestmentTypeValue = "renda-fixa" | "fundo" | "acao" | "cripto" | "outro";

export const INVESTMENT_TYPES: { value: InvestmentTypeValue; label: string; color: string }[] = [
  { value: "renda-fixa", label: "Fixed income", color: "#2e7d50" },
  { value: "fundo", label: "Fund", color: "#3d6b9e" },
  { value: "acao", label: "Stock / ETF", color: "#8C2D3F" },
  { value: "cripto", label: "Crypto", color: "#a87b3a" },
  { value: "outro", label: "Other", color: "#7a6855" },
];

export function typeLabel(type: string): string {
  return INVESTMENT_TYPES.find((t) => t.value === type)?.label ?? type;
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
  label: string;
  irExempt: boolean;
  valuationMode: ValuationMode;
  /** Tesouro Direto titles fall back to accrual, not flat amountInvested, when unpriced. */
  fallback: "amountInvested" | "accrual";
};

export const RENDA_FIXA_SUBTYPES: SubtypeConfig[] = [
  { value: "cdb", label: "CDB", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "lci", label: "LCI", irExempt: true, valuationMode: "direct", fallback: "accrual" },
  { value: "lca", label: "LCA", irExempt: true, valuationMode: "direct", fallback: "accrual" },
  { value: "poupanca", label: "Poupança (savings)", irExempt: true, valuationMode: "direct", fallback: "accrual" },
  { value: "tesouro-selic", label: "Tesouro Selic", irExempt: false, valuationMode: "unit", fallback: "accrual" },
  { value: "tesouro-ipca", label: "Tesouro IPCA+", irExempt: false, valuationMode: "unit", fallback: "accrual" },
  { value: "tesouro-pre", label: "Tesouro Prefixado", irExempt: false, valuationMode: "unit", fallback: "accrual" },
  { value: "tesouro-renda", label: "Tesouro Renda+", irExempt: false, valuationMode: "unit", fallback: "accrual" },
  { value: "tesouro-educa", label: "Tesouro Educa+", irExempt: false, valuationMode: "unit", fallback: "accrual" },
  { value: "ntn-f", label: "NTN-F (fixed rate w/ coupons)", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "debenture-incent", label: "Debênture (tax-exempt)", irExempt: true, valuationMode: "direct", fallback: "accrual" },
  { value: "debenture-comum", label: "Debênture (standard)", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "cri", label: "CRI", irExempt: true, valuationMode: "direct", fallback: "accrual" },
  { value: "cra", label: "CRA", irExempt: true, valuationMode: "direct", fallback: "accrual" },
  { value: "outro-rf", label: "Other fixed income", irExempt: false, valuationMode: "direct", fallback: "accrual" },
];

export const FUNDO_SUBTYPES: SubtypeConfig[] = [
  { value: "fidc", label: "FIDC / FIC-FIDC (senior share)", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "fidc-sub", label: "FIDC (subordinated share)", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "fii-fechado", label: "FII (closed-end / unlisted)", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "fi-infra", label: "FI-Infra", irExempt: true, valuationMode: "direct", fallback: "accrual" },
  { value: "fi-agro", label: "FI-Agro", irExempt: true, valuationMode: "direct", fallback: "accrual" },
  { value: "fundo-rf", label: "Fixed income fund", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "fundo-mm", label: "Multi-strategy fund", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "fundo-acoes", label: "Equity fund", irExempt: false, valuationMode: "direct", fallback: "accrual" },
  { value: "outro-fundo", label: "Other fund", irExempt: false, valuationMode: "direct", fallback: "accrual" },
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

export function subtypeLabel(type: string, subtype: string | null | undefined): string | null {
  return subtypeConfig(type, subtype)?.label ?? null;
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

export const INDEXADOR_OPTIONS: { value: string; label: string }[] = [
  { value: "prefixada", label: "Fixed rate" },
  { value: "cdi-pct", label: "% of CDI" },
  { value: "cdi-plus", label: "CDI +" },
  { value: "ipca-plus", label: "IPCA +" },
  { value: "selic-pct", label: "% of SELIC" },
];

export function rateFieldLabel(indexador: string | null | undefined): string {
  if (indexador === "cdi-pct") return "% of CDI";
  if (indexador === "selic-pct") return "% of SELIC";
  return "Rate % p.a.";
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
