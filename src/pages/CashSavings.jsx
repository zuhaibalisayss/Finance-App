import React, { useState, useEffect } from "react";
import { entities, audit } from "@/lib/localStorage";
import { SectionHeader, EmptyState, Badge, StatCard } from "@/components/ui/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";

export default function CashSavings() {
  const [accounts, setAccounts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const accts = await entities.Account.list();
      setAccounts(accts);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (a) => { setEditing(a); setDialogOpen(true); };

  const handleDelete = async (a) => {
    if (!confirm(`Delete account "${a.name}"?`)) return;
    await entities.Account.delete(a.id);
    await audit("account_delete", `Deleted ${a.name}`);
    loadData();
  };

  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Cash & Savings" description="Track your cash accounts, savings, and money market funds."
        action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add Account</Button>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Balance" value={`$${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} tone="positive" />
        <StatCard label="Number of Accounts" value={accounts.length} />
      </div>

      {accounts.length === 0 ? (
        <EmptyState icon={Wallet} title="No accounts yet" description="Add your first bank account, savings account, or cash fund." action={<Button onClick={openNew}>Add Account</Button>} />
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Institution</th>
                <th className="text-right px-4 py-2.5">Balance</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{a.name}</td>
                  <td className="px-4 py-2.5"><Badge>{a.account_type || "checking"}</Badge></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{a.institution || "—"}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${(a.balance || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>${(a.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-muted rounded"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(a)} className="p-1.5 hover:bg-destructive/10 rounded text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && <AccountDialog account={editing} onClose={() => setDialogOpen(false)} onSaved={loadData} />}
    </div>
  );
}

function AccountDialog({ account, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: account?.name || "",
    account_type: account?.account_type || "checking",
    institution: account?.institution || "",
    balance: account?.balance || 0,
    currency: account?.currency || "USD",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) { alert("Enter an account name."); return; }
    setSaving(true);
    try {
      const payload = { ...form, balance: Number(form.balance) };
      if (account) {
        await entities.Account.update(account.id, payload);
        await audit("account_edit", `Edited ${payload.name}`);
      } else {
        await entities.Account.create(payload);
        await audit("account_create", `Created ${payload.name}`);
      }
      onSaved();
      onClose();
    } catch (e) { alert("Could not save: " + (e.message || e)); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{account ? "Edit Account" : "New Account"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Type</Label>
            <Select value={form.account_type} onValueChange={(v) => setForm({ ...form, account_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="money_market">Money Market</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Institution</Label><Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></div>
          <div><Label>Balance</Label><Input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} /></div>
          <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
