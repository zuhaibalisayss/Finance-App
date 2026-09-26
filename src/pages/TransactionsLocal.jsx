import React, { useState, useMemo, useEffect } from "react";
import { entities, audit } from "@/lib/localStorage";
import { formatMoney } from "@/lib/finance";
import { SectionHeader, EmptyState, Badge } from "@/components/ui/finance";
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
import { ArrowLeftRight, Plus, Pencil, Trash2, Search } from "lucide-react";

const TX_TYPES = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
  { value: "investment_contribution", label: "Investment Contribution" },
  { value: "investment_withdrawal", label: "Investment Withdrawal" },
  { value: "dividend", label: "Dividend" },
  { value: "interest", label: "Interest" },
  { value: "business_contribution", label: "Business Contribution" },
  { value: "business_withdrawal", label: "Business Withdrawal" },
  { value: "adjustment", label: "Adjustment" },
];

const INCOME_CATEGORIES = [
  { value: "salary", label: "Salary" },
  { value: "freelance", label: "Freelance" },
  { value: "investments", label: "Investments" },
  { value: "gifts", label: "Gifts" },
  { value: "other", label: "Other" }
];

const EXPENSE_CATEGORIES = [
  { value: "housing", label: "Housing" },
  { value: "food", label: "Food" },
  { value: "transportation", label: "Transportation" },
  { value: "utilities", label: "Utilities" },
  { value: "insurance", label: "Insurance" },
  { value: "healthcare", label: "Healthcare" },
  { value: "entertainment", label: "Entertainment" },
  { value: "shopping", label: "Shopping" },
  { value: "other", label: "Other" }
];

function categoriesFor(type) {
  if (type === "income") return INCOME_CATEGORIES;
  if (type === "expense") return EXPENSE_CATEGORIES;
  return ["general"];
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txns, accts] = await Promise.all([
        entities.Transaction.list("-date", 500),
        entities.Account.list()
      ]);
      setTransactions(txns);
      setAccounts(accts);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setLoading(false);
    }
  };

  const accountName = (id) => accounts.find((a) => a.id === id)?.name || "—";

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (filterAccount !== "all" && t.account_id !== filterAccount && t.to_account_id !== filterAccount) return false;
      if (!q) return true;
      const hay = `${t.description || ""} ${t.category || ""} ${t.notes || ""} ${t.reference || ""} ${accountName(t.account_id)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [transactions, search, filterType, filterAccount]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (t) => { setEditing(t); setDialogOpen(true); };

  const handleDelete = async (t) => {
    if (!confirm("Delete this transaction? This action is deliberate and cannot be undone.")) return;
    await entities.Transaction.delete(t.id);
    await audit("transaction_delete", `Deleted transaction: ${t.description || t.type} ${t.amount}`);
    loadData();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Transactions" description="Record income, expenses, and transfers. Transfers between your own accounts are not counted as income or expense."
        action={<Button onClick={openNew} disabled={accounts.length === 0}><Plus className="w-4 h-4 mr-1" /> Add Transaction</Button>} />

      {accounts.length === 0 && (
        <EmptyState icon={ArrowLeftRight} title="Add an account first" description="You need at least one account before recording transactions." />
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search description, category, notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TX_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Account" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="No transactions found" description="Adjust filters or add a new transaction." />
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-left px-4 py-2.5">Description</th>
                <th className="text-left px-4 py-2.5">Account</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Category</th>
                <th className="text-right px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const tone = t.type === "income" || t.type === "dividend" || t.type === "interest" ? "positive"
                  : t.type === "expense" || t.type === "investment_contribution" || t.type === "business_contribution" ? "negative" : "default";
                const amt = t.type === "income" || t.type === "dividend" || t.type === "interest" || t.type === "transfer" ? t.amount : t.amount;
                return (
                  <tr key={t.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2.5 whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">{t.description || "—"}</td>
                    <td className="px-4 py-2.5">
                      {accountName(t.account_id)}
                      {t.type === "transfer" && t.to_account_id && <span className="text-muted-foreground"> → {accountName(t.to_account_id)}</span>}
                    </td>
                    <td className="px-4 py-2.5"><Badge>{TX_TYPES.find((x) => x.value === t.type)?.label || t.type}</Badge></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.category || "—"}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${tone === "positive" ? "text-emerald-600 dark:text-emerald-400" : tone === "negative" ? "text-red-600 dark:text-red-400" : ""}`}>
                      {t.type === "income" || t.type === "dividend" || t.type === "interest" ? "+" : t.type === "expense" ? "−" : ""}{formatMoney(amt, t.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-muted rounded"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(t)} className="p-1.5 hover:bg-destructive/10 rounded text-destructive"><Trash2 className="w-4 h-4" /></button>
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
        <TransactionDialog tx={editing} accounts={accounts} onClose={() => setDialogOpen(false)} onSaved={loadData} />
      )}
    </div>
  );
}

function TransactionDialog({ tx, accounts, onClose, onSaved }) {
  const [form, setForm] = useState({
    date: (tx?.date || new Date().toISOString()).slice(0, 16),
    account_id: tx?.account_id || accounts[0]?.id || "",
    to_account_id: tx?.to_account_id || "",
    type: tx?.type || "expense",
    category: tx?.category || "",
    amount: tx?.amount || 0,
    currency: tx?.currency || "PKR",
    description: tx?.description || "",
    reference: tx?.reference || "",
    notes: tx?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const cats = categoriesFor(form.type);

  const submit = async () => {
    if (!form.account_id) { alert("Select an account."); return; }
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { alert("Amount must be greater than 0."); return; }
    if (form.type === "transfer" && !form.to_account_id) { alert("Select the destination account for the transfer."); return; }
    if (form.type === "transfer" && form.to_account_id === form.account_id) { alert("Transfer source and destination must differ."); return; }
    setSaving(true);
    try {
      const payload = { ...form, date: new Date(form.date).toISOString(), amount: amt,
        category: form.category || (form.type === "income" ? "other_income" : form.type === "expense" ? "other" : "general") };
      if (form.type !== "transfer") delete payload.to_account_id;
      if (tx) {
        await entities.Transaction.update(tx.id, payload);
        await audit("transaction_edit", `Edited transaction ${payload.type} ${amt}`);
      } else {
        await entities.Transaction.create(payload);
        await audit("transaction_create", `Created transaction ${payload.type} ${amt}`);
      }
      onSaved();
      onClose();
    } catch (e) { alert("Could not save transaction: " + (e.message || e)); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{tx ? "Edit Transaction" : "New Transaction"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, category: "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TX_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date / Time</Label>
            <Input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <Label>Account</Label>
            <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {form.type === "transfer" ? (
            <div>
              <Label>Transfer To</Label>
              <Select value={form.to_account_id} onValueChange={(v) => setForm({ ...form, to_account_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Amount</Label>
            <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <Label>Currency</Label>
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Reference</Label>
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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