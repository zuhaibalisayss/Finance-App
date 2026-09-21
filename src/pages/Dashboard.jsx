import React, { useState, useEffect } from "react";
import { entities } from "@/lib/localStorage";
import { SectionHeader, StatCard } from "@/components/ui/finance";
import { Wallet, TrendingUp, CreditCard, Target } from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState({ accounts: [], transactions: [], goals: [], liabilities: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accounts, transactions, goals, liabilities] = await Promise.all([
        entities.Account.list(),
        entities.Transaction.list("-date", 10),
        entities.Goal.list(),
        entities.Liability.list()
      ]);
      setData({ accounts, transactions, goals, liabilities });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const totalAssets = data.accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalLiabilities = data.liabilities.reduce((sum, l) => sum + (l.balance || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Dashboard" description="Overview of your financial position" />
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Assets" value={`$${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} tone="positive" />
        <StatCard label="Total Liabilities" value={`$${totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} tone="negative" />
        <StatCard label="Net Worth" value={`$${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} tone={netWorth >= 0 ? "positive" : "negative"} />
        <StatCard label="Active Goals" value={`${data.goals.filter(g => (g.current_amount || 0) < (g.target_amount || 0)).length} / ${data.goals.length}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Wallet className="w-4 h-4" /> Recent Transactions</h3>
          {data.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {data.transactions.slice(0, 5).map((t) => (
                <div key={t.id} className="flex justify-between items-center text-sm">
                  <span>{t.description || t.type}</span>
                  <span className={`font-medium ${(t.type === 'income' || t.type === 'dividend') ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}${t.amount?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Target className="w-4 h-4" /> Financial Goals</h3>
          {data.goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goals set</p>
          ) : (
            <div className="space-y-3">
              {data.goals.slice(0, 3).map((g) => {
                const progress = g.target_amount ? Math.min(100, ((g.current_amount || 0) / g.target_amount) * 100) : 0;
                return (
                  <div key={g.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{g.name}</span>
                      <span className="text-muted-foreground">${g.current_amount || 0} / ${g.target_amount || 0}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
