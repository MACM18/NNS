"use client";

import React from "react";
import { Eye, Pencil, Trash, Package, LockKeyhole } from "lucide-react";
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
  expandedInvoiceId: string | null;
  setExpandedInvoiceId: (id: string | null) => void;
  fetchInvoiceItems: (id: string) => Promise<void>;
  invoiceItems: Record<string, InventoryInvoiceItem[]>;
  role: string | null;
  onEdit: (invoice: InventoryInvoice) => void;
  onDelete: (invoice: InventoryInvoice) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

export function InvoicesTab({
  invoices,
  loadingData,
  expandedInvoiceId,
  setExpandedInvoiceId,
  fetchInvoiceItems,
  invoiceItems,
  role,
  onEdit,
  onDelete,
  getStatusBadge,
}: InvoicesTabProps) {
  const [view, setView] = React.useState("all");
  const visibleInvoices = invoices.filter((invoice) => {
    if (view === "manual") return !invoice.is_system_generated;
    if (view === "google") return invoice.is_system_generated && invoice.source_type !== "google_material_balance_adjustment";
    if (view === "history") return invoice.is_system_generated && invoice.source_type === "google_material_balance_adjustment";
    return true;
  });

  return (
    <Card className="glass-card border-border/40 overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base font-bold">Inventory Invoices</CardTitle>
            <CardDescription>Material receipts, free-issued stock, and sync history</CardDescription>
          </div>
          <Select value={view} onValueChange={setView}>
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue placeholder="Invoice view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All invoices</SelectItem>
              <SelectItem value="manual">Manual invoices</SelectItem>
              <SelectItem value="google">Current Google Sheet</SelectItem>
              <SelectItem value="history">Historical revisions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loadingData ? (
          <TableSkeleton columns={7} rows={6} />
        ) : visibleInvoices.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">
                        Invoice Number
                      </TableHead>
                      <TableHead className="min-w-[100px]">
                        Warehouse
                      </TableHead>
                      <TableHead className="min-w-[100px]">
                        Date
                      </TableHead>
                      <TableHead className="min-w-[60px]">
                        Items
                      </TableHead>
                      <TableHead className="min-w-[100px]">
                        Issued By
                      </TableHead>
                      <TableHead className="min-w-[80px]">
                        Status
                      </TableHead>
                      <TableHead className="min-w-[120px] text-center">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleInvoices.map((invoice) => (
                      <React.Fragment key={invoice.id}>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono text-sm font-semibold">
                            <div className="flex flex-col items-start gap-1">
                              <span>{invoice.invoice_number}</span>
                              {invoice.is_system_generated && (
                                <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-600 bg-blue-500/5">
                                  {invoice.source_type === "google_material_balance_adjustment"
                                    ? "Historical revision / Google Sheet"
                                    : "Free-issued / Google Sheet"}
                                </Badge>
                              )}
                              {invoice.is_system_generated && (
                                <span className="text-[10px] text-muted-foreground">
                                  {invoice.source_date || invoice.date}
                                  {invoice.last_synced_at ? ` · synced ${new Date(invoice.last_synced_at).toLocaleDateString()}` : ""}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{invoice.warehouse}</TableCell>
                          <TableCell>
                            {new Date(invoice.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{invoice.total_items}</TableCell>
                          <TableCell>{invoice.issued_by}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {getStatusBadge(invoice.status)}
                              {invoice.is_system_generated && <LockKeyhole className="h-3.5 w-3.5 text-muted-foreground" aria-label="Locked system invoice" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-center align-middle">
                            <div className="flex gap-1 justify-center items-center min-h-[32px]">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={async () => {
                                  if (expandedInvoiceId === invoice.id) {
                                    setExpandedInvoiceId(null);
                                  } else {
                                    setExpandedInvoiceId(invoice.id);
                                    await fetchInvoiceItems(invoice.id);
                                  }
                                }}
                                title="View Items"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {!invoice.is_system_generated && (role === "admin" || role === "moderator" || role === "superadmin") && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 px-2.5"
                                  onClick={() => onEdit(invoice)}
                                >
                                  Edit
                                </Button>
                              )}
                              {!invoice.is_system_generated && (role === "admin" || role === "superadmin") && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 px-2.5"
                                  onClick={() => onDelete(invoice)}
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedInvoiceId === invoice.id && (
                          <TableRow className="bg-muted/10">
                            <TableCell
                              colSpan={7}
                              className="p-0 border-t border-border/20"
                            >
                              <div className="p-5 sm:p-6 bg-muted/20">
                                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">
                                  Invoice Items Details
                                </h4>
                                {invoiceItems[invoice.id] &&
                                invoiceItems[invoice.id].length > 0 ? (
                                  <div className="border border-border/30 rounded-lg overflow-hidden bg-background/50">
                                    <Table>
                                      <TableHeader className="bg-muted/40">
                                        <TableRow>
                                          <TableHead className="text-[11px] font-bold">Description</TableHead>
                                          <TableHead className="text-[11px] font-bold">Qty Requested</TableHead>
                                          <TableHead className="text-[11px] font-bold">Qty Issued</TableHead>
                                          <TableHead className="text-[11px] font-bold">Unit</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {invoiceItems[invoice.id].map(
                                          (item) => (
                                            <TableRow key={item.id} className="hover:bg-muted/20">
                                              <TableCell className="text-xs font-medium">
                                                {item.description}
                                              </TableCell>
                                              <TableCell className="text-xs tabular-nums">
                                                {item.quantity_requested}
                                              </TableCell>
                                              <TableCell className="text-xs tabular-nums font-bold">
                                                {item.quantity_issued}
                                              </TableCell>
                                              <TableCell className="text-xs text-muted-foreground">
                                                {item.unit}
                                              </TableCell>
                                            </TableRow>
                                          )
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground py-2 italic">
                                    No items found for this invoice.
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-40 animate-pulse-glow" />
            <p className="font-semibold text-sm">No invoices found</p>
            <p className="text-xs mt-1">
              Create your first invoice to populate inventory
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
