import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Copy, Check } from "lucide-react";

export default function RestoreKeyPanel({ restoreKey, onConfirm }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(restoreKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be blocked; user can still select-all the key field
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/40 p-4 font-mono text-sm break-all text-center select-all tracking-wider leading-relaxed">
        {restoreKey}
      </div>

      <Button variant="outline" className="w-full" onClick={copy}>
        {copied ? (
          <>
            <Check className="w-4 h-4 mr-2" /> Copied to clipboard
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 mr-2" /> Copy restore key
          </>
        )}
      </Button>

      <div className="flex gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
        <div>
          <b>Warning:</b> If the restore key is lost and you don't remember your
          password, your data can be unrecoverable.
        </div>
      </div>

      <Button className="w-full h-12 font-medium" onClick={onConfirm}>
        I've saved my restore key
      </Button>
    </div>
  );
}