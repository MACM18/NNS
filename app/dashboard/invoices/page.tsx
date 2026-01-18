"use client";

import { useState, useEffect } from "react";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import {
  Plus,
  FileText,
  Settings,
  Download,
  Eye,
  Calendar,
  RefreshCw,
  Columns,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GenerateMonthlyInvoicesModal } from "@/components/modals/generate-monthly-invoices-modal";
import { CompanySettingsModal } from "@/components/modals/company-settings-modal";
import { InvoicePDFModal } from "@/components/modals/invoice-pdf-modal";
import { useAuth } from "@/contexts/auth-context";
import { AuthWrapper } from "@/components/auth/auth-wrapper";
import { useNotification } from "@/contexts/notification-context";
import { useDataCache } from "@/contexts/data-cache-context";
import { min } from "date-fns";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { getErrorMessage } from "@/lib/error-utils";

interface GeneratedInvoice {
  id: string;
  invoice_number: string;
  invoice_type: "A" | "B";
  month: number;
  year: number;
  job_month: string;
  invoice_date: string;
  total_amount: number;
  line_count: number;
  line_details_ids: string[];
  status: string;
  created_at: string;
}

interface InvoiceStats {
  thisMonth: number;
  totalAmount: number;
  linesBilled: number;
  avgRate: number;
}

const COLUMNS = [
  { id: "invoice_number", label: "Invoice Number" },
  { id: "invoice_type", label: "Type" },
  { id: "job_month", label: "Month" },
  { id: "line_count", label: "Lines" },
  { id: "total_amount", label: "Amount" },
  { id: "status", label: "Status" },
  { id: "actions", label: "Actions" },
];

export default function InvoicesPage() {
  const { user, role, loading } = useAuth();
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] =
    useState<GeneratedInvoice | null>(null);
  const { addNotification } = useNotification();
  const { cache, updateCache } = useDataCache();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pricingTiers, setPricingTiers] = useState<
    Array<{
      rate: number;
      max_length: number;
      min_length: number;
    }>
  >([
    {
      rate: 6000,
      max_length: 100,
      min_length: 0,
    },
    {
      rate: 6500,
      max_length: 200,
      min_length: 101,
    },
    {
      rate: 7200,
      max_length: 300,
      min_length: 201,
    },
    {
      rate: 7800,
      max_length: 400,
      min_length: 301,
    },
    {
      rate: 8200,
      max_length: 500,
      min_length: 401,
    },
    {
      rate: 8400,
      max_length: Infinity,
      min_length: 501,
    },
  ]);

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

  const invoices = cache.invoices.data || [];
  const stats = cache.invoices.stats || {
    thisMonth: 0,
    totalAmount: 0,
    linesBilled: 0,
    avgRate: 0,
  };

  const fetchInvoices = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/invoices?types=A,B&limit=50");

      if (!response.ok) {
        throw new Error("Failed to fetch invoices");
      }

      const { data } = await response.json();

      updateCache("invoices", {
        data: data || [],
      });
    } catch (error: unknown) {
      console.error("Error fetching invoices:", error);
      addNotification({
        title: "Error",
        message: getErrorMessage(error, "Failed to fetch invoices"),
        type: "error",
        category: "system",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Get invoice stats
      const statsResponse = await fetch(
        `/api/invoices/stats?month=${currentMonth}&year=${currentYear}`
      );

      if (statsResponse.ok) {
        const { data: stats } = await statsResponse.json();
        updateCache("invoices", { stats });
      }

      // Get pricing tiers from company settings
      const settingsResponse = await fetch("/api/settings/company");

      if (settingsResponse.ok) {
        const { data: settings } = await settingsResponse.json();
        if (settings?.pricing_tiers && Array.isArray(settings.pricing_tiers)) {
          setPricingTiers(settings.pricing_tiers);
        }
      }
    } catch (error: unknown) {
      console.error("Error fetching stats:", error);
    }
  };

  const refreshData = async () => {
    await Promise.all([fetchInvoices(), fetchStats()]);
  };

  useEffect(() => {
    if (user && !cache.invoices.lastUpdated) {
      refreshData();
    }
  }, [user]);

  // Refresh data when page becomes visible again
  usePageVisibility(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  const handleSuccess = () => {
    refreshData(); // Refresh data after generating invoices
  };

  const handlePreviewInvoice = (invoice: GeneratedInvoice) => {
    setSelectedInvoice(invoice);
    setPdfModalOpen(true);
  };

  const handleDownloadInvoice = async (invoice: GeneratedInvoice) => {
    try {
      // This would generate and download the PDF
      addNotification({
        title: "Download Started",
        message: `Downloading ${invoice.invoice_number}`,
        type: "info",
        category: "system",
      });

      // Here you would implement the actual PDF generation and download
      // For now, we'll just show a notification
    } catch (error: unknown) {
      addNotification({
        title: "Error",
        message: getErrorMessage(error, "Failed to download invoice"),
        type: "error",
        category: "system",
      });
    }
  };

  const getInvoiceTypeBadge = (type: string) => {
    // Only display A and B type invoices
    if (type !== "A" && type !== "B") {
      return null;
    }
    return (
      <Badge
        variant={type === "A" ? "default" : "secondary"}
        className='text-xs'
      >
        Type {type}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "generated":
        return (
          <Badge
            variant='outline'
            className='bg-green-50 text-green-700 border-green-200'
          >
            Generated
          </Badge>
        );
      case "sent":
        return (
          <Badge
            variant='outline'
            className='bg-blue-50 text-blue-700 border-blue-200'
          >
            Sent
          </Badge>
        );
      case "paid":
        return (
          <Badge
            variant='outline'
            className='bg-purple-50 text-purple-700 border-purple-200'
          >
            Paid
          </Badge>
        );
      default:
        return <Badge variant='secondary'>{status}</Badge>;
    }
  };

  if (!user) {
    return <AuthWrapper />;
  }

  const normalizedRole = (role || "").toLowerCase();
  const canEditSettings = ["admin", "moderator"].includes(normalizedRole);

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold'>Invoice Management</h1>
          <p className='text-muted-foreground'>
            Generate monthly invoices and manage billing
          </p>
        </div>
        <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
          <Button
            variant='outline'
            size='sm'
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {canEditSettings && (
            <Button
              onClick={() => setSettingsModalOpen(true)}
              variant='outline'
              className='gap-2'
            >
              <Settings className='h-4 w-4' />
              Settings
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' className='gap-2'>
                <Columns className='h-4 w-4' />
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
          <Button onClick={() => setGenerateModalOpen(true)} className='gap-2'>
            <Plus className='h-4 w-4' />
            Generate Invoices
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>This Month</CardTitle>
            <FileText className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.thisMonth}</div>
            <p className='text-xs text-muted-foreground'>Invoices generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Amount</CardTitle>
            <Calendar className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              LKR {Number(stats.totalAmount || 0).toLocaleString()}
            </div>
            <p className='text-xs text-muted-foreground'>
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Lines Billed</CardTitle>
            <FileText className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.linesBilled}</div>
            <p className='text-xs text-muted-foreground'>Total installations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Avg. Rate</CardTitle>
            <Calendar className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              LKR {Number(stats.avgRate || 0).toLocaleString()}
            </div>
            <p className='text-xs text-muted-foreground'>Per installation</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue='invoices' className='space-y-6'>
        <TabsList>
          <TabsTrigger value='invoices'>Generated Invoices</TabsTrigger>
          {canEditSettings && (
            <TabsTrigger value='settings'>Pricing & Settings</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value='invoices'>
          <Card>
            <CardHeader>
              <CardTitle>Generated Invoices</CardTitle>
              <CardDescription>
                Monthly invoices with A/B distribution (90%/10%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isRefreshing ? (
                <TableSkeleton columns={7} rows={6} />
              ) : invoices.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground'>
                  <FileText className='h-12 w-12 mx-auto mb-4 opacity-50' />
                  <p>No invoices generated yet</p>
                  <p className='text-sm'>
                    Click &quot;Generate Invoices&quot; to create monthly
                    invoices
                  </p>
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {visibleColumns.has("invoice_number") && (
                          <TableHead>Invoice Number</TableHead>
                        )}
                        {visibleColumns.has("invoice_type") && (
                          <TableHead>Type</TableHead>
                        )}
                        {visibleColumns.has("job_month") && (
                          <TableHead>Month</TableHead>
                        )}
                        {visibleColumns.has("line_count") && (
                          <TableHead>Lines</TableHead>
                        )}
                        {visibleColumns.has("total_amount") && (
                          <TableHead>Amount</TableHead>
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
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          {visibleColumns.has("invoice_number") && (
                            <TableCell className='font-mono text-sm'>
                              {invoice.invoice_number}
                            </TableCell>
                          )}
                          {visibleColumns.has("invoice_type") && (
                            <TableCell>
                              {getInvoiceTypeBadge(invoice.invoice_type)}
                            </TableCell>
                          )}
                          {visibleColumns.has("job_month") && (
                            <TableCell>{invoice.job_month}</TableCell>
                          )}
                          {visibleColumns.has("line_count") && (
                            <TableCell>{invoice.line_count}</TableCell>
                          )}
                          {visibleColumns.has("total_amount") && (
                            <TableCell>
                              LKR{" "}
                              {Number(invoice.total_amount || 0).toLocaleString()}
                            </TableCell>
                          )}
                          {visibleColumns.has("status") && (
                            <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          )}
                          {visibleColumns.has("actions") && (
                            <TableCell>
                              <div className='flex gap-2'>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  onClick={() => handlePreviewInvoice(invoice)}
                                >
                                  <Eye className='h-4 w-4' />
                                </Button>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  onClick={() => handleDownloadInvoice(invoice)}
                                >
                                  <Download className='h-4 w-4' />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='settings'>
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Company Settings</CardTitle>
              <CardDescription>
                Configure pricing tiers and company information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                  {pricingTiers.map((tier, index) => (
                    <div key={index} className='p-4 border rounded-lg'>
                      <div className='font-medium'>
                        {tier.min_length}-{tier.max_length}m
                      </div>
                      <div className='text-2xl font-bold'>
                        LKR {Number(tier.rate || 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => setSettingsModalOpen(true)}
                  className='gap-2'
                >
                  <Settings className='h-4 w-4' />
                  Edit Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <GenerateMonthlyInvoicesModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        onSuccess={handleSuccess}
      />
      <CompanySettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        onSuccess={handleSuccess}
      />
      <InvoicePDFModal
        open={pdfModalOpen}
        onOpenChange={setPdfModalOpen}
        invoice={selectedInvoice}
      />
    </div>
  );
}
