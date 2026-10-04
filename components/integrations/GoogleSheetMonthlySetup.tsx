"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DrivePicker, DrivePickerDocsView } from "@googleworkspace/drive-picker-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, CheckCircle2, ChevronDown, ChevronUp, FileSpreadsheet, FolderOpen, Link2, RefreshCw, Save, Send } from "lucide-react";

type PickerAuth = { accessToken: string; apiKey: string; appId: string };
type PickerKind = "template" | "folder";
type PickerSelectionEvent = CustomEvent<{ docs?: Array<{ id?: string; name?: string; mimeType?: string }> }>;
type MonthlyRun = { id: string; period: string; status: string; error: string | null; fileUrl: string | null; startedAt: string; finishedAt: string | null };
type Setup = { connected: boolean; accountEmail: string | null; enabled: boolean; templateFileId: string; destinationFolderId: string; namePattern: string; editors: string[]; lastRun: MonthlyRun | null; recentRuns: MonthlyRun[] };

export default function GoogleSheetMonthlySetup() {
  const [data, setData] = useState<Setup | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [templateFileId, setTemplateFileId] = useState("");
  const [destinationFolderId, setDestinationFolderId] = useState("");
  const [namePattern, setNamePattern] = useState("NNS Telecom - {Month} {Year}");
  const [editors, setEditors] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pickerKind, setPickerKind] = useState<PickerKind | null>(null);
  const [pickerAuth, setPickerAuth] = useState<PickerAuth | null>(null);
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualMessage, setManualMessage] = useState("");
  const [manualLink, setManualLink] = useState("");
  const pickerHost = useRef<HTMLDivElement>(null);
  const initializedCollapse = useRef(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations/google-sheets/monthly/settings", { cache: "no-store" });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not load monthly settings");
      const normalized = { ...result, recentRuns: Array.isArray(result.recentRuns) ? result.recentRuns : result.lastRun ? [result.lastRun] : [] } as Setup;
      setData(normalized); setEnabled(normalized.enabled); setTemplateFileId(normalized.templateFileId); setDestinationFolderId(normalized.destinationFolderId); setNamePattern(normalized.namePattern); setEditors(normalized.editors.join("\n"));
      if (!initializedCollapse.current) {
        setSetupCollapsed(isFullyConfigured(normalized));
        initializedCollapse.current = true;
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load monthly settings"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!pickerKind || !pickerHost.current) return;
    const picker = pickerHost.current.querySelector("drive-picker");
    if (!picker) return;
    const reportError = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string; error?: string }>).detail;
      setMessage(detail?.message || detail?.error || "Google Picker could not complete the selection. Check Drive access and try again.");
      setPickerKind(null); setPickerAuth(null);
    };
    picker.addEventListener("picker-error", reportError);
    return () => picker.removeEventListener("picker-error", reportError);
  }, [pickerKind]);

  async function pick(kind: PickerKind) {
    setMessage("");
    try {
      const response = await fetch("/api/integrations/google-sheets/monthly/picker-token", { cache: "no-store" });
      const auth = await response.json(); if (!response.ok) throw new Error(auth.error || "Connect Google Drive first");
      if (!auth.apiKey || !auth.appId) throw new Error("Set GOOGLE_PICKER_API_KEY and GOOGLE_CLOUD_PROJECT_NUMBER in Dokploy to enable file picking.");
      if (!auth.accessToken) throw new Error("Google Drive authorization expired. Reconnect the Google account and try again.");
      setPickerAuth({ accessToken: auth.accessToken, apiKey: auth.apiKey, appId: auth.appId });
      setPickerKind(kind);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not open Google Picker"); }
  }

  function handlePicked(event: PickerSelectionEvent) {
    const doc = event.detail.docs?.[0];
    if (!doc?.id || !pickerKind) {
      setMessage("Google Picker did not return a file or folder. Please try again.");
      setPickerKind(null); setPickerAuth(null); return;
    }
    if (pickerKind === "folder") {
      if (doc.mimeType && doc.mimeType !== "application/vnd.google-apps.folder") {
        setMessage("Choose a folder for the destination."); return;
      }
      setDestinationFolderId(doc.id);
      setMessage(`Destination folder selected${doc.name ? `: ${doc.name}` : ""}. Save monthly setup to keep it.`);
    } else {
      if (doc.mimeType && doc.mimeType !== "application/vnd.google-apps.spreadsheet") {
        setMessage("Choose a Google spreadsheet for the master template."); return;
      }
      setTemplateFileId(doc.id);
      setMessage(`Master spreadsheet selected${doc.name ? `: ${doc.name}` : ""}. Save monthly setup to keep it.`);
    }
    setPickerKind(null); setPickerAuth(null);
  }

  function closePicker(messageText: string) {
    setPickerKind(null); setPickerAuth(null); setMessage(messageText);
  }

  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/integrations/google-sheets/monthly/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled, templateFileId, destinationFolderId, namePattern, editors: editors.split(/\n|,/).map(x => x.trim()).filter(Boolean) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not save settings");
      await load();
      if (data?.connected && enabled && templateFileId && destinationFolderId) setSetupCollapsed(true);
      setMessage("Monthly sheet automation settings saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save settings"); } finally { setBusy(false); }
  }

  async function prepareCurrentMonth() {
    setManualBusy(true); setManualMessage(""); setManualLink("");
    try {
      const response = await fetch("/api/integrations/google-sheets/monthly/provision", { method: "POST" });
      const result = await response.json();
      await load();
      if (!response.ok) throw new Error(result.error || "Could not prepare this month’s sheet");
      if (result.fileUrl) setManualLink(result.fileUrl);
      setManualMessage(result.skipped
        ? result.fileUrl ? "This month’s sheet already exists. Its link is ready below; no duplicate email was sent." : result.reason || "A creation attempt is already running. Check the activity log shortly."
        : "This month’s sheet is ready. The link was emailed to the configured recipients.");
    } catch (error) {
      setManualMessage(error instanceof Error ? error.message : "Could not prepare this month’s sheet. See the activity log for details.");
      await load();
    } finally { setManualBusy(false); }
  }

  const fullyConfigured = isFullyConfigured(data);
  const currentMonth = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "Asia/Colombo" }).format(new Date());

  return <div className="space-y-5">
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><FileSpreadsheet className="h-5 w-5" /></div><div><CardTitle>Automated monthly sheet creation</CardTitle><CardDescription>Copy the master sheet, carry balances forward, share it, then connect it for import.</CardDescription></div></div>
          {fullyConfigured && <Button type="button" variant="outline" size="sm" onClick={() => setSetupCollapsed(value => !value)} aria-expanded={!setupCollapsed}>{setupCollapsed ? <>Edit setup <ChevronDown className="ml-2 h-4 w-4" /></> : <>Collapse <ChevronUp className="ml-2 h-4 w-4" /></>}</Button>}
        </div>
      </CardHeader>
      {setupCollapsed && fullyConfigured ? <CardContent className="pt-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-emerald-500/5 px-4 py-3 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="font-medium">Ready for automatic creation</span><span className="text-muted-foreground">{data?.accountEmail} · Runs at 00:05 Sri Lanka time · {data?.editors.length || 0} editor entries</span></div></CardContent> : <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4"><div><p className="font-medium">Admin Google Drive</p><p className="text-sm text-muted-foreground">{data?.connected ? `Connected as ${data.accountEmail || "Google account"}` : "Connect the Google account that owns and manages the sheets."}</p></div><Button variant="outline" asChild><a href="/api/integrations/google-sheets/monthly/oauth/start">{data?.connected ? "Reconnect account" : "Connect Google account"}</a></Button></div>
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4"><div><Label htmlFor="monthly-sheet-enabled">Monthly automation</Label><p className="text-sm text-muted-foreground">Runs at 00:05 on the first day of each month (Sri Lanka time).</p></div><Switch id="monthly-sheet-enabled" checked={enabled} onCheckedChange={setEnabled} disabled={!data?.connected || busy} /></div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2"><Label>Master template</Label><div className="flex gap-2"><Input aria-label="Master template ID" value={templateFileId} readOnly placeholder="Choose a spreadsheet" /><Button type="button" variant="outline" onClick={() => pick("template")} disabled={!data?.connected}><FileSpreadsheet className="mr-2 h-4 w-4" />Choose</Button></div></div>
          <div className="space-y-2"><Label>Destination folder</Label><div className="flex gap-2"><Input aria-label="Destination folder ID" value={destinationFolderId} readOnly placeholder="Choose a Drive folder" /><Button type="button" variant="outline" onClick={() => pick("folder")} disabled={!data?.connected}><FolderOpen className="mr-2 h-4 w-4" />Choose</Button></div></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="monthly-name">Sheet name pattern</Label><Input id="monthly-name" value={namePattern} onChange={e => setNamePattern(e.target.value)} /><p className="text-xs text-muted-foreground">Use {"{Month}"}, {"{Year}"}, and optionally {"{MM}"}.</p></div><div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground"><p className="font-medium text-foreground">Template updates</p><p>Only the specified month and invoice cells are updated. Previous month balances from Material Balance - Month H8 downward are copied to both opening balance columns. All other cells and formulas are preserved.</p></div></div>
        <div className="space-y-2"><Label htmlFor="monthly-editors">Editor email addresses</Label><textarea id="monthly-editors" className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="One Google account email per line" value={editors} onChange={e => setEditors(e.target.value)} /><p className="text-xs text-muted-foreground">Use one Google email per line. For a Google Group, prefix it with group:. The importer service account is added automatically.</p></div>
        {data?.lastRun && <p className="text-sm text-muted-foreground">Last monthly setup: {data.lastRun.period} · {data.lastRun.status}{data.lastRun.fileUrl ? <> · <a className="underline" href={data.lastRun.fileUrl} target="_blank" rel="noreferrer">Open sheet</a></> : null}{data.lastRun.error ? ` · ${data.lastRun.error}` : ""}</p>}
        <div className="flex flex-wrap items-center gap-3"><Button onClick={save} disabled={busy || !data}>{busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save monthly setup</Button>{message && <p className="text-sm" role="status">{message}</p>}</div>
        {pickerKind && pickerAuth && <div ref={pickerHost} data-testid="google-picker-host"><DrivePicker app-id={pickerAuth.appId} developer-key={pickerAuth.apiKey} oauth-token={pickerAuth.accessToken} origin={typeof window === "undefined" ? undefined : window.location.origin} title={pickerKind === "folder" ? "Choose destination folder" : "Choose master spreadsheet"} onPicked={handlePicked} onCanceled={() => closePicker("Selection cancelled. Your current value was not changed.")} onOauthError={event => closePicker(event.detail.error_description || event.detail.error || "Google authorization failed. Reconnect the Google account and try again.")}>{pickerKind === "folder" ? <DrivePickerDocsView view-id="FOLDERS" include-folders="true" select-folder-enabled="true" enable-drives="true" /> : <DrivePickerDocsView view-id="SPREADSHEETS" enable-drives="true" />}</DrivePicker></div>}
      </CardContent>}
    </Card>

    <Card className="overflow-hidden border-primary/20 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-primary p-3 text-primary-foreground shadow-sm"><CalendarDays className="h-5 w-5" /></div><div><CardTitle>Prepare this month’s sheet</CardTitle><CardDescription>Make {currentMonth}’s sheet now and email its access link to the configured editors.</CardDescription></div></div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {!data?.connected && <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">The admin Google Drive account is not connected. You can still record a creation attempt below; it will log the connection issue. Connect the account to create and share the sheet.</p>}
        {data?.connected && !fullyConfigured && <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">Choose a template and destination folder, then save the setup. The manual attempt button remains available and any missing setup will be recorded in the activity log.</p>}
        <div className="flex flex-wrap items-center gap-3"><Button onClick={prepareCurrentMonth} disabled={manualBusy || !data}>{manualBusy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Prepare &amp; email link</Button>{manualMessage && <p className="text-sm" role="status">{manualMessage}</p>}</div>
        {manualLink && <a className="flex w-fit max-w-full items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary underline-offset-4 hover:underline" href={manualLink} target="_blank" rel="noreferrer"><Link2 className="h-4 w-4 shrink-0" /><span className="truncate">Open current month’s sheet</span></a>}
        <div className="border-t pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold">Creation activity</h3><p className="text-xs text-muted-foreground">Successes and failed attempts, including missing Google connections.</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{data?.recentRuns.length || 0} recent</span></div>
          {data?.recentRuns.length ? <ol className="space-y-2">{data.recentRuns.map(run => <li key={run.id} className="rounded-lg border px-3 py-2.5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{run.period}</span><span className={`rounded-full px-2 py-0.5 text-xs ${run.status === "success" ? "bg-emerald-500/10 text-emerald-700" : run.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700"}`}>{run.status}</span></div><p className="mt-1 text-xs text-muted-foreground">Started {new Date(run.startedAt).toLocaleString()}</p>{run.error && <p className="mt-1 break-words text-xs text-destructive">{run.error}</p>}{run.fileUrl && <a className="mt-1 inline-block text-xs text-primary underline" href={run.fileUrl} target="_blank" rel="noreferrer">Open created sheet</a>}</li>)}</ol> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No creation attempts yet. Manual and scheduled attempts will appear here, including failures.</p>}
        </div>
      </CardContent>
    </Card>
  </div>;
}

function isFullyConfigured(data: Pick<Setup, "connected" | "enabled" | "templateFileId" | "destinationFolderId" | "namePattern"> | null | undefined) {
  return Boolean(data?.connected && data.enabled && data.templateFileId && data.destinationFolderId && data.namePattern.includes("{Month}") && data.namePattern.includes("{Year}"));
}
