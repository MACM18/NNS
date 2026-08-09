"use client";

import React, { useState, useEffect } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
import { CriticalAlerts } from "@/components/inventory/critical-alerts";
import { InvoicesTab } from "@/components/inventory/invoices-tab";
import { StockTab } from "@/components/inventory/stock-tab";
import { DrumsTab } from "@/components/inventory/drums-tab";
import { WasteTab } from "@/components/inventory/waste-tab";
import { MaterialBalanceTab } from "@/components/inventory/material-balance-tab";
import { InventoryWorkspaceHeader } from "@/components/inventory/inventory-workspace-header";
import { InventorySectionNav } from "@/components/inventory/inventory-section-nav";

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
  is_active?: boolean;
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
  const [deleteItemConfirmOpen, setDeleteItemConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  
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
          is_active: d.is_active !== false,
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

  const deleteInventoryItem = async () => {
    if (!itemToDelete) return;
    try {
      const response = await fetch(`/api/inventory/${itemToDelete.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Failed to remove inventory item");

      const action = result.action === "archived" ? "archived" : "deleted";
      addNotification({
        title: action === "archived" ? "Item Archived" : "Item Deleted",
        message: action === "archived"
          ? `${itemToDelete.name} was archived so its history remains available.`
          : `${itemToDelete.name} was permanently deleted because it had no history.`,
        type: "success",
        category: "system",
      });
      setDeleteItemConfirmOpen(false);
      setItemToDelete(null);
      handleSuccess();
    } catch (error) {
      addNotification({
        title: "Could not remove item",
        message: error instanceof Error ? error.message : "Failed to remove inventory item",
        type: "error",
        category: "system",
      });
    }
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

  const canManageItems = ["admin", "moderator", "superadmin"].includes((role || "").toLowerCase());

  return (
    <div className="space-y-6">
      <InventoryWorkspaceHeader
        totalItems={inventoryItems.length || stats.totalItems}
        attentionCount={inventoryItems.length > 0 ? attentionCount : stats.lowStockAlerts}
        activeDrums={stats.activeDrums}
        wastePercentage={stats.monthlyWastePercentage}
        lastRefreshedAt={lastRefreshedAt}
        loading={loadingData}
        errorCount={loadErrorCount}
        canManageItems={canManageItems}
        onRefresh={() => void fetchAllData()}
        onAddReceipt={() => setAddInvoiceModalOpen(true)}
        onRecordWaste={() => setAddWasteModalOpen(true)}
        onManageItems={() => setManageItemsModalOpen(true)}
        onShowAllStock={() => {
          setActiveTab("stock");
          setStockStatusFilter("all");
          setStockSearchQuery("");
        }}
        onShowAttention={handleFilterLowStock}
        onShowDrums={() => setActiveTab("drums")}
        onShowWaste={() => setActiveTab("waste")}
      />

      {sectionErrors.summary && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300" role="alert">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{sectionErrors.summary}</span>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InventoryTab)} className="space-y-6">
        <InventorySectionNav counts={tabCounts} />

        <TabsContent value="stock" className="animate-fade-in-up space-y-4">
          <CriticalAlerts
            items={inventoryItems}
            onFilterLowStock={handleFilterLowStock}
            isLoading={loadingData}
          />
          <StockTab
            inventoryItems={inventoryItems}
            loadingData={loadingData}
            error={sectionErrors.stock}
            role={role}
            onEdit={(item) => {
              setSelectedItem(item);
              setEditItemModalOpen(true);
            }}
            onDelete={(item) => {
              setItemToDelete(item);
              setDeleteItemConfirmOpen(true);
            }}
            searchQuery={stockSearchQuery}
            setSearchQuery={setStockSearchQuery}
            statusFilter={stockStatusFilter}
            setStatusFilter={setStockStatusFilter}
            onAddReceipt={() => setAddInvoiceModalOpen(true)}
            onOpenMaterialBalance={() => setActiveTab("material-balance")}
          />
        </TabsContent>

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
        onSuccess={handleSuccess}
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

      <Dialog open={deleteItemConfirmOpen} onOpenChange={setDeleteItemConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove inventory item</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {itemToDelete
              ? `Remove ${itemToDelete.name}? Items with stock or historical records are archived automatically, so invoices and stock history are not deleted.`
              : "Remove this inventory item? Historical records are always preserved."}
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteItemConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void deleteInventoryItem()}>Remove item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
