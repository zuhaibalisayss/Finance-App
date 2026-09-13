// Centralized finance calculation engine.
// All monetary math uses JS numbers but rounds to 2 decimals to avoid float drift.
// Source data lives in entities; everything here is derived.

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const CURRENCIES = {
  PKR: { symbol: "₨", name: "Pakistani Rupee" },
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  AED: { symbol: "د.إ", name: "UAE Dirham" },
  SAR: { symbol: "﷼", name: "Saudi Riyal" },
};

export function getCurrencySetting() {
  try {
    const raw = localStorage.getItem("pf_currency");
    if (!raw) return "PKR";
    try { return JSON.parse(raw) || "PKR"; } catch { return raw; }
  } catch {
    return "PKR";
  }
}

export function formatMoney(amount, currency) {
  const cur = currency || getCurrencySetting();
  const sym = CURRENCIES[cur]?.symbol || cur + " ";
  const val = round2(amount || 0);
  const formatted = val.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${sym}${formatted}`;
}

export function formatNumber(amount) {
  return (Number(amount) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatPct(pct) {
  const v = Number(pct) || 0;
  return `${v >= 0 ? "" : ""}${v.toFixed(1)}%`;
}

// ---- Account balances ----
export function accountBalance(account, transactions) {
  if (!account) return 0;
  let bal = Number(account.opening_balance) || 0;
  (transactions || []).forEach((t) => {
    if (!t) return;
    const amt = Number(t.amount) || 0;
    if (t.account_id === account.id) {
      if (t.type === "income") bal += amt;
      else if (t.type === "expense") bal -= amt;
      else if (t.type === "transfer") bal -= amt; // outflow leg
      else if (t.type === "investment_contribution" || t.type === "business_contribution") bal -= amt;
      else if (t.type === "investment_withdrawal" || t.type === "business_withdrawal") bal += amt;
      else if (t.type === "dividend" || t.type === "interest") bal += amt;
      else if (t.type === "adjustment") bal += amt;
    } else if (t.to_account_id === account.id) {
      if (t.type === "transfer") bal += amt; // inflow leg
    }
  });
  return round2(bal);
}

export function accountsSummary(accounts, transactions) {
  const groups = { bank: 0, savings: 0, emergency: 0, cash: 0, wallet: 0, other: 0 };
  let liquid = 0;
  (accounts || []).forEach((a) => {
    const bal = accountBalance(a, transactions);
    groups[a.type] = (groups[a.type] || 0) + bal;
    liquid += bal;
  });
  return {
    bank: round2(groups.bank),
    savings: round2(groups.savings),
    emergency: round2(groups.emergency),
    cash: round2(groups.cash + groups.wallet),
    other: round2(groups.other),
    totalLiquid: round2(liquid),
  };
}

// ---- Monthly figures ----
function inMonth(dateStr, year, month) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === year && d.getMonth() === month;
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthlyFigures(transactions, year, month) {
  let income = 0, expense = 0, savings = 0, investments = 0,
    business = 0, dividends = 0, netFlow = 0;
  (transactions || []).forEach((t) => {
    if (!inMonth(t.date, year, month)) return;
    const amt = Number(t.amount) || 0;
    switch (t.type) {
      case "income": income += amt; netFlow += amt; break;
      case "expense": expense += amt; netFlow -= amt; break;
      case "investment_contribution": investments += amt; netFlow -= amt; break;
      case "investment_withdrawal": investments -= amt; netFlow += amt; break;
      case "business_contribution": business += amt; netFlow -= amt; break;
      case "business_withdrawal": business -= amt; netFlow += amt; break;
      case "dividend": dividends += amt; netFlow += amt; break;
      case "interest": income += amt; netFlow += amt; break;
      case "transfer": break;
      default: break;
    }
  });
  savings = round2(income - expense - investments - business);
  return { income: round2(income), expense: round2(expense), savings, investments: round2(investments),
    business: round2(business), dividends: round2(dividends), netFlow: round2(netFlow) };
}

// ---- Investment metrics (transaction-level cost basis) ----
export function investmentMetrics(investment, iTransactions) {
  let totalQty = 0, costBasis = 0, realizedPL = 0, dividends = 0, fees = 0, totalInvested = 0;
  (iTransactions || []).forEach((t) => {
    const qty = Number(t.quantity) || 0;
    const price = Number(t.price) || 0;
    const amt = Number(t.amount) || 0;
    const fee = Number(t.fees) || 0;
    fees += fee;
    if (t.type === "buy") {
      const cost = qty * price + fee;
      totalQty += qty;
      costBasis += cost;
      totalInvested += cost;
    } else if (t.type === "sell") {
      const avgCost = totalQty > 0 ? costBasis / totalQty : 0;
      const proceeds = qty * price - fee;
      realizedPL += proceeds - qty * avgCost;
      costBasis -= qty * avgCost;
      totalQty -= qty;
    } else if (t.type === "dividend" || t.type === "distribution") {
      dividends += amt || (qty * price);
    } else if (t.type === "split") {
      totalQty = totalQty * (price || qty || 1);
    } else if (t.type === "fee") {
      fees += amt;
    }
  });
  const currentPrice = Number(investment?.current_price) || 0;
  const currentValue = round2(totalQty * currentPrice);
  const unrealizedPL = round2(currentValue - costBasis);
  const totalCost = round2(costBasis + fees);
  const roi = totalCost > 0 ? round2((unrealizedPL / totalCost) * 100) : 0;
  return {
    quantity: round2(totalQty),
    costBasis: round2(costBasis),
    totalInvested: round2(totalInvested),
    currentValue,
    unrealizedPL,
    realizedPL: round2(realizedPL),
    dividends: round2(dividends),
    fees: round2(fees),
    totalCost,
    roi,
  };
}

export function portfolioSummary(investments, iTransactions) {
  let totalInvested = 0, currentValue = 0, realized = 0, unrealized = 0, dividends = 0, fees = 0;
  const byType = {};
  (investments || []).forEach((inv) => {
    if (!inv.active) return;
    const m = investmentMetrics(inv, iTransactions.filter((t) => t.investment_id === inv.id));
    totalInvested += m.totalInvested;
    currentValue += m.currentValue;
    realized += m.realizedPL;
    unrealized += m.unrealizedPL;
    dividends += m.dividends;
    fees += m.fees;
    byType[inv.asset_type] = (byType[inv.asset_type] || 0) + m.currentValue;
  });
  const roi = totalInvested > 0 ? round2((unrealized / totalInvested) * 100) : 0;
  return {
    totalInvested: round2(totalInvested), currentValue: round2(currentValue),
    realized: round2(realized), unrealized: round2(unrealized),
    dividends: round2(dividends), fees: round2(fees), roi,
    byType,
  };
}

// ---- Business metrics ----
export function businessMetrics(business, bTransactions) {
  let capital = Number(business?.initial_capital) || 0;
  let withdrawals = 0, revenue = 0, expenses = 0;
  (bTransactions || []).forEach((t) => {
    const amt = Number(t.amount) || 0;
    if (t.type === "capital") capital += amt;
    else if (t.type === "withdrawal") withdrawals += amt;
    else if (t.type === "revenue") revenue += amt;
    else if (t.type === "expense") expenses += amt;
  });
  const netProfit = round2(revenue - expenses);
  const invested = round2(capital - withdrawals);
  const estimatedValue = Number(business?.estimated_value) || 0;
  const pl = round2(estimatedValue - invested);
  const roi = invested > 0 ? round2((pl / invested) * 100) : 0;
  return { capital: round2(capital), withdrawals: round2(withdrawals), revenue: round2(revenue),
    expenses: round2(expenses), netProfit, invested, estimatedValue: round2(estimatedValue), pl, roi };
}

export function businessPortfolioSummary(businesses, bTransactions) {
  let totalCapital = 0, totalValue = 0, totalProfit = 0;
  const allocation = [];
  (businesses || []).forEach((b) => {
    const m = businessMetrics(b, bTransactions.filter((t) => t.business_id === b.id));
    totalCapital += m.invested;
    totalValue += m.estimatedValue;
    totalProfit += m.netProfit;
    allocation.push({ name: b.name, value: m.estimatedValue, ownership: b.ownership_pct });
  });
  const roi = totalCapital > 0 ? round2((totalProfit / totalCapital) * 100) : 0;
  return { totalCapital: round2(totalCapital), totalValue: round2(totalValue),
    totalProfit: round2(totalProfit), roi, allocation };
}

// ---- Net worth ----
export function netWorth({ accounts, transactions, investments, iTransactions, businesses, bTransactions, assets, liabilities }) {
  const cash = accountsSummary(accounts, transactions).totalLiquid;
  const portfolio = portfolioSummary(investments, iTransactions).currentValue;
  const business = businessPortfolioSummary(businesses, bTransactions).totalValue;
  const assetValue = (assets || []).reduce((s, a) => s + (Number(a.value) || 0), 0);
  const liabilityValue = (liabilities || []).reduce((s, l) => s + (Number(l.balance) || 0), 0);
  const totalAssets = round2(cash + portfolio + business + assetValue);
  const totalLiabilities = round2(liabilityValue);
  const net = round2(totalAssets - totalLiabilities);
  return { cash: round2(cash), portfolio, business: round2(business),
    assets: round2(assetValue), liabilities: totalLiabilities,
    totalAssets, totalLiabilities, netWorth: net };
}

// ---- Allocation vs targets ----
export const DEFAULT_ALLOCATIONS = {
  expenses: 50, savings: 20, emergency: 10, investments: 15, business: 5,
};

export function allocationFigures(monthly, income) {
  const base = income || 1;
  return [
    { key: "expenses", label: "Expenses", actual: monthly.expense, actualPct: round2((monthly.expense / base) * 100) },
    { key: "savings", label: "Savings", actual: monthly.savings, actualPct: round2((monthly.savings / base) * 100) },
    { key: "emergency", label: "Emergency Fund", actual: 0, actualPct: 0 },
    { key: "investments", label: "Investments", actual: monthly.investments, actualPct: round2((monthly.investments / base) * 100) },
    { key: "business", label: "Business", actual: monthly.business, actualPct: round2((monthly.business / base) * 100) },
    { key: "cash", label: "Cash Held", actual: 0, actualPct: 0 },
  ];
}

export function changePct(current, previous) {
  if (!previous) return current ? 100 : 0;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}