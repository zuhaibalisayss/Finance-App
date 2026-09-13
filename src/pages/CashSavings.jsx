import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useFinanceData } from "@/lib/useFinanceData";
import { formatMoney, accountsSummary, accountBalance } from "@/lib/finance";
import { getSetting, ACCOUNT_TYPES, maskId, audit } from "@/lib/store";
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
import { Wallet, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

export default function CashSavings() {
  const { data, loading, reload } = useFinanceData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showIds, setShowIds] = useState({});

  const summary = useMemo(() => data ? accountsSummary(data.accounts, data.transactions) : null, [data]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (acc) => { setEditing(acc); setDialogOpen(true); };

  const handleDelete = async (acc) => {
    if (!confirm(`Delete account "${acc.name}"? This does not delete its transactions but they will lose their account link.`)) return;
    await base44.entities.Account.delete(acc.id);
    await audit("account_delete", `Deleted account ${acc.name}`);
    reload();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Cash & Savings" description="Track your bank, savings, emergency fund, cash in hand, and other liquid accounts."
        action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add Account</Button>} />

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Bank Balance" value={formatMoney(summary.bank)} />
          <StatCard label="Savings" value={formatMoney(summary.savings)} />
          <StatCard label="Emergency Fund" value={formatMoney(summary.emergency)} tone={summary.emergency < (getSetting("emergency_target", 0) || 0) ? "negative" : "positive"} />
          <StatCard label="Cash in Hand" value={formatMoney(summary.cash)} />
          <StatCard label="Total Liquid" value={formatMoney(summary.totalLiquid)} tone="positive" />
        </div>
      )}

      {(data.accounts || []).length === 0 ? (
        <EmptyState icon={Wallet} title="No accounts yet" description="Add your first account to start tracking cash and savings."
          action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add Account</Button>} />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Institution</th>
                <th className="text-left px-4 py-2.5">Identifier</th>
                <th className="text-right px-4 py-2.5">Opening Balance</th>
                <th className="text-right px-4 py-2.5">Current Balance</th>
                <th className="text-center px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {(data.accounts || []).map((a) => {
                const bal = accountBalance(a, data.transactions);
                const masked = a.masked && !showIds[a.id];
                return (
                  <tr key={a.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{a.name}</td>
                    <td className="px-4 py-2.5">{ACCOUNT_TYPES.find((t) => t.value === a.type)?.label || a.type}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{a.institution || "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {masked ? maskId(a.nickname) : (a.nickname || "—")}
                        {a.masked && (
                          <button onClick={() => setShowIds((s) => ({ ...s, [a.id]: !s[a.id] }))} className="text-muted-foreground">
                            {showIds[a.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">{formatMoney(a.opening_balance, a.currency)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatMoney(bal, a.currency)}</td>
                    <td className="px-4 py-2.5 text-center"><Badge tone={a.status === "active" ? "positive" : a.status === "closed" ? "default" : "warning"}>{a.status}</Badge></td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-muted rounded"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(a)} className="p-1.5 hover:bg-destructive/10 rounded text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <AccountDialog account={editing} onClose={() => setDialogOpen(false)} onSaved={reload} />
      )}
    </div>
  );
}

function AccountDialog({ account, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: account?.name || "", type: account?.type || "bank", institution: account?.institution || "",
    nickname: account?.nickname || "", opening_balance: account?.opening_balance || 0,
    currency: account?.currency || "PKR", opening_date: account?.opening_date || new Date().toISOString().slice(0, 10),
    status: account?.status || "active", notes: account?.notes || "", masked: account?.masked || false,
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) { alert("Account name is required."); return; }
    setSaving(true);
    try {
      const payload = { ...form, opening_balance: Number(form.opening_balance) || 0 };
      if (account) {
        await base44.entities.Account.update(account.id, payload);
        await audit("account_modify", `Modified account ${payload.name}`);
      } else {
        await base44.entities.Account.create(payload);
        await audit("account_create", `Created account ${payload.name}`);
      }
      onSaved();
      onClose();
    } catch (e) { alert("Could not save account: " + (e.message || e)); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{account ? "Edit Account" : "New Account"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2">
            <Label>Account Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Account Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACCOUNT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Currency</Label>
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          <div>
            <Label>Institution / Bank</Label>
            <Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
          </div>
          <div>
            <Label>Identifier / Nickname</Label>
            <Input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
          </div>
          <div>
            <Label>Opening Balance</Label>
            <Input type="number" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} />
          </div>
          <div>
            <Label>Opening Date</Label>
            <Input type="date" value={form.opening_date} onChange={(e) => setForm({ ...form, opening_date: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="frozen">Frozen</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.masked} onChange={(e) => setForm({ ...form, masked: e.target.checked })} />
              Mask identifier in lists
            </label>
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}