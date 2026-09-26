import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContextLocal";
import {
  LayoutDashboard, Wallet, ArrowLeftRight, TrendingUp,
  Landmark, CreditCard, Target, FileText, Scale, Download, DatabaseBackup,
  Settings, Shield, History, LogOut, Lock, Menu, X,
} from "lucide-react";
import { audit } from "@/lib/store";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/cash-savings", label: "Cash & Savings", icon: Wallet },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/investments", label: "Investment Portfolio", icon: TrendingUp },
  { to: "/assets", label: "Assets", icon: Landmark },
  { to: "/liabilities", label: "Liabilities", icon: CreditCard },
  { to: "/goals", label: "Financial Goals", icon: Target },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/net-worth", label: "Net Worth", icon: Scale },
  { to: "/import-export", label: "Import / Export", icon: Download },
  { to: "/backup", label: "Backup & Restore", icon: DatabaseBackup },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/security", label: "Security / Account", icon: Shield },
  { to: "/audit-log", label: "Audit Log", icon: History },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    try {
      const theme = JSON.parse(localStorage.getItem("pf_theme") || '"light"');
      if (theme === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } catch {}
  }, []);

  const handleLogout = async () => {
    await audit("logout", "User logged out");
    logout();
  };

  const handleLock = () => {
    // Manual lock: sign out to force re-authentication.
    audit("manual_lock", "Application manually locked");
    logout();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-40 w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-transform ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="px-5 py-5 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Scale className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold tracking-tight">Wealth Manager</span>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button
            onClick={handleLock}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
          >
            <Lock className="w-4 h-4" /> Lock Application
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-20">
          <button onClick={() => setOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-heading font-semibold">Wealth Manager</span>
          <div className="w-5" />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}