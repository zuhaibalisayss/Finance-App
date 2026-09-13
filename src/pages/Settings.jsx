import React, { useState } from "react";
import { useFinanceData } from "@/lib/useFinanceData";
import { CURRENCIES, DEFAULT_ALLOCATIONS } from "@/lib/finance";
import { getSetting, setSetting, audit } from "@/lib/store";
import { SectionHeader } from "@/components/ui/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALLOC_KEYS = [
  { key: "expenses", label: "Expenses" }, { key: "savings", label: "Savings" },
  { key: "emergency", label: "Emergency Fund" }, { key: "investments", label: "Investments" },
  { key: "business", label: "Business / Other" },
];

export default function Settings() {
  const { data } = useFinanceData();
  const [currency, setCurrency] = useState(getSetting("currency", "PKR"));
  const [customCurrency, setCustomCurrency] = useState(getSetting("custom_currency", ""));
  const [dateFormat, setDateFormat] = useState(getSetting("date_format", "DD/MM/YYYY"));
  const [firstDay, setFirstDay] = useState(getSetting("first_day", "Monday"));
  const [theme, setTheme] = useState(getSetting("theme", "light"));
  const [emergencyTarget, setEmergencyTarget] = useState(getSetting("emergency_target", 0));
  const [allocations, setAllocations] = useState(getSetting("allocations", DEFAULT_ALLOCATIONS));

  const save = async () => {
    setSetting("currency", currency);
    if (currency === "custom") setSetting("custom_currency", customCurrency);
    setSetting("date_format", dateFormat);
    setSetting("first_day", firstDay);
    setSetting("theme", theme);
    setSetting("emergency_target", Number(emergencyTarget) || 0);
    setSetting("allocations", allocations);
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    await audit("settings_change", "Updated general/financial settings");
    alert("Settings saved.");
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" description="Configure currency, display preferences, allocation targets, and budgeting defaults." action={<Button onClick={save}>Save Settings</Button>} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="font-medium">General</div>
          <div>
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CURRENCIES).map(([k, v]) => <SelectItem key={k} value={k}>{k} — {v.name}</SelectItem>)}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {currency === "custom" && (
            <div><Label>Custom Currency Code</Label><Input value={customCurrency} onChange={(e) => setCustomCurrency(e.target.value)} placeholder="e.g. INR" /></div>
          )}
          <div>
            <Label>Date Format</Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>First Day of Week</Label>
            <Select value={firstDay} onValueChange={setFirstDay}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Monday">Monday</SelectItem><SelectItem value="Sunday">Sunday</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label>Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="light">Light</SelectItem><SelectItem value="dark">Dark</SelectItem></SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="font-medium">Financial — Allocation Targets (%)</div>
          <p className="text-xs text-muted-foreground">These are your personal policy, not financial advice. Used for the dashboard allocation vs target comparison.</p>
          {ALLOC_KEYS.map((a) => (
            <div key={a.key}>
              <Label>{a.label}</Label>
              <Input type="number" min="0" max="100" value={allocations[a.key] || 0} onChange={(e) => setAllocations({ ...allocations, [a.key]: Number(e.target.value) })} />
            </div>
          ))}
          <div className="text-xs text-muted-foreground">Total: {Object.values(allocations).reduce((s, v) => s + Number(v || 0), 0)}%</div>
          <div>
            <Label>Emergency Fund Target Amount</Label>
            <Input type="number" step="0.01" value={emergencyTarget} onChange={(e) => setEmergencyTarget(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="font-medium">Budgeting</div>
        <p className="text-sm text-muted-foreground">You have {data?.budgets?.length || 0} budget rules. Create category budgets from the budgeting section.</p>
      </div>
    </div>
  );
}