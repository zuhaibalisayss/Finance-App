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
import { Landmark, Plus, Pencil, Trash2 } from "lucide-react";

const TYPES = [
  { value: "vehicle", label: "Vehicle" }, { value: "property", label: "Property" },
  { value: "equipment", label: "Equipment" }, { value: "precious_metal", label: "Precious Metals" },
  { value: "collectible", label: "Collectibles" }, { value: "other", label: "Other" },
];

export default function Assets() {
  const { data, loading, reload } = useFinanceData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const total = (data?.assets || []).reduce((s, a) => s + (Number(a.value) || 0), 0);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Assets" description="Manually track assets not represented in your accounts, investments, or businesses (vehicles, property, equipment, collectibles)."
        action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Asset</Button>} />

      <div className="rounded-lg border bg-card p-4 text-sm">Total Asset Value: <span className="font-semibold ml-2">{formatMoney(total)}</span></div>

      {(data?.assets || []).length === 0 ? (
        <EmptyState icon={Landmark} title="No assets recorded" description="Add vehicles, property, equipment, or other tangible assets."
          action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Asset</Button>} />
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr><th className="text-left px-4 py-2.5">Name</th><th className="text-left px-4 py-2.5">Type</th><th className="text-left px-4 py-2.5">Institution</th><th className="text-right px-4 py-2.5">Value</th><th className="text-left px-4 py-2.5">Date</th><th className="text-right px-4 py-2.5">Interest</th><th className="px-4 py-2.5"></th></tr>
            </thead>
            <tbody>
              {(data?.assets || []).map((a) => (
                <tr key={a.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{a.name}</td>
                  <td className="px-4 py-2.5"><Badge>{TYPES.find((t) => t.value === a.type)?.label || a.type}</Badge></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{a.institution || "—"}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatMoney(a.value)}</td>
                  <td className="px-4 py-2.5">{a.date ? new Date(a.date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-2.5 text-right">{a.interest_rate ? `${a.interest_rate}%` : "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditing(a); setDialogOpen(true); }} className="p-1.5 hover:bg-muted rounded"><Pencil className="w-4 h-4" /></button>
                      <button onClick={async () => { if (confirm(`Delete asset "${a.name}"?`)) { await base44.entities.Asset.delete(a.id); await audit("asset_delete", `Deleted ${a.name}`); reload(); } }} className="p-1.5 hover:bg-destructive/10 rounded text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && <AssetDialog asset={editing} onClose={() => setDialogOpen(false)} onSaved={reload} />}
    </div>
  );
}

function AssetDialog({ asset, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: asset?.name || "", type: asset?.type || "other", value: asset?.value || 0,
    date: asset?.date || new Date().toISOString().slice(0, 10), institution: asset?.institution || "",
    interest_rate: asset?.interest_rate || "", notes: asset?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!form.name.trim()) { alert("Name required."); return; }
    setSaving(true);
    try {
      const payload = { ...form, value: Number(form.value) || 0, interest_rate: form.interest_rate === "" ? undefined : Number(form.interest_rate) };
      if (asset) { await base44.entities.Asset.update(asset.id, payload); await audit("asset_modify", `Modified ${payload.name}`); }
      else { await base44.entities.Asset.create(payload); await audit("asset_create", `Created ${payload.name}`); }
      onSaved(); onClose();
    } catch (e) { alert("Could not save: " + (e.message || e)); }
    setSaving(false);
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{asset ? "Edit Asset" : "New Asset"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Value</Label><Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><Label>Interest Rate</Label><Input type="number" step="0.01" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} /></div>
          <div className="col-span-2"><Label>Institution</Label><Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}