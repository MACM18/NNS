"use client";

import { useEffect, useState } from "react";
import { Search, CreditCard, FileText, Check, X, Clock, Columns } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNotification } from "@/contexts/notification-context";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { PaymentModal } from "@/components/accounting";

interface Invoice {
  id: string;
  invoice_number?: string;
  invoiceNumber?: string;
  total_amount?: number;
  totalAmount?: number;
  paid_amount?: number;
  paidAmount?: number;
  payment_status?: string;
  paymentStatus?: string;
  created_at?: string;
  createdAt?: string;
  customer_name?: string;
  customerName?: string;
  vendor_name?: string;
  vendorName?: string;
  type: "generated" | "inventory";
}

const COLUMNS = [
  { id: "invoice_number", label: "Invoice #" },
  { id: "type", label: "Type" },
  { id: "name", label: "Customer/Vendor" },
  { id: "date", label: "Date" },
  { id: "total", label: "Total" },
  { id: "paid", label: "Paid" },
  { id: "remaining", label: "Remaining" },
  { id: "status", label: "Status" },
  { id: "actions", label: "Actions" },
];

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("unpaid");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(COLUMNS.map((c) => c.id))
  );

  const toggleColumn = (id: string) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisibleColumns(newVisible);
  };

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { addNotification } = useNotification();

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      // Fetch both generated and inventory invoices
      const [generatedRes, inventoryRes] = await Promise.all([
        fetch("/api/invoices?limit=100"),
        fetch("/api/inventory-invoices?limit=100"),
      ]);

      const generated = generatedRes.ok
        ? await generatedRes.json()
        : { data: [] };
      const inventory = inventoryRes.ok
        ? await inventoryRes.json()
        : { data: [] };

      // Combine and normalize invoices
      const allInvoices: Invoice[] = [
        ...(generated.data || []).map((inv: Invoice) => ({
          ...inv,
          type: "generated" as const,
        })),
        ...(inventory.data || []).map((inv: Invoice) => ({
          ...inv,
          type: "inventory" as const,
        })),
      ];

      setInvoices(allInvoices);
    } catch (error) {
      addNotification({
        title: "Error",
        message: "Failed to load invoices",
        type: "error",
        category: "accounting",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const getInvoiceNumber = (inv: Invoice) =>
    inv.invoice_number || inv.invoiceNumber || "N/A";

  const getTotalAmount = (inv: Invoice) =>
    inv.total_amount || inv.totalAmount || 0;

  const getPaidAmount = (inv: Invoice) =>
    inv.paid_amount || inv.paidAmount || 0;

  const getPaymentStatus = (inv: Invoice) =>
    inv.payment_status || inv.paymentStatus || "unpaid";

  const getCreatedAt = (inv: Invoice) =>
    inv.created_at || inv.createdAt || new Date().toISOString();

  const getName = (inv: Invoice) =>
    inv.customer_name ||
    inv.customerName ||
    inv.vendor_name ||
    inv.vendorName ||
    "N/A";

  const getRemainingAmount = (inv: Invoice) =>
    getTotalAmount(inv) - getPaidAmount(inv);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className='bg-green-500'>
            <Check className='h-3 w-3 mr-1' />
            Paid
          </Badge>
        );
      case "partial":
        return (
          <Badge className='bg-yellow-500'>
            <Clock className='h-3 w-3 mr-1' />
            Partial
          </Badge>
        );
      case "unpaid":
      default:
        return (
          <Badge variant='destructive'>
            <X className='h-3 w-3 mr-1' />
            Unpaid
          </Badge>
        );
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      getInvoiceNumber(inv).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getName(inv).toLowerCase().includes(searchTerm.toLowerCase());

    const status = getPaymentStatus(inv);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "unpaid" &&
        (status === "unpaid" || status === "partial")) ||
      status === statusFilter;

    const matchesType = typeFilter === "all" || inv.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate totals
  const totalUnpaid = filteredInvoices
    .filter((inv) => getPaymentStatus(inv) !== "paid")
    .reduce((sum, inv) => sum + getRemainingAmount(inv), 0);

  const totalPaid = filteredInvoices.reduce(
    (sum, inv) => sum + getPaidAmount(inv),
    0
  );

  const handleRecordPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentModalOpen(true);
  };

  if (loading) {
    return (
      <div className='flex-1 space-y-4 p-4 md:p-8 pt-6'>
        <h2 className='text-3xl font-bold tracking-tight'>Payments</h2>
        <TableSkeleton rows={10} columns={7} />
      </div>
    );
  }

  return (
    <div className='flex-1 space-y-4 p-4 md:p-8 pt-6'>
      <div className='flex items-center justify-between space-y-2'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>Payments</h2>
          <p className='text-muted-foreground'>
            Record and manage invoice payments
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Unpaid</CardTitle>
            <CreditCard className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-red-600'>
              {formatCurrency(totalUnpaid)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Paid</CardTitle>
            <Check className='h-4 w-4 text-green-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {formatCurrency(totalPaid)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Pending Invoices
            </CardTitle>
            <FileText className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {
                filteredInvoices.filter(
                  (inv) => getPaymentStatus(inv) !== "paid"
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className='p-4'>
          <div className='flex flex-col sm:flex-row gap-4'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4' />
              <Input
                placeholder='Search invoices...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='w-[150px]'>
                <SelectValue placeholder='Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Status</SelectItem>
                <SelectItem value='unpaid'>Unpaid</SelectItem>
                <SelectItem value='partial'>Partial</SelectItem>
                <SelectItem value='paid'>Paid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className='w-[150px]'>
                <SelectValue placeholder='Type' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Types</SelectItem>
                <SelectItem value='generated'>Sales Invoices</SelectItem>
                <SelectItem value='inventory'>Purchase Invoices</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' className='w-full sm:w-auto'>
                  <Columns className='mr-2 h-4 w-4' />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                {COLUMNS.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className='capitalize'
                    checked={visibleColumns.has(column.id)}
                    onCheckedChange={() => toggleColumn(column.id)}
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.has("invoice_number") && (
                    <TableHead>Invoice #</TableHead>
                  )}
                  {visibleColumns.has("type") && <TableHead>Type</TableHead>}
                  {visibleColumns.has("name") && (
                    <TableHead>Customer/Vendor</TableHead>
                  )}
                  {visibleColumns.has("date") && <TableHead>Date</TableHead>}
                  {visibleColumns.has("total") && (
                    <TableHead className='text-right'>Total</TableHead>
                  )}
                  {visibleColumns.has("paid") && (
                    <TableHead className='text-right'>Paid</TableHead>
                  )}
                  {visibleColumns.has("remaining") && (
                    <TableHead className='text-right'>Remaining</TableHead>
                  )}
                  {visibleColumns.has("status") && (
                    <TableHead>Status</TableHead>
                  )}
                  {visibleColumns.has("actions") && (
                    <TableHead>Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.size}
                      className='text-center text-muted-foreground py-8'
                    >
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={`${invoice.type}-${invoice.id}`}>
                      {visibleColumns.has("invoice_number") && (
                        <TableCell className='font-mono'>
                          {getInvoiceNumber(invoice)}
                        </TableCell>
                      )}
                      {visibleColumns.has("type") && (
                        <TableCell>
                          <Badge variant='outline'>
                            {invoice.type === "generated"
                              ? "Sales"
                              : "Purchase"}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.has("name") && (
                        <TableCell>{getName(invoice)}</TableCell>
                      )}
                      {visibleColumns.has("date") && (
                        <TableCell>
                          {format(
                            new Date(getCreatedAt(invoice)),
                            "MMM d, yyyy"
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("total") && (
                        <TableCell className='text-right font-mono'>
                          {formatCurrency(getTotalAmount(invoice))}
                        </TableCell>
                      )}
                      {visibleColumns.has("paid") && (
                        <TableCell className='text-right font-mono text-green-600'>
                          {formatCurrency(getPaidAmount(invoice))}
                        </TableCell>
                      )}
                      {visibleColumns.has("remaining") && (
                        <TableCell className='text-right font-mono'>
                          {getRemainingAmount(invoice) > 0 ? (
                            <span className='text-red-600'>
                              {formatCurrency(getRemainingAmount(invoice))}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.has("status") && (
                        <TableCell>
                          {getStatusBadge(getPaymentStatus(invoice))}
                        </TableCell>
                      )}
                      {visibleColumns.has("actions") && (
                        <TableCell>
                          {getPaymentStatus(invoice) !== "paid" && (
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleRecordPayment(invoice)}
                            >
                              <CreditCard className='h-4 w-4 mr-1' />
                              Pay
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {selectedInvoice && (
        <PaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          invoiceId={selectedInvoice.id}
          invoiceType={selectedInvoice.type}
          invoiceNumber={getInvoiceNumber(selectedInvoice)}
          invoiceAmount={getTotalAmount(selectedInvoice)}
          remainingAmount={getRemainingAmount(selectedInvoice)}
          onSuccess={() => {
            fetchInvoices();
            setSelectedInvoice(null);
          }}
        />
      )}
    </div>
  );
}
