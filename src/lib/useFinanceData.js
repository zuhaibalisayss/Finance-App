import { useState, useEffect } from 'react';
import { entities } from './localStorage';

export function useFinanceData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const allData = await entities.getAllData();
        setData(allData);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { data, loading, error };
}
