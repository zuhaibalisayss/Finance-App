import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useFinanceData } from "@/lib/useFinanceData";
import { formatMoney } from "@/lib/finance";
import { audit } from "@/lib/store";
import { SectionHeader, EmptyState, Badge } from "@/components/ui/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Plus, Pencil, Trash2 } from "lucide-react";

const TYPES = [
  { value: "loan", label: "Loan" }, { value: "credit_card", label: "Credit Card" },
  { value: "mortgage", label: "Mortgage" }, { value: "personal_debt", label: "Personal Debt" },
  { value: "business_debt", label: "Business Debt" }, { value: "other", label: "Other" },
];

export default function Liabilities() {
  const { data, loading, reload } = useFinanceData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const now = new Date();

  const total = (data?.liabilities || []).reduce((s, l) => s + (Number(l.balance) || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Liabilities" description="Track loans, credit cards, mortgages, and other debts. Due-soon items are flagged."
        action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Liability</Button>} />

      <div className="rounded-lg border bg-card p-4 text-sm">Total Liabilities: <span className="font-semibold ml-2 text-red-600 dark:text-red-400">{formatMoney(total)}</span></div>

      {(data?.liabilities || []).length === 0 ? (
        <EmptyState icon={CreditCard} title="No liabilities recorded" description="Add loans, credit cards, mortgages, or other debts."
          action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Liability</Button>} />
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr><th className="text-left px-4 py-2.5">Name</th><th className="text-left px-4 py-2.5">Type</th><th className="text-left px-4 py-2.5">Institution</th><th className="text-right px-4 py-2.5">Balance</th><th className="text-right px-4 py-2.5">Interest</th><th className="text-left px-4 py-2.5">Due Date</th><th className="px-4 py-2.5"></th></tr>
            </thead>
            <tbody>
              {(data?.liabilities || []).map((l) => {
                let dueTone = "default";
                if (l.due_date) {
                  const d = new Date(l.due_date);
                  const days = (d - now) / 86400000;
                  if (days < 0) dueTone = "negative";
                  else if (days <= 7) dueTone = "warning";
                }
                return (
                  <tr key={l.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{l.name}</td>
                    <td className="px-4 py-2.5"><Badge>{TYPES.find((t) => t.value === l.type)?.label || l.type}</Badge></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{l.institution || "—"}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-red-600 dark:text-red-400">{formatMoney(l.balance)}</td>
                    <td className="px-4 py-2.5 text-right">{l.interest_rate ? `${l.interest_rate}%` : "—"}</td>
                    <td className="px-4 py-2.5">{l.due_date ? <Badge tone={dueTone}>{new Date(l.due_date).toLocaleDateString()}</Badge> : "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditing(l); setDialogOpen(true); }} className="p-1.5 hover:bg-muted rounded"><Pencil className="w-4 h-4" /></button>
                        <button onClick={async () => { if (confirm(`Delete liability "${l.name}"?`)) { await base44.entities.Liability.delete(l.id); await audit("liability_delete", `Deleted ${l.name}`); reload(); } }} className="p-1.5 hover:bg-destructive/10 rounded text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && <LiabilityDialog liability={editing} onClose={() => setDialogOpen(false)} onSaved={reload} />}
    </div>
  );
}

function LiabilityDialog({ liability, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: liability?.name || "", type: liability?.type || "loan", balance: liability?.balance || 0,
    date: liability?.date || new Date().toISOString().slice(0, 10), institution: liability?.institution || "",
    interest_rate: liability?.interest_rate || "", due_date: liability?.due_date || "", notes: liability?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!form.name.trim()) { alert("Name required."); return; }
    setSaving(true);
    try {
      const payload = { ...form, balance: Number(form.balance) || 0, interest_rate: form.interest_rate === "" ? undefined : Number(form.interest_rate) };
      if (liability) { await base44.entities.Liability.update(liability.id, payload); await audit("liability_modify", `Modified ${payload.name}`); }
      else { await base44.entities.Liability.create(payload); await audit("liability_create", `Created ${payload.name}`); }
      onSaved(); onClose();
    } catch (e) { alert("Could not save: " + (e.message || e)); }
    setSaving(false);
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{liability ? "Edit Liability" : "New Liability"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Balance</Label><Input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></div>
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          <div><Label>Interest Rate</Label><Input type="number" step="0.01" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} /></div>
          <div className="col-span-2"><Label>Institution</Label><Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}