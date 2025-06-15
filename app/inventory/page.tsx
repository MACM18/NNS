"use client"

import { useState } from "react"
import { Plus, Package, TrendingDown, AlertTriangle, BarChart3 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { AddInventoryInvoiceModal } from "@/components/modals/add-inventory-invoice-modal"
import { AddWasteModal } from "@/components/modals/add-waste-modal"
import { useAuth } from "@/contexts/auth-context"
import { AuthWrapper } from "@/components/auth/auth-wrapper"

export default function InventoryPage() {
  const { user, loading } = useAuth()
  const [addInvoiceModalOpen, setAddInvoiceModalOpen] = useState(false)
  const [addWasteModalOpen, setAddWasteModalOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />

        <main className="flex-1 space-y-6 p-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Inventory Management</h1>
              <p className="text-muted-foreground">Manage stock receipts, drum tracking, and waste reporting</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setAddWasteModalOpen(true)} variant="outline" className="gap-2">
                <TrendingDown className="h-4 w-4" />
                Record Waste
              </Button>
              <Button onClick={() => setAddInvoiceModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Invoice
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">156</div>
                <p className="text-xs text-muted-foreground">Active inventory items</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">12</div>
                <p className="text-xs text-muted-foreground">Items below reorder level</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Drums</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">28</div>
                <p className="text-xs text-muted-foreground">Cable drums in use</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Waste</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.3%</div>
                <p className="text-xs text-muted-foreground">Of total inventory</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="invoices" className="space-y-6">
            <TabsList>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="stock">Stock Levels</TabsTrigger>
              <TabsTrigger value="drums">Drum Tracking</TabsTrigger>
              <TabsTrigger value="waste">Waste Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>Material receipts and stock updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Invoice management table will be implemented here</p>
                    <p className="text-sm">Features: OCR processing, auto-numbering, stock updates</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stock">
              <Card>
                <CardHeader>
                  <CardTitle>Current Stock Levels</CardTitle>
                  <CardDescription>Real-time inventory status with reorder alerts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Stock levels table will be implemented here</p>
                    <p className="text-sm">Features: Low stock alerts, reorder suggestions, usage trends</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="drums">
              <Card>
                <CardHeader>
                  <CardTitle>Drum Tracking</CardTitle>
                  <CardDescription>Cable drum usage and remaining quantities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Drum tracking table will be implemented here</p>
                    <p className="text-sm">Features: 2000m drum tracking, daily usage, line assignments</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="waste">
              <Card>
                <CardHeader>
                  <CardTitle>Waste Reports</CardTitle>
                  <CardDescription>Monthly waste tracking and analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Waste tracking table will be implemented here</p>
                    <p className="text-sm">Features: Monthly reports, waste reasons, cost analysis</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        {/* Modals */}
        <AddInventoryInvoiceModal
          open={addInvoiceModalOpen}
          onOpenChange={setAddInvoiceModalOpen}
          onSuccess={handleSuccess}
        />
        <AddWasteModal open={addWasteModalOpen} onOpenChange={setAddWasteModalOpen} onSuccess={handleSuccess} />
      </SidebarInset>
    </SidebarProvider>
  )
}
