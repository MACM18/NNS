"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateInvoicePdf, formatMonthlyInvoiceDisplayNumber, invoicePdfFilename } from "@/lib/monthly-report-pdf";

export interface InvoiceRecordForPdf {
  id: string;
  invoice_number: string;
  invoice_type: "A" | "B";
  month: number;
  year: number;
  job_month: string;
  invoice_date: string | null;
  total_amount: number;
  line_count: number;
  line_details_ids: string[] | null;
  line_details_snapshot?: Array<Record<string, unknown>> | null;
  optional_items_snapshot?: Array<Record<string, unknown>> | null;
  invoice_content_snapshot?: Record<string, unknown> | null;
  pricing_snapshot?: unknown;
  status: string;
  created_at: string;
}

interface CompanySettingsResponse {
  company_name?: string;
  address?: string;
  contact_numbers?: string[];
  registered_number?: string;
  website?: string;
  bank_details?: {
    bank_name?: string;
    account_title?: string;
    account_number?: string;
    branch_code?: string;
    iban?: string;
  };
}

export function InvoicePdfPreviewDialog({ open, onOpenChange, invoice }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceRecordForPdf | null;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !invoice) return;
    let disposed = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    setPdfUrl(null);

    void (async () => {
      try {
        const response = await fetch("/api/settings/company");
        const result = response.ok ? await response.json() : null;
        const settings = (result?.data || {}) as CompanySettingsResponse;
        const bank = settings.bank_details || {};
        const lines = Array.isArray(invoice.line_details_snapshot) ? invoice.line_details_snapshot : [];
        const optionalItems = Array.isArray(invoice.optional_items_snapshot) ? invoice.optional_items_snapshot : [];
        const bytes = generateInvoicePdf({
          invoice: {
            invoiceNumber: invoice.invoice_number,
            invoiceType: invoice.invoice_type,
            invoiceDate: invoice.invoice_date || "",
            jobMonth: invoice.job_month,
            totalAmount: Number(invoice.total_amount || 0),
          },
          lines: lines as never,
          optionalItems: optionalItems as never,
          pricingSnapshot: invoice.pricing_snapshot,
          invoiceContentSnapshot: invoice.invoice_content_snapshot,
          displayNumber: formatMonthlyInvoiceDisplayNumber(invoice.year, invoice.month),
          year: invoice.year,
          month: invoice.month,
          company: {
            name: settings.company_name || "NNS Enterprise",
            address: settings.address || "",
            contacts: Array.isArray(settings.contact_numbers) ? settings.contact_numbers : [],
            registeredNumber: settings.registered_number || "",
            website: settings.website || "",
            bank: {
              bankName: bank.bank_name || "",
              accountTitle: bank.account_title || "",
              accountNumber: bank.account_number || "",
              branchCode: bank.branch_code || "",
              iban: bank.iban || "",
            },
          },
        });
        objectUrl = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
        if (!disposed) setPdfUrl(objectUrl);
      } catch (cause) {
        if (!disposed) setError(cause instanceof Error ? cause.message : "Could not prepare this invoice PDF.");
      } finally {
        if (!disposed) setLoading(false);
      }
    })();

    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, invoice]);

  const download = () => {
    if (!pdfUrl || !invoice) return;
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = invoicePdfFilename(invoice.invoice_type, formatMonthlyInvoiceDisplayNumber(invoice.year, invoice.month));
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[94vh] max-h-[94vh] w-[96vw] max-w-6xl flex-col gap-0 p-0">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle>Invoice {invoice?.invoice_type}</DialogTitle>
          <DialogDescription>{invoice?.job_month} · {invoice?.invoice_number}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 bg-slate-100 p-3 sm:p-5">
          {loading && <div className="flex h-full items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Preparing PDF preview…</div>}
          {error && <div className="flex h-full items-center justify-center text-sm text-destructive">{error}</div>}
          {pdfUrl && !loading && <iframe title={`Invoice ${invoice?.invoice_type} PDF`} src={pdfUrl} className="h-full w-full rounded-md border bg-white shadow-sm" />}
        </div>
        <DialogFooter className="border-t px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={download} disabled={!pdfUrl}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
