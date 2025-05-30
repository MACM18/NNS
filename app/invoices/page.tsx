"use client"

import { useState } from "react"
import { Plus, FileText, Settings, Download, Eye, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { GenerateMonthlyInvoicesModal } from "@/components/modals/generate-monthly-invoices-modal"
import { CompanySettingsModal } from "@/components/modals/company-settings-modal"
import { useAuth } from "@/contexts/auth-context"
import { AuthWrapper } from "@/components/auth/auth-wrapper"

export default function InvoicesPage() {
  const { user, loading } = useAuth()
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Mock data for demonstration
  const recentInvoices = [
    {
      id: "1",
      invoice_number: "S/Southern/HR/NC/25/January/A",
      invoice_type: "A",
      month: "January 2025",
      total_amount: 450000,
      line_count: 45,
      status: "generated",
      created_at: "2025-02-02",
    },
    {
      id: "2",
      invoice_number: "S/Southern/HR/NC/25/January/B",
      invoice_type: "B",
      month: "January 2025",
      total_amount: 25000,
      line_count: 3,
      status: "generated",
      created_at: "2025-02-02",
    },
    {
      id: "3",
      invoice_number: "S/Southern/HR/NC/25/January/C",
      invoice_type: "C",
      month: "January 2025",
      total_amount: 25000,
      line_count: 2,
      status: "generated",
      created_at: "2025-02-02",
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <AuthWrapper />
  }

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const getInvoiceTypeBadge = (type: string) => {
    return (
      <Badge variant={type === "A" ? "default" : "secondary"} className="text-xs">
        Type {type}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "generated":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Generated
          </Badge>
        )
      case "sent":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Sent
          </Badge>
        )
      case "paid":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Paid
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header onAddLineDetails={() => {}} />

        <main className="flex-1 space-y-6 p-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Invoice Management</h1>
              <p className="text-muted-foreground">Generate monthly invoices and manage billing</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setSettingsModalOpen(true)} variant="outline" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button onClick={() => setGenerateModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Generate Invoices
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">Invoices generated</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">PKR 500K</div>
                <p className="text-xs text-muted-foreground">January 2025</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lines Billed</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">50</div>
                <p className="text-xs text-muted-foreground">Total installations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Rate</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">PKR 10K</div>
                <p className="text-xs text-muted-foreground">Per installation</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="invoices" className="space-y-6">
            <TabsList>
              <TabsTrigger value="invoices">Generated Invoices</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="settings">Pricing & Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>Monthly invoices with A/B/C distribution (90%/5%/5%)</CardDescription>
                </CardHeader>
                <CardContent>
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
                      {recentInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                          <TableCell>{getInvoiceTypeBadge(invoice.invoice_type)}</TableCell>
                          <TableCell>{invoice.month}</TableCell>
                          <TableCell>{invoice.line_count}</TableCell>
                          <TableCell>PKR {invoice.total_amount.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Templates</CardTitle>
                  <CardDescription>Customize invoice layout and branding</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Invoice template customization will be implemented here</p>
                    <p className="text-sm">Features: Logo upload, custom headers, footer text</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing & Company Settings</CardTitle>
                  <CardDescription>Configure pricing tiers and company information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="font-medium">0-100m</div>
                        <div className="text-2xl font-bold">PKR 6,000</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="font-medium">101-200m</div>
                        <div className="text-2xl font-bold">PKR 6,500</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="font-medium">201-300m</div>
                        <div className="text-2xl font-bold">PKR 7,200</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="font-medium">301-400m</div>
                        <div className="text-2xl font-bold">PKR 7,800</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="font-medium">401-500m</div>
                        <div className="text-2xl font-bold">PKR 8,200</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="font-medium">500m+</div>
                        <div className="text-2xl font-bold">PKR 8,400</div>
                      </div>
                    </div>
                    <Button onClick={() => setSettingsModalOpen(true)} className="gap-2">
                      <Settings className="h-4 w-4" />
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
        <CompanySettingsModal open={settingsModalOpen} onOpenChange={setSettingsModalOpen} onSuccess={handleSuccess} />
      </SidebarInset>
    </SidebarProvider>
  )
}
