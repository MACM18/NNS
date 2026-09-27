"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, RefreshCw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type AutoSyncData = {
  enabled: boolean;
  schedulerConfigured: boolean;
  dailyTime: string;
  timeZone: string;
  newestConnection: { id: string; sheetName: string | null; month: number; year: number; autoSyncEnabled: boolean } | null;
  lastRun: { status: string; startedAt: string; error: string | null } | null;
};

export default function GoogleSheetAutoSyncSettings() {
  const router = useRouter();
  const [data, setData] = useState<AutoSyncData | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [dailyTime, setDailyTime] = useState("02:00");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations/google-sheets/auto-sync", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load auto-sync settings");
      setData(result);
      setEnabled(result.enabled);
      setDailyTime(result.dailyTime);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load settings");
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => { void load(); };
    window.addEventListener("google-sheet-auto-sync-changed", refresh);
    return () => window.removeEventListener("google-sheet-auto-sync-changed", refresh);
  }, [load]);

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/integrations/google-sheets/auto-sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, dailyTime, timeZone: "Asia/Colombo" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save settings");
      await load();
      setMessage("Daily import settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setBusy(false);
    }
  }

  async function toggleConnection(checked: boolean) {
    if (!data?.newestConnection) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/integrations/google-sheets/auto-sync", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: data.newestConnection.id, enabled: checked }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update selection");
      await load();
      router.refresh();
      setMessage(checked ? "Latest sheet selected for auto-sync." : "Auto-sync disabled for this sheet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update selection");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><Settings2 className="h-5 w-5" /></div>
          <div>
            <CardTitle>Automatic Google Sheets import</CardTitle>
            <CardDescription>Import the latest current-month sheet once each day.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {data && !data.schedulerConfigured && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">Automatic imports are unavailable until CRON_SECRET is set in the Dokploy application environment and the app is redeployed.</p>}
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
          <div><Label htmlFor="sheet-auto-enabled">Daily import</Label><p className="text-sm text-muted-foreground">Run the selected sheet automatically.</p></div>
          <Switch id="sheet-auto-enabled" checked={enabled} onCheckedChange={setEnabled} disabled={busy || !data} />
        </div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,180px)_1fr] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="sheet-auto-time">Run every day at</Label>
            <Input id="sheet-auto-time" type="time" value={dailyTime} onChange={(event) => setDailyTime(event.target.value)} disabled={busy || !data} />
          </div>
          <div className="flex items-center gap-2 pb-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" /> Sri Lanka time (Asia/Colombo)</div>
        </div>
        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <div><Label htmlFor="sheet-auto-connection">Current-month connection</Label><p className="text-sm text-muted-foreground">{data?.newestConnection ? (data.newestConnection.sheetName || `${data.newestConnection.month}/${data.newestConnection.year}`) : "No sheet connected for this month"}</p></div>
            <Switch id="sheet-auto-connection" checked={Boolean(data?.newestConnection?.autoSyncEnabled)} onCheckedChange={toggleConnection} disabled={busy || !data?.newestConnection} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">At the start of a new month, older sheets are unchecked. The newest sheet for that month is selected when available.</p>
        </div>
        {data?.lastRun && <p className="text-sm text-muted-foreground">Last scheduled run: {data.lastRun.status} · {new Date(data.lastRun.startedAt).toLocaleString()}{data.lastRun.error ? ` · ${data.lastRun.error}` : ""}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={busy || !data}>{busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}Save schedule</Button>
          {message && <p className="text-sm" role="status">{message}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
