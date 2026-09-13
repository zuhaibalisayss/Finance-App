import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { SectionHeader, EmptyState, Badge } from "@/components/ui/finance";
import { Input } from "@/components/ui/input";
import { Search, History } from "lucide-react";

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    base44.entities.AuditLog.list("-timestamp", 500)
      .then((r) => setLogs(r))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return logs;
    return logs.filter((l) => `${l.action} ${l.details || ""}`.toLowerCase().includes(q));
  }, [logs, search]);

  const toneFor = (action) => {
    if (action.includes("delete") || action.includes("failed")) return "negative";
    if (action.includes("backup") || action.includes("restore")) return "warning";
    if (action.includes("create") || action.includes("import")) return "positive";
    return "default";
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Audit Log" description="A record of important actions. Secrets (passwords, recovery codes, keys) are never logged." />

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search actions…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div> :
        filtered.length === 0 ? (
          <EmptyState icon={History} title="No audit entries" description="Actions you take will be recorded here." />
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                <tr><th className="text-left px-4 py-2.5">Timestamp</th><th className="text-left px-4 py-2.5">Action</th><th className="text-left px-4 py-2.5">Details</th></tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-2.5"><Badge tone={toneFor(l.action)}>{l.action}</Badge></td>
                    <td className="px-4 py-2.5">{l.details || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}