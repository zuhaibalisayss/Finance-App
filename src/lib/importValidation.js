// Shared import/restore validation. Treats every imported file as untrusted.
// Runs entirely offline. No secrets are logged.

const MAX_RECORDS = 5000; // total records across all sections in one import
const MAX_PER_SECTION = 2000;
const MAX_STRING_LEN = 5000;

// Allowlist of importable sections and the fields a record may carry.
// Any other top-level key or field is dropped before the record is written.
export const IMPORTABLE_SECTIONS = {
  Account: ["name", "type", "institution", "nickname", "opening_balance", "currency", "opening_date", "status", "notes", "masked"],
  Transaction: ["date", "account_id", "to_account_id", "category", "type", "amount", "currency", "description", "reference", "linked_entity", "notes"],
  Investment: ["name", "asset_type", "institution", "ticker", "exchange", "fund_category", "purchase_date", "currency", "current_price", "current_price_date", "price_source", "notes", "active"],
  InvestmentTransaction: ["investment_id", "type", "date", "quantity", "price", "amount", "fees", "notes"],
  Business: ["name", "industry", "ownership_pct", "initial_capital", "estimated_value", "value_date", "currency", "notes"],
  BusinessTransaction: ["business_id", "type", "date", "amount", "category", "description", "notes"],
  Asset: ["name", "type", "value", "date", "institution", "interest_rate", "notes"],
  Liability: ["name", "type", "balance", "date", "institution", "interest_rate", "due_date", "notes"],
  Goal: ["name", "target_amount", "current_amount", "target_date", "priority", "monthly_contribution", "notes"],
  Budget: ["category", "amount", "period", "rollover"],
  NetWorthSnapshot: ["date", "assets", "liabilities", "net_worth", "source"],
};

function coerceString(s) {
  if (s == null) return undefined;
  const v = typeof s === "string" ? s : String(s);
  return v.length > MAX_STRING_LEN ? v.slice(0, MAX_STRING_LEN) : v;
}

// validateImport(parsed) -> { fatal, warnings, counts, cleaned }
// fatal: null or a string explaining why the import must be rejected entirely.
// warnings: non-fatal issues (unknown sections, skipped bad records).
// counts: { section: recordCount } for sections that will be imported.
// cleaned: { section: [sanitizedPayload, ...] } safe to create().
export function validateImport(parsed) {
  const warnings = [];
  const counts = {};

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { fatal: "Invalid file: expected a JSON object.", warnings, counts, cleaned: {} };
  }

  let total = 0;
  for (const key of Object.keys(parsed)) {
    if (key === "_meta") continue;
    if (!IMPORTABLE_SECTIONS[key]) {
      warnings.push(`Unknown section ignored: ${key}`);
      continue;
    }
    const arr = parsed[key];
    if (!Array.isArray(arr)) {
      warnings.push(`Section ${key} is not an array; skipped.`);
      continue;
    }
    if (total + arr.length > MAX_RECORDS) {
      return { fatal: `Import too large: exceeds ${MAX_RECORDS} total records.`, warnings, counts, cleaned: {} };
    }
    if (arr.length > MAX_PER_SECTION) {
      warnings.push(`Section ${key} exceeds ${MAX_PER_SECTION} records; skipped.`);
      continue;
    }
    total += arr.length;
    counts[key] = arr.length;
  }

  const cleaned = {};
  for (const [key, arr] of Object.entries(parsed)) {
    if (!isImportable(key) || !Array.isArray(arr)) continue;
    if (arr.length > MAX_PER_SECTION) continue;
    const allowed = IMPORTABLE_SECTIONS[key];
    cleaned[key] = arr
      .map((rec, idx) => {
        if (!rec || typeof rec !== "object" || Array.isArray(rec)) {
          warnings.push(`${key}[${idx}]: not an object; skipped.`);
          return null;
        }
        const out = {};
        for (const f of allowed) {
          if (!(f in rec)) continue;
          const v = rec[f];
          if (typeof v === "number") out[f] = isFinite(v) ? v : 0;
          else if (typeof v === "boolean") out[f] = v;
          else if (v == null) {
            // skip null/undefined fields
          } else {
            out[f] = coerceString(v);
          }
        }
        return out;
      })
      .filter(Boolean);
  }

  return { fatal: null, warnings, counts, cleaned };
}

function isImportable(key) {
  return Object.prototype.hasOwnProperty.call(IMPORTABLE_SECTIONS, key);
}