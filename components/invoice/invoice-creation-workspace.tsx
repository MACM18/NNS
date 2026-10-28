"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileText, Loader2, Plus, RotateCw, Save } from "lucide-react";
import { AuthWrapper } from "@/components/auth/auth-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { useNotification } from "@/contexts/notification-context";
import { OPTIONAL_ITEM_DESCRIPTIONS, OPTIONAL_ITEM_RATES, type OptionalItemCode } from "@/lib/service-pricing-types";
import { formatMonthlyInvoiceDisplayNumber, generateInvoicePdf } from "@/lib/monthly-report-pdf";
import { monthlyInvoiceNumber } from "@/lib/monthly-invoice-number";
import type { InvoiceRecordForPdf } from "@/components/invoice/invoice-pdf-preview-dialog";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const OPTIONAL_CODES = Object.keys(OPTIONAL_ITEM_RATES) as OptionalItemCode[];

type SourceLine = { id: string; name: string; phone_number: string; total_cable: number; date: string; address: string };
type InvoiceLine = {
  lineId: string;
  included: boolean;
  customerName: string;
  telephoneNo: string;
  address: string;
  serviceDate: string;
  cableLength: number;
  serviceType: "FTTH" | "DATA" | "PEO_TV";
  description: string;
  baseRate: number;
  pricingScheduleId?: string;
  pricingScheduleName?: string;
};
type OptionalItem = { code: OptionalItemCode; description: string; quantity: number; unitRate: number };
type Company = { company_name: string; address: string; contact_numbers: string[]; registered_number: string; website: string; bank_details: Record<string, string> };
type ExistingInvoice = InvoiceRecordForPdf;

const money = (amount: number) => `LKR ${Number(amount || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cents = (amount: number) => Math.round((Number(amount) + Number.EPSILON) * 100);

function percentShares(values: number[], percent: 90 | 10) {
  const allCents = values.map(cents);
  const grandTotal = allCents.reduce((sum, value) => sum + value, 0);
  const target = percent === 90 ? Math.round(grandTotal * .9) : grandTotal - Math.round(grandTotal * .9);
  let assigned = 0;
  return allCents.map((value, index) => {
    const share = index === allCents.length - 1 ? target - assigned : percent === 90 ? Math.round(value * .9) : value - Math.round(value * .9);
    assigned += share;
    return share / 100;
  });
}

export function InvoiceCreationWorkspace() {
  const { user, role } = useAuth();
  const router = useRouter();
  const { addNotification } = useNotification();
  const canManage = ["admin", "moderator", "superadmin"].includes(String(role || "").toLowerCase());
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [optionalItems, setOptionalItems] = useState<Record<OptionalItemCode, OptionalItem>>(() => Object.fromEntries(OPTIONAL_CODES.map(code => [code, { code, description: OPTIONAL_ITEM_DESCRIPTIONS[code], quantity: 0, unitRate: OPTIONAL_ITEM_RATES[code] }])) as Record<OptionalItemCode, OptionalItem>);
  const [pricingSnapshot, setPricingSnapshot] = useState<unknown>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [existingInvoices, setExistingInvoices] = useState<ExistingInvoice[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<"A" | "B">("A");
  const [pdfUrls, setPdfUrls] = useState<Record<"A" | "B", string | null>>({ A: null, B: null });

  const selectedLines = useMemo(() => lines.filter(line => line.included), [lines]);
  const activeOptional = useMemo(() => OPTIONAL_CODES.map(code => optionalItems[code]).filter(item => item.quantity > 0), [optionalItems]);
  const baseRows = useMemo(() => [
    ...selectedLines.map(line => ({ amount: Number(line.baseRate || 0), kind: "line" as const })),
    ...activeOptional.map(item => ({ amount: Number(item.unitRate || 0) * item.quantity, kind: "optional" as const })),
  ], [selectedLines, activeOptional]);
  const grandTotal = baseRows.reduce((sum, row) => sum + row.amount, 0);
  const validAmounts = selectedLines.every(line => Number.isFinite(line.baseRate) && line.baseRate > 0 && Number.isFinite(line.cableLength) && line.cableLength >= 0)
    && activeOptional.every(item => Number.isSafeInteger(item.quantity) && item.quantity >= 0 && Number.isFinite(item.unitRate) && item.unitRate > 0);
  const aAmount = Math.round(cents(grandTotal) * .9) / 100;
  const bAmount = (cents(grandTotal) - cents(aAmount)) / 100;
  const existingA = existingInvoices.some(invoice => invoice.invoice_type === "A");
  const existingB = existingInvoices.some(invoice => invoice.invoice_type === "B");
  const pairComplete = existingA && existingB;
  const partialPair = existingA !== existingB;
  const canUseExistingSnapshot = existingInvoices.some(invoice => Array.isArray(invoice.line_details_snapshot) && invoice.line_details_snapshot.length > 0);
  const yearOptions = Array.from({ length: Math.max(7, now.getFullYear() - 2023 + 3) }, (_, index) => String(2023 + index));
  const invoiceDate = useMemo(() => new Date(Date.UTC(Number(year), Number(month), 2)).toISOString().slice(0, 10), [month, year]);
  const jobMonth = `${MONTHS[Number(month) - 1]} ${year}`;
  const numberA = useMemo(() => monthlyInvoiceNumber(year, month, "A"), [year, month]);
  const numberB = useMemo(() => monthlyInvoiceNumber(year, month, "B"), [year, month]);

  const loadMonth = useCallback(async () => {
    setLoadingMonth(true);
    setError(null);
    setLines([]);
    setExistingInvoices([]);
    setPricingSnapshot(null);
    try {
      const [lineResponse, invoiceResponse, settingsResponse] = await Promise.all([
        fetch(`/api/lines/for-invoice?month=${month}&year=${year}`),
        fetch(`/api/invoices?month=${month}&year=${year}&types=A,B&limit=10`),
        fetch("/api/settings/company"),
      ]);
      const [lineResult, invoiceResult, settingsResult] = await Promise.all([lineResponse.json(), invoiceResponse.json(), settingsResponse.json()]);
      if (!lineResponse.ok) throw new Error(lineResult.error || "Could not load this month’s installation lines.");
      if (!invoiceResponse.ok) throw new Error(invoiceResult.error || "Could not check existing invoices.");
      if (!settingsResponse.ok) throw new Error(settingsResult.error || "Could not load company invoice details.");
      const source: SourceLine[] = lineResult.data || [];
      const existing: ExistingInvoice[] = invoiceResult.data || [];
      setExistingInvoices(existing);
      setCompany(settingsResult.data);
      const savedInvoice = existing.find(invoice => Array.isArray(invoice.line_details_snapshot) && invoice.line_details_snapshot.length > 0);
      let lineSnapshots: InvoiceLine[] = [];
      let savedOptionals: Record<OptionalItemCode, OptionalItem> | null = null;

      if (savedInvoice && existing.length > 0) {
        const savedLines = savedInvoice.line_details_snapshot || [];
        const sourceById = new Map(source.map(line => [line.id, line]));
        lineSnapshots = savedLines.map(raw => {
          const saved = raw as Record<string, unknown>;
          const lineId = String(saved.lineId || "");
          const current = sourceById.get(lineId);
          return {
            lineId,
            included: true,
            customerName: String(saved.customerName || current?.name || ""),
            telephoneNo: String(saved.telephoneNo || current?.phone_number || ""),
            address: String(saved.address || current?.address || ""),
            serviceDate: String(saved.serviceDate || current?.date || ""),
            cableLength: Number(saved.cableLength ?? current?.total_cable ?? 0),
            serviceType: (String(saved.serviceType || "FTTH").toUpperCase() === "DATA" ? "DATA" : String(saved.serviceType || "").toUpperCase() === "PEO_TV" ? "PEO_TV" : "FTTH"),
            description: String(saved.description || ""),
            baseRate: Number(saved.baseRate || 0),
            ...(typeof saved.pricingScheduleId === "string" ? { pricingScheduleId: saved.pricingScheduleId } : {}),
            ...(typeof saved.pricingScheduleName === "string" ? { pricingScheduleName: saved.pricingScheduleName } : {}),
          };
        });
        const defaults = Object.fromEntries(OPTIONAL_CODES.map(code => [code, { code, description: OPTIONAL_ITEM_DESCRIPTIONS[code], quantity: 0, unitRate: OPTIONAL_ITEM_RATES[code] }])) as Record<OptionalItemCode, OptionalItem>;
        for (const raw of savedInvoice.optional_items_snapshot || []) {
          const item = raw as Record<string, unknown>;
          const code = String(item.code || "") as OptionalItemCode;
          if (OPTIONAL_CODES.includes(code)) defaults[code] = { code, description: String(item.description || OPTIONAL_ITEM_DESCRIPTIONS[code]), quantity: Number(item.quantity || 0), unitRate: Number(item.unitRate || OPTIONAL_ITEM_RATES[code]) };
        }
        savedOptionals = defaults;
        setPricingSnapshot(savedInvoice.pricing_snapshot || null);
      } else if (source.length) {
        const pricingResponse = await fetch("/api/invoices/generate/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineDetailsIds: source.map(line => line.id), invoiceType: "A", optionalItems: {} }),
        });
        const pricingResult = await pricingResponse.json();
        if (!pricingResponse.ok) throw new Error(pricingResult.error || "Could not calculate invoice pricing.");
        const priced = pricingResult.data;
        setPricingSnapshot(priced.pricingSnapshot);
        const pricedById = new Map((priced.lineDetailsSnapshot || []).map((line: Record<string, unknown>) => [String(line.lineId), line]));
        lineSnapshots = source.map(line => {
          const price = pricedById.get(line.id) as Record<string, unknown> | undefined;
          const kind = String(price?.serviceType || "FTTH").toUpperCase();
          return {
            lineId: line.id,
            included: true,
            customerName: String(price?.customerName || line.name || ""),
            telephoneNo: String(price?.telephoneNo || line.phone_number || ""),
            address: String(price?.address || line.address || ""),
            serviceDate: String(price?.serviceDate || line.date || ""),
            cableLength: Number(price?.cableLength ?? line.total_cable),
            serviceType: kind === "DATA" ? "DATA" : kind === "PEO_TV" ? "PEO_TV" : "FTTH",
            description: String(price?.description || ""),
            baseRate: Number(price?.baseRate || 0),
            ...(typeof price?.pricingScheduleId === "string" ? { pricingScheduleId: price.pricingScheduleId } : {}),
            ...(typeof price?.pricingScheduleName === "string" ? { pricingScheduleName: price.pricingScheduleName } : {}),
          };
        });
        const schedule = Array.isArray(priced.pricingSnapshot) ? priced.pricingSnapshot[priced.pricingSnapshot.length - 1] : null;
        const rates = schedule?.optionalRates || {};
        savedOptionals = Object.fromEntries(OPTIONAL_CODES.map(code => [code, { code, description: OPTIONAL_ITEM_DESCRIPTIONS[code], quantity: 0, unitRate: Number(rates[code] || OPTIONAL_ITEM_RATES[code]) }])) as Record<OptionalItemCode, OptionalItem>;
      }
      setLines(lineSnapshots);
      if (savedOptionals) setOptionalItems(savedOptionals);
      if (source.length === 0 && existing.length === 0) setError("No installation lines were found for this month.");
      if (existing.length === 2) setError("Both invoices already exist for this month. They are preserved in the archive.");
      if (existing.length === 1 && !savedInvoice) setError("An invoice already exists, but it has no saved line snapshot to prepare its counterpart.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not prepare this month.");
    } finally {
      setLoadingMonth(false);
    }
  }, [month, year]);

  useEffect(() => { if (user && canManage) void loadMonth(); }, [user, canManage, loadMonth]);

  useEffect(() => {
    if (!company || selectedLines.length === 0 || grandTotal <= 0) {
      setPdfUrls({ A: null, B: null });
      return;
    }
    let disposed = false;
    let urls: string[] = [];
    setPreviewLoading(true);
    try {
      const amounts = percentShares(baseRows.map(row => row.amount), 90);
      const bAmounts = percentShares(baseRows.map(row => row.amount), 10);
      const lineBase = selectedLines.length;
      const lineA = selectedLines.map((line, index) => ({ ...line, invoiceAmount: amounts[index] }));
      const lineB = selectedLines.map((line, index) => ({ ...line, invoiceAmount: bAmounts[index] }));
      const optionalA = activeOptional.map((item, index) => ({ ...item, baseAmount: item.unitRate * item.quantity, invoiceAmount: amounts[lineBase + index] }));
      const optionalB = activeOptional.map((item, index) => ({ ...item, baseAmount: item.unitRate * item.quantity, invoiceAmount: bAmounts[lineBase + index] }));
      const pdf = (type: "A" | "B", invoiceNumber: string, actualAmount: number, lineRows: typeof lineA, itemRows: typeof optionalA) => generateInvoicePdf({
        invoice: { invoiceNumber, invoiceType: type, invoiceDate, jobMonth, totalAmount: actualAmount },
        lines: lineRows as never,
        optionalItems: itemRows as never,
        pricingSnapshot,
        displayNumber: formatMonthlyInvoiceDisplayNumber(Number(year), Number(month)),
        year: Number(year), month: Number(month),
        company: {
          name: company.company_name,
          address: company.address,
          contacts: company.contact_numbers || [],
          registeredNumber: company.registered_number,
          website: company.website,
          bank: {
            bankName: company.bank_details?.bank_name || "",
            accountTitle: company.bank_details?.account_title || "",
            accountNumber: company.bank_details?.account_number || "",
            branchCode: company.bank_details?.branch_code || "",
            iban: company.bank_details?.iban || "",
          },
        },
      });
      const aBytes = pdf("A", numberA, aAmount, lineA, optionalA);
      const bBytes = pdf("B", numberB, bAmount, lineB, optionalB);
      const aUrl = URL.createObjectURL(new Blob([aBytes as BlobPart], { type: "application/pdf" }));
      const bUrl = URL.createObjectURL(new Blob([bBytes as BlobPart], { type: "application/pdf" }));
      urls = [aUrl, bUrl];
      if (!disposed) setPdfUrls({ A: aUrl, B: bUrl });
    } catch (cause) {
      if (!disposed) setError(cause instanceof Error ? cause.message : "Could not render the invoice preview.");
    } finally {
      if (!disposed) setPreviewLoading(false);
    }
    return () => { disposed = true; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [company, selectedLines, activeOptional, baseRows, grandTotal, pricingSnapshot, invoiceDate, jobMonth, numberA, numberB, aAmount, bAmount, year, month]);

  if (!user) return <AuthWrapper />;
  if (!canManage) return <div className="mx-auto max-w-3xl p-8 text-center"><h1 className="text-xl font-semibold">Invoice access required</h1><p className="mt-2 text-muted-foreground">Ask an administrator or moderator to prepare invoices.</p><Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/invoices")}><ArrowLeft className="mr-2 h-4 w-4" />Back to invoices</Button></div>;

  const updateLine = (lineId: string, values: Partial<InvoiceLine>) => setLines(current => current.map(line => line.lineId === lineId ? { ...line, ...values } : line));
  const savePair = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/invoices/create-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: Number(month), year: Number(year), lines: selectedLines, optionalItems: activeOptional, pricingSnapshot }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create invoices.");
      addNotification({ title: "Invoices created", message: `The reviewed A/B invoice pair for ${jobMonth} is saved.`, type: "success", category: "invoice_generated" });
      router.push("/dashboard/invoices");
    } catch (cause) {
      addNotification({ title: "Invoice creation failed", message: cause instanceof Error ? cause.message : "Please review the invoice and try again.", type: "error", category: "system" });
    } finally {
      setSaving(false);
    }
  };

  const downloadPreview = () => {
    const url = pdfUrls[activePreview];
    if (!url) return;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(activePreview === "A" ? numberA : numberB).replace(/[^A-Za-z0-9_-]+/g, "_")}.pdf`;
    anchor.click();
  };

  return (
    <div className="w-full min-w-0 space-y-5 px-1 sm:px-2">
      <header className="flex flex-col gap-4 border-b pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-3 -ml-3" onClick={() => router.push("/dashboard/invoices")}><ArrowLeft className="mr-2 h-4 w-4" />Invoice archive</Button>
          <p className="mb-1 text-sm font-medium uppercase tracking-[0.16em] text-primary">Invoice preparation</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Create monthly invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">Select a service month, review the imported lines, then create the invoice pair when it is ready.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled title="Invoice analytics will be available in a future update">Analytics · Coming soon</Button>
          <Button variant="outline" onClick={() => void loadMonth()} disabled={loadingMonth}><RotateCw className={`mr-2 h-4 w-4 ${loadingMonth ? "animate-spin" : ""}`} />Reload month</Button>
          <Button onClick={() => void savePair()} disabled={saving || loadingMonth || pairComplete || (partialPair && !canUseExistingSnapshot) || selectedLines.length === 0 || grandTotal <= 0 || !validAmounts}><Save className="mr-2 h-4 w-4" />{saving ? "Creating invoices…" : partialPair ? "Create missing invoice" : "Create invoices"}</Button>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(480px,0.9fr)]">
        <div className="min-w-0 space-y-5">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">1. Select service month</CardTitle><CardDescription>Installation records and rates will be loaded for this month.</CardDescription></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Month</Label><Select value={month} onValueChange={setMonth}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map((value, index) => <SelectItem key={value} value={String(index + 1)}>{value}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Year</Label><Select value={year} onValueChange={setYear}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{yearOptions.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
              <div className="sm:col-span-2 grid gap-2 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-3"><div><span className="text-muted-foreground">Job month</span><div className="font-medium">{jobMonth}</div></div><div><span className="text-muted-foreground">Invoice date</span><div className="font-medium">{new Date(`${invoiceDate}T00:00:00`).toLocaleDateString()}</div></div><div><span className="text-muted-foreground">Source lines</span><div className="font-medium">{selectedLines.length} selected of {lines.length}</div></div></div>
              {error && <div className="sm:col-span-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}{pairComplete && <Link className="ml-2 inline-flex items-center underline" href="/dashboard/invoices">View archive</Link>}</div>}
              {!validAmounts && lines.length > 0 && <div className="sm:col-span-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">Enter a positive rate for every selected line and optional item, and use whole-number quantities.</div>}
              {partialPair && <div className="sm:col-span-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">One invoice already exists. It will remain unchanged; the missing invoice will be created from its saved snapshot.</div>}
              {pairComplete && <div className="sm:col-span-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"><Check className="mr-2 inline h-4 w-4" />Both invoices are already saved. They will not be replaced.</div>}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-base">2. Review and edit invoice lines</CardTitle><CardDescription className="mt-1">Changes here are saved to the invoice snapshot only. Installation records are not changed.</CardDescription></div><Badge variant="secondary">{selectedLines.length} selected</Badge></div></CardHeader>
            <CardContent className="p-0">
              {loadingMonth ? <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading lines and rates…</div> : lines.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Choose a month with installation records to begin.</div> : (
                <div className="max-h-[520px] overflow-auto">
                  <Table className="min-w-[1350px]">
                    <TableHeader className="sticky top-0 z-10 bg-background"><TableRow><TableHead className="w-10">Use</TableHead><TableHead>Customer</TableHead><TableHead>Telephone</TableHead><TableHead>Address</TableHead><TableHead>Service date</TableHead><TableHead>Service type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Length m</TableHead><TableHead className="text-right">Full rate</TableHead></TableRow></TableHeader>
                    <TableBody>{lines.map(line => (
                      <TableRow key={line.lineId} className={!line.included ? "opacity-50" : undefined}>
                        <TableCell><input type="checkbox" aria-label={`Include ${line.customerName}`} checked={line.included} disabled={partialPair || pairComplete} onChange={event => updateLine(line.lineId, { included: event.target.checked })} /></TableCell>
                        <TableCell><Input className="min-w-32" value={line.customerName} disabled={partialPair || pairComplete} onChange={event => updateLine(line.lineId, { customerName: event.target.value })} /></TableCell>
                        <TableCell><Input className="min-w-32" value={line.telephoneNo} disabled={partialPair || pairComplete} onChange={event => updateLine(line.lineId, { telephoneNo: event.target.value })} /></TableCell>
                        <TableCell><Input className="min-w-40" value={line.address} disabled={partialPair || pairComplete} onChange={event => updateLine(line.lineId, { address: event.target.value })} /></TableCell>
                        <TableCell><Input type="date" className="min-w-36" value={line.serviceDate} disabled={partialPair || pairComplete} onChange={event => updateLine(line.lineId, { serviceDate: event.target.value })} /></TableCell>
                        <TableCell><Select value={line.serviceType} disabled={partialPair || pairComplete} onValueChange={value => updateLine(line.lineId, { serviceType: value as InvoiceLine["serviceType"] })}><SelectTrigger className="min-w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="FTTH">FTTH</SelectItem><SelectItem value="DATA">Data Line</SelectItem><SelectItem value="PEO_TV">Peo TV</SelectItem></SelectContent></Select></TableCell>
                        <TableCell><Input className="min-w-52" value={line.description} disabled={partialPair || pairComplete} onChange={event => updateLine(line.lineId, { description: event.target.value })} /></TableCell>
                        <TableCell><Input type="number" min="0" step="0.01" className="w-24 text-right" value={line.cableLength} disabled={partialPair || pairComplete} onChange={event => updateLine(line.lineId, { cableLength: Number(event.target.value) })} /></TableCell>
                        <TableCell><Input type="number" min="0.01" step="0.01" className="w-28 text-right" value={line.baseRate} disabled={partialPair || pairComplete} onChange={event => updateLine(line.lineId, { baseRate: Number(event.target.value) })} /></TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-base">Optional invoice items</CardTitle><CardDescription>Pole and high-rise charges are added only when a quantity is entered.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {OPTIONAL_CODES.map(code => <div key={code} className="grid grid-cols-[minmax(0,1fr)_82px_118px] items-end gap-2"><div className="min-w-0"><Label className="truncate">{OPTIONAL_ITEM_DESCRIPTIONS[code]}</Label><p className="mt-1 text-xs text-muted-foreground">Unit rate</p></div><Input aria-label={`${OPTIONAL_ITEM_DESCRIPTIONS[code]} quantity`} type="number" min="0" step="1" value={optionalItems[code].quantity} disabled={partialPair || pairComplete} onChange={event => setOptionalItems(current => ({ ...current, [code]: { ...current[code], quantity: Math.max(0, Math.floor(Number(event.target.value) || 0)) } }))} /><Input aria-label={`${OPTIONAL_ITEM_DESCRIPTIONS[code]} unit rate`} type="number" min="0.01" step="0.01" value={optionalItems[code].unitRate} disabled={partialPair || pairComplete} onChange={event => setOptionalItems(current => ({ ...current, [code]: { ...current[code], unitRate: Number(event.target.value) } }))} /></div>)}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card className="border-primary/20 shadow-sm xl:sticky xl:top-4">
            <CardHeader className="border-b pb-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="text-base">3. Invoice preview</CardTitle><CardDescription className="mt-1">Rendered with the same A/B sheet layout used by report PDFs.</CardDescription></div><div className="flex gap-1 rounded-lg bg-muted p-1"><Button size="sm" variant={activePreview === "A" ? "default" : "ghost"} onClick={() => setActivePreview("A")}>Invoice A · 90%</Button><Button size="sm" variant={activePreview === "B" ? "default" : "ghost"} onClick={() => setActivePreview("B")}>Invoice B · 10%</Button></div></div></CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid grid-cols-3 gap-2"><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Grand total · 100%</p><p className="mt-1 text-sm font-semibold tabular-nums">{money(grandTotal)}</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Invoice A · 90%</p><p className="mt-1 text-sm font-semibold tabular-nums">{money(aAmount)}</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Invoice B · 10%</p><p className="mt-1 text-sm font-semibold tabular-nums">{money(bAmount)}</p></div></div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><div><span className="text-muted-foreground">Display number</span><p className="font-mono text-xs">{formatMonthlyInvoiceDisplayNumber(Number(year), Number(month))}</p></div><Badge variant="outline">{activePreview === "A" ? "90% actual" : "10% actual"}</Badge></div>
              <div className="overflow-hidden rounded-lg border bg-slate-100 p-2"><div className="relative aspect-[210/297] w-full bg-white shadow-sm">{previewLoading ? <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Preparing preview…</div> : pdfUrls[activePreview] ? <iframe title={`Invoice ${activePreview} preview`} src={pdfUrls[activePreview] || undefined} className="absolute inset-0 h-full w-full" /> : <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">Add at least one priced line to see the invoice preview.</div>}</div></div>
              <Button variant="outline" className="w-full" onClick={downloadPreview} disabled={!pdfUrls[activePreview]}><FileText className="mr-2 h-4 w-4" />Download preview PDF</Button>
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Invoice date: {new Date(`${invoiceDate}T00:00:00`).toLocaleDateString()} · Bank details are read from Company Settings.</div>
            </CardContent>
          </Card>
          <Card><CardContent className="flex items-start gap-3 p-4 text-sm"><div className="rounded-full bg-primary/10 p-2 text-primary"><Check className="h-4 w-4" /></div><div><p className="font-medium">Nothing is saved automatically</p><p className="mt-1 text-muted-foreground">Check both previews and the source lines. Create invoices saves the reviewed snapshot and leaves the source installation records as they are.</p></div></CardContent></Card>
          <Button className="w-full xl:hidden" size="lg" onClick={() => void savePair()} disabled={saving || loadingMonth || pairComplete || (partialPair && !canUseExistingSnapshot) || selectedLines.length === 0 || grandTotal <= 0 || !validAmounts}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating invoices…</> : <><Plus className="mr-2 h-4 w-4" />{partialPair ? "Create missing invoice" : "Create invoices"}</>}</Button>
        </div>
      </div>
    </div>
  );
}
