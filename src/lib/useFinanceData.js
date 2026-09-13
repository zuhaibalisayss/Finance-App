import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Loads all source data used across the app. Pages derive metrics from this.
export function useFinanceData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        accounts, transactions, investments, investmentTransactions,
        businesses, businessTransactions, assets, liabilities,
        goals, budgets, snapshots, categories,
      ] = await Promise.all([
        base44.entities.Account.list(),
        base44.entities.Transaction.list("-date", 500),
        base44.entities.Investment.list(),
        base44.entities.InvestmentTransaction.list("-date", 1000),
        base44.entities.Business.list(),
        base44.entities.BusinessTransaction.list("-date", 1000),
        base44.entities.Asset.list(),
        base44.entities.Liability.list(),
        base44.entities.Goal.list(),
        base44.entities.Budget.list(),
        base44.entities.NetWorthSnapshot.list("-date", 200),
        base44.entities.Category.list(),
      ]);
      setData({
        accounts, transactions, investments, investmentTransactions,
        businesses, businessTransactions, assets, liabilities,
        goals, budgets, snapshots, categories,
      });
      setError(null);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to load financial data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}