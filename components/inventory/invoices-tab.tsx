"use client";

import React from "react";
import { Eye, Pencil, Trash, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
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
  return (
    <Card className="glass-card border-border/40 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base font-bold">Recent Invoices</CardTitle>
        <CardDescription>
          Material receipts and stock updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loadingData ? (
          <TableSkeleton columns={7} rows={6} />
        ) : invoices.length > 0 ? (
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
                    {invoices.map((invoice) => (
                      <React.Fragment key={invoice.id}>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono text-sm font-semibold">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell>{invoice.warehouse}</TableCell>
                          <TableCell>
                            {new Date(invoice.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{invoice.total_items}</TableCell>
                          <TableCell>{invoice.issued_by}</TableCell>
                          <TableCell>
                            {getStatusBadge(invoice.status)}
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
                              {(role === "admin" || role === "moderator") && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 px-2.5"
                                  onClick={() => onEdit(invoice)}
                                >
                                  Edit
                                </Button>
                              )}
                              {role === "admin" && (
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
