import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useFinanceData } from "@/lib/useFinanceData";
import { formatMoney } from "@/lib/finance";
import { audit } from "@/lib/store";
import { StatCard, SectionHeader, EmptyState, Badge } from "@/components/ui/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, Pencil, Trash2 } from "lucide-react";

const PRIORITIES = [
  { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" },
];

export default function Goals() {
  const { data, loading, reload } = useFinanceData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  const goals = data?.goals || [];

  const totalTarget = goals.reduce((s, g) => s + (g.target_amount || 0), 0);
  const totalSaved = goals.reduce((s, g) => s + (g.current_amount || 0), 0);

  return (
    <div className="space-y-6">
      <SectionHeader title="Financial Goals" description="Set savings and investment targets and track progress toward each goal."
        action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Goal</Button>} />

      {goals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Total Target" value={formatMoney(totalTarget)} />
          <StatCard label="Total Saved" value={formatMoney(totalSaved)} tone="positive" />
          <StatCard label="Overall Progress" value={`${totalTarget ? Math.round((totalSaved / totalTarget) * 100) : 0}%`} />
        </div>
      )}

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet" description="Create goals like Emergency Fund, House, Car, or Retirement."
          action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Goal</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((g) => {
            const pct = g.target_amount ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0;
            const remaining = Math.max(0, g.target_amount - g.current_amount);
            const monthsLeft = g.target_date ? Math.max(0, Math.round((new Date(g.target_date) - new Date()) / 2592000000)) : null;
            const required = monthsLeft ? remaining / monthsLeft : g.monthly_contribution;
            return (
              <div key={g.id} className="rounded-lg border bg-card p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{g.name}</div>
                    <Badge tone={g.priority === "high" ? "negative" : g.priority === "medium" ? "warning" : "default"}>{g.priority}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(g); setDialogOpen(true); }} className="p-1 hover:bg-muted rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={async () => { if (confirm(`Delete goal "${g.name}"?`)) { await base44.entities.Goal.delete(g.id); await audit("goal_delete", `Deleted ${g.name}`); reload(); } }} className="p-1 hover:bg-destructive/10 rounded text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span>{formatMoney(g.current_amount)}</span><span className="text-muted-foreground">{formatMoney(g.target_amount)}</span></div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{pct}% complete · {formatMoney(remaining)} to go</div>
                </div>
                <div className="text-xs space-y-0.5">
                  {g.target_date && <div>Target date: {new Date(g.target_date).toLocaleDateString()} ({monthsLeft} mo left)</div>}
                  {required > 0 && <div>Required: {formatMoney(required)}/mo</div>}
                  {g.monthly_contribution > 0 && <div>Planned: {formatMoney(g.monthly_contribution)}/mo</div>}
                </div>
                <div className="flex gap-2 mt-auto">
                  <Button size="sm" variant="outline" className="flex-1" onClick={async () => {
                    const add = prompt(`Add contribution to "${g.name}":`, "");
                    const v = Number(add);
                    if (!v || v <= 0) return;
                    await base44.entities.Goal.update(g.id, { current_amount: (g.current_amount || 0) + v });
                    await audit("goal_contribution", `Added ${v} to ${g.name}`);
                    reload();
                  }}>+ Contribute</Button>
                </div>
                {g.notes && <div className="text-xs text-muted-foreground">{g.notes}</div>}
              </div>
            );
          })}
        </div>
      )}

      {dialogOpen && <GoalDialog goal={editing} onClose={() => setDialogOpen(false)} onSaved={reload} />}
    </div>
  );
}

function GoalDialog({ goal, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: goal?.name || "", target_amount: goal?.target_amount || 0, current_amount: goal?.current_amount || 0,
    target_date: goal?.target_date || "", priority: goal?.priority || "medium",
    monthly_contribution: goal?.monthly_contribution || 0, notes: goal?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!form.name.trim()) { alert("Goal name required."); return; }
    setSaving(true);
    try {
      const payload = { ...form, target_amount: Number(form.target_amount) || 0, current_amount: Number(form.current_amount) || 0, monthly_contribution: Number(form.monthly_contribution) || 0 };
      if (goal) { await base44.entities.Goal.update(goal.id, payload); await audit("goal_modify", `Modified ${payload.name}`); }
      else { await base44.entities.Goal.create(payload); await audit("goal_create", `Created ${payload.name}`); }
      onSaved(); onClose();
    } catch (e) { alert("Could not save: " + (e.message || e)); }
    setSaving(false);
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{goal ? "Edit Goal" : "New Goal"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2"><Label>Goal Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Target Amount</Label><Input type="number" step="0.01" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} /></div>
          <div><Label>Current Amount</Label><Input type="number" step="0.01" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} /></div>
          <div><Label>Target Date</Label><Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></div>
          <div><Label>Monthly Contribution</Label><Input type="number" step="0.01" value={form.monthly_contribution} onChange={(e) => setForm({ ...form, monthly_contribution: e.target.value })} /></div>
          <div><Label>Priority</Label><Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}