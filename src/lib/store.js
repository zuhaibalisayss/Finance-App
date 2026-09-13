import { base44 } from "@/api/base44Client";

// Append an audit log entry. Never logs secrets.
export async function audit(action, details = "") {
  try {
    await base44.entities.AuditLog.create({
      timestamp: new Date().toISOString(),
      action,
      details: String(details || ""),
    });
  } catch (e) {
    // Audit logging must never break the user's operation.
    console.warn("audit log failed", e);
  }
}

// Local settings helpers (currency, theme, session timeout, allocations).
export function getSetting(key, fallback) {
  try {
    const v = localStorage.getItem("pf_" + key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function setSetting(key, value) {
  try {
    localStorage.setItem("pf_" + key, JSON.stringify(value));
  } catch {}
}

export const INCOME_CATEGORIES = [
  "salary", "business_income", "freelance", "dividends", "interest",
  "investment_sale", "gifts", "refunds", "other_income",
];

export const EXPENSE_CATEGORIES = [
  "food", "groceries", "rent", "utilities", "transport", "education",
  "health", "entertainment", "shopping", "subscriptions", "business",
  "investment", "debt_payment", "other",
];

export const ACCOUNT_TYPES = [
  { value: "bank", label: "Bank Account" },
  { value: "savings", label: "Savings Account" },
  { value: "emergency", label: "Emergency Fund" },
  { value: "cash", label: "Cash in Hand" },
  { value: "wallet", label: "Wallet" },
  { value: "other", label: "Other Liquid Account" },
];

export const ASSET_TYPES = [
  { value: "stock", label: "Stocks" },
  { value: "bond", label: "Bonds" },
  { value: "mutual_fund", label: "Mutual Funds" },
  { value: "etf", label: "ETFs" },
  { value: "crypto", label: "Crypto" },
  { value: "commodity", label: "Commodities" },
  { value: "real_estate", label: "Real Estate" },
  { value: "reit", label: "REITs" },
  { value: "business", label: "Business" },
  { value: "other", label: "Other Assets" },
];

export function maskId(id) {
  if (!id) return "";
  const s = String(id);
  return "**** " + s.slice(-4);
}