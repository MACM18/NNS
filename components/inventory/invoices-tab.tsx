"use client";

import React, { useState } from "react";
import { ChevronUp, Eye, FileText, LockKeyhole, Pencil, Trash } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InventoryInvoice, InventoryInvoiceItem } from "@/app/dashboard/inventory/page";

interface InvoicesTabProps {
  invoices: InventoryInvoice[];
  loadingData: boolean;
  error?: string;
  expandedInvoiceId: string | null;
  setExpandedInvoiceId: (id: string | null) => void;
  fetchInvoiceItems: (id: string) => Promise<void>;
  invoiceItems: Record<string, InventoryInvoiceItem[]>;
  role: string | null;
  onEdit: (invoice: InventoryInvoice) => void;
  onDelete: (invoice: InventoryInvoice) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

function sourceLabel(invoice: InventoryInvoice) {
  if (!invoice.is_system_generated) return "Manual receipt";
  if (invoice.source_type === "google_material_balance_adjustment") return "Historical revision";
  return "Free-issued / Google Sheet";
}

function sourceClasses(invoice: InventoryInvoice) {
  if (!invoice.is_system_generated) return "border-border/50 bg-muted/40 text-muted-foreground";
  if (invoice.source_type === "google_material_balance_adjustment") return "border-slate-500/20 bg-slate-500/5 text-slate-600 dark:text-slate-300";
  return "border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400";
}

export function InvoicesTab({
  invoices,
  loadingData,
  error,
  expandedInvoiceId,
  setExpandedInvoiceId,
  fetchInvoiceItems,
  invoiceItems,
  role,
  onEdit,
  onDelete,
  getStatusBadge,
}: InvoicesTabProps) {
  const [view, setView] = useState("all");
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);
  const normalizedRole = (role || "").toLowerCase();
  const canEdit = ["admin", "moderator", "superadmin"].includes(normalizedRole);
  const canDelete = ["admin", "superadmin"].includes(normalizedRole);
  const visibleInvoices = invoices.filter((invoice) => {
    if (view === "manual") return !invoice.is_system_generated;
    if (view === "google") return invoice.is_system_generated && invoice.source_type !== "google_material_balance_adjustment";
    if (view === "history") return invoice.is_system_generated && invoice.source_type === "google_material_balance_adjustment";
    return true;
  });

  const toggleInvoice = async (invoice: InventoryInvoice) => {
    if (expandedInvoiceId === invoice.id) {
      setExpandedInvoiceId(null);
      return;
    }
    setExpandedInvoiceId(invoice.id);
    if (invoiceItems[invoice.id]) return;
    setLoadingInvoiceId(invoice.id);
    try {
      await fetchInvoiceItems(invoice.id);
    } finally {
      setLoadingInvoiceId(null);
    }
  };

  const renderItems = (invoice: InventoryInvoice) => {
    const items = invoiceItems[invoice.id];
    if (loadingInvoiceId === invoice.id) return <p className="text-sm text-muted-foreground">Loading item details…</p>;
    if (!items?.length) return <p className="text-sm text-muted-foreground">No item details were returned for this invoice.</p>;
    return (
      <div className="overflow-x-auto rounded-lg border bg-background/50">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-[11px]">Item</TableHead>
              <TableHead className="text-right text-[11px]">Requested</TableHead>
              <TableHead className="text-right text-[11px]">Issued</TableHead>
              <TableHead className="text-[11px]">Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-xs font-medium">{item.description}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{item.quantity_requested}</TableCell>
                <TableCell className="text-right text-xs font-bold tabular-nums">{item.quantity_issued}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.unit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card className="glass-card overflow-hidden rounded-3xl border-border/40 shadow-sm">
      <CardHeader className="space-y-4 border-b border-border/40 bg-muted/[0.12]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Inventory receipts</CardTitle>
            <CardDescription>Manual receipts, free-issued materials, and sync history in one place.</CardDescription>
          </div>
          <Select value={view} onValueChange={setView}>
            <SelectTrigger className="w-full sm:w-[210px]" aria-label="Filter inventory invoices">
              <SelectValue placeholder="Invoice view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All receipts ({invoices.length})</SelectItem>
              <SelectItem value="manual">Manual receipts ({invoices.filter((invoice) => !invoice.is_system_generated).length})</SelectItem>
              <SelectItem value="google">Current Google Sheet ({invoices.filter((invoice) => invoice.is_system_generated && invoice.source_type !== "google_material_balance_adjustment").length})</SelectItem>
              <SelectItem value="history">Historical revisions ({invoices.filter((invoice) => invoice.source_type === "google_material_balance_adjustment").length})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{visibleInvoices.length} receipt{visibleInvoices.length === 1 ? "" : "s"} shown</span>
          <span aria-hidden="true">·</span>
          <span>Google Sheet records are locked and have no purchase cost</span>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {error ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-300" role="alert">{error}</div>
        ) : loadingData ? (
          <TableSkeleton columns={6} rows={6} />
        ) : visibleInvoices.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleInvoices.map((invoice) => {
                    const locked = Boolean(invoice.is_system_generated || invoice.locked);
                    return (
                      <React.Fragment key={invoice.id}>
                        <TableRow className="hover:bg-muted/30">
                          <TableCell>
                            <div>
                              <p className="font-mono text-sm font-semibold">{invoice.invoice_number}</p>
                              <p className="text-xs text-muted-foreground">{invoice.warehouse || "Main warehouse"}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{new Date(invoice.source_date || invoice.date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium tabular-nums">{invoice.total_items}</TableCell>
                          <TableCell>
                            <div className="space-y-1.5">
                              <Badge variant="outline" className={`text-[10px] ${sourceClasses(invoice)}`}>{sourceLabel(invoice)}</Badge>
                              {invoice.is_system_generated && <p className="text-[10px] text-muted-foreground">{invoice.last_synced_at ? `Synced ${new Date(invoice.last_synced_at).toLocaleDateString()}` : "System generated"}</p>}
                            </div>
                          </TableCell>
                          <TableCell><div className="flex items-center gap-1.5">{getStatusBadge(invoice.status)}{locked && <LockKeyhole className="h-3.5 w-3.5 text-muted-foreground" aria-label="Locked receipt" />}</div></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => void toggleInvoice(invoice)} aria-label={`View ${invoice.invoice_number} items`}>
                                {expandedInvoiceId === invoice.id ? <ChevronUp className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              {!locked && canEdit && <Button size="sm" variant="secondary" className="h-8 px-2.5" onClick={() => onEdit(invoice)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>}
                              {!locked && canDelete && <Button size="sm" variant="destructive" className="h-8 px-2.5" onClick={() => onDelete(invoice)}><Trash className="mr-1 h-3.5 w-3.5" />Delete</Button>}
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedInvoiceId === invoice.id && <TableRow className="bg-muted/10"><TableCell colSpan={6} className="p-0"><div className="space-y-3 p-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receipt contents</p><p className="text-xs text-muted-foreground">Issued by {invoice.issued_by || "System"}{invoice.revision_count ? ` · ${invoice.revision_count} historical revision${invoice.revision_count === 1 ? "" : "s"}` : ""}</p></div>{renderItems(invoice)}</div></TableCell></TableRow>}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="grid gap-3 md:hidden">
              {visibleInvoices.map((invoice) => {
                const locked = Boolean(invoice.is_system_generated || invoice.locked);
                return (
                  <div key={invoice.id} className="rounded-xl border bg-card/60 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold">{invoice.invoice_number}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(invoice.source_date || invoice.date).toLocaleDateString()} · {invoice.total_items} item{invoice.total_items === 1 ? "" : "s"}</p>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] ${sourceClasses(invoice)}`}>{sourceLabel(invoice)}</Badge>
                      {locked && <Badge variant="outline" className="gap-1 text-[10px]"><LockKeyhole className="h-3 w-3" />Locked</Badge>}
                    </div>
                    {invoice.is_system_generated && <p className="mt-2 text-xs text-muted-foreground">{invoice.last_synced_at ? `Last synced ${new Date(invoice.last_synced_at).toLocaleDateString()}` : "Created by the system"}{invoice.revision_count ? ` · ${invoice.revision_count} revision${invoice.revision_count === 1 ? "" : "s"}` : ""}</p>}
                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <span className="text-xs text-muted-foreground">{invoice.warehouse || "Main warehouse"}</span>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => void toggleInvoice(invoice)}>{expandedInvoiceId === invoice.id ? <ChevronUp className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{expandedInvoiceId === invoice.id ? "Hide items" : "View items"}</Button>
                        {!locked && canEdit && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(invoice)} aria-label={`Edit ${invoice.invoice_number}`}><Pencil className="h-4 w-4" /></Button>}
                      </div>
                    </div>
                    {expandedInvoiceId === invoice.id && <div className="mt-3 border-t pt-3">{renderItems(invoice)}</div>}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center sm:p-12">
            <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
            <p className="font-semibold text-sm">No receipts in this view</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">Manual receipts appear here after they are recorded. Google Sheet free-issued records appear after a successful sync.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
