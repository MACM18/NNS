"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FolderOpen, FileSpreadsheet, RefreshCw, Save } from "lucide-react";

declare global { interface Window { gapi?: any; google?: any } }
type Setup = { connected: boolean; accountEmail: string | null; enabled: boolean; templateFileId: string; destinationFolderId: string; namePattern: string; clearRanges: string[]; monthCell: string; balanceMappings: { sourceRange: string; destinationRange: string }[]; editors: string[]; lastRun: { period: string; status: string; error: string | null; fileUrl: string | null; startedAt: string } | null };

export default function GoogleSheetMonthlySetup() {
  const [data, setData] = useState<Setup | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [templateFileId, setTemplateFileId] = useState("");
  const [destinationFolderId, setDestinationFolderId] = useState("");
  const [namePattern, setNamePattern] = useState("NNS Telecom - {Month} {Year}");
  const [clearRanges, setClearRanges] = useState("");
  const [monthCell, setMonthCell] = useState("");
  const [balanceMappings, setBalanceMappings] = useState("");
  const [editors, setEditors] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations/google-sheets/monthly/settings", { cache: "no-store" });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not load monthly settings");
      setData(result); setEnabled(result.enabled); setTemplateFileId(result.templateFileId); setDestinationFolderId(result.destinationFolderId); setNamePattern(result.namePattern); setClearRanges(result.clearRanges.join("\n")); setMonthCell(result.monthCell); setBalanceMappings(result.balanceMappings.map((x: any) => `${x.sourceRange} -> ${x.destinationRange}`).join("\n")); setEditors(result.editors.join("\n"));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load monthly settings"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function pick(kind: "template" | "folder") {
    setMessage("");
    try {
      const response = await fetch("/api/integrations/google-sheets/monthly/picker-token", { cache: "no-store" });
      const auth = await response.json(); if (!response.ok) throw new Error(auth.error || "Connect Google Drive first");
      if (!auth.apiKey || !auth.appId) throw new Error("Set GOOGLE_PICKER_API_KEY and GOOGLE_CLOUD_PROJECT_NUMBER in Dokploy to enable file picking.");
      if (!window.gapi) { await new Promise<void>((resolve, reject) => { const script = document.createElement("script"); script.src = "https://apis.google.com/js/api.js"; script.onload = () => resolve(); script.onerror = () => reject(new Error("Google Picker could not load")); document.head.appendChild(script); }); }
      await new Promise<void>((resolve) => window.gapi.load("picker", { callback: resolve }));
      const picker = window.google.picker;
      const view = kind === "folder" ? new picker.DocsView(picker.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true) : new picker.DocsView(picker.ViewId.SPREADSHEETS);
      const builder = new picker.PickerBuilder().addView(view).setOAuthToken(auth.accessToken).setDeveloperKey(auth.apiKey).setAppId(auth.appId).setTitle(kind === "folder" ? "Choose destination folder" : "Choose master spreadsheet").setCallback((result: any) => {
        if (result.action !== picker.Action.PICKED) return;
        const doc = result.docs?.[0]; if (!doc?.id) return;
        if (kind === "folder") setDestinationFolderId(doc.id); else setTemplateFileId(doc.id);
      });
      builder.build().setVisible(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not open Google Picker"); }
  }

  async function save() {
    setBusy(true); setMessage("");
    try {
      const ranges = clearRanges.split(/\n|,/).map(x => x.trim()).filter(Boolean);
      const mappings = balanceMappings.split("\n").map(x => x.trim()).filter(Boolean).map(line => { const parts = line.split("->").map(p => p.trim()); if (parts.length !== 2) throw new Error(`Invalid balance mapping: ${line}`); return { sourceRange: parts[0], destinationRange: parts[1] }; });
      const response = await fetch("/api/integrations/google-sheets/monthly/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled, templateFileId, destinationFolderId, namePattern, clearRanges: ranges, monthCell, balanceMappings: mappings, editors: editors.split(/\n|,/).map(x => x.trim()).filter(Boolean) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not save settings");
      await load(); setMessage("Monthly sheet automation settings saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save settings"); } finally { setBusy(false); }
  }

  return <Card className="border-border/80 shadow-sm">
    <CardHeader><div className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><FileSpreadsheet className="h-5 w-5" /></div><div><CardTitle>Monthly sheet setup</CardTitle><CardDescription>Create a new monthly copy, carry balances forward, share it, then connect it for import.</CardDescription></div></div></CardHeader>
    <CardContent className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4"><div><p className="font-medium">Admin Google Drive</p><p className="text-sm text-muted-foreground">{data?.connected ? `Connected as ${data.accountEmail || "Google account"}` : "Connect the Google account that owns and manages the sheets."}</p></div><Button variant="outline" asChild><a href="/api/integrations/google-sheets/monthly/oauth/start">{data?.connected ? "Reconnect account" : "Connect Google account"}</a></Button></div>
      <div className="flex items-center justify-between gap-4 rounded-lg border p-4"><div><Label htmlFor="monthly-sheet-enabled">Monthly automation</Label><p className="text-sm text-muted-foreground">Runs at 00:05 on the first day of each month (Sri Lanka time).</p></div><Switch id="monthly-sheet-enabled" checked={enabled} onCheckedChange={setEnabled} disabled={!data?.connected || busy} /></div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2"><Label>Master template</Label><div className="flex gap-2"><Input value={templateFileId} readOnly placeholder="Choose a spreadsheet" /><Button type="button" variant="outline" onClick={() => pick("template")} disabled={!data?.connected}><FileSpreadsheet className="mr-2 h-4 w-4" />Choose</Button></div></div>
        <div className="space-y-2"><Label>Destination folder</Label><div className="flex gap-2"><Input value={destinationFolderId} readOnly placeholder="Choose a Drive folder" /><Button type="button" variant="outline" onClick={() => pick("folder")} disabled={!data?.connected}><FolderOpen className="mr-2 h-4 w-4" />Choose</Button></div></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="monthly-name">Sheet name pattern</Label><Input id="monthly-name" value={namePattern} onChange={e => setNamePattern(e.target.value)} /><p className="text-xs text-muted-foreground">Use {"{Month}"}, {"{Year}"}, and optionally {"{MM}"}.</p></div><div className="space-y-2"><Label htmlFor="monthly-cell">Month label cell (optional)</Label><Input id="monthly-cell" placeholder="Summary!B2" value={monthCell} onChange={e => setMonthCell(e.target.value)} /></div></div>
      <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="monthly-clear">Input ranges to clear</Label><textarea id="monthly-clear" className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder={'Entries!A2:Z500\n'Material Balance'!A2:H100'} value={clearRanges} onChange={e => setClearRanges(e.target.value)} /><p className="text-xs text-muted-foreground">One A1 range per line. Existing formulas are preserved.</p></div><div className="space-y-2"><Label htmlFor="monthly-balances">Ending to opening balance mappings</Label><textarea id="monthly-balances" className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder={''Material Balance - Month'!H2:H30 -> 'Material Balance - Month'!B2:B30'} value={balanceMappings} onChange={e => setBalanceMappings(e.target.value)} /><p className="text-xs text-muted-foreground">Previous month source range → new month opening range, one mapping per line.</p></div></div>
      <div className="space-y-2"><Label htmlFor="monthly-editors">Editor email addresses</Label><textarea id="monthly-editors" className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="One Google account email per line" value={editors} onChange={e => setEditors(e.target.value)} /><p className="text-xs text-muted-foreground">Use one Google email per line. For a Google Group, prefix it with group:. The importer service account is added automatically.</p></div>
      {data?.lastRun && <p className="text-sm text-muted-foreground">Last monthly setup: {data.lastRun.period} · {data.lastRun.status}{data.lastRun.fileUrl ? <> · <a className="underline" href={data.lastRun.fileUrl} target="_blank" rel="noreferrer">Open sheet</a></> : null}{data.lastRun.error ? ` · ${data.lastRun.error}` : ""}</p>}
      <div className="flex flex-wrap items-center gap-3"><Button onClick={save} disabled={busy || !data}>{busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save monthly setup</Button>{message && <p className="text-sm" role="status">{message}</p>}</div>
    </CardContent>
  </Card>;
}
