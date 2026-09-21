import React from 'react';
import { useAuth } from '@/lib/AuthContextLocal';

export default function ImportExport() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Import / Export</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-slate-600">Import and export your financial data.</p>
        <p className="text-slate-500 mt-2">This feature is under development.</p>
      </div>
    </div>
  );
}
