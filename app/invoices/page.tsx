"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  FileText,
  Settings,
  Download,
  Eye,
  Calendar,
  RefreshCw,
} from "lucide-react";
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
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { GenerateMonthlyInvoicesModal } from "@/components/modals/generate-monthly-invoices-modal";
import { CompanySettingsModal } from "@/components/modals/company-settings-modal";
import { InvoicePDFModal } from "@/components/modals/invoice-pdf-modal";
import { useAuth } from "@/contexts/auth-context";
import { AuthWrapper } from "@/components/auth/auth-wrapper";
import { getSupabaseClient } from "@/lib/supabase";
import { useNotification } from "@/contexts/notification-context";
import { useDataCache } from "@/contexts/data-cache-context";

interface GeneratedInvoice {
  id: string;
  invoice_number: string;
  invoice_type: "A" | "B" | "C";
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

export default function InvoicesPage() {
  const { user, loading } = useAuth();
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] =
    useState<GeneratedInvoice | null>(null);
  const supabase = getSupabaseClient();
  const { addNotification } = useNotification();
  const { cache, updateCache } = useDataCache();
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      const { data, error } = await supabase
        .from("generated_invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      updateCache("invoices", {
        data: data || [],
      });
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      addNotification({
        title: "Error",
        message: "Failed to fetch invoices",
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

      // Get this month's invoices
      const { data: monthlyInvoices, error: monthlyError } = await supabase
        .from("generated_invoices")
        .select("*")
        .eq("month", currentMonth)
        .eq("year", currentYear);

      if (monthlyError) throw monthlyError;

      // Calculate stats
      const thisMonth = monthlyInvoices?.length || 0;
      const totalAmount =
        monthlyInvoices?.reduce(
          (sum, inv) => sum + (inv.total_amount || 0),
          0
        ) || 0;
      const linesBilled =
        monthlyInvoices?.reduce((sum, inv) => sum + (inv.line_count || 0), 0) ||
        0;
      const avgRate =
        linesBilled > 0 ? Math.round(totalAmount / linesBilled) : 0;

      updateCache("invoices", {
        stats: {
          thisMonth,
          totalAmount,
          linesBilled,
          avgRate,
        },
      });
    } catch (error: any) {
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
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: "Failed to download invoice",
        type: "error",
        category: "system",
      });
    }
  };

  const getInvoiceTypeBadge = (type: string) => {
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

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
      </div>
    );
  }

  if (!user) {
    return <AuthWrapper />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header onAddLineDetails={() => {}} />

        <main className='flex-1 space-y-6 p-6'>
          {/* Page Header */}
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
            <div>
              <h1 className='text-3xl font-bold'>Invoice Management</h1>
              <p className='text-muted-foreground'>
                Generate monthly invoices and manage billing
              </p>
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={refreshData}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </Button>
              <Button
                onClick={() => setSettingsModalOpen(true)}
                variant='outline'
                className='gap-2'
              >
                <Settings className='h-4 w-4' />
                Settings
              </Button>
              <Button
                onClick={() => setGenerateModalOpen(true)}
                className='gap-2'
              >
                <Plus className='h-4 w-4' />
                Generate Invoices
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  This Month
                </CardTitle>
                <FileText className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{stats.thisMonth}</div>
                <p className='text-xs text-muted-foreground'>
                  Invoices generated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Total Amount
                </CardTitle>
                <Calendar className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  LKR {stats.totalAmount.toLocaleString()}
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
                <CardTitle className='text-sm font-medium'>
                  Lines Billed
                </CardTitle>
                <FileText className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{stats.linesBilled}</div>
                <p className='text-xs text-muted-foreground'>
                  Total installations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Avg. Rate</CardTitle>
                <Calendar className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  LKR {stats.avgRate.toLocaleString()}
                </div>
                <p className='text-xs text-muted-foreground'>
                  Per installation
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue='invoices' className='space-y-6'>
            <TabsList>
              <TabsTrigger value='invoices'>Generated Invoices</TabsTrigger>
              <TabsTrigger value='settings'>Pricing & Settings</TabsTrigger>
            </TabsList>

            <TabsContent value='invoices'>
              <Card>
                <CardHeader>
                  <CardTitle>Generated Invoices</CardTitle>
                  <CardDescription>
                    Monthly invoices with A/B/C distribution (90%/5%/5%)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isRefreshing ? (
                    <div className='text-center py-8'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto'></div>
                      <p className='mt-2 text-sm text-muted-foreground'>
                        Loading invoices...
                      </p>
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className='text-center py-8 text-muted-foreground'>
                      <FileText className='h-12 w-12 mx-auto mb-4 opacity-50' />
                      <p>No invoices generated yet</p>
                      <p className='text-sm'>
                        Click "Generate Invoices" to create monthly invoices
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice Number</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Month</TableHead>
                          <TableHead>Lines</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className='font-mono text-sm'>
                              {invoice.invoice_number}
                            </TableCell>
                            <TableCell>
                              {getInvoiceTypeBadge(invoice.invoice_type)}
                            </TableCell>
                            <TableCell>{invoice.job_month}</TableCell>
                            <TableCell>{invoice.line_count}</TableCell>
                            <TableCell>
                              LKR {invoice.total_amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(invoice.status)}
                            </TableCell>
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
                      <div className='p-4 border rounded-lg'>
                        <div className='font-medium'>0-100m</div>
                        <div className='text-2xl font-bold'>LKR 6,000</div>
                      </div>
                      <div className='p-4 border rounded-lg'>
                        <div className='font-medium'>101-200m</div>
                        <div className='text-2xl font-bold'>LKR 6,500</div>
                      </div>
                      <div className='p-4 border rounded-lg'>
                        <div className='font-medium'>201-300m</div>
                        <div className='text-2xl font-bold'>LKR 7,200</div>
                      </div>
                      <div className='p-4 border rounded-lg'>
                        <div className='font-medium'>301-400m</div>
                        <div className='text-2xl font-bold'>LKR 7,800</div>
                      </div>
                      <div className='p-4 border rounded-lg'>
                        <div className='font-medium'>401-500m</div>
                        <div className='text-2xl font-bold'>LKR 8,200</div>
                      </div>
                      <div className='p-4 border rounded-lg'>
                        <div className='font-medium'>500m+</div>
                        <div className='text-2xl font-bold'>LKR 8,400</div>
                      </div>
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
        </main>

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
      </SidebarInset>
    </SidebarProvider>
  );
}
