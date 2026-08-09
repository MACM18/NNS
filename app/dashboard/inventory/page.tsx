"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Package,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Layers,
  Boxes,
  FileText,
  CircleAlert,
  Clock3,
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
import { MaterialBalanceTab } from "@/components/inventory/material-balance-tab";

interface InventoryStats {
  totalItems: number;
  lowStockAlerts: number;
  activeDrums: number;
  monthlyWastePercentage: number;
}

type InventoryTab = "stock" | "invoices" | "drums" | "waste" | "material-balance";
type InventorySection = "summary" | "invoices" | "stock" | "drums" | "waste";

export interface InventoryInvoice {
  id: string;
  invoice_number: string;
  warehouse: string;
  date: string;
  issued_by: string;
  drawn_by: string;
  total_items: number;
  status: string;
  source_type?: string | null;
  source_key?: string | null;
  material_balance_import_id?: string | null;
  source_date?: string | null;
  is_system_generated?: boolean;
  canonical_day_status?: string | null;
  latest_import_reference?: string | null;
  source_connection_id?: string | null;
  last_synced_at?: string | null;
  revision_count?: number;
  locked?: boolean;
  created_at: string;
  updated_at?: string;
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
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<InventoryTab>("stock");
  
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
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [sectionErrors, setSectionErrors] = useState<Partial<Record<InventorySection, string>>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const requestedTab = new URLSearchParams(window.location.search).get("tab") as InventoryTab | null;
      const validTabs: InventoryTab[] = ["stock", "invoices", "drums", "waste", "material-balance"];
      if (requestedTab && validTabs.includes(requestedTab)) {
        setActiveTab(requestedTab);
      }
    }
  }, []);
  
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
  const [drumStatusFilter, setDrumStatusFilter] = useState("active");

  const { addNotification } = useNotification();

  const setSectionError = (section: InventorySection, message?: string) => {
    setSectionErrors((current) => {
      const next = { ...current };
      if (message) next[section] = message;
      else delete next[section];
      return next;
    });
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, refreshTrigger]);

  const fetchAllData = async () => {
    setLoadingData(true);
    setSectionErrors({});
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
      setLastRefreshedAt(new Date());
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
      setSectionError("summary", "Summary metrics could not be loaded.");
    }
  };

  const fetchInvoices = async () => {
    try {
      const [operationalResponse, historyResponse] = await Promise.all([
        fetch("/api/inventory/invoices?limit=50&view=operational"),
        fetch("/api/inventory/invoices?limit=100&view=history"),
      ]);
      if (!operationalResponse.ok || !historyResponse.ok) throw new Error("Failed to fetch invoices");
      const [operational, history] = await Promise.all([
        operationalResponse.json(),
        historyResponse.json(),
      ]);
      setInvoices([...(operational.data || []), ...(history.data || [])]);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setSectionError("invoices", "Invoices could not be loaded. Try refreshing this page.");
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
      setSectionError("stock", "Stock levels could not be loaded. Try refreshing this page.");
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
      setSectionError("drums", "Drum records could not be loaded. Try refreshing this page.");
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
      setSectionError("waste", "Waste reports could not be loaded. Try refreshing this page.");
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

  useEffect(() => {
    const invoiceId = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("invoiceId")
      : null;
    const target = invoiceId ? invoices.find((invoice) => invoice.id === invoiceId) : null;
    if (!target) return;
    setActiveTab("invoices");
    setExpandedInvoiceId(target.id);
    void fetchInvoiceItems(target.id);
    // The query parameter is intentionally handled once invoices are loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices]);

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
      case "reversed":
        return <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/20">Reversed</Badge>;
      case "superseded":
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Historical revision</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
    setStockStatusFilter("attention");
    setStockSearchQuery("");
  };

  const attentionCount = inventoryItems.filter((item) => {
    if (item.current_stock <= 0) return true;
    return item.reorder_level > 0 && item.current_stock / item.reorder_level < 1.5;
  }).length;
  const tabCounts: Record<InventoryTab, number> = {
    stock: inventoryItems.length,
    invoices: invoices.filter((invoice) => !invoice.is_system_generated || invoice.source_type !== "google_material_balance_adjustment").length,
    drums: drums.length,
    waste: wasteReports.length,
    "material-balance": 0,
  };
  const loadErrorCount = Object.keys(sectionErrors).length;

  if (!user) {
    return <AuthWrapper />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Boxes className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Operations</p>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground">
              Inventory
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              See what is available, what needs attention, and where every stock movement came from.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-live="polite">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {lastRefreshedAt ? `Updated ${lastRefreshedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Loading latest data"}
            </span>
            {loadErrorCount > 0 && (
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                {loadErrorCount} section{loadErrorCount === 1 ? "" : "s"} need{loadErrorCount === 1 ? "s" : ""} attention
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button
            onClick={fetchAllData}
            variant="outline"
            size="sm"
            disabled={loadingData}
            className="h-9 gap-1.5"
            aria-label="Refresh inventory data"
          >
            <RefreshCw className={`h-4 w-4 ${loadingData ? "animate-spin" : ""}`} aria-hidden="true" />
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
            <span>Add receipt</span>
          </Button>
          {(role === "admin" || role === "moderator" || role === "superadmin") && (
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Stock items"
          value={stats.totalItems}
          icon={Package}
          color="blue"
          subtitle="Items being tracked"
          isLoading={loadingData}
          onClick={() => setActiveTab("stock")}
          isActive={activeTab === "stock" && stockStatusFilter === "all"}
        />
        <StatCard
          title="Needs attention"
          value={inventoryItems.length > 0 ? attentionCount : stats.lowStockAlerts}
          icon={AlertTriangle}
          color="red"
          subtitle="Out, critical, or low"
          isLoading={loadingData}
          onClick={handleFilterLowStock}
          isActive={stockStatusFilter === "attention" && activeTab === "stock"}
        />
        <StatCard
          title="Active drums"
          value={stats.activeDrums}
          icon={Layers}
          color="purple"
          subtitle="Cable drums in use"
          isLoading={loadingData}
          onClick={() => setActiveTab("drums")}
          isActive={activeTab === "drums"}
        />
        <StatCard
          title="Waste this month"
          value={`${stats.monthlyWastePercentage}%`}
          icon={TrendingDown}
          color="green"
          subtitle="Of total inventory"
          isLoading={loadingData}
          onClick={() => setActiveTab("waste")}
          isActive={activeTab === "waste"}
        />
      </div>

      {sectionErrors.summary && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300" role="alert">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{sectionErrors.summary}</span>
        </div>
      )}

      {/* Critical alerts banner */}
      <CriticalAlerts
        items={inventoryItems}
        onFilterLowStock={handleFilterLowStock}
        isLoading={loadingData}
      />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InventoryTab)} className="space-y-6">
        <div className="-mx-1 overflow-x-auto pb-1">
          <TabsList className="flex h-auto min-w-max gap-1 rounded-xl border border-border/20 bg-muted/40 p-1 backdrop-blur-sm sm:min-w-0">
            {[
              { value: "stock" as InventoryTab, label: "Stock", icon: Package },
              { value: "invoices" as InventoryTab, label: "Invoices", icon: FileText },
              { value: "drums" as InventoryTab, label: "Drums", icon: Layers },
              { value: "waste" as InventoryTab, label: "Waste", icon: TrendingDown },
              { value: "material-balance" as InventoryTab, label: "Material Balance", icon: Boxes },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="min-h-10 gap-1.5 rounded-lg px-3 text-xs transition-all duration-200 sm:text-sm">
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
                {tabCounts[value] > 0 && <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px]">{tabCounts[value]}</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="invoices" className="animate-fade-in-up">
          <InvoicesTab
            invoices={invoices}
            loadingData={loadingData}
            error={sectionErrors.invoices}
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
            error={sectionErrors.stock}
            role={role}
            onEdit={(item) => {
              setSelectedItem(item);
              setEditItemModalOpen(true);
            }}
            searchQuery={stockSearchQuery}
            setSearchQuery={setStockSearchQuery}
            statusFilter={stockStatusFilter}
            setStatusFilter={setStockStatusFilter}
            onAddReceipt={() => setAddInvoiceModalOpen(true)}
            onOpenMaterialBalance={() => setActiveTab("material-balance")}
          />
        </TabsContent>

        <TabsContent value="drums" className="animate-fade-in-up">
          <DrumsTab
            drums={drums}
            loadingData={loadingData}
            error={sectionErrors.drums}
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
            error={sectionErrors.waste}
            role={role}
            onDelete={(waste) => {
              setWasteToDelete(waste);
              setDeleteWasteConfirmOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="material-balance" className="animate-fade-in-up">
          <MaterialBalanceTab />
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
