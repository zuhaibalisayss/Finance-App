import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useFinanceData } from "@/lib/useFinanceData";
import { audit } from "@/lib/store";
import { SectionHeader } from "@/components/ui/finance";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getSetting, setSetting } from "@/lib/store";
import { downloadJSON, downloadFile, sha256Hex } from "@/lib/exporters";
import { validateImport } from "@/lib/importValidation";
import { DatabaseBackup, ShieldCheck, AlertTriangle } from "lucide-react";

export default function BackupRestore() {
  const { data, loading, reload } = useFinanceData();
  const fileRef = useRef(null);
  const [status, setStatus] = useState("");
  const [restorePreview, setRestorePreview] = useState(null);

  const backupFolder = getSetting("backup_folder", "Downloads (browser default)");
  const backupFreq = getSetting("backup_freq", "manual");
  const retention = getSetting("backup_retention", 5);

  const createBackup = async () => {
    if (!data) return;
    const payload = {
      _meta: { exported_at: new Date().toISOString(), app: "Offline Wealth Manager", version: 1 },
      Account: data.accounts, Transaction: data.transactions, Investment: data.investments,
      InvestmentTransaction: data.investmentTransactions, Business: data.businesses,
      BusinessTransaction: data.businessTransactions, Asset: data.assets, Liability: data.liabilities,
      Goal: data.goals, Budget: data.budgets, NetWorthSnapshot: data.snapshots,
    };
    const checksum = await sha256Hex(JSON.stringify(payload, null, 2));
    payload._meta.checksum = "sha256:" + checksum;
    downloadJSON(`wealth-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, payload);
    await audit("backup", "Manual backup created");
    setStatus("Backup file downloaded with integrity checksum. Store it on an external drive for safety.");
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert("Backup file too large."); return; }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const { fatal, counts } = validateImport(parsed);
      if (fatal) { alert(fatal); e.target.value = ""; return; }
      let checksumOk = null;
      const claimed = parsed?._meta?.checksum;
      if (typeof claimed === "string" && claimed.startsWith("sha256:")) {
        const verify = { ...parsed };
        if (verify._meta) { const { checksum, ...rest } = verify._meta; verify._meta = rest; }
        const actual = "sha256:" + (await sha256Hex(JSON.stringify(verify, null, 2)));
        checksumOk = actual === claimed;
      }
      const total = Object.values(counts).reduce((s, n) => s + n, 0);
      setRestorePreview({ name: file.name, data: parsed, counts, total });
      const ck = checksumOk === false ? "⚠ Checksum mismatch — file may be corrupted or tampered."
        : checksumOk === true ? "✓ Checksum verified."
        : "No checksum present.";
      setStatus(`Backup loaded for review: ${total} records. Structure validated. ${ck}`);
    } catch (err) {
      alert("Invalid or corrupted backup file.");
    }
    e.target.value = "";
  };

  const restore = async () => {
    if (!restorePreview) return;
    const { fatal, counts, cleaned } = validateImport(restorePreview.data);
    if (fatal) { alert(fatal); return; }
    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    if (!confirm(`Restore will APPEND ${total} validated records into your current data. It does not erase existing data. Continue?`)) return;
    setStatus("Restoring…");
    let ok = 0, failed = 0;
    for (const [key, recs] of Object.entries(cleaned)) {
      for (const payload of recs) {
        try { await base44.entities[key].create(payload); ok++; } catch (e) { failed++; }
      }
    }
    await audit("restore", `Restored ${ok} records, ${failed} failed`);
    setStatus(`Restore complete: ${ok} restored, ${failed} failed.`);
    setRestorePreview(null);
    reload();
  };

  const integrityCheck = async () => {
    setStatus("Running integrity check…");
    const problems = [];
    (data.transactions || []).forEach((t) => {
      if (!data.accounts.find((a) => a.id === t.account_id)) problems.push(`Transaction ${t.id}: account missing`);
    });
    (data.investmentTransactions || []).forEach((t) => {
      if (!data.investments.find((i) => i.id === t.investment_id)) problems.push(`Investment tx ${t.id}: investment missing`);
    });
    (data.businessTransactions || []).forEach((t) => {
      if (!data.businesses.find((b) => b.id === t.business_id)) problems.push(`Business tx ${t.id}: business missing`);
    });
    await audit("integrity_check", `Found ${problems.length} issues`);
    if (problems.length === 0) setStatus("✓ Integrity check passed. All references are valid.");
    else setStatus(`⚠ ${problems.length} broken references found: ` + problems.slice(0, 5).join("; "));
  };

  if (loading || !data) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Backup & Restore" description="Fully offline backups. Backups are exported as files to your chosen location — never uploaded anywhere." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="font-medium flex items-center gap-2"><DatabaseBackup className="w-4 h-4" /> Create Backup</div>
          <p className="text-sm text-muted-foreground">Exports an encrypted-suitable JSON backup with metadata and a checksum. Choose where to save it (an external drive is recommended).</p>
          <Button onClick={createBackup}><DatabaseBackup className="w-4 h-4 mr-1" /> Backup Now</Button>
        </div>

        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="font-medium flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Restore & Integrity</div>
          <p className="text-sm text-muted-foreground">Validate and restore from a backup file, or run a database integrity check on your current data.</p>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleRestoreFile} className="hidden" />
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => fileRef.current?.click()}>Select Backup File</Button>
            <Button variant="outline" onClick={integrityCheck}>Run Integrity Check</Button>
          </div>
          {restorePreview && (
            <div className="rounded-md border p-3 text-sm">
              <div><b>{restorePreview.name}</b> — {restorePreview.total} records. Structure validated.</div>
              <Button size="sm" className="mt-2" onClick={restore}>Confirm Restore</Button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="font-medium">Backup Settings</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Backup Location</Label>
            <Input value={backupFolder} onChange={(e) => setSetting("backup_folder", e.target.value)} placeholder="e.g. External Drive E:\Backups" />
          </div>
          <div>
            <Label>Frequency</Label>
            <Input value={backupFreq} onChange={(e) => setSetting("backup_freq", e.target.value)} placeholder="manual / weekly / monthly" />
          </div>
          <div>
            <Label>Retention Count</Label>
            <Input type="number" value={retention} onChange={(e) => setSetting("backup_retention", Number(e.target.value))} />
          </div>
        </div>
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-50 dark:bg-amber-900/20 p-3 rounded">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          Note: This platform stores data in its cloud database; the JSON backup is your local export copy. For a truly local-only file store, save backups to an external drive you control.
        </div>
      </div>

      {status && <div className="rounded-lg border bg-muted/30 p-4 text-sm">{status}</div>}
    </div>
  );
}