"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Download, FileText, Link2, Loader2, Mail, RefreshCw, ShieldOff, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { GenerateMonthlyInvoicesModal } from "@/components/modals/generate-monthly-invoices-modal";

type Document = { id: string; reportType: string; title: string; fileName: string };
type Version = { id: string; version: number; status: string; createdAt: string; publishedAt: string | null; shareActive: boolean; shareRevokedAt: string | null; documents: Document[] };
type Report = { id: string; year: number; month: number; currentVersionId: string | null; versions: Version[] };
type RedesignProgress = { done: number; total: number; current: string; created: number; skipped: number; failures: string[] };
type Confirmation = { kind: "redesign" } | { kind: "delete" | "revoke" | "unpublish"; report: Report; version: Version };
const MANAGEMENT = new Set(["admin", "moderator", "superadmin"]);
const monthLabel = (report: Report) => format(new Date(report.year, report.month - 1, 1), "MMMM yyyy");

export function MonthlyReportsPage() {
  const { role } = useAuth();
  const manager = MANAGEMENT.has((role || "").toLowerCase());
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [invoiceDialog, setInvoiceDialog] = useState(false);
  const [invoiceMonth, setInvoiceMonth] = useState(new Date());
  const [shareUrls, setShareUrls] = useState<Record<string, string>>({});
  const [redesignProgress, setRedesignProgress] = useState<RedesignProgress | null>(null);
  const [emailTarget, setEmailTarget] = useState<{ reportId: string; versionId: string } | null>(null);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const refreshSequence = useRef(0);

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const sequence = ++refreshSequence.current;
    try {
      const response = await fetch("/api/monthly-reports", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load reports.");
      if (sequence === refreshSequence.current) setReports(payload.data);
    } catch (error) {
      if (sequence === refreshSequence.current) toast.error(error instanceof Error ? error.message : "Unable to load reports.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(true);
    const onFocus = () => { void refresh(); };
    const interval = window.setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", onFocus); };
  }, [refresh]);

  const act = async (key: string, path: string, method: string, body?: unknown) => {
    setBusy(key);
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Action failed.");
      return payload.data ?? (payload.success ? { success: true } : null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.");
      return null;
    } finally {
      setBusy("");
    }
  };

  const prepare = async (month: Date, openInvoiceModal = true) => {
    const year = Number(format(month, "yyyy")), monthNumber = Number(format(month, "M"));
    setBusy(`prepare-${year}-${monthNumber}`);
    try {
      const response = await fetch("/api/monthly-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year, month: monthNumber }) });
      const payload = await response.json();
      if (response.status === 409 && payload.code === "INVOICES_REQUIRED" && openInvoiceModal) { setInvoiceMonth(month); setInvoiceDialog(true); return; }
      if (!response.ok) throw new Error(payload.error || "Unable to prepare reports.");
      toast.success(`Draft version ${payload.data.version.version} prepared for ${format(month, "MMMM yyyy")}.`);
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to prepare reports."); }
    finally { setBusy(""); }
  };

  const redesignAll = async () => {
    if (!reports.length) { toast.info("There are no archived months to regenerate."); return; }
    setBusy("redesign-all");
    const progress: RedesignProgress = { done: 0, total: reports.length, current: "", created: 0, skipped: 0, failures: [] };
    setRedesignProgress({ ...progress });
    for (const report of reports) {
      progress.current = monthLabel(report);
      setRedesignProgress({ ...progress, failures: [...progress.failures] });
      try {
        const response = await fetch(`/api/monthly-reports/${report.id}/redesign`, { method: "POST" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not redesign this month.");
        if (payload.data.status === "created") progress.created += 1;
        else progress.skipped += 1;
      } catch (error) { progress.failures.push(`${monthLabel(report)}: ${error instanceof Error ? error.message : "Redesign failed"}`); }
      progress.done += 1;
      setRedesignProgress({ ...progress, failures: [...progress.failures] });
    }
    progress.current = "";
    setRedesignProgress({ ...progress, failures: [...progress.failures] });
    setBusy("");
    await refresh();
    if (progress.failures.length) toast.warning(`Redesign finished: ${progress.created} drafts created, ${progress.skipped} already current, ${progress.failures.length} failed. See the progress details.`);
    else toast.success(`Redesign finished: ${progress.created} drafts created; ${progress.skipped} months already had the new design.`);
  };

  const updateVersion = (reportId: string, versionId: string, patch: Partial<Version>) => {
    refreshSequence.current += 1;
    setReports(current => current.map(report => report.id !== reportId ? report : {
      ...report,
      versions: report.versions.map(version => version.id === versionId ? { ...version, ...patch } : version),
    }));
  };

  const share = async (report: Report, version: Version) => {
    const result = await act(`share-${version.id}`, `/api/monthly-reports/${report.id}/share`, "POST", { versionId: version.id });
    if (!result?.token) return;
    const url = `${window.location.origin}/reports/shared/${result.token}`;
    updateVersion(report.id, version.id, { shareActive: true, shareRevokedAt: null });
    setShareUrls(current => ({ ...current, [version.id]: url }));
    try { await navigator.clipboard.writeText(url); toast.success("Version link copied. Anyone with the link can view these PDFs."); }
    catch { toast.info("Version link is ready to copy."); }
    await refresh();
  };

  const revoke = async (report: Report, version: Version) => {
    const result = await act(`revoke-${version.id}`, `/api/monthly-reports/${report.id}/share`, "DELETE", { versionId: version.id });
    if (!result) return;
    updateVersion(report.id, version.id, { shareActive: false, shareRevokedAt: result.shareRevokedAt || new Date().toISOString() });
    setShareUrls(current => { const copy = { ...current }; delete copy[version.id]; return copy; });
    toast.success(`Sharing stopped for version ${version.version}.`);
    await refresh();
  };

  const unpublish = async (report: Report, version: Version) => {
    const result = await act(`unpublish-${version.id}`, `/api/monthly-reports/${report.id}/unpublish`, "POST", { versionId: version.id });
    if (!result) return;
    refreshSequence.current += 1;
    setReports(current => current.map(item => item.id !== report.id ? item : {
      ...item,
      currentVersionId: null,
      versions: item.versions.map(candidate => candidate.id === version.id
        ? { ...candidate, status: "archived", shareActive: false, shareRevokedAt: result.shareRevokedAt }
        : candidate),
    }));
    setShareUrls(current => { const copy = { ...current }; delete copy[version.id]; return copy; });
    toast.success(`Version ${version.version} unpublished. Its share link is disabled; you can now delete it.`);
    await refresh();
  };

  const deleteVersion = async (report: Report, version: Version) => {
    const result = await act(`delete-${version.id}`, `/api/monthly-reports/${report.id}/versions/${version.id}`, "DELETE");
    if (!result) return;
    refreshSequence.current += 1;
    setReports(current => current.map(item => item.id === report.id ? { ...item, versions: item.versions.filter(candidate => candidate.id !== version.id) } : item));
    setShareUrls(current => { const copy = { ...current }; delete copy[version.id]; return copy; });
    toast.success(`Version ${version.version} and its PDFs were deleted.`);
    await refresh();
  };

  const publish = async (report: Report, version: Version) => {
    const result = await act(`publish-${version.id}`, `/api/monthly-reports/${report.id}/publish`, "POST", { versionId: version.id });
    if (!result) return;
    toast.success(`Version ${version.version} published. Existing version links continue to show their own PDFs.`);
    await refresh();
  };

  const sendShareEmail = async () => {
    if (!emailTarget) return;
    setEmailBusy(true);
    try {
      const recipients = emailRecipients.split(/[\n,;]/).map(value => value.trim()).filter(Boolean);
      const response = await fetch(`/api/monthly-reports/${emailTarget.reportId}/share/email`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: emailTarget.versionId, recipients }),
      });
      const payload = await response.json();
      if (!response.ok && !payload.data) throw new Error(payload.error || "Unable to email the report link.");
      const result = payload.data;
      if (result.failed) {
        const failedRecipients = (result.results || []).filter((item: { success: boolean }) => !item.success).map((item: { recipient: string }) => item.recipient);
        setEmailRecipients(failedRecipients.join("\n"));
        toast.warning(`Report link emailed to ${result.sent} recipient${result.sent === 1 ? "" : "s"}; ${result.failed} failed. The recipient field now contains only failed addresses.`);
      } else { toast.success(`Report link emailed to ${result.sent} recipient${result.sent === 1 ? "" : "s"}.`); setEmailTarget(null); }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to email the report link."); }
    finally { setEmailBusy(false); }
  };

  const confirmAction = async () => {
    const selected = confirmation;
    setConfirmation(null);
    if (!selected) return;
    if (selected.kind === "redesign") await redesignAll();
    else if (selected.kind === "delete") await deleteVersion(selected.report, selected.version);
    else if (selected.kind === "unpublish") await unpublish(selected.report, selected.version);
    else await revoke(selected.report, selected.version);
  };

  const confirmTitle = confirmation?.kind === "redesign" ? "Regenerate archived PDFs?" : confirmation?.kind === "delete" ? "Delete this report version?" : confirmation?.kind === "unpublish" ? "Unpublish this report version?" : "Stop sharing this version?";
  const confirmDescription = confirmation?.kind === "redesign"
    ? `Create a new draft for each of the ${reports.length} archived months. Review and publish each draft separately.`
    : confirmation?.kind === "delete"
      ? `Delete version ${confirmation.version.version} from ${monthLabel(confirmation.report)} and all ${confirmation.version.documents.length} saved PDFs? This cannot be undone.`
      : confirmation?.kind === "unpublish"
        ? `Version ${confirmation.version.version} will no longer be the published version for ${monthLabel(confirmation.report)}. Its public link and PDF links will stop working immediately. Other versions keep their own links. You can delete this version afterward.`
        : confirmation?.kind === "revoke"
          ? `The link for version ${confirmation.version.version} of ${monthLabel(confirmation.report)} and its PDF links will stop working immediately. Other versions keep their own links.`
          : "";

  return <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">Monthly Reports</h1><p className="mt-1 text-sm text-muted-foreground">Spreadsheet-style monthly PDFs, saved as reviewed snapshots.</p></div>
      {manager && <div className="flex flex-wrap items-center gap-2">
        <MonthYearPicker date={selectedMonth} onDateChange={setSelectedMonth} />
        <Button variant="outline" onClick={() => setConfirmation({ kind: "redesign" })} disabled={Boolean(busy) || reports.length === 0}>{busy === "redesign-all" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Regenerate all archived PDFs</Button>
        <Button onClick={() => void prepare(selectedMonth)} disabled={Boolean(busy)}>{busy.startsWith("prepare") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Prepare month</Button>
      </div>}
    </div>

    {manager && redesignProgress && <Card role="status" aria-live="polite"><CardContent className="space-y-2 p-4">
      <div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium">{redesignProgress.done < redesignProgress.total ? `Redesigning ${redesignProgress.current}…` : "PDF redesign finished"}</span><span className="text-muted-foreground">{redesignProgress.done} / {redesignProgress.total} months · {redesignProgress.created} drafts · {redesignProgress.skipped} already current</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={redesignProgress.total} aria-valuenow={redesignProgress.done}><div className="h-full bg-primary transition-all" style={{ width: `${redesignProgress.total ? redesignProgress.done / redesignProgress.total * 100 : 0}%` }} /></div>
      {redesignProgress.failures.length > 0 && <ul className="max-h-32 list-disc space-y-1 overflow-auto pl-5 text-xs text-destructive">{redesignProgress.failures.map(failure => <li key={failure}>{failure}</li>)}</ul>}
    </CardContent></Card>}

    <Card><CardHeader className="pb-3"><CardTitle className="text-base">Report archive</CardTitle><CardDescription>Each version has its own sharing controls. Publishing a new version leaves earlier links on their original PDFs.</CardDescription></CardHeader><CardContent className="space-y-4">
      {loading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading report archive…</div> : reports.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No monthly report sets have been prepared yet.</p> : reports.map(report => {
        const current = report.versions.find(version => version.id === report.currentVersionId);
        const drafts = report.versions.filter(version => version.status === "draft").length;
        const shared = report.versions.filter(version => version.shareActive).length;
        return <section key={report.id} className="overflow-hidden rounded-lg border">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 p-4">
            <div><h2 className="font-semibold">{monthLabel(report)}</h2><p className="text-xs text-muted-foreground">{current ? `Published v${current.version}` : "No current published version"}{drafts ? ` · ${drafts} draft${drafts === 1 ? "" : "s"}` : ""} · {shared ? `${shared} shared version${shared === 1 ? "" : "s"}` : "Private"}</p></div>
          </div>
          {report.versions.map(version => {
            const isCurrent = version.id === report.currentVersionId;
            const canDelete = !isCurrent && !version.shareActive;
            const deleteReason = isCurrent ? "Unpublish this version before deleting it." : version.shareActive ? "Stop sharing this version before deleting it." : undefined;
            return <div key={version.id} className="border-b p-4 last:border-0">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Version {version.version} <span className="font-normal text-muted-foreground">· {isCurrent ? "Current" : version.status === "draft" ? "Draft for review" : "Archived"}</span></div>
                  <p className="mt-1 text-xs text-muted-foreground">{format(new Date(version.createdAt), "PPp")} · {version.shareActive ? "Shared" : version.shareRevokedAt ? "Sharing stopped" : "Private"}</p>
                </div>
                {manager && <div className="flex flex-wrap gap-2">
                  {!isCurrent && <Button size="sm" variant="outline" onClick={() => void publish(report, version)} disabled={Boolean(busy)}>{busy === `publish-${version.id}` ? "Publishing…" : version.status === "draft" ? "Publish reviewed version" : "Make current"}</Button>}
                  {isCurrent && <Button size="sm" variant="outline" onClick={() => setConfirmation({ kind: "unpublish", report, version })} disabled={Boolean(busy)}><Upload className="mr-1.5 h-4 w-4 rotate-180" />{busy === `unpublish-${version.id}` ? "Unpublishing…" : "Unpublish"}</Button>}
                  {version.status !== "draft" && <>
                    <Button size="sm" variant={version.shareActive ? "outline" : "default"} onClick={() => void share(report, version)} disabled={Boolean(busy)}><Link2 className="mr-1.5 h-4 w-4" />{busy === `share-${version.id}` ? "Working…" : version.shareActive ? "Copy link" : "Share version"}</Button>
                    {version.shareActive && <>
                      <Button size="sm" variant="outline" onClick={() => { setEmailRecipients(""); setEmailTarget({ reportId: report.id, versionId: version.id }); }} disabled={Boolean(busy) || emailBusy}><Mail className="mr-1.5 h-4 w-4" />Email link</Button>
                      <Button size="sm" variant="destructive" onClick={() => setConfirmation({ kind: "revoke", report, version })} disabled={Boolean(busy)}><ShieldOff className="mr-1.5 h-4 w-4" />{busy === `revoke-${version.id}` ? "Stopping…" : "Stop sharing"}</Button>
                    </>}
                  </>}
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" title={deleteReason} onClick={() => setConfirmation({ kind: "delete", report, version })} disabled={Boolean(busy) || !canDelete}><Trash2 className="mr-1.5 h-4 w-4" />{busy === `delete-${version.id}` ? "Deleting…" : "Delete version"}</Button>
                </div>}
              </div>
              {manager && deleteReason && <p className="mb-3 text-xs text-muted-foreground">{deleteReason}</p>}
              {version.shareActive && shareUrls[version.id] && <input aria-label={`${monthLabel(report)} version ${version.version} share link`} readOnly value={shareUrls[version.id]} onFocus={event => event.currentTarget.select()} className="mb-3 w-full rounded border bg-background px-3 py-2 text-sm" />}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{version.documents.map(doc => <a key={doc.id} href={`/api/monthly-reports/documents/${doc.id}`} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 rounded-md border p-3 text-sm hover:bg-muted"><FileText className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate">{doc.title}</span><Download className="h-4 w-4 shrink-0 text-muted-foreground" /></a>)}</div>
            </div>;
          })}
        </section>;
      })}
    </CardContent></Card>

    <AlertDialog open={confirmation !== null} onOpenChange={open => { if (!open) setConfirmation(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirmTitle}</AlertDialogTitle><AlertDialogDescription>{confirmDescription}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><Button variant={confirmation?.kind === "delete" || confirmation?.kind === "revoke" || confirmation?.kind === "unpublish" ? "destructive" : "default"} onClick={() => void confirmAction()}>{confirmation?.kind === "redesign" ? "Regenerate drafts" : confirmation?.kind === "delete" ? "Delete version" : confirmation?.kind === "unpublish" ? "Unpublish version" : "Stop sharing"}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={emailTarget !== null} onOpenChange={open => { if (!open && !emailBusy) setEmailTarget(null); }}>
      <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Email version link</DialogTitle><DialogDescription>Enter up to 10 email addresses, one per line or separated by commas. Anyone with the link can view this version until sharing is stopped.</DialogDescription></DialogHeader>
        <label htmlFor="monthly-report-email-recipients" className="text-sm font-medium">Recipients</label>
        <textarea id="monthly-report-email-recipients" value={emailRecipients} onChange={event => setEmailRecipients(event.target.value)} placeholder="name@example.com" className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        <DialogFooter><Button variant="outline" onClick={() => setEmailTarget(null)} disabled={emailBusy}>Cancel</Button><Button onClick={() => void sendShareEmail()} disabled={emailBusy || !emailRecipients.trim()}>{emailBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Send version link</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    {manager && <GenerateMonthlyInvoicesModal open={invoiceDialog} onOpenChange={setInvoiceDialog} initialMonth={Number(format(invoiceMonth, "M"))} initialYear={Number(format(invoiceMonth, "yyyy"))} onSuccess={() => { setInvoiceDialog(false); void prepare(invoiceMonth, false); }} />}
  </div>;
}
