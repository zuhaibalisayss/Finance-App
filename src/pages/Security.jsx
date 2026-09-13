import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { getSetting, setSetting, audit } from "@/lib/store";
import { SectionHeader } from "@/components/ui/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/finance";
import { Shield, Lock, KeyRound, Clock, AlertTriangle } from "lucide-react";

export default function Security() {
  const [user, setUser] = useState(null);
  const [sessionTimeout, setSessionTimeout] = useState(getSetting("session_timeout", 15));
  const [rememberSession, setRememberSession] = useState(getSetting("remember_session", false));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 8) { alert("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { alert("Passwords do not match."); return; }
    if (!confirm("Change your account password? This is the local recovery path — there is no server-side email reset.")) return;
    try {
      await base44.auth.updateMe({ password: newPassword });
      await audit("password_change", "Password changed");
      setNewPassword(""); setConfirmPassword("");
      alert("Password updated. Use it on your next login.");
    } catch (e) { alert("Could not change password: " + (e.message || e)); }
  };

  const saveSecurity = async () => {
    setSetting("session_timeout", Number(sessionTimeout) || 15);
    setSetting("remember_session", rememberSession);
    await audit("security_settings", "Updated security settings");
    alert("Security settings saved.");
  };

  const lock = () => { audit("manual_lock", "Locked from security page"); base44.auth.logout(); };

  return (
    <div className="space-y-6">
      <SectionHeader title="Security / Account" description="Account security, session locking, and password management. There is no server-side reset — keep your recovery code safe." />

      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="font-medium flex items-center gap-2"><Shield className="w-4 h-4" /> Account</div>
        {user ? (
          <div className="text-sm space-y-1">
            <div>Email: <b>{user.email}</b></div>
            <div>Role: <Badge>{user.role || "user"}</Badge></div>
            <div>Name: {user.full_name || "—"}</div>
          </div>
        ) : <div className="text-sm text-muted-foreground">Loading account…</div>}
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="font-medium flex items-center gap-2"><KeyRound className="w-4 h-4" /> Change Password</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" /></div>
          <div><Label>Confirm New Password</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
        </div>
        <Button onClick={changePassword}>Change Password</Button>
        <div className="text-xs text-muted-foreground">Passwords are never stored in plaintext or with reversible encryption on the platform.</div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="font-medium flex items-center gap-2"><Clock className="w-4 h-4" /> Session</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Auto-Lock After Inactivity (minutes)</Label>
            <Input type="number" min="1" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={rememberSession} onChange={(e) => setRememberSession(e.target.checked)} />
              Remember local session (disabled by default)
            </label>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveSecurity}>Save Security Settings</Button>
          <Button variant="outline" onClick={lock}><Lock className="w-4 h-4 mr-1" /> Lock Application Now</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200 p-4 text-sm flex gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
        <div>
          <b>Recovery note:</b> This platform uses email-based account recovery. If you lose access, use the "Forgot Password" flow on the login screen. For a fully offline recovery-code system (no server), a native desktop build would be required — beyond this web platform.
        </div>
      </div>
    </div>
  );
}