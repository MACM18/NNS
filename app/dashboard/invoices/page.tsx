"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Eye, FilePlus2, FileText, RefreshCw, Search, Settings, Pencil } from "lucide-react";
import { AuthWrapper } from "@/components/auth/auth-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettingsModal } from "@/components/modals/company-settings-modal";
import { InvoicePdfPreviewDialog, type InvoiceRecordForPdf } from "@/components/invoice/invoice-pdf-preview-dialog";
import { PricingSchedulePanel } from "@/components/settings/pricing-schedule-panel";
import { InvoiceRatioSettings } from "@/components/settings/invoice-ratio-settings";
import { ActionButton } from "@/components/ui/action-button";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useNotification } from "@/contexts/notification-context";
import { formatMonthlyInvoiceDisplayNumber } from "@/lib/monthly-report-pdf";

type InvoiceRecord = InvoiceRecordForPdf;

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function InvoicesPage() {
  const { user, role } = useAuth();
  const router = useRouter();
  const { addNotification } = useNotification();
  const canManage = ["admin", "moderator", "superadmin"].includes(String(role || "").toLowerCase());
  const canEditSettings = ["admin", "moderator", "superadmin"].includes(String(role || "").toLowerCase());
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("invoices");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  const fetchInvoices = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({ types: "A,B", limit: "50", page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      if (month !== "all" && year !== "all") {
        params.set("month", month);
        params.set("year", year);
      }
      const response = await fetch(`/api/invoices?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load invoices.");
      setInvoices(result.data || []);
      setPagination({ total: Number(result.pagination?.total || 0), totalPages: Math.max(1, Number(result.pagination?.totalPages || 1)) });
    } catch (error) {
      addNotification({ title: "Could not load invoices", message: error instanceof Error ? error.message : "Try again.", type: "error", category: "system" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addNotification, month, year, search, page]);

  useEffect(() => { if (user) void fetchInvoices(); }, [user, fetchInvoices]);

  if (!user) return <AuthWrapper />;

  const years = Array.from(new Set([...Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - index), ...invoices.map(invoice => invoice.year).filter(Boolean)])).sort((a, b) => b - a);
  return (
    <div className="min-h-full w-full min-w-0 space-y-5 px-1 sm:px-2">
      <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium uppercase tracking-[0.16em] text-primary">Billing workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">Prepare, review, and manage service invoices for each month.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled title="Invoice analytics will be available in a future update"><Activity className="mr-2 h-4 w-4" />Analytics · Coming soon</Button>
          {canEditSettings && <Button variant="outline" onClick={() => setActiveTab("settings")}><Settings className="mr-2 h-4 w-4" />Invoice settings</Button>}
          {canManage && <Button onClick={() => router.push("/dashboard/invoices/create")}><FilePlus2 className="mr-2 h-4 w-4" />Create invoices</Button>}
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="invoices">Invoice archive</TabsTrigger>
          {canEditSettings && <TabsTrigger value="settings">Pricing & company details</TabsTrigger>}
        </TabsList>
        <TabsContent value="invoices" className="mt-4">
          <Card className="w-full border-border/70 shadow-sm">
            <CardHeader className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Service invoice records</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">A and B invoices are stored with the reviewed line and pricing snapshots.</p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-[minmax(180px,1fr)_150px_130px_auto] lg:w-auto">
                <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search invoice number" className="pl-9" /></div>
                <Select value={month} onValueChange={value => { setMonth(value); setPage(1); }}><SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger><SelectContent><SelectItem value="all">All months</SelectItem>{months.map((name, index) => <SelectItem key={name} value={String(index + 1)}>{name}</SelectItem>)}</SelectContent></Select>
                <Select value={year} onValueChange={value => { setYear(value); setPage(1); }}><SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger><SelectContent><SelectItem value="all">All years</SelectItem>{years.map(value => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent></Select>
                <Button variant="outline" onClick={() => void fetchInvoices(true)} disabled={refreshing}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? <div className="p-5"><TableSkeleton columns={7} rows={8} /></div> : invoices.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><div className="mb-4 rounded-full bg-primary/10 p-4"><FileText className="h-7 w-7 text-primary" /></div><h2 className="font-medium">No invoices found</h2><p className="mt-1 max-w-md text-sm text-muted-foreground">Choose a month and create a reviewed A/B invoice pair to get started.</p>{canManage && <Button className="mt-4" onClick={() => router.push("/dashboard/invoices/create")}><FilePlus2 className="mr-2 h-4 w-4" />Create invoices</Button>}</div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table className="w-full table-fixed">
                    <TableHeader><TableRow className="bg-muted/50"><TableHead className="w-[25%]">Invoice number</TableHead><TableHead className="w-[10%]">Type</TableHead><TableHead className="w-[17%]">Job month</TableHead><TableHead className="w-[14%]">Invoice date</TableHead><TableHead className="w-[10%] text-right">Lines</TableHead><TableHead className="w-[14%] text-right">Invoice amount</TableHead><TableHead className="w-[10%] text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>{invoices.map(invoice => (
                      <TableRow key={invoice.id} className="hover:bg-muted/30 [&>td]:align-middle">
                        <TableCell className="font-mono text-xs sm:text-sm">{invoice.month && invoice.year ? formatMonthlyInvoiceDisplayNumber(invoice.year, invoice.month) : invoice.invoice_number}</TableCell>
                        <TableCell><Badge variant={invoice.invoice_type === "A" ? "default" : "secondary"}>Invoice {invoice.invoice_type}</Badge></TableCell>
                        <TableCell>{invoice.job_month}</TableCell>
                        <TableCell>{invoice.invoice_date ? new Date(`${invoice.invoice_date}T00:00:00`).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{invoice.line_count}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">LKR {Number(invoice.total_amount || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right"><div className="flex min-h-10 items-center justify-end gap-1"><ActionButton style="compact" icon={<Eye className="h-4 w-4" />} label={`Preview invoice ${invoice.invoice_number}`} onClick={() => setSelectedInvoice(invoice)} />{canManage && <ActionButton style="text" icon={<Pencil className="h-4 w-4" />} label="Edit" onClick={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)} />}</div></TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                  <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <span>{pagination.total === 0 ? "No records" : `Showing ${(page - 1) * 50 + 1}–${Math.min(page * 50, pagination.total)} of ${pagination.total} invoices`}</span>
                    <div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(current => current - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={page >= pagination.totalPages || loading} onClick={() => setPage(current => current + 1)}>Next</Button></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {canEditSettings && <TabsContent value="settings" className="space-y-5"><InvoiceRatioSettings /><PricingSchedulePanel canManage={canManage} /><Button variant="outline" onClick={() => setSettingsOpen(true)}><Settings className="mr-2 h-4 w-4" />Edit company and bank details</Button></TabsContent>}
      </Tabs>
      <CompanySettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} onSuccess={() => void fetchInvoices(true)} />
      <InvoicePdfPreviewDialog open={Boolean(selectedInvoice)} onOpenChange={open => { if (!open) setSelectedInvoice(null); }} invoice={selectedInvoice} />
    </div>
  );
}
