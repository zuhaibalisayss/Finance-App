import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import CashSavings from '@/pages/CashSavings';
import Transactions from '@/pages/Transactions';
import Investments from '@/pages/Investments';
import Business from '@/pages/Business';
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
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import { Navigate } from 'react-router-dom';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cash-savings" element={<CashSavings />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/investments" element={<Investments />} />
          <Route path="/business" element={<Business />} />
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