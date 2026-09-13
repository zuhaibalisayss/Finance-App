import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useFinanceData } from "@/lib/useFinanceData";
import { formatMoney, netWorth, accountsSummary, portfolioSummary, businessPortfolioSummary } from "@/lib/finance";
import { audit } from "@/lib/store";
import { SectionHeader, StatCard, Badge } from "@/components/ui/finance";
import { Button } from "@/components/ui/button";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function NetWorthPage() {
  const { data, loading, reload } = useFinanceData();

  const nw = useMemo(() => data ? netWorth(data) : null, [data]);
  const chart = useMemo(() => {
    if (!data) return [];
    const snaps = (data.snapshots || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    return snaps.map((s) => ({ date: new Date(s.date).toLocaleDateString(), netWorth: s.net_worth, assets: s.assets, liabilities: s.liabilities }));
  }, [data]);

  const snapshot = async () => {
    if (!nw) return;
    await base44.entities.NetWorthSnapshot.create({
      date: new Date().toISOString(), assets: nw.totalAssets, liabilities: nw.totalLiabilities, net_worth: nw.netWorth, source: "calculated",
    });
    await audit("net_worth_snapshot", `Snapshot: ${formatMoney(nw.netWorth)}`);
    reload();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  if (!nw) return null;

  const prev = chart.length >= 2 ? chart[chart.length - 2].netWorth : 0;
  const change = prev ? ((nw.netWorth - prev) / Math.abs(prev)) * 100 : 0;

  return (
    <div className="space-y-6">
      <SectionHeader title="Net Worth" description="Net worth = Total Assets − Total Liabilities, computed live from all your recorded data."
        action={<Button onClick={snapshot}>Save Snapshot</Button>} />

      <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-6">
        <div className="text-sm text-muted-foreground mb-1">Total Net Worth</div>
        <div className="flex items-end gap-3 flex-wrap">
          <span className="text-4xl font-heading font-bold">{formatMoney(nw.netWorth)}</span>
          {chart.length >= 2 && <Badge tone={change >= 0 ? "positive" : "negative"}>{change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}% vs last snapshot</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Cash & Liquid" value={formatMoney(nw.cash)} />
        <StatCard label="Investments" value={formatMoney(nw.portfolio)} />
        <StatCard label="Business Value" value={formatMoney(nw.business)} />
        <StatCard label="Other Assets" value={formatMoney(nw.assets)} />
        <StatCard label="Total Assets" value={formatMoney(nw.totalAssets)} tone="positive" />
        <StatCard label="Total Liabilities" value={formatMoney(nw.totalLiabilities)} tone="negative" />
        <StatCard label="Assets − Liabilities" value={formatMoney(nw.netWorth)} />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="text-sm font-medium mb-2">Net Worth Timeline</div>
        {chart.length === 0 ? (
          <div className="text-sm text-muted-foreground py-10 text-center">No snapshots yet. Click "Save Snapshot" to start building your net-worth history.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Line type="monotone" dataKey="netWorth" stroke="#6366f1" strokeWidth={2} dot />
              <Line type="monotone" dataKey="assets" stroke="#10b981" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="liabilities" stroke="#ef4444" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}