"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Package,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Import modals
import { AddInventoryInvoiceModal } from "@/components/modals/add-inventory-invoice-modal";
import { AddWasteModal } from "@/components/modals/add-waste-modal";
import { ManageInventoryItemsModal } from "@/components/modals/manage-inventory-items-modal";
import { EditInventoryInvoiceModal } from "@/components/modals/edit-inventory-invoice-modal";
import { EditInventoryItemModal } from "@/components/modals/edit-inventory-item-modal";
import { EditDrumModal } from "@/components/modals/edit-drum-modal";
import { AddDrumModal } from "@/components/modals/add-drum-modal";

// Context & auth
import { useAuth } from "@/contexts/auth-context";
import { AuthWrapper } from "@/components/auth/auth-wrapper";
import { useNotification } from "@/contexts/notification-context";

// Extracted UI Components
import { StatCard } from "@/components/inventory/stat-card";
import { CriticalAlerts } from "@/components/inventory/critical-alerts";
import { InvoicesTab } from "@/components/inventory/invoices-tab";
import { StockTab } from "@/components/inventory/stock-tab";
import { DrumsTab } from "@/components/inventory/drums-tab";
import { WasteTab } from "@/components/inventory/waste-tab";

interface InventoryStats {
  totalItems: number;
  lowStockAlerts: number;
  activeDrums: number;
  monthlyWastePercentage: number;
}

export interface InventoryInvoice {
  id: string;
  invoice_number: string;
  warehouse: string;
  date: string;
  issued_by: string;
  drawn_by: string;
  total_items: number;
  status: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  reorder_level: number;
  last_updated: string;
}

export interface DrumTracking {
  id: string;
  drum_number: string;
  item_id: string;
  cable_type?: string;
  initial_quantity: number;
  current_quantity: number;
  received_date: string;
  status: string;
  item_name?: string;
  calculated_current_quantity?: number;
  calculated_status?: string;
  total_used?: number;
  total_wastage?: number;
  remaining_cable?: number;
  usage_count?: number;
  last_usage_date?: string;
  usages?: any[];
}

export interface WasteReport {
  id: string;
  item_id: string;
  quantity: number;
  waste_reason: string;
  waste_date: string;
  full_name: string;
  created_at: string;
  item_name?: string;
}

export interface InventoryInvoiceItem {
  id: string;
  invoice_id: string;
  item_id: string;
  description: string;
  unit: string;
  quantity_requested: number;
  quantity_issued: number;
}

export default function InventoryPage() {
  const { user, loading, role } = useAuth();
  const [activeTab, setActiveTab] = useState("invoices");
  
  // Modals state
  const [addInvoiceModalOpen, setAddInvoiceModalOpen] = useState(false);
  const [addWasteModalOpen, setAddWasteModalOpen] = useState(false);
  const [manageItemsModalOpen, setManageItemsModalOpen] = useState(false);
  const [addDrumModalOpen, setAddDrumModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Data state
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    lowStockAlerts: 0,
    activeDrums: 0,
    monthlyWastePercentage: 0,
  });
  const [invoices, setInvoices] = useState<InventoryInvoice[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [drums, setDrums] = useState<DrumTracking[]>([]);
  const [wasteReports, setWasteReports] = useState<WasteReport[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Invoice items cache and expansion state
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<Record<string, InventoryInvoiceItem[]>>({});
  
  // Editing state
  const [editInvoiceModalOpen, setEditInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InventoryInvoice | null>(null);
  const [editDrumModalOpen, setEditDrumModalOpen] = useState(false);
  const [selectedDrum, setSelectedDrum] = useState<DrumTracking | null>(null);
  const [editItemModalOpen, setEditItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Delete confirm state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<InventoryInvoice | null>(null);
  const [deleteDrumConfirmOpen, setDeleteDrumConfirmOpen] = useState(false);
  const [drumToDelete, setDrumToDelete] = useState<DrumTracking | null>(null);
  const [deleteWasteConfirmOpen, setDeleteWasteConfirmOpen] = useState(false);
  const [wasteToDelete, setWasteToDelete] = useState<WasteReport | null>(null);

  // Search/Filters state
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [searchDrumQuery, setSearchDrumQuery] = useState("");
  const [drumStatusFilter, setDrumStatusFilter] = useState("all");

  const { addNotification } = useNotification();

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, refreshTrigger]);

  const fetchAllData = async () => {
    setLoadingData(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchInvoices(),
        fetchInventoryItems(),
        fetchDrums(),
        fetchWasteReports(),
      ]);
    } catch (error) {
      console.error("Error fetching inventory data:", error);
      addNotification({
        title: "Error",
        message: "Failed to fetch inventory data",
        type: "error",
        category: "system",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/inventory/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      const result = await response.json();
      setStats(result.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch("/api/inventory/invoices?limit=10");
      if (!response.ok) throw new Error("Failed to fetch invoices");
      const result = await response.json();
      setInvoices(result.data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const response = await fetch("/api/inventory?all=true");
      if (!response.ok) throw new Error("Failed to fetch inventory items");
      const result = await response.json();
      setInventoryItems(
        (result.data || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          unit: d.unit,
          current_stock: d.current_stock,
          reorder_level: d.reorder_level,
          last_updated: d.updated_at,
        }))
      );
    } catch (error) {
      console.error("Error fetching inventory items:", error);
    }
  };

  const fetchDrums = async () => {
    try {
      const response = await fetch("/api/drums?all=true");
      if (!response.ok) throw new Error("Failed to fetch drums");
      const result = await response.json();
      setDrums((result.data || []) as DrumTracking[]);
    } catch (error) {
      console.error("Error fetching drums:", error);
    }
  };

  const fetchWasteReports = async () => {
    try {
      const response = await fetch("/api/inventory/waste?limit=20");
      if (!response.ok) throw new Error("Failed to fetch waste reports");
      const result = await response.json();
      setWasteReports(result.data || []);
    } catch (error) {
      console.error("Error fetching waste reports:", error);
    }
  };

  const fetchInvoiceItems = async (invoiceId: string) => {
    if (invoiceItems[invoiceId]) return;
    try {
      const response = await fetch(
        `/api/inventory/invoices/${invoiceId}/items`
      );
      if (!response.ok) throw new Error("Failed to fetch invoice items");
      const result = await response.json();
      setInvoiceItems((prev) => ({
        ...prev,
        [invoiceId]: result.data || [],
      }));
    } catch (error) {
      addNotification({
        title: "Error",
        message: "Failed to fetch invoice items",
        type: "error",
        category: "system",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/15 border-green-500/20">
            Completed
          </Badge>
        );
      case "pending":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/15 border-amber-500/20">Pending</Badge>;
      case "active":
        return (
          <Badge variant="default" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/15 border-blue-500/20">
            Active
          </Badge>
        );
      case "empty":
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
            Empty
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
            Inactive
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStockStatus = (currentStock: number, reorderLevel: number) => {
    const ratio = reorderLevel > 0 ? (currentStock / reorderLevel) * 100 : 150;
    if (currentStock <= 0) {
      return <Badge variant="destructive" className="bg-red-500 text-white font-semibold">Out of Stock</Badge>;
    } else if (ratio <= 100) {
      return (
        <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/15 border-red-500/20 font-semibold animate-pulse-glow">
          Critical
        </Badge>
      );
    } else if (ratio < 150) {
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 dark:bg-yellow-950/20 dark:text-yellow-400 font-semibold">
          Low Stock
        </Badge>
      );
    } else {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/15 dark:bg-green-950/20 dark:text-green-400 font-semibold">
          Normal
        </Badge>
      );
    }
  };

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const updateDrumStatus = async (
    drumId: string,
    newStatus: string,
    drumNumber: string
  ) => {
    try {
      const response = await fetch(`/api/drums/${drumId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error("Failed to update drum status");

      addNotification({
        title: "Status Updated",
        message: `Drum ${drumNumber} status changed to ${newStatus}`,
        type: "success",
        category: "system",
      });

      handleSuccess();
    } catch (error) {
      addNotification({
        title: "Error",
        message: "Failed to update drum status",
        type: "error",
        category: "system",
      });
    }
  };

  const handleFilterLowStock = () => {
    setActiveTab("stock");
    setStockStatusFilter("low");
    setStockSearchQuery("");
  };

  if (!user) {
    return <AuthWrapper />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground">
            Inventory Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage stock receipts, drum tracking, and waste reporting
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={fetchAllData}
            variant="outline"
            size="sm"
            disabled={loadingData}
            className="h-9"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingData ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setAddWasteModalOpen(true)}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 border-border/60 hover:bg-muted/50"
          >
            <TrendingDown className="h-4 w-4" />
            <span>Record Waste</span>
          </Button>
          <Button
            onClick={() => setAddInvoiceModalOpen(true)}
            size="sm"
            className="h-9 gap-1.5 glass-button"
          >
            <Plus className="h-4 w-4" />
            <span>Add Invoice</span>
          </Button>
          {(role === "admin" || role === "moderator") && (
            <Button
              onClick={() => setManageItemsModalOpen(true)}
              variant="secondary"
              size="sm"
              className="h-9 gap-1.5 bg-secondary/80 hover:bg-secondary border border-border/20"
            >
              <Layers className="h-4 w-4" />
              <span>Manage Items</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Items"
          value={stats.totalItems}
          icon={Package}
          color="blue"
          subtitle="Active inventory items"
          isLoading={loadingData}
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats.lowStockAlerts}
          icon={AlertTriangle}
          color="red"
          subtitle="Items below threshold"
          isLoading={loadingData}
          onClick={handleFilterLowStock}
          isActive={stockStatusFilter === "low" && activeTab === "stock"}
        />
        <StatCard
          title="Active Drums"
          value={stats.activeDrums}
          icon={Layers}
          color="purple"
          subtitle="Cable drums in use"
          isLoading={loadingData}
          onClick={() => setActiveTab("drums")}
        />
        <StatCard
          title="Monthly Waste"
          value={`${stats.monthlyWastePercentage}%`}
          icon={TrendingDown}
          color="green"
          subtitle="Of total inventory"
          isLoading={loadingData}
          onClick={() => setActiveTab("waste")}
        />
      </div>

      {/* Critical alerts banner */}
      <CriticalAlerts
        items={inventoryItems}
        onFilterLowStock={handleFilterLowStock}
        isLoading={loadingData}
      />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full grid grid-cols-4 gap-1 h-11 p-1 bg-muted/40 border border-border/20 rounded-xl backdrop-blur-sm">
          <TabsTrigger value="invoices" className="text-xs sm:text-sm rounded-lg transition-all duration-200">
            Invoices
          </TabsTrigger>
          <TabsTrigger value="stock" className="text-xs sm:text-sm rounded-lg transition-all duration-200">
            Stock
          </TabsTrigger>
          <TabsTrigger value="drums" className="text-xs sm:text-sm rounded-lg transition-all duration-200">
            Drums
          </TabsTrigger>
          <TabsTrigger value="waste" className="text-xs sm:text-sm rounded-lg transition-all duration-200">
            Waste
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="animate-fade-in-up">
          <InvoicesTab
            invoices={invoices}
            loadingData={loadingData}
            expandedInvoiceId={expandedInvoiceId}
            setExpandedInvoiceId={setExpandedInvoiceId}
            fetchInvoiceItems={fetchInvoiceItems}
            invoiceItems={invoiceItems}
            role={role}
            onEdit={(invoice) => {
              setSelectedInvoice(invoice);
              setEditInvoiceModalOpen(true);
            }}
            onDelete={(invoice) => {
              setInvoiceToDelete(invoice);
              setDeleteConfirmOpen(true);
            }}
            getStatusBadge={getStatusBadge}
          />
        </TabsContent>

        <TabsContent value="stock" className="animate-fade-in-up">
          <StockTab
            inventoryItems={inventoryItems}
            loadingData={loadingData}
            role={role}
            onEdit={(item) => {
              setSelectedItem(item);
              setEditItemModalOpen(true);
            }}
            getStockStatus={getStockStatus}
            searchQuery={stockSearchQuery}
            setSearchQuery={setStockSearchQuery}
            statusFilter={stockStatusFilter}
            setStatusFilter={setStockStatusFilter}
          />
        </TabsContent>

        <TabsContent value="drums" className="animate-fade-in-up">
          <DrumsTab
            drums={drums}
            loadingData={loadingData}
            role={role}
            setAddDrumModalOpen={setAddDrumModalOpen}
            searchDrumQuery={searchDrumQuery}
            setSearchDrumQuery={setSearchDrumQuery}
            drumStatusFilter={drumStatusFilter}
            setDrumStatusFilter={setDrumStatusFilter}
            setSelectedDrum={setSelectedDrum}
            setEditDrumModalOpen={setEditDrumModalOpen}
            updateDrumStatus={updateDrumStatus}
            setDrumToDelete={setDrumToDelete}
            setDeleteDrumConfirmOpen={setDeleteDrumConfirmOpen}
            getStatusBadge={getStatusBadge}
            onDrumUpdate={handleSuccess}
          />
        </TabsContent>

        <TabsContent value="waste" className="animate-fade-in-up">
          <WasteTab
            wasteReports={wasteReports}
            loadingData={loadingData}
            role={role}
            onDelete={(waste) => {
              setWasteToDelete(waste);
              setDeleteWasteConfirmOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddInventoryInvoiceModal
        open={addInvoiceModalOpen}
        onOpenChange={setAddInvoiceModalOpen}
        onSuccess={handleSuccess}
      />
      <EditInventoryInvoiceModal
        open={editInvoiceModalOpen}
        invoice={selectedInvoice}
        invoiceItems={
          selectedInvoice ? invoiceItems[selectedInvoice.id] || [] : []
        }
        onClose={() => setEditInvoiceModalOpen(false)}
        onSuccess={handleSuccess}
        addNotification={addNotification}
      />
      <AddWasteModal
        open={addWasteModalOpen}
        onOpenChange={setAddWasteModalOpen}
        onSuccess={handleSuccess}
      />
      <ManageInventoryItemsModal
        open={manageItemsModalOpen}
        onOpenChange={setManageItemsModalOpen}
        userRole={role ?? ""}
      />
      <EditDrumModal
        open={editDrumModalOpen}
        drum={selectedDrum}
        onClose={() => {
          setEditDrumModalOpen(false);
          setSelectedDrum(null);
        }}
        onSuccess={handleSuccess}
        addNotification={addNotification}
      />
      <AddDrumModal
        isOpen={addDrumModalOpen}
        onClose={() => setAddDrumModalOpen(false)}
        onSuccess={handleSuccess}
      />
      <EditInventoryItemModal
        open={editItemModalOpen}
        onOpenChange={setEditItemModalOpen}
        item={selectedItem}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation Dialogs */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this invoice? This will restore the previous stock values.</p>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (invoiceToDelete) {
                  try {
                    const response = await fetch(
                      `/api/inventory/invoices/${invoiceToDelete.id}`,
                      { method: "DELETE" }
                    );
                    if (!response.ok)
                      throw new Error("Failed to delete invoice");
                    addNotification({
                      title: "Invoice Deleted",
                      message: `Invoice #${invoiceToDelete.invoice_number} deleted successfully`,
                      type: "success",
                      category: "system",
                    });
                    setDeleteConfirmOpen(false);
                    setInvoiceToDelete(null);
                    handleSuccess();
                  } catch (error) {
                    addNotification({
                      title: "Error",
                      message: "Failed to delete invoice",
                      type: "error",
                      category: "system",
                    });
                  }
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDrumConfirmOpen}
        onOpenChange={setDeleteDrumConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Drum</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this drum?</p>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteDrumConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (drumToDelete) {
                  try {
                    const response = await fetch(
                      `/api/drums/${drumToDelete.id}`,
                      {
                        method: "DELETE",
                      }
                    );
                    if (!response.ok) throw new Error("Failed to delete drum");
                    addNotification({
                      title: "Drum Deleted",
                      message: `Drum #${drumToDelete.drum_number} deleted successfully`,
                      type: "success",
                      category: "system",
                    });
                    setDeleteDrumConfirmOpen(false);
                    setDrumToDelete(null);
                    handleSuccess();
                  } catch (error) {
                    addNotification({
                      title: "Error",
                      message: "Failed to delete drum",
                      type: "error",
                      category: "system",
                    });
                  }
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteWasteConfirmOpen}
        onOpenChange={setDeleteWasteConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Waste Record</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this waste record? This will restore the item stock.</p>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteWasteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (wasteToDelete) {
                  try {
                    const response = await fetch(
                      `/api/inventory/waste/${wasteToDelete.id}`,
                      { method: "DELETE" }
                    );
                    if (!response.ok)
                      throw new Error("Failed to delete waste record");
                    addNotification({
                      title: "Waste Record Deleted",
                      message: `Waste record deleted and stock restored for ${wasteToDelete.item_name || "item"}`,
                      type: "success",
                      category: "system",
                    });
                    setDeleteWasteConfirmOpen(false);
                    setWasteToDelete(null);
                    handleSuccess();
                  } catch (error) {
                    addNotification({
                      title: "Error",
                      message: "Failed to delete waste record or restore stock",
                      type: "error",
                      category: "system",
                    });
                  }
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
