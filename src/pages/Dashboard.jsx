import React, { useMemo } from "react";
import { useFinanceData } from "@/lib/useFinanceData";
import {
  formatMoney, formatPct, changePct, netWorth, accountsSummary,
  monthlyFigures, portfolioSummary, businessPortfolioSummary, allocationFigures,
  DEFAULT_ALLOCATIONS,
} from "@/lib/finance";
import { getSetting } from "@/lib/store";
import { StatCard, SectionHeader, EmptyState, Badge } from "@/components/ui/finance";
import { Wallet, TrendingUp, Building2, AlertTriangle, Scale } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, LineChart, Line,
} from "recharts";

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function Dashboard() {
  const { data, loading } = useFinanceData();
  const now = new Date();
  const allocations = getSetting("allocations", DEFAULT_ALLOCATIONS);

  const view = useMemo(() => {
    if (!data) return null;
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const cur = monthlyFigures(data.transactions, now.getFullYear(), now.getMonth());
    const prev = monthlyFigures(data.transactions, prevMonth.getFullYear(), prevMonth.getMonth());
    const nw = netWorth(data);
    const cash = accountsSummary(data.accounts, data.transactions);
    const portfolio = portfolioSummary(data.investments, data.investmentTransactions);
    const business = businessPortfolioSummary(data.businesses, data.businessTransactions);
    return { cur, prev, nw, cash, portfolio, business };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }
  if (!view) return null;

  const nwChange = changePct(view.nw.netWorth, view.prev ? view.nw.netWorth : 0);

  // Allocation breakdown
  const allocData = allocationFigures(view.cur, view.cur.income).map((a) => ({
    name: a.label, value: Math.max(a.actual, 0), pct: a.actualPct, target: allocations[a.key] || 0,
  }));

  // Portfolio allocation by type
  const portByType = Object.entries(view.portfolio.byType).map(([k, v]) => ({ name: k, value: v }));

  // Alerts
  const alerts = [];
  if (view.cash.emergency < (getSetting("emergency_target", 0) || 0)) {
    alerts.push({ text: "Emergency fund below target", tone: "warning" });
  }
  if (view.cur.income > 0 && view.cur.expense / view.cur.income > (allocations.expenses / 100 + 0.1)) {
    alerts.push({ text: "Spending above monthly budget", tone: "negative" });
  }
  if (view.cur.income > 0 && view.cur.savings / view.cur.income < (allocations.savings / 100 - 0.05)) {
    alerts.push({ text: "Savings rate below target", tone: "warning" });
  }
  (data.liabilities || []).forEach((l) => {
    if (l.due_date) {
      const d = new Date(l.due_date);
      const days = (d - now) / 86400000;
      if (days >= 0 && days <= 7) alerts.push({ text: `Liability payment due: ${l.name}`, tone: "warning" });
    }
  });
  if ((data.transactions || []).length === 0) {
    alerts.push({ text: "Add your first transaction to start tracking", tone: "default" });
  }

  const monthlyChart = [
    { name: "Income", current: view.cur.income, previous: view.prev.income },
    { name: "Expenses", current: view.cur.expense, previous: view.prev.expense },
    { name: "Savings", current: view.cur.savings, previous: view.prev.savings },
    { name: "Investments", current: view.cur.investments, previous: view.prev.investments },
    { name: "Business", current: view.cur.business, previous: view.prev.business },
  ];

  return (
    <div className="space-y-8">
      <SectionHeader title="Dashboard" description="Your financial command center. All figures are computed live from your recorded data." />

      {/* Net Worth hero */}
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-6">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
          <Scale className="w-4 h-4" /> Total Net Worth
        </div>
        <div className="flex items-end gap-4 flex-wrap">
          <span className="text-4xl font-heading font-bold tracking-tight">
            {formatMoney(view.nw.netWorth)}
          </span>
          <Badge tone={nwChange >= 0 ? "positive" : "negative"}>
            {nwChange >= 0 ? "▲" : "▼"} {formatPct(Math.abs(nwChange))} vs prev
          </Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <StatCard label="Total Assets" value={formatMoney(view.nw.totalAssets)} tone="positive" />
          <StatCard label="Total Liabilities" value={formatMoney(view.nw.totalLiabilities)} tone="negative" />
          <StatCard label="Cash & Liquid" value={formatMoney(view.nw.cash)} />
          <StatCard label="Investments + Business" value={formatMoney(view.nw.portfolio + view.nw.business)} />
        </div>
      </div>

      {/* Cash + Monthly */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center gap-2 font-medium mb-1"><Wallet className="w-4 h-4" /> Cash Position</div>
          <StatCard label="Total Bank Balance" value={formatMoney(view.cash.bank)} />
          <StatCard label="Total Savings" value={formatMoney(view.cash.savings)} />
          <StatCard label="Emergency Fund" value={formatMoney(view.cash.emergency)} tone={view.cash.emergency < (getSetting("emergency_target", 0) || 0) ? "negative" : "positive"} />
          <StatCard label="Cash in Hand" value={formatMoney(view.cash.cash)} />
          <StatCard label="Total Liquid Assets" value={formatMoney(view.cash.totalLiquid)} tone="positive" />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="font-medium mb-3">Monthly Summary ({now.toLocaleDateString(undefined, { month: "long", year: "numeric" })})</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Income" value={formatMoney(view.cur.income)} tone="positive" sublabel={`Prev: ${formatMoney(view.prev.income)}`} />
              <StatCard label="Expenses" value={formatMoney(view.cur.expense)} tone="negative" sublabel={`Prev: ${formatMoney(view.prev.expense)}`} />
              <StatCard label="Savings" value={formatMoney(view.cur.savings)} tone={view.cur.savings >= 0 ? "positive" : "negative"} />
              <StatCard label="Net Cash Flow" value={formatMoney(view.cur.netFlow)} tone={view.cur.netFlow >= 0 ? "positive" : "negative"} />
              <StatCard label="Investments" value={formatMoney(view.cur.investments)} />
              <StatCard label="Business Inv." value={formatMoney(view.cur.business)} />
              <StatCard label="Dividends/Income" value={formatMoney(view.cur.dividends)} tone="positive" />
              <StatCard label="Savings Rate" value={formatPct(view.cur.income ? (view.cur.savings / view.cur.income) * 100 : 0)} />
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-sm font-medium mb-2">Current vs Previous Month</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Legend />
                <Bar dataKey="current" name="Current" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="previous" name="Previous" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Allocation + Portfolio + Business */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium mb-2">Income Allocation vs Targets</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={allocData.filter((d) => d.value > 0)} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {allocData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [formatMoney(v), n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {allocData.map((a, i) => (
              <div key={a.name} className="flex justify-between text-xs">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{a.name}</span>
                <span className="text-muted-foreground">{formatPct(a.pct)} · target {a.target}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-3"><TrendingUp className="w-4 h-4" /> Portfolio</div>
          <div className="space-y-2 text-sm">
            <Row label="Total Invested" value={formatMoney(view.portfolio.totalInvested)} />
            <Row label="Current Value" value={formatMoney(view.portfolio.currentValue)} />
            <Row label="Unrealized P/L" value={formatMoney(view.portfolio.unrealized)} tone={view.portfolio.unrealized >= 0 ? "positive" : "negative"} />
            <Row label="Realized P/L" value={formatMoney(view.portfolio.realized)} tone={view.portfolio.realized >= 0 ? "positive" : "negative"} />
            <Row label="ROI" value={formatPct(view.portfolio.roi)} tone={view.portfolio.roi >= 0 ? "positive" : "negative"} />
            <Row label="Dividend Income" value={formatMoney(view.portfolio.dividends)} tone="positive" />
          </div>
          {portByType.length > 0 && (
            <div className="mt-3 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={portByType} dataKey="value" nameKey="name" outerRadius={50}>
                    {portByType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-3"><Building2 className="w-4 h-4" /> Business</div>
          <div className="space-y-2 text-sm">
            <Row label="Total Capital Invested" value={formatMoney(view.business.totalCapital)} />
            <Row label="Est. Business Value" value={formatMoney(view.business.totalValue)} />
            <Row label="Total Business Profit" value={formatMoney(view.business.totalProfit)} tone={view.business.totalProfit >= 0 ? "positive" : "negative"} />
            <Row label="ROI" value={formatPct(view.business.roi)} tone={view.business.roi >= 0 ? "positive" : "negative"} />
          </div>
          {view.business.allocation.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-xs text-muted-foreground">Business Allocation</div>
              {view.business.allocation.map((b, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>{b.name} ({b.ownership}%)</span>
                  <span>{formatMoney(b.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      <div>
        <div className="flex items-center gap-2 font-medium mb-3"><AlertTriangle className="w-4 h-4" /> Alerts</div>
        {alerts.length === 0 ? (
          <div className="text-sm text-muted-foreground border rounded-lg p-4">No active alerts. Everything looks on track.</div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-2 border rounded-lg p-3 text-sm">
                <Badge tone={a.tone}>{a.tone === "negative" ? "Alert" : a.tone === "warning" ? "Warning" : "Info"}</Badge>
                <span>{a.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {(data.transactions || []).length === 0 && (data.accounts || []).length === 0 && (
        <EmptyState icon={Wallet} title="Welcome to your Wealth Manager"
          description="Start by adding your bank and savings accounts, then record income and expenses. Your dashboard numbers will appear automatically."
        />
      )}
    </div>
  );
}

function Row({ label, value, tone }) {
  const cls = tone === "positive" ? "text-emerald-600 dark:text-emerald-400"
    : tone === "negative" ? "text-red-600 dark:text-red-400" : "";
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${cls}`}>{value}</span>
    </div>
  );
}