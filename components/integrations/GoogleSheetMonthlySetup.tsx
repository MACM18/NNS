"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DrivePicker, DrivePickerDocsView } from "@googleworkspace/drive-picker-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CalendarDays, CheckCircle2, ExternalLink, FileSpreadsheet, FolderOpen, Loader2, Mail, RefreshCw, Save, Send, Settings2, XCircle } from "lucide-react";

type PickerAuth = { accessToken: string; apiKey: string; appId: string };
type PickerKind = "template" | "folder";
type PickerSelectionEvent = CustomEvent<{ docs?: Array<{ id?: string; name?: string; mimeType?: string }> }>;
type RunEvent = { id: string; at: string; stage: string; status: "running" | "success" | "warning" | "failed"; message: string; durationMs?: number; details?: Record<string, string | number | boolean | null> };
type MonthlyRun = { id: string; period: string; status: string; error: string | null; fileUrl: string | null; events?: RunEvent[]; startedAt: string; finishedAt: string | null };
type Setup = { connected: boolean; accountEmail: string | null; enabled: boolean; templateFileId: string; destinationFolderId: string; namePattern: string; editors: string[] };
type ExistingConnection = { id: string; sheetName: string | null; sheetUrl: string; status: string | null; autoSyncEnabled: boolean; createdAt: string };
type CurrentRun = { id: string; status: string; fileUrl: string | null };

export default function GoogleSheetMonthlySetup() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Setup | null>(null);
  const [runs, setRuns] = useState<MonthlyRun[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState("");
  const [currentConnection, setCurrentConnection] = useState<ExistingConnection | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [templateFileId, setTemplateFileId] = useState("");
  const [destinationFolderId, setDestinationFolderId] = useState("");
  const [namePattern, setNamePattern] = useState("NNS Telecom - {Month} {Year}");
  const [editors, setEditors] = useState("");
  const [busy, setBusy] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [retryId, setRetryId] = useState<string | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [message, setMessage] = useState("");
  const [pickerKind, setPickerKind] = useState<PickerKind | null>(null);
  const [pickerAuth, setPickerAuth] = useState<PickerAuth | null>(null);
  const pickerHost = useRef<HTMLDivElement>(null);
  const currentRun = runs.find(run => run.period === currentPeriod) || null;
  const configured = Boolean(data?.connected && data.templateFileId && data.destinationFolderId);
  const statusText = !data ? "Loading monthly setup" : data.enabled && configured ? "Automated setup on · 00:05 Sri Lanka time" : configured ? "Ready for manual monthly setup" : "Setup needs attention";

  const load = useCallback(async () => {
    const [settingsRes, runsRes] = await Promise.all([
      fetch("/api/integrations/google-sheets/monthly/settings", { cache: "no-store" }),
      fetch("/api/integrations/google-sheets/monthly/runs", { cache: "no-store" }),
    ]);
    const settings = await settingsRes.json();
    if (!settingsRes.ok) throw new Error(settings.error || "Could not load monthly settings");
    const runData = await runsRes.json();
    if (!runsRes.ok) throw new Error(runData.error || "Could not load creation history");
    setData(settings);
    setEnabled(settings.enabled);
    setTemplateFileId(settings.templateFileId);
    setDestinationFolderId(settings.destinationFolderId);
    setNamePattern(settings.namePattern);
    setEditors(settings.editors.join("\n"));
    setRuns(Array.isArray(runData.runs) ? runData.runs : []);
    setCurrentPeriod(typeof runData.currentPeriod === "string" ? runData.currentPeriod : "");
    setCurrentConnection(runData.currentConnection || null);
  }, []);

  useEffect(() => { if (open) void load().catch(error => setMessage(error.message || "Could not load monthly setup")); }, [open, load]);
  useEffect(() => {
    if (!open || (!manualBusy && !retryId && !runs.some(run => run.status === "running"))) return;
    const timer = window.setInterval(() => void load().catch(() => {}), 1200);
    return () => window.clearInterval(timer);
  }, [open, manualBusy, retryId, runs, load]);
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
      if (!auth.apiKey || !auth.appId) throw new Error("Google Picker is not configured. Check the API key and project number in the app settings.");
      if (!auth.accessToken) throw new Error("Google Drive authorization expired. Reconnect the Google account and try again.");
      setPickerAuth({ accessToken: auth.accessToken, apiKey: auth.apiKey, appId: auth.appId }); setPickerKind(kind);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not open Google Picker"); }
  }
  function handlePicked(event: PickerSelectionEvent) {
    const doc = event.detail.docs?.[0];
    if (!doc?.id || !pickerKind) { setMessage("Google Picker did not return a file or folder."); setPickerKind(null); setPickerAuth(null); return; }
    if (pickerKind === "folder") {
      if (doc.mimeType && doc.mimeType !== "application/vnd.google-apps.folder") { setMessage("Choose a folder for the destination."); return; }
      setDestinationFolderId(doc.id); setMessage(`Destination folder selected${doc.name ? `: ${doc.name}` : ""}. Save setup to keep it.`);
    } else {
      if (doc.mimeType && doc.mimeType !== "application/vnd.google-apps.spreadsheet") { setMessage("Choose a Google spreadsheet for the master template."); return; }
      setTemplateFileId(doc.id); setMessage(`Master spreadsheet selected${doc.name ? `: ${doc.name}` : ""}. Save setup to keep it.`);
    }
    setPickerKind(null); setPickerAuth(null);
  }

  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/integrations/google-sheets/monthly/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled, templateFileId, destinationFolderId, namePattern, editors: editors.split(/\n|,/).map(x => x.trim()).filter(Boolean) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not save settings");
      await load(); setMessage("Monthly sheet setup saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save settings"); } finally { setBusy(false); }
  }
  async function prepare() {
    setConfirmationOpen(false);
    setManualBusy(true); setMessage("");
    try {
      const response = await fetch("/api/integrations/google-sheets/monthly/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmed: true,
          expectedConnectionId: currentConnection?.id || null,
          expectedRunId: currentRun?.id || null,
        }),
      });
      const result = await response.json();
      await load();
      if (!response.ok) throw new Error(result.error || "Could not prepare this month’s sheet");
      setMessage(result.status === "partial" ? "The sheet is ready, but the summary email failed. Review the log and retry email." : result.skipped ? result.reason || "This month already has a setup run." : result.status === "success" ? "Monthly sheet is ready and the summary email was sent." : "Monthly sheet preparation started.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not prepare sheet"); await load().catch(() => {}); }
    finally { setManualBusy(false); }
  }
  async function retryEmail(runId: string) {
    setRetryId(runId); setMessage("");
    try {
      const response = await fetch(`/api/integrations/google-sheets/monthly/runs/${runId}/email`, { method: "POST" });
      const result = await response.json(); if (!response.ok && result.status !== "partial") throw new Error(result.error || "Email retry failed");
      await load(); setMessage(result.status === "success" ? "Summary email sent." : "Email still failed. Review the updated run details.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Email retry failed"); await load().catch(() => {}); }
    finally { setRetryId(null); }
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" className="h-auto min-h-[76px] w-full justify-start gap-3 whitespace-normal px-4 py-3 text-left hover:border-primary/40 hover:bg-primary/4"><span className="rounded-lg bg-primary/10 p-2 text-primary"><CalendarDays className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">Monthly sheet setup</span><span className="block truncate text-xs font-normal text-muted-foreground">{statusText}</span></span><Settings2 className="h-4 w-4 shrink-0 text-muted-foreground" /></Button></DialogTrigger>
    <DialogContent className="max-h-[92dvh] max-w-3xl overflow-hidden p-0">
      <div className="border-b px-5 py-4 sm:px-6"><DialogHeader><DialogTitle>Monthly Google Sheet setup</DialogTitle><DialogDescription>Connect the admin Drive account, choose the master and destination, then prepare and share each month’s sheet.</DialogDescription></DialogHeader></div>
      <div className="max-h-[calc(92dvh-88px)] space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
        <section className="space-y-4 rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Admin Google Drive</h3><p className="text-sm text-muted-foreground">{data?.connected ? `Connected as ${data.accountEmail || "Google account"}` : "Connect the account that owns the template and monthly sheets."}</p></div><Button variant="outline" asChild><a href="/api/integrations/google-sheets/monthly/oauth/start">{data?.connected ? "Reconnect account" : "Connect Google account"}</a></Button></div>
          <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 p-3"><div><Label htmlFor="monthly-sheet-enabled">Monthly automation</Label><p className="text-xs text-muted-foreground">Runs at 00:05 on the first day of each month (Sri Lanka time).</p></div><Switch id="monthly-sheet-enabled" checked={enabled} onCheckedChange={setEnabled} disabled={!data?.connected || busy} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Master template</Label><div className="flex gap-2"><Input aria-label="Master template ID" value={templateFileId} readOnly placeholder="Choose spreadsheet" /><Button type="button" variant="outline" onClick={() => pick("template")} disabled={!data?.connected} aria-label="Choose master spreadsheet"><FileSpreadsheet className="h-4 w-4" /></Button></div></div>
            <div className="space-y-2"><Label>Destination folder</Label><div className="flex gap-2"><Input aria-label="Destination folder ID" value={destinationFolderId} readOnly placeholder="Choose folder" /><Button type="button" variant="outline" onClick={() => pick("folder")} disabled={!data?.connected} aria-label="Choose destination folder"><FolderOpen className="h-4 w-4" /></Button></div></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="monthly-name">Sheet name pattern</Label><Input id="monthly-name" value={namePattern} onChange={e => setNamePattern(e.target.value)} /><p className="text-xs text-muted-foreground">Use {"{Month}"}, {"{Year}"}, and optionally {"{MM}"}.</p></div><div className="space-y-2"><Label htmlFor="monthly-editors">Editor emails or Google Groups</Label><textarea id="monthly-editors" className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="One Google email per line" value={editors} onChange={e => setEditors(e.target.value)} /><p className="text-xs text-muted-foreground">The importer service account is added automatically.</p></div></div>
          <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">Only the specified month and invoice cells change. Prior month balances from Material Balance - Month H8 downward fill both opening balance columns. Other cells and formulas are preserved.</p>
          <Button onClick={save} disabled={busy || !data}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save monthly setup</Button>
        </section>
        {pickerKind && pickerAuth && <div ref={pickerHost} data-testid="google-picker-host"><DrivePicker app-id={pickerAuth.appId} developer-key={pickerAuth.apiKey} oauth-token={pickerAuth.accessToken} origin={typeof window === "undefined" ? undefined : window.location.origin} title={pickerKind === "folder" ? "Choose destination folder" : "Choose master spreadsheet"} onPicked={handlePicked} onCanceled={() => { setPickerKind(null); setPickerAuth(null); setMessage("Selection cancelled. The current value was not changed."); }} onOauthError={event => { setPickerKind(null); setPickerAuth(null); setMessage(event.detail.error_description || event.detail.error || "Google authorization failed."); }}>{pickerKind === "folder" ? <DrivePickerDocsView view-id="FOLDERS" include-folders="true" select-folder-enabled="true" enable-drives="true" /> : <DrivePickerDocsView view-id="SPREADSHEETS" enable-drives="true" />}</DrivePicker></div>}
        <section className="rounded-xl border border-primary/20 bg-primary/2.5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-semibold">Prepare this month and email the link</h3><p className="text-sm text-muted-foreground">We check this month’s connection first. Existing monthly runs resume their saved sheet instead of making another copy.</p></div>
            <Button onClick={() => setConfirmationOpen(true)} disabled={manualBusy || !data || !confirmationChecked}>{manualBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Prepare this month</Button>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg border bg-background/70 p-3">
            <Checkbox id="confirm-current-month-checked" checked={confirmationChecked} onCheckedChange={value => setConfirmationChecked(value === true)} disabled={manualBusy} className="mt-0.5" />
            <Label htmlFor="confirm-current-month-checked" className="cursor-pointer text-sm font-normal leading-5">I’ve reviewed the current-month connection check for {currentPeriod || "this month"} and want to continue.</Label>
          </div>
          {currentRun?.fileUrl && <a className="mt-3 inline-flex items-center gap-2 text-sm text-primary underline" href={currentRun.fileUrl} target="_blank" rel="noreferrer">Open this month’s existing sheet <ExternalLink className="h-3.5 w-3.5" /></a>}
        </section>
        <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm {currentPeriod} sheet setup</AlertDialogTitle>
              <AlertDialogDescription>Review the existing connection and previous attempt before continuing. The server rechecks these records before starting.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3 text-sm">
              {currentConnection ? <div className="rounded-lg border p-3"><p className="font-medium">Current connection found</p><p className="mt-1 wrap-break-word text-muted-foreground">{currentConnection.sheetName || "Google Sheet"} · {currentConnection.status || "status unknown"} · {currentConnection.autoSyncEnabled ? "selected for daily import" : "not selected for daily import"}</p><a className="mt-2 inline-flex items-center gap-1 text-primary underline" href={currentConnection.sheetUrl} target="_blank" rel="noreferrer">Review connected sheet <ExternalLink className="h-3 w-3" /></a></div> : <p className="rounded-lg border border-dashed p-3 text-muted-foreground">No Google Sheet connection is currently registered for {currentPeriod}.</p>}
              {currentRun ? <div className="rounded-lg border p-3"><p className="font-medium">Existing monthly setup: {currentRun.status}</p><p className="mt-1 text-muted-foreground">{currentRun.fileUrl ? "Continuing this run will verify and reuse its existing sheet, or replace a stale inaccessible copy." : "The run has no saved sheet yet; it will check Drive for a monthly copy before creating one."}</p>{currentRun.fileUrl && <a className="mt-2 inline-flex items-center gap-1 text-primary underline" href={currentRun.fileUrl} target="_blank" rel="noreferrer">Review this run’s sheet <ExternalLink className="h-3 w-3" /></a>}</div> : currentConnection ? <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-amber-900">No monthly automation run is linked to this connection. Continuing can create a new template copy and select it for import; the existing connection will remain in history.</p> : null}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={manualBusy}>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={!confirmationChecked || manualBusy} onClick={() => void prepare()}>{currentRun?.fileUrl ? "Continue existing setup" : "Confirm and prepare"}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <section><div className="mb-3 flex items-center justify-between gap-2"><div><h3 className="font-semibold">Provisioning activity</h3><p className="text-xs text-muted-foreground">Stage-by-stage progress and results. This history remains available after closing the dialog.</p></div><Button variant="ghost" size="sm" onClick={() => void load()} aria-label="Refresh run history"><RefreshCw className="h-4 w-4" /></Button></div>
          {runs.length ? <div className="space-y-3">{runs.map(run => <article key={run.id} className="rounded-xl border p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-semibold">{run.period}</div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${run.status === "success" ? "bg-emerald-500/10 text-emerald-700" : run.status === "partial" ? "bg-amber-500/10 text-amber-800" : run.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-blue-500/10 text-blue-700"}`}>{run.status === "partial" ? "Partial · email needed" : run.status}</span></div><p className="mt-1 text-xs text-muted-foreground">Started {new Date(run.startedAt).toLocaleString()}{run.finishedAt ? ` · Finished ${new Date(run.finishedAt).toLocaleString()}` : " · In progress"}</p>
              {run.fileUrl && <a className="mt-2 inline-flex items-center gap-1 text-sm text-primary underline" href={run.fileUrl} target="_blank" rel="noreferrer">Open created sheet <ExternalLink className="h-3 w-3" /></a>}
              {run.status === "partial" && (run.events || []).some(event => event.stage === "summary_email" && event.status === "failed") && <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><p>The sheet was created, shared, and connected. Only the summary email failed. You can retry email without creating another sheet.</p><p className="mt-2 text-xs text-muted-foreground">Check <a className="underline" href="/dashboard/settings?tab=email">Email Settings</a> if saved settings could not be decrypted.</p><Button className="mt-2" size="sm" variant="outline" disabled={retryId === run.id} onClick={() => void retryEmail(run.id)}>{retryId === run.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Retry email only</Button></div>}
              {run.events?.length ? <ol className="mt-3 space-y-2 border-l pl-3">{run.events.map(event => <li key={event.id} className="relative"><span className="absolute left-[-19px] top-1 rounded-full bg-background">{event.status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" /> : event.status === "failed" ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : <CheckCircle2 className={`h-3.5 w-3.5 ${event.status === "warning" ? "text-amber-600" : "text-emerald-600"}`} />}</span><div className="flex flex-wrap justify-between gap-x-3 text-xs"><span className="font-medium">{event.stage.replaceAll("_", " ")}</span><span className="text-muted-foreground">{new Date(event.at).toLocaleTimeString()}{event.durationMs != null ? ` · ${(event.durationMs / 1000).toFixed(1)}s` : ""}</span></div><p className={`mt-0.5 wrap-break-word text-xs ${event.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>{event.message}</p>{event.details && Object.keys(event.details).filter(key => !["fileUrl", "messageId"].includes(key)).length > 0 && <p className="mt-0.5 wrap-break-word text-[11px] text-muted-foreground">{Object.entries(event.details).filter(([key]) => !["fileUrl", "messageId"].includes(key)).map(([key, value]) => `${key.replaceAll(/([A-Z])/g, " $1")}: ${String(value)}`).join(" · ")}</p>}</li>)}</ol> : <p className="mt-3 text-xs text-muted-foreground">No detailed events recorded for this run. {run.error || ""}</p>}
            </article>)}</div> : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No monthly sheet runs yet.</p>}
        </section>
        {message && <p className="rounded-lg bg-muted px-3 py-2 text-sm" role="status">{message}</p>}
      </div>
    </DialogContent>
  </Dialog>;
}
