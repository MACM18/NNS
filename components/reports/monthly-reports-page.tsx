"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { GenerateMonthlyInvoicesModal } from "@/components/modals/generate-monthly-invoices-modal";
import { Download, FileText, Link2, Loader2, RefreshCw, ShieldOff, Trash2 } from "lucide-react";

type Document = { id: string; reportType: string; title: string; fileName: string };
type Version = { id: string; version: number; status: string; createdAt: string; publishedAt: string | null; documents: Document[] };
type Report = { id: string; year: number; month: number; shareActive: boolean; shareRevokedAt: string | null; currentVersionId: string | null; versions: Version[] };
type RedesignProgress = { done: number; total: number; current: string; created: number; skipped: number; failures: string[] };
const MANAGEMENT = new Set(["admin", "moderator", "superadmin"]);

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
  const [emailReportId, setEmailReportId] = useState<string | null>(null);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/monthly-reports", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load reports.");
      setReports(payload.data);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to load reports."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

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

  const act = async (key: string, path: string, method: string, body?: unknown) => {
    setBusy(key);
    try {
      const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Action failed.");
      return payload.data;
    } catch (error) { toast.error(error instanceof Error ? error.message : "Action failed."); return null; }
    finally { setBusy(""); }
  };

  const redesignAll = async () => {
    if (!reports.length) { toast.info("There are no archived months to regenerate."); return; }
    const confirmed = window.confirm(`Create a redesigned draft for all ${reports.length} archived month${reports.length === 1 ? "" : "s"}? Published PDFs and shared links will remain unchanged until you review and publish each draft.`);
    if (!confirmed) return;
    setBusy("redesign-all");
    const progress: RedesignProgress = { done: 0, total: reports.length, current: "", created: 0, skipped: 0, failures: [] };
    setRedesignProgress({ ...progress });
    for (const report of reports) {
      const month = format(new Date(report.year, report.month - 1, 1), "MMMM yyyy");
      progress.current = month;
      setRedesignProgress({ ...progress, failures: [...progress.failures] });
      try {
        const response = await fetch(`/api/monthly-reports/${report.id}/redesign`, { method: "POST" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not redesign this month.");
        if (payload.data.status === "created") progress.created += 1;
        else progress.skipped += 1;
      } catch (error) {
        progress.failures.push(`${month}: ${error instanceof Error ? error.message : "Redesign failed"}`);
      }
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

  const deleteVersion = async (report: Report, version: Version) => {
    const month = format(new Date(report.year, report.month - 1, 1), "MMMM yyyy");
    if (!window.confirm(`Delete version ${version.version} from ${month} and all ${version.documents.length} PDFs stored in it? This cannot be undone. The currently published version is protected.`)) return;
    const result = await act(`delete-${version.id}`, `/api/monthly-reports/${report.id}/versions/${version.id}`, "DELETE");
    if (result) { toast.success(`Version ${version.version} and its PDFs were deleted.`); await refresh(); }
  };

  const publish = async (report: Report, version: Version) => {
    const result = await act(`publish-${version.id}`, `/api/monthly-reports/${report.id}/publish`, "POST", { versionId: version.id });
    if (result) { toast.success("Reviewed report version published."); await refresh(); }
  };
  const share = async (report: Report) => {
    const result = await act(`share-${report.id}`, `/api/monthly-reports/${report.id}/share`, "POST");
    if (!result?.token) return;
    const url = `${window.location.origin}/reports/shared/${result.token}`;
    setShareUrls(current => ({ ...current, [report.id]: url }));
    try { await navigator.clipboard.writeText(url); toast.success("Share link copied. Anyone with the link can view the PDFs."); }
    catch { toast.info("Share link is ready to copy."); }
    await refresh();
  };
  const revoke = async (report: Report) => {
    if (!window.confirm("Stop sharing this month? The link and all its report links will stop working.")) return;
    const result = await act(`revoke-${report.id}`, `/api/monthly-reports/${report.id}/share`, "DELETE");
    if (result) { setShareUrls(current => { const copy = { ...current }; delete copy[report.id]; return copy; }); toast.success("Sharing stopped."); await refresh(); }
  };
  const sendShareEmail = async () => {
    if (!emailReportId) return;
    setEmailBusy(true);
    try {
      const recipients = emailRecipients.split(/[\n,;]/).map(value => value.trim()).filter(Boolean);
      const response = await fetch(`/api/monthly-reports/${emailReportId}/share/email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipients }) });
      const payload = await response.json();
      if (!response.ok && !payload.data) throw new Error(payload.error || "Unable to email the report link.");
      const result = payload.data;
      if (result.failed) {
        const failedRecipients = (result.results || []).filter((item: { success: boolean }) => !item.success).map((item: { recipient: string }) => item.recipient);
        setEmailRecipients(failedRecipients.join("\n"));
        toast.warning(`Report link emailed to ${result.sent} recipient${result.sent === 1 ? "" : "s"}; ${result.failed} failed. The recipient field now contains only failed addresses.`);
      } else { toast.success(`Report link emailed to ${result.sent} recipient${result.sent === 1 ? "" : "s"}.`); setEmailReportId(null); }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to email the report link."); }
    finally { setEmailBusy(false); }
  };
  const grouped = useMemo(() => reports, [reports]);

  return <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Monthly Reports</h1><p className="mt-1 text-sm text-muted-foreground">Spreadsheet-style monthly PDFs, saved as reviewed snapshots.</p></div>{manager && <div className="flex flex-wrap items-center gap-2"><MonthYearPicker date={selectedMonth} onDateChange={setSelectedMonth} /><Button variant="outline" onClick={() => void redesignAll()} disabled={Boolean(busy) || reports.length === 0}>{busy === "redesign-all" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Regenerate all archived PDFs</Button><Button onClick={() => void prepare(selectedMonth)} disabled={Boolean(busy)}>{busy.startsWith("prepare") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Prepare month</Button></div>}</div>
    {manager && redesignProgress && <Card role="status" aria-live="polite"><CardContent className="space-y-2 p-4"><div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium">{redesignProgress.done < redesignProgress.total ? `Redesigning ${redesignProgress.current}…` : "PDF redesign finished"}</span><span className="text-muted-foreground">{redesignProgress.done} / {redesignProgress.total} months · {redesignProgress.created} drafts · {redesignProgress.skipped} already current</span></div><div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={redesignProgress.total} aria-valuenow={redesignProgress.done}><div className="h-full bg-primary transition-all" style={{ width: `${redesignProgress.total ? redesignProgress.done / redesignProgress.total * 100 : 0}%` }} /></div>{redesignProgress.failures.length > 0 && <ul className="max-h-32 list-disc space-y-1 overflow-auto pl-5 text-xs text-destructive">{redesignProgress.failures.map(failure => <li key={failure}>{failure}</li>)}</ul>}</CardContent></Card>}
    <Card><CardHeader className="pb-3"><CardTitle className="text-base">Report archive</CardTitle><CardDescription>All signed-in users can view archived PDFs. Only managers can prepare or share reports.</CardDescription></CardHeader><CardContent className="space-y-4">
      {loading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading report archive…</div> : grouped.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No monthly report sets have been prepared yet.</p> : grouped.map(report => {
        const current = report.versions.find(version => version.id === report.currentVersionId);
        const draft = report.versions.find(version => version.status === "draft");
        const label = format(new Date(report.year, report.month - 1, 1), "MMMM yyyy");
        return <section key={report.id} className="rounded-lg border"><div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 p-4"><div><h2 className="font-semibold">{label}</h2><p className="text-xs text-muted-foreground">{current ? `Published v${current.version}` : "Not published"}{draft ? ` · Draft v${draft.version} awaiting review` : ""}{report.shareActive ? " · Shared" : report.shareRevokedAt ? " · Sharing revoked" : " · Private"}</p></div>{manager && <div className="flex flex-wrap gap-2">{draft && <Button size="sm" variant="outline" onClick={() => void publish(report, draft)} disabled={Boolean(busy)}>{busy === `publish-${draft.id}` ? "Publishing…" : "Publish reviewed update"}</Button>}{current && report.shareActive && <Button size="sm" variant="outline" onClick={() => { setEmailRecipients(""); setEmailReportId(report.id); }} disabled={Boolean(busy) || emailBusy}><Mail className="mr-1.5 h-4 w-4" />Email link</Button>}{current && !report.shareActive && <Button size="sm" onClick={() => void share(report)} disabled={Boolean(busy)}><Link2 className="mr-1.5 h-4 w-4" />Share report</Button>}{report.shareActive && <><Button size="sm" variant="outline" onClick={() => void share(report)} disabled={Boolean(busy)}><Link2 className="mr-1.5 h-4 w-4" />Copy link</Button><Button size="sm" variant="destructive" onClick={() => void revoke(report)} disabled={Boolean(busy)}><ShieldOff className="mr-1.5 h-4 w-4" />Stop sharing</Button></> }</div>}</div>
          {report.shareActive && shareUrls[report.id] && <div className="border-b px-4 py-3"><input aria-label={`${label} share link`} readOnly value={shareUrls[report.id]} onFocus={event => event.currentTarget.select()} className="w-full rounded border bg-background px-3 py-2 text-sm" /></div>}
          {report.versions.map(version => <div key={version.id} className="border-b p-4 last:border-0"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-medium">Version {version.version} · {version.status === "draft" ? "Draft for review" : version.status === "published" ? "Published" : "Archived"}<span className="ml-2 text-xs font-normal text-muted-foreground">{format(new Date(version.createdAt), "PPp")}</span></div>{manager && version.id !== report.currentVersionId && <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void deleteVersion(report, version)} disabled={Boolean(busy)}><Trash2 className="mr-1.5 h-4 w-4" />{busy === `delete-${version.id}` ? "Deleting…" : "Delete version"}</Button>}</div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{version.documents.map(doc => <a key={doc.id} href={`/api/monthly-reports/documents/${doc.id}`} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 rounded-md border p-3 text-sm hover:bg-muted"><FileText className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate">{doc.title}</span><Download className="h-4 w-4 shrink-0 text-muted-foreground" /></a>)}</div></div>)}
        </section>;
      })}
    </CardContent></Card>
    <Dialog open={Boolean(emailReportId)} onOpenChange={open => { if (!open && !emailBusy) setEmailReportId(null); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Email monthly report link</DialogTitle><DialogDescription>Enter up to 10 email addresses, one per line or separated by commas. Anyone with the link can view this report set; you can revoke it later.</DialogDescription></DialogHeader>
        <label htmlFor="monthly-report-email-recipients" className="text-sm font-medium">Recipients</label>
        <textarea id="monthly-report-email-recipients" value={emailRecipients} onChange={event => setEmailRecipients(event.target.value)} placeholder="name@example.com" className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        <DialogFooter><Button variant="outline" onClick={() => setEmailReportId(null)} disabled={emailBusy}>Cancel</Button><Button onClick={() => void sendShareEmail()} disabled={emailBusy || !emailRecipients.trim()}>{emailBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Send report link</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    {manager && <GenerateMonthlyInvoicesModal open={invoiceDialog} onOpenChange={setInvoiceDialog} initialMonth={Number(format(invoiceMonth, "M"))} initialYear={Number(format(invoiceMonth, "yyyy"))} onSuccess={() => { setInvoiceDialog(false); void prepare(invoiceMonth, false); }} />}
  </div>;
}
