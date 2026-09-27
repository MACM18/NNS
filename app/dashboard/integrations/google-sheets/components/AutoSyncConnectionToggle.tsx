"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";

export default function AutoSyncConnectionToggle({ connectionId, checked, eligible }: { connectionId: string; checked: boolean; eligible: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function update(enabled: boolean) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/integrations/google-sheets/auto-sync", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, enabled }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update auto-sync");
      window.dispatchEvent(new Event("google-sheet-auto-sync-changed"));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update auto-sync");
    } finally {
      setPending(false);
    }
  }

  return <div className="flex flex-col gap-1">
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <Switch checked={checked} onCheckedChange={update} disabled={!eligible || pending} aria-label="Auto-sync this sheet" />
      {eligible ? "Auto-sync" : "Manual only"}
    </label>
    {error && <span className="text-xs text-destructive" role="alert">{error}</span>}
  </div>;
}
