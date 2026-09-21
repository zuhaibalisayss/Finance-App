import React, { useState, useEffect } from "react";
import { entities, audit } from "@/lib/localStorage";
import { SectionHeader, EmptyState, Badge, StatCard } from "@/components/ui/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";

export default function Investments() {
  const [investments, setInvestments] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const invs = await entities.Investment.list();
      setInvestments(invs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (i) => { setEditing(i); setDialogOpen(true); };

  const handleDelete = async (i) => {
    if (!confirm(`Delete investment "${i.name}"?`)) return;
    await entities.Investment.delete(i.id);
    await audit("investment_delete", `Deleted ${i.name}`);
    loadData();
  };

  const totalValue = investments.reduce((sum, i) => sum + (i.value || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Investment Portfolio" description="Track your stocks, bonds, mutual funds, and other investments."
        action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add Investment</Button>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Value" value={`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} tone="positive" />
        <StatCard label="Number of Investments" value={investments.length} />
      </div>

      {investments.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No investments yet" description="Add your first stock, bond, or fund." action={<Button onClick={openNew}>Add Investment</Button>} />
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Symbol</th>
                <th className="text-left px-4 py-2.5">Shares</th>
                <th className="text-right px-4 py-2.5">Value</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {investments.map((i) => (
                <tr key={i.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{i.name}</td>
                  <td className="px-4 py-2.5"><Badge>{i.investment_type || "stock"}</Badge></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{i.symbol || "—"}</td>
                  <td className="px-4 py-2.5">{i.shares || 0}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${(i.value || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>${(i.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(i)} className="p-1.5 hover:bg-muted rounded"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(i)} className="p-1.5 hover:bg-destructive/10 rounded text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && <InvestmentDialog investment={editing} onClose={() => setDialogOpen(false)} onSaved={loadData} />}
    </div>
  );
}

function InvestmentDialog({ investment, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: investment?.name || "",
    investment_type: investment?.investment_type || "stock",
    symbol: investment?.symbol || "",
    shares: investment?.shares || 0,
    value: investment?.value || 0,
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) { alert("Enter an investment name."); return; }
    setSaving(true);
    try {
      const payload = { ...form, shares: Number(form.shares), value: Number(form.value) };
      if (investment) {
        await entities.Investment.update(investment.id, payload);
        await audit("investment_edit", `Edited ${payload.name}`);
      } else {
        await entities.Investment.create(payload);
        await audit("investment_create", `Created ${payload.name}`);
      }
      onSaved();
      onClose();
    } catch (e) { alert("Could not save: " + (e.message || e)); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{investment ? "Edit Investment" : "New Investment"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Type</Label>
            <Select value={form.investment_type} onValueChange={(v) => setForm({ ...form, investment_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">Stock</SelectItem>
                <SelectItem value="bond">Bond</SelectItem>
                <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
                <SelectItem value="etf">ETF</SelectItem>
                <SelectItem value="crypto">Cryptocurrency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Symbol/Ticker</Label><Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} /></div>
          <div><Label>Shares/Units</Label><Input type="number" step="0.0001" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} /></div>
          <div><Label>Total Value ($)</Label><Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
