export const DEFAULT_EXPENSE_CATEGORIES = [
  "Groceries",
  "Rent",
  "Transport",
  "Utilities",
  "Dining Out",
  "Entertainment",
  "Health",
  "Shopping",
  "Other",
];

export const DEFAULT_INCOME_CATEGORIES = ["Salary", "Freelance", "Investment", "Gift", "Other"];

export const DEFAULT_PAYMENT_METHODS = ["Debit Card", "Credit Card", "Cash", "Bank Transfer", "Other"];

export const DEFAULT_ASSET_CLASSES = [
  "Stocks",
  "FII",
  "ETF",
  "BDR",
  "Crypto",
  "Fixed income",
  "Fund",
  "Other",
];

const CATEGORY_COLORS: Record<string, string> = {
  Rent: "#3B82F6",
  Groceries: "#F59E0B",
  Shopping: "#EC4899",
  "Dining Out": "#F97316",
  Utilities: "#14B8A6",
  Transport: "#0EA5E9",
  Entertainment: "#A855F7",
  Health: "#DC3545",
  Salary: "#0C9E57",
  Freelance: "#10B96A",
  Investment: "#3B82F6",
  Gift: "#F97316",
  Other: "#9CA3AF",
  Stocks: "#0C9E57",
  FII: "#7C3AED",
  ETF: "#3B82F6",
  BDR: "#06B6D4",
  Crypto: "#F59E0B",
  "Fixed income": "#14B8A6",
  Fund: "#EC4899",
};

const PALETTE = ["#0C9E57", "#10B96A", "#3B82F6", "#F59E0B", "#A855F7", "#F97316", "#14B8A6", "#EC4899", "#0EA5E9", "#9CA3AF"];

export function categoryColor(category: string): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

const CATEGORY_ICONS: Record<string, string> = {
  Groceries: "shopping-cart",
  Rent: "home",
  Transport: "car",
  Utilities: "zap",
  "Dining Out": "utensils",
  Entertainment: "tv",
  Health: "heart-pulse",
  Shopping: "shopping-bag",
  Salary: "arrow-down-left",
  Freelance: "briefcase",
  Investment: "trending-up",
  Gift: "gift",
  Other: "package",
};

export function categoryIconName(category: string): string {
  return CATEGORY_ICONS[category] ?? "package";
}

const ASSET_CLASS_ICONS: Record<string, string> = {
  Stocks: "trending-up",
  FII: "building",
  ETF: "layers",
  BDR: "globe",
  Crypto: "bitcoin",
  "Fixed income": "landmark",
  Fund: "briefcase",
  Other: "package",
};

export function assetClassIconName(assetClass: string): string {
  return ASSET_CLASS_ICONS[assetClass] ?? "package";
}

const METHOD_ICONS: Record<string, string> = {
  "Debit Card": "credit-card",
  "Credit Card": "credit-card",
  Cash: "banknote",
  "Bank Transfer": "landmark",
  Other: "coins",
};

export function methodIconName(method: string): string {
  return METHOD_ICONS[method] ?? "credit-card";
}
