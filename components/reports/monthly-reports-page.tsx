"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { GenerateMonthlyInvoicesModal } from "@/components/modals/generate-monthly-invoices-modal";
import { Download, FileText, Link2, Loader2, RefreshCw, ShieldOff } from "lucide-react";

type Document = { id: string; reportType: string; title: string; fileName: string };
type Version = { id: string; version: number; status: string; createdAt: string; publishedAt: string | null; documents: Document[] };
type Report = { id: string; year: number; month: number; shareActive: boolean; shareRevokedAt: string | null; currentVersionId: string | null; versions: Version[] };
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
  const grouped = useMemo(() => reports, [reports]);

  return <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Monthly Reports</h1><p className="mt-1 text-sm text-muted-foreground">Spreadsheet-style monthly PDFs, saved as reviewed snapshots.</p></div>{manager && <div className="flex flex-wrap items-center gap-2"><MonthYearPicker date={selectedMonth} onDateChange={setSelectedMonth} /><Button onClick={() => void prepare(selectedMonth)} disabled={Boolean(busy)}>{busy.startsWith("prepare") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Prepare month</Button></div>}</div>
    <Card><CardHeader className="pb-3"><CardTitle className="text-base">Report archive</CardTitle><CardDescription>All signed-in users can view archived PDFs. Only managers can prepare or share reports.</CardDescription></CardHeader><CardContent className="space-y-4">
      {loading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading report archive…</div> : grouped.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No monthly report sets have been prepared yet.</p> : grouped.map(report => {
        const current = report.versions.find(version => version.id === report.currentVersionId);
        const draft = report.versions.find(version => version.status === "draft");
        const label = format(new Date(report.year, report.month - 1, 1), "MMMM yyyy");
        return <section key={report.id} className="rounded-lg border"><div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 p-4"><div><h2 className="font-semibold">{label}</h2><p className="text-xs text-muted-foreground">{current ? `Published v${current.version}` : "Not published"}{draft ? ` · Draft v${draft.version} awaiting review` : ""}{report.shareActive ? " · Shared" : report.shareRevokedAt ? " · Sharing revoked" : " · Private"}</p></div>{manager && <div className="flex flex-wrap gap-2">{draft && <Button size="sm" variant="outline" onClick={() => void publish(report, draft)} disabled={Boolean(busy)}>{busy === `publish-${draft.id}` ? "Publishing…" : "Publish reviewed update"}</Button>}{current && !report.shareActive && <Button size="sm" onClick={() => void share(report)} disabled={Boolean(busy)}><Link2 className="mr-1.5 h-4 w-4" />Share report</Button>}{report.shareActive && <><Button size="sm" variant="outline" onClick={() => void share(report)} disabled={Boolean(busy)}><Link2 className="mr-1.5 h-4 w-4" />Copy link</Button><Button size="sm" variant="destructive" onClick={() => void revoke(report)} disabled={Boolean(busy)}><ShieldOff className="mr-1.5 h-4 w-4" />Stop sharing</Button></> }</div>}</div>
          {report.shareActive && shareUrls[report.id] && <div className="border-b px-4 py-3"><input aria-label={`${label} share link`} readOnly value={shareUrls[report.id]} onFocus={event => event.currentTarget.select()} className="w-full rounded border bg-background px-3 py-2 text-sm" /></div>}
          {report.versions.map(version => <div key={version.id} className="border-b p-4 last:border-0"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-medium">Version {version.version} · {version.status === "draft" ? "Draft for review" : version.status === "published" ? "Published" : "Archived"}<span className="ml-2 text-xs font-normal text-muted-foreground">{format(new Date(version.createdAt), "PPp")}</span></div></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{version.documents.map(doc => <a key={doc.id} href={`/api/monthly-reports/documents/${doc.id}`} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 rounded-md border p-3 text-sm hover:bg-muted"><FileText className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate">{doc.title}</span><Download className="h-4 w-4 shrink-0 text-muted-foreground" /></a>)}</div></div>)}
        </section>;
      })}
    </CardContent></Card>
    {manager && <GenerateMonthlyInvoicesModal open={invoiceDialog} onOpenChange={setInvoiceDialog} initialMonth={Number(format(invoiceMonth, "M"))} initialYear={Number(format(invoiceMonth, "yyyy"))} onSuccess={() => { setInvoiceDialog(false); void prepare(invoiceMonth, false); }} />}
  </div>;
}
