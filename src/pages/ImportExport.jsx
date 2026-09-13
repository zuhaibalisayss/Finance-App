import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useFinanceData } from "@/lib/useFinanceData";
import { formatMoney, netWorth, portfolioSummary, businessPortfolioSummary, accountsSummary } from "@/lib/finance";
import { audit } from "@/lib/store";
import { SectionHeader } from "@/components/ui/finance";
import { Button } from "@/components/ui/button";
import { downloadJSON, downloadFile, toCSV } from "@/lib/exporters";
import { validateImport } from "@/lib/importValidation";
import { Download, Upload, FileJson, FileSpreadsheet } from "lucide-react";

export default function ImportExport() {
  const { data, loading, reload } = useFinanceData();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("File too large (max 5MB)."); return; }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text); // malformed JSON throws — handled below
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid structure");
      const { fatal, counts } = validateImport(parsed);
      if (fatal) { alert(fatal); e.target.value = ""; return; }
      setPreview({ name: file.name, data: parsed, count: Object.values(counts).reduce((s, n) => s + n, 0), counts });
      setResult(null);
    } catch (err) {
      alert("Could not parse file: " + (err.message || err));
    }
    e.target.value = "";
  };

  const doImport = async () => {
    if (!preview) return;
    const { fatal, warnings, counts, cleaned } = validateImport(preview.data);
    if (fatal) { alert(fatal); return; }
    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    if (!confirm(`Import ${total} records from "${preview.name}"? Existing records are not updated — new records are appended.`)) return;
    setImporting(true);
    const res = { ok: 0, failed: 0, errors: [] };
    try {
      for (const [key, recs] of Object.entries(cleaned)) {
        for (const payload of recs) {
          try {
            await base44.entities[key].create(payload);
            res.ok++;
          } catch (e) {
            res.failed++;
            if (res.errors.length < 10) res.errors.push(`${key}: one record could not be imported`);
          }
        }
      }
      if (res.failed > 0 && res.ok === 0) {
        alert("Import failed. No records were written. Details are in the audit log.");
      }
      setResult({ ...res, warnings });
      await audit("import", `Imported ${res.ok} records, ${res.failed} failed`);
      reload();
    } catch (e) {
      alert("Import failed. Details are in the audit log.");
    }
    setImporting(false);
  };

  const exportFullJSON = async () => {
    if (!data) return;
    const d = data;
    const full = {
      _meta: { exported_at: new Date().toISOString(), app: "Offline Wealth Manager", version: 1 },
      Account: d.accounts, Transaction: d.transactions, Investment: d.investments,
      InvestmentTransaction: d.investmentTransactions, Business: d.businesses,
      BusinessTransaction: d.businessTransactions, Asset: d.assets, Liability: d.liabilities,
      Goal: d.goals, Budget: d.budgets, NetWorthSnapshot: d.snapshots,
    };
    downloadJSON(`wealth-backup-${new Date().toISOString().slice(0, 10)}.json`, full);
    await audit("export", "Full JSON export");
  };

  const exportAccountsCSV = () => {
    if (!data) return;
    const csv = toCSV(data.accounts, [
      { label: "Name", get: (a) => a.name }, { label: "Type", get: (a) => a.type },
      { label: "Institution", get: (a) => a.institution || "" }, { label: "Opening Balance", get: (a) => a.opening_balance },
      { label: "Currency", get: (a) => a.currency }, { label: "Status", get: (a) => a.status },
    ]);
    downloadFile("accounts.csv", csv, "text/csv");
    audit("export", "Accounts CSV");
  };

  const exportTransactionsCSV = () => {
    if (!data) return;
    const csv = toCSV(data.transactions, [
      { label: "Date", get: (t) => t.date }, { label: "Description", get: (t) => t.description || "" },
      { label: "Type", get: (t) => t.type }, { label: "Category", get: (t) => t.category || "" },
      { label: "Amount", get: (t) => t.amount }, { label: "Currency", get: (t) => t.currency },
    ]);
    downloadFile("transactions.csv", csv, "text/csv");
    audit("export", "Transactions CSV");
  };

  if (loading || !data) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Import / Export" description="Export your full financial data or import a previously exported JSON backup. Imports are validated and confirmed before writing." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="font-medium flex items-center gap-2"><Download className="w-4 h-4" /> Export</div>
          <p className="text-sm text-muted-foreground">Export full financial data (JSON backup) or individual sections as CSV (opens in Excel).</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportFullJSON}><FileJson className="w-4 h-4 mr-1" /> Full JSON Backup</Button>
            <Button variant="outline" onClick={exportAccountsCSV}><FileSpreadsheet className="w-4 h-4 mr-1" /> Accounts CSV</Button>
            <Button variant="outline" onClick={exportTransactionsCSV}><FileSpreadsheet className="w-4 h-4 mr-1" /> Transactions CSV</Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="font-medium flex items-center gap-2"><Upload className="w-4 h-4" /> Import</div>
          <p className="text-sm text-muted-foreground">Import a JSON backup. The file is validated and previewed before anything is written. New records are appended (existing records are not modified or overwritten).</p>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFile} className="hidden" />
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 mr-1" /> Choose JSON File</Button>
          {preview && (
            <div className="rounded-md border p-3 text-sm space-y-2">
              <div><b>{preview.name}</b> — {preview.count} records detected</div>
              <div className="text-xs text-muted-foreground">Sections: {Object.keys(preview.data).filter((k) => Array.isArray(preview.data[k])).join(", ") || "none"}</div>
              {result ? (
                <div className={`text-sm ${result.failed > 0 ? "text-amber-600" : "text-emerald-600"}`}>Imported {result.ok} records. {result.failed > 0 && `${result.failed} failed.`}</div>
              ) : (
                <Button size="sm" onClick={doImport} disabled={importing}>{importing ? "Importing…" : "Confirm & Import"}</Button>
              )}
              {result?.errors?.length > 0 && (
                <div className="text-xs text-red-600 max-h-24 overflow-auto">{result.errors.slice(0, 10).map((e, i) => <div key={i}>{e}</div>)}</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <b>Data summary:</b> {data.accounts.length} accounts, {data.transactions.length} transactions, {data.investments.length} investments, {data.businesses.length} businesses, {data.assets.length} assets, {data.liabilities.length} liabilities. Net worth: {formatMoney(netWorth(data).netWorth)}.
      </div>
    </div>
  );
}