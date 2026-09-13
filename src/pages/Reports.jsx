import React, { useMemo, useState } from "react";
import { useFinanceData } from "@/lib/useFinanceData";
import { formatMoney, formatPct, netWorth, accountsSummary, monthlyFigures, portfolioSummary, businessPortfolioSummary } from "@/lib/finance";
import { getSetting } from "@/lib/store";
import { SectionHeader } from "@/components/ui/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildPDFReport, downloadPDF, toCSV, downloadFile, sanitizeForCSV } from "@/lib/exporters";
import { audit } from "@/lib/store";
import { FileText, Download } from "lucide-react";

const PERIODS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom Range" },
];

export default function Reports() {
  const { data, loading } = useFinanceData();
  const [period, setPeriod] = useState("monthly");
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const range = useMemo(() => {
    const f = new Date(from);
    const t = new Date(to);
    t.setHours(23, 59, 59, 999);
    return { f, t };
  }, [from, to]);

  const report = useMemo(() => {
    if (!data) return null;
    const txs = (data.transactions || []).filter((t) => {
      const d = new Date(t.date);
      return d >= range.f && d <= range.t;
    });
    let income = 0, expense = 0, transfers = 0, savings = 0, investments = 0, dividends = 0, business = 0;
    const byCategory = {};
    txs.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === "income" || t.type === "interest") income += amt;
      else if (t.type === "expense") expense += amt;
      else if (t.type === "transfer") transfers += amt;
      else if (t.type === "investment_contribution") investments += amt;
      else if (t.type === "investment_withdrawal") investments -= amt;
      else if (t.type === "business_contribution") business += amt;
      else if (t.type === "business_withdrawal") business -= amt;
      else if (t.type === "dividend") dividends += amt;
      const cat = t.category || t.type;
      byCategory[cat] = (byCategory[cat] || 0) + (t.type === "income" ? amt : t.type === "expense" ? amt : 0);
    });
    savings = income - expense - investments - business;
    const nw = netWorth(data);
    const cash = accountsSummary(data.accounts, data.transactions);
    const portfolio = portfolioSummary(data.investments, data.investmentTransactions);
    const bp = businessPortfolioSummary(data.businesses, data.businessTransactions);
    return { txs, income, expense, transfers, savings, investments, dividends, business, byCategory, nw, cash, portfolio, bp };
  }, [data, range]);

  const periodLabel = period === "custom"
    ? `${from} to ${to}`
    : period === "weekly" ? "Last 7 days"
    : period === "yearly" ? "This year"
    : "This month";

  const exportPDF = () => {
    if (!report) return;
    const doc = buildPDFReport({
      title: "Financial Report",
      period: periodLabel,
      currency: getSetting("currency", "PKR"),
      generatedAt: new Date().toLocaleString(),
      sections: [
        { heading: "Summary", rows: [
          { label: "Income", value: formatMoney(report.income) },
          { label: "Expenses", value: formatMoney(report.expense) },
          { label: "Transfers (not income/expense)", value: formatMoney(report.transfers) },
          { label: "Savings", value: formatMoney(report.savings) },
          { label: "Investments", value: formatMoney(report.investments) },
          { label: "Dividends/Income", value: formatMoney(report.dividends) },
          { label: "Business", value: formatMoney(report.business) },
          { label: "Net Cash Flow", value: formatMoney(report.income - report.expense) },
        ]},
        { heading: "Net Worth", rows: [
          { label: "Total Assets", value: formatMoney(report.nw.totalAssets) },
          { label: "Total Liabilities", value: formatMoney(report.nw.totalLiabilities) },
          { label: "Net Worth", value: formatMoney(report.nw.netWorth) },
        ]},
        { heading: "Cash Position", rows: [
          { label: "Bank Balance", value: formatMoney(report.cash.bank) },
          { label: "Savings", value: formatMoney(report.cash.savings) },
          { label: "Emergency Fund", value: formatMoney(report.cash.emergency) },
          { label: "Cash in Hand", value: formatMoney(report.cash.cash) },
        ]},
        { heading: "Portfolio", rows: [
          { label: "Total Invested", value: formatMoney(report.portfolio.totalInvested) },
          { label: "Current Value", value: formatMoney(report.portfolio.currentValue) },
          { label: "Unrealized P/L", value: formatMoney(report.portfolio.unrealized) },
          { label: "ROI", value: formatPct(report.portfolio.roi) },
        ]},
        { heading: "Business", rows: [
          { label: "Capital Invested", value: formatMoney(report.bp.totalCapital) },
          { label: "Est. Value", value: formatMoney(report.bp.totalValue) },
          { label: "Profit", value: formatMoney(report.bp.totalProfit) },
        ]},
        { heading: "Expense Breakdown", table: {
          headers: ["Category", "Amount"],
          rows: Object.entries(report.byCategory).filter(([k]) => k).map(([k, v]) => [k, formatMoney(v)]),
        }},
        { heading: "Transactions", table: {
          headers: ["Date", "Description", "Type", "Amount"],
          rows: report.txs.slice(0, 200).map((t) => [new Date(t.date).toLocaleDateString(), t.description || "", t.type, formatMoney(t.amount)]),
        }},
        { disclaimer: "Note: Market valuations shown are manually entered or locally imported. They are not live market data." },
      ],
    });
    downloadPDF(`financial-report-${period}-${new Date().toISOString().slice(0, 10)}.pdf`, doc);
    audit("report_export", `PDF ${period}`);
  };

  const exportCSV = () => {
    if (!report) return;
    const rows = report.txs.map((t) => ({
      date: new Date(t.date).toLocaleString(),
      description: t.description || "",
      type: t.type,
      category: t.category || "",
      account: data.accounts.find((a) => a.id === t.account_id)?.name || "",
      amount: t.amount,
    }));
    const csv = toCSV(rows, [
      { label: "Date", get: (r) => r.date }, { label: "Description", get: (r) => r.description },
      { label: "Type", get: (r) => r.type }, { label: "Category", get: (r) => r.category },
      { label: "Account", get: (r) => r.account }, { label: "Amount", get: (r) => r.amount },
    ]);
    downloadFile(`transactions-${period}-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv");
    audit("report_export", `CSV ${period}`);
  };

  if (loading || !report) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Reports" description="Generate weekly, monthly, yearly, or custom-range financial reports and export to PDF or Excel (CSV). Reports are generated locally." />

      <div className="rounded-lg border bg-card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <Label>Period</Label>
          <Select value={period} onValueChange={(v) => {
            setPeriod(v);
            const now = new Date();
            if (v === "weekly") { setFrom(new Date(now.getTime() - 604800000).toISOString().slice(0, 10)); setTo(now.toISOString().slice(0, 10)); }
            else if (v === "monthly") { setFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)); setTo(now.toISOString().slice(0, 10)); }
            else if (v === "yearly") { setFrom(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)); setTo(now.toISOString().slice(0, 10)); }
          }}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>{PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {period === "custom" && (
          <>
            <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </>
        )}
        <Button onClick={exportPDF}><FileText className="w-4 h-4 mr-1" /> Export PDF</Button>
        <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> Export Excel (CSV)</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground uppercase">Income</div><div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(report.income)}</div></div>
        <div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground uppercase">Expenses</div><div className="text-xl font-semibold text-red-600 dark:text-red-400">{formatMoney(report.expense)}</div></div>
        <div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground uppercase">Savings</div><div className="text-xl font-semibold">{formatMoney(report.savings)}</div></div>
        <div className="rounded-lg border p-4"><div className="text-xs text-muted-foreground uppercase">Net Cash Flow</div><div className="text-xl font-semibold">{formatMoney(report.income - report.expense)}</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium mb-3">Expense Breakdown by Category</div>
          {Object.keys(report.byCategory).length === 0 ? <div className="text-sm text-muted-foreground">No expenses in this period.</div> : (
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(report.byCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <tr key={k} className="border-b last:border-0"><td className="py-1.5">{k}</td><td className="py-1.5 text-right">{formatMoney(v)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium mb-3">Net Worth</div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b"><td className="py-1.5">Total Assets</td><td className="py-1.5 text-right text-emerald-600 dark:text-emerald-400">{formatMoney(report.nw.totalAssets)}</td></tr>
              <tr className="border-b"><td className="py-1.5">Total Liabilities</td><td className="py-1.5 text-right text-red-600 dark:text-red-400">{formatMoney(report.nw.totalLiabilities)}</td></tr>
              <tr><td className="py-1.5 font-medium">Net Worth</td><td className="py-1.5 text-right font-semibold">{formatMoney(report.nw.netWorth)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="text-sm font-medium mb-3">Transactions ({report.txs.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase"><tr><th className="text-left py-1.5">Date</th><th className="text-left">Description</th><th className="text-left">Type</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {report.txs.slice(0, 100).map((t) => (
                <tr key={t.id} className="border-t"><td className="py-1.5">{new Date(t.date).toLocaleDateString()}</td><td>{t.description || "—"}</td><td>{t.type}</td><td className="text-right">{formatMoney(t.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}