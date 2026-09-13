import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useFinanceData } from "@/lib/useFinanceData";
import { formatMoney, formatPct, investmentMetrics, portfolioSummary } from "@/lib/finance";
import { ASSET_TYPES, audit } from "@/lib/store";
import { StatCard, SectionHeader, EmptyState, Badge } from "@/components/ui/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Plus, Pencil, Trash2, ChevronRight, ChevronLeft } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#64748b"];
const ITX_TYPES = ["buy", "sell", "dividend", "distribution", "fee", "transfer", "split", "adjustment"];

export default function Investments() {
  const { data, loading, reload } = useFinanceData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);

  const portfolio = useMemo(() => data ? portfolioSummary(data.investments, data.investmentTransactions) : null, [data]);
  const rows = useMemo(() => {
    if (!data) return [];
    return (data.investments || []).map((inv) => {
      const m = investmentMetrics(inv, data.investmentTransactions.filter((t) => t.investment_id === inv.id));
      return { inv, m };
    });
  }, [data]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  const performers = [...rows].sort((a, b) => b.m.roi - a.m.roi);

  return (
    <div className="space-y-6">
      <SectionHeader title="Investment Portfolio" description="Transaction-level accounting across stocks, bonds, mutual funds, ETFs, crypto, commodities, real estate, REITs, and more. Market values are manually or locally-imported — never live."
        action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Investment</Button>} />

      {portfolio && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Total Invested" value={formatMoney(portfolio.totalInvested)} />
            <StatCard label="Current Value" value={formatMoney(portfolio.currentValue)} />
            <StatCard label="Unrealized P/L" value={formatMoney(portfolio.unrealized)} tone={portfolio.unrealized >= 0 ? "positive" : "negative"} />
            <StatCard label="Realized P/L" value={formatMoney(portfolio.realized)} tone={portfolio.realized >= 0 ? "positive" : "negative"} />
            <StatCard label="Dividends" value={formatMoney(portfolio.dividends)} tone="positive" />
            <StatCard label="ROI" value={formatPct(portfolio.roi)} tone={portfolio.roi >= 0 ? "positive" : "negative"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm font-medium mb-2">Allocation by Asset Type</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={Object.entries(portfolio.byType).map(([k, v]) => ({ name: k, value: v }))} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                    {Object.keys(portfolio.byType).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 text-xs">
                {Object.entries(portfolio.byType).map(([k, v], i) => (
                  <div key={k} className="flex justify-between">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{ASSET_TYPES.find((t) => t.value === k)?.label || k}</span>
                    <span>{formatMoney(v)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="text-sm font-medium mb-2 text-emerald-600">Top Performers</div>
                {performers.slice(0, 3).map((r) => (
                  <div key={r.inv.id} className="flex justify-between text-sm py-1">
                    <span className="truncate pr-2">{r.inv.name}</span>
                    <Badge tone="positive">{formatPct(r.m.roi)}</Badge>
                  </div>
                ))}
                {performers.length === 0 && <div className="text-sm text-muted-foreground">No investments yet.</div>}
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="text-sm font-medium mb-2 text-red-600">Bottom Performers</div>
                {performers.slice(-3).reverse().map((r) => (
                  <div key={r.inv.id} className="flex justify-between text-sm py-1">
                    <span className="truncate pr-2">{r.inv.name}</span>
                    <Badge tone={r.m.roi >= 0 ? "positive" : "negative"}>{formatPct(r.m.roi)}</Badge>
                  </div>
                ))}
                {performers.length === 0 && <div className="text-sm text-muted-foreground">No investments yet.</div>}
              </div>
            </div>
          </div>
        </>
      )}

      {(data.investments || []).length === 0 ? (
        <EmptyState icon={TrendingUp} title="No investments yet" description="Add an investment (stock, mutual fund, crypto, etc.) and record buy/sell/dividend transactions."
          action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Investment</Button>} />
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-right px-4 py-2.5">Qty</th>
                <th className="text-right px-4 py-2.5">Cost Basis</th>
                <th className="text-right px-4 py-2.5">Current Value</th>
                <th className="text-right px-4 py-2.5">Unrealized P/L</th>
                <th className="text-right px-4 py-2.5">ROI</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ inv, m }) => (
                <React.Fragment key={inv.id}>
                  <tr className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(selected === inv.id ? null : inv.id)}>
                    <td className="px-4 py-2.5 font-medium">{inv.name}{selected === inv.id ? <ChevronLeft className="inline w-4 h-4 ml-1 text-muted-foreground" /> : <ChevronRight className="inline w-4 h-4 ml-1 text-muted-foreground" />}</td>
                    <td className="px-4 py-2.5"><Badge>{ASSET_TYPES.find((t) => t.value === inv.asset_type)?.label || inv.asset_type}</Badge></td>
                    <td className="px-4 py-2.5 text-right">{m.quantity}</td>
                    <td className="px-4 py-2.5 text-right">{formatMoney(m.costBasis, inv.currency)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatMoney(m.currentValue, inv.currency)}</td>
                    <td className={`px-4 py-2.5 text-right ${m.unrealizedPL >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{formatMoney(m.unrealizedPL, inv.currency)}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${m.roi >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{formatPct(m.roi)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setEditing(inv); setDialogOpen(true); }} className="p-1.5 hover:bg-muted rounded"><Pencil className="w-4 h-4" /></button>
                        <button onClick={async () => { if (confirm(`Delete "${inv.name}" and all its transactions?`)) { await base44.entities.Investment.delete(inv.id); await audit("investment_delete", `Deleted ${inv.name}`); reload(); } }} className="p-1.5 hover:bg-destructive/10 rounded text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                  {selected === inv.id && (
                    <tr className="bg-muted/20">
                      <td colSpan={8} className="px-4 py-3">
                        <InvestmentDetail inv={inv} m={m} reload={reload} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <InvestmentDialog investment={editing} onClose={() => setDialogOpen(false)} onSaved={reload} />
      )}
    </div>
  );
}

function InvestmentDetail({ inv, m, reload }) {
  const { data } = useFinanceData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const txs = (data.investmentTransactions || []).filter((t) => t.investment_id === inv.id);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        <div><span className="text-muted-foreground">Total Invested:</span> {formatMoney(m.totalInvested, inv.currency)}</div>
        <div><span className="text-muted-foreground">Fees:</span> {formatMoney(m.fees, inv.currency)}</div>
        <div><span className="text-muted-foreground">Dividends:</span> {formatMoney(m.dividends, inv.currency)}</div>
        <div><span className="text-muted-foreground">Realized P/L:</span> {formatMoney(m.realizedPL, inv.currency)}</div>
        <div><span className="text-muted-foreground">Price:</span> {formatMoney(inv.current_price, inv.currency)} ({inv.price_source}{inv.current_price_date ? `, ${new Date(inv.current_price_date).toLocaleDateString()}` : ""})</div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Transactions</span>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Add Transaction</Button>
      </div>
      {txs.length === 0 ? (
        <div className="text-sm text-muted-foreground">No transactions yet.</div>
      ) : (
        <table className="w-full text-xs">
          <thead className="text-muted-foreground uppercase">
            <tr><th className="text-left py-1">Date</th><th className="text-left">Type</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Amount</th><th className="text-right">Fees</th><th></th></tr>
          </thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="py-1">{new Date(t.date).toLocaleDateString()}</td>
                <td><Badge>{t.type}</Badge></td>
                <td className="text-right">{t.quantity}</td>
                <td className="text-right">{formatMoney(t.price, inv.currency)}</td>
                <td className="text-right">{formatMoney(t.amount, inv.currency)}</td>
                <td className="text-right">{formatMoney(t.fees, inv.currency)}</td>
                <td className="text-right">
                  <button onClick={async () => { if (confirm("Delete this transaction?")) { await base44.entities.InvestmentTransaction.delete(t.id); await audit("investment_tx_delete", `Deleted ${t.type} on ${inv.name}`); reload(); } }} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {dialogOpen && <InvestmentTxDialog inv={inv} onClose={() => setDialogOpen(false)} onSaved={reload} />}
    </div>
  );
}

function InvestmentDialog({ investment, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: investment?.name || "", asset_type: investment?.asset_type || "stock",
    institution: investment?.institution || "", ticker: investment?.ticker || "",
    exchange: investment?.exchange || "", fund_category: investment?.fund_category || "",
    purchase_date: investment?.purchase_date || new Date().toISOString().slice(0, 10),
    currency: investment?.currency || "PKR", current_price: investment?.current_price || 0,
    current_price_date: investment?.current_price_date || new Date().toISOString(),
    price_source: investment?.price_source || "manual", notes: investment?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) { alert("Investment name is required."); return; }
    setSaving(true);
    try {
      const payload = { ...form, current_price: Number(form.current_price) || 0 };
      if (investment) {
        await base44.entities.Investment.update(investment.id, payload);
        await audit("investment_modify", `Modified investment ${payload.name}`);
      } else {
        await base44.entities.Investment.create(payload);
        await audit("investment_create", `Created investment ${payload.name}`);
      }
      onSaved(); onClose();
    } catch (e) { alert("Could not save: " + (e.message || e)); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{investment ? "Edit Investment" : "New Investment"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2"><Label>Investment Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <Label>Asset Type</Label>
            <Select value={form.asset_type} onValueChange={(v) => setForm({ ...form, asset_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ASSET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
          <div><Label>Institution / Provider</Label><Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></div>
          <div><Label>Ticker / Symbol</Label><Input value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} /></div>
          <div><Label>Exchange</Label><Input value={form.exchange} onChange={(e) => setForm({ ...form, exchange: e.target.value })} /></div>
          <div><Label>Fund Category</Label><Input value={form.fund_category} onChange={(e) => setForm({ ...form, fund_category: e.target.value })} /></div>
          <div><Label>Purchase Date</Label><Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></div>
          <div>
            <Label>Current Price (Manual)</Label>
            <Input type="number" step="0.0001" value={form.current_price} onChange={(e) => setForm({ ...form, current_price: e.target.value })} />
          </div>
          <div>
            <Label>Price Source</Label>
            <Select value={form.price_source} onValueChange={(v) => setForm({ ...form, price_source: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="manual">Manual</SelectItem><SelectItem value="local_import">Local Import</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvestmentTxDialog({ inv, onClose, onSaved }) {
  const [form, setForm] = useState({
    type: "buy", date: new Date().toISOString().slice(0, 10),
    quantity: 0, price: 0, amount: 0, fees: 0, notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const payload = { investment_id: inv.id, ...form,
        quantity: Number(form.quantity) || 0, price: Number(form.price) || 0,
        amount: Number(form.amount) || 0, fees: Number(form.fees) || 0 };
      await base44.entities.InvestmentTransaction.create(payload);
      await audit("investment_transaction", `${form.type} on ${inv.name}`);
      // update current price when buying/selling to keep current value in sync (manual)
      if ((form.type === "buy" || form.type === "sell") && Number(form.price) > 0) {
        await base44.entities.Investment.update(inv.id, {
          current_price: Number(form.price),
          current_price_date: new Date().toISOString(),
          price_source: inv.price_source || "manual",
        });
      }
      onSaved(); onClose();
    } catch (e) { alert("Could not save: " + (e.message || e)); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Transaction — {inv.name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ITX_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><Label>Quantity</Label><Input type="number" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
          <div><Label>Price / NAV</Label><Input type="number" step="any" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><Label>Fees</Label><Input type="number" step="0.01" value={form.fees} onChange={(e) => setForm({ ...form, fees: e.target.value })} /></div>
          <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <div className="text-xs text-muted-foreground">Cost basis uses average-cost method. Sells reduce quantity and realize P/L against average cost.</div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}