"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DrivePicker, DrivePickerDocsView } from "@googleworkspace/drive-picker-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FolderOpen, FileSpreadsheet, RefreshCw, Save } from "lucide-react";

type PickerAuth = { accessToken: string; apiKey: string; appId: string };
type PickerKind = "template" | "folder";
type PickerSelectionEvent = CustomEvent<{ docs?: Array<{ id?: string; name?: string; mimeType?: string }> }>;
type Setup = { connected: boolean; accountEmail: string | null; enabled: boolean; templateFileId: string; destinationFolderId: string; namePattern: string; editors: string[]; lastRun: { period: string; status: string; error: string | null; fileUrl: string | null; startedAt: string } | null };

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
  const pickerHost = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations/google-sheets/monthly/settings", { cache: "no-store" });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not load monthly settings");
      setData(result); setEnabled(result.enabled); setTemplateFileId(result.templateFileId); setDestinationFolderId(result.destinationFolderId); setNamePattern(result.namePattern); setEditors(result.editors.join("\n"));
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
      await load(); setMessage("Monthly sheet automation settings saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save settings"); } finally { setBusy(false); }
  }

  return <Card className="border-border/80 shadow-sm">
    <CardHeader><div className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><FileSpreadsheet className="h-5 w-5" /></div><div><CardTitle>Monthly sheet setup</CardTitle><CardDescription>Create a new monthly copy, carry balances forward, share it, then connect it for import.</CardDescription></div></div></CardHeader>
    <CardContent className="space-y-5">
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
      {pickerKind && pickerAuth && <div ref={pickerHost} data-testid="google-picker-host">
        <DrivePicker app-id={pickerAuth.appId} developer-key={pickerAuth.apiKey} oauth-token={pickerAuth.accessToken} origin={typeof window === "undefined" ? undefined : window.location.origin} title={pickerKind === "folder" ? "Choose destination folder" : "Choose master spreadsheet"} onPicked={handlePicked} onCanceled={() => closePicker("Selection cancelled. Your current value was not changed.")} onOauthError={event => closePicker(event.detail.error_description || event.detail.error || "Google authorization failed. Reconnect the Google account and try again.")}>
          {pickerKind === "folder"
            ? <DrivePickerDocsView view-id="FOLDERS" include-folders="true" select-folder-enabled="true" enable-drives="true" />
            : <DrivePickerDocsView view-id="SPREADSHEETS" enable-drives="true" />}
        </DrivePicker>
      </div>}
    </CardContent>
  </Card>;
}
