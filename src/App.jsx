import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContextLocal';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import CashSavings from '@/pages/CashSavings';
import TransactionsLocal from '@/pages/TransactionsLocal';
import Investments from '@/pages/Investments';
import Assets from '@/pages/Assets';
import Liabilities from '@/pages/Liabilities';
import Goals from '@/pages/Goals';
import Reports from '@/pages/Reports';
import NetWorthPage from '@/pages/NetWorth';
import ImportExport from '@/pages/ImportExport';
import BackupRestore from '@/pages/BackupRestore';
import Settings from '@/pages/Settings';
import Security from '@/pages/Security';
import AuditLog from '@/pages/AuditLog';
import Login from '@/pages/Login';
import Register from '@/pages/Register';

const AuthenticatedApp = () => {
  const { user, isLoading } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not logged in, show login/register
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Render the main app for authenticated users
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cash-savings" element={<CashSavings />} />
        <Route path="/transactions" element={<TransactionsLocal />} />
        <Route path="/investments" element={<Investments />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/liabilities" element={<Liabilities />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/net-worth" element={<NetWorthPage />} />
        <Route path="/import-export" element={<ImportExport />} />
        <Route path="/backup" element={<BackupRestore />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/security" element={<Security />} />
        <Route path="/audit-log" element={<AuditLog />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App