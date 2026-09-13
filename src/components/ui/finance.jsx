import React from "react";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, sublabel, tone = "default", className }) {
  const tones = {
    default: "text-foreground",
    positive: "text-emerald-600 dark:text-emerald-400",
    negative: "text-red-600 dark:text-red-400",
    muted: "text-muted-foreground",
  };
  return (
    <div className={cn("rounded-lg border bg-card p-4 flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={cn("text-2xl font-heading font-semibold", tones[tone])}>{value}</span>
      {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
    </div>
  );
}

export function SectionHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="text-2xl font-heading font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 border border-dashed rounded-lg">
      {Icon && <Icon className="w-10 h-10 text-muted-foreground mb-3" />}
      <h3 className="font-medium">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = "default" }) {
  const tones = {
    default: "bg-secondary text-secondary-foreground",
    positive: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    negative: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function useLoading() {
  // simple inline loading spinner element
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
}

export function Spinner() {
  return <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}