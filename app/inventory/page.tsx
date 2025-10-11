"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Package,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Eye,
  Pencil,
  Trash,
  Cable,
  ToggleLeft,
  ToggleRight,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { AddInventoryInvoiceModal } from "@/components/modals/add-inventory-invoice-modal";
import { AddWasteModal } from "@/components/modals/add-waste-modal";
import { ManageInventoryItemsModal } from "@/components/modals/manage-inventory-items-modal";
import { EditInventoryInvoiceModal } from "@/components/modals/edit-inventory-invoice-modal";
import { EditInventoryItemModal } from "@/components/modals/edit-inventory-item-modal";
import { EditDrumModal } from "@/components/modals/edit-drum-modal";
import { DrumUsageDetailsModal } from "@/components/modals/drum-usage-details-modal";
import { useAuth } from "@/contexts/auth-context";
import { AuthWrapper } from "@/components/auth/auth-wrapper";
import { getSupabaseClient } from "@/lib/supabase";
import { useNotification } from "@/contexts/notification-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  calculateSmartWastage,
  calculateLegacyWastage,
  type DrumUsage,
} from "@/lib/drum-wastage-calculator";

interface InventoryStats {
  totalItems: number;
  lowStockAlerts: number;
  activeDrums: number;
  monthlyWastePercentage: number;
}

interface InventoryInvoice {
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

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  reorder_level: number;
  last_updated: string;
}

export interface DrumTracking {
  id: string
  drum_number: string
  item_id: string
  initial_quantity: number
  current_quantity: number
  calculated_current_quantity?: number
  suggested_status?: string | null
  total_used?: number
  total_wastage?: number
  remaining_cable?: number
  usage_count?: number
  last_usage_date?: string
  usages?: any[]
  received_date: string
  status: string
  item_name?: string
  wastage_calculation_method?: 'smart_segments' | 'legacy_gaps' | 'manual_override'
  manual_wastage_override?: number
}

interface WasteReport {
  id: string;
  item_id: string;
  quantity: number;
  waste_reason: string;
  waste_date: string;
  full_name: string;
  created_at: string;
  item_name?: string;
}

interface InventoryInvoiceItem {
  id: string;
  invoice_id: string;
  item_id: string;
  description: string;
  unit: string;
  quantity_requested: number;
  quantity_issued: number;
}

// Enhanced drum calculation logic with smart wastage calculation
// IMPORTANT: This function NEVER modifies the drum status - it only calculates metrics
const calculateDrumMetrics = (drum: any, usageData: any[]) => {
  const drumUsages = usageData.filter((usage) => usage.drum_id === drum.id);

  // CRITICAL: Always preserve the database status - never override it
  const preservedStatus = drum.status

  if (drumUsages.length === 0) {
    // For drums with no usage, calculate wastage based on current status
    const totalWastage = drum.manual_wastage_override || (preservedStatus === 'inactive' ? drum.initial_quantity : 0)
    
    return {
      totalUsed: 0,
      totalWastage,
      calculatedCurrentQuantity: drum.initial_quantity - totalWastage,
      remainingCable: preservedStatus === 'inactive' ? 0 : drum.initial_quantity,
      suggestedStatus: null, // Never suggest changes for drums without usage
      usageCount: 0,
      lastUsageDate: null,
      usages: [],
      wastageCalculationMethod:
        drum.manual_wastage_override !== undefined
          ? "manual_override"
          : "smart_segments",
    };
  }

  // Convert to the format expected by our calculation functions
  const drumUsageData: DrumUsage[] = drumUsages.map((usage) => ({
    id: usage.id,
    cable_start_point: usage.cable_start_point || 0,
    cable_end_point: usage.cable_end_point || 0,
    usage_date: usage.usage_date,
    quantity_used: usage.quantity_used,
  }));

  // Use smart calculation with the PRESERVED status (never modified)
  const calculation = calculateSmartWastage(
    drumUsageData,
    drum.initial_quantity,
    drum.manual_wastage_override,
    preservedStatus // Use preserved status, not a calculated one
  )

  // Sort usages by date for UI display
  const sortedUsages = [...drumUsages].sort(
    (a, b) =>
      new Date(a.usage_date).getTime() - new Date(b.usage_date).getTime()
  );

  // Only provide status suggestions for ACTIVE drums (never override inactive/empty/maintenance)
  let suggestedStatus = null
  if (preservedStatus === 'active') {
    if (calculation.calculatedCurrentQuantity <= 0) {
      suggestedStatus = "empty"
    } else if (calculation.calculatedCurrentQuantity <= 10) {
      suggestedStatus = "inactive"
    }
  }

  return {
    totalUsed: calculation.totalUsed,
    totalWastage: calculation.totalWastage,
    calculatedCurrentQuantity: calculation.calculatedCurrentQuantity,
    remainingCable: calculation.remainingCable,
    suggestedStatus, // Only set if suggesting a change for active drums
    usageCount: sortedUsages.length,
    lastUsageDate:
      sortedUsages.length > 0
        ? sortedUsages[sortedUsages.length - 1].usage_date
        : null,
    usages: sortedUsages.slice(-5), // Keep last 5 usages for details
    wastageCalculationMethod: calculation.calculationMethod,
    usageSegments: calculation.usageSegments,
    wastedSegments: calculation.wastedSegments,
    manualWastageOverride: calculation.manualWastageOverride,
  };
};

export default function InventoryPage() {
  const { user, loading, role } = useAuth();
  const [addInvoiceModalOpen, setAddInvoiceModalOpen] = useState(false);
  const [addWasteModalOpen, setAddWasteModalOpen] = useState(false);
  const [manageItemsModalOpen, setManageItemsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
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
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(
    null
  );
  const [invoiceItems, setInvoiceItems] = useState<
    Record<string, InventoryInvoiceItem[]>
  >({});
  const [editInvoiceModalOpen, setEditInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] =
    useState<InventoryInvoice | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] =
    useState<InventoryInvoice | null>(null);
  const [editDrumModalOpen, setEditDrumModalOpen] = useState(false);
  const [selectedDrum, setSelectedDrum] = useState<DrumTracking | null>(null);
  const [deleteDrumConfirmOpen, setDeleteDrumConfirmOpen] = useState(false);
  const [drumToDelete, setDrumToDelete] = useState<DrumTracking | null>(null);
  const [editItemModalOpen, setEditItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [deleteWasteConfirmOpen, setDeleteWasteConfirmOpen] = useState(false);
  const [wasteToDelete, setWasteToDelete] = useState<WasteReport | null>(null);
  const [drumUsageModalOpen, setDrumUsageModalOpen] = useState(false);
  const [selectedDrumForUsage, setSelectedDrumForUsage] =
    useState<DrumTracking | null>(null);
  const [showInactiveDrums, setShowInactiveDrums] = useState(false);

  const supabase = getSupabaseClient();
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
      const { count: totalItems } = await supabase
        .from("inventory_items")
        .select("*", { count: "exact", head: true });

      const { data: lowStockData, error: lowStockError } = await supabase.rpc(
        "low_stock_alert_count"
      );
      const lowStockAlerts = lowStockData ?? 0;

      const { count: activeDrums } = await supabase
        .from("drum_tracking")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7);
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${currentMonth}-${lastDay.toString().padStart(2, "0")}`;

      const { data: wasteData } = await supabase
        .from("waste_tracking")
        .select("quantity")
        .gte("waste_date", `${currentMonth}-01`)
        .lte("waste_date", endDate);

      const { data: totalStock } = await supabase
        .from("inventory_items")
        .select("current_stock");

      const totalWaste =
        wasteData?.reduce(
          (sum, item) => sum + ((item as { quantity: number }).quantity || 0),
          0
        ) || 0;
      const totalStockValue =
        totalStock?.reduce(
          (sum, item) =>
            sum +
            (typeof item.current_stock === "number" ? item.current_stock : 0),
          0
        ) || 1;
      const wastePercentage =
        totalStockValue > 0 ? (totalWaste / totalStockValue) * 100 : 0;

      setStats({
        totalItems: typeof totalItems === "number" ? totalItems : 0,
        lowStockAlerts: typeof lowStockAlerts === "number" ? lowStockAlerts : 0,
        activeDrums: typeof activeDrums === "number" ? activeDrums : 0,
        monthlyWastePercentage: Number(wastePercentage.toFixed(1)),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setInvoices(
        Array.isArray(data)
          ? data
              .filter(
                (d) =>
                  d &&
                  typeof d.id === "string" &&
                  typeof d.invoice_number === "string" &&
                  typeof d.warehouse === "string" &&
                  typeof d.date === "string" &&
                  typeof d.issued_by === "string" &&
                  typeof d.drawn_by === "string" &&
                  typeof d.total_items === "number" &&
                  typeof d.status === "string" &&
                  typeof d.created_at === "string"
              )
              .map(
                (d) =>
                  ({
                    id: d.id,
                    invoice_number: d.invoice_number,
                    warehouse: d.warehouse,
                    date: d.date,
                    issued_by: d.issued_by,
                    drawn_by: d.drawn_by,
                    total_items: d.total_items,
                    status: d.status,
                    created_at: d.created_at,
                  } as InventoryInvoice)
              )
          : []
      );
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("name");

      if (error) throw error;
      setInventoryItems(
        Array.isArray(data)
          ? data
              .filter(
                (d) =>
                  d &&
                  typeof d.id === "string" &&
                  typeof d.name === "string" &&
                  typeof d.unit === "string" &&
                  typeof d.current_stock === "number" &&
                  typeof d.reorder_level === "number" &&
                  typeof d.updated_at === "string"
              )
              .map(
                (d) =>
                  ({
                    id: d.id,
                    name: d.name,
                    unit: d.unit,
                    current_stock: d.current_stock,
                    reorder_level: d.reorder_level,
                    last_updated: d.updated_at,
                  } as InventoryItem)
              )
          : []
      );
    } catch (error) {
      console.error("Error fetching inventory items:", error);
    }
  };

  const fetchDrums = async () => {
    try {
      console.log(`[FETCH DRUMS] Starting to fetch drum data`)
      
      const { data, error } = await supabase
        .from("drum_tracking")
        .select(
          `id, drum_number, item_id, initial_quantity, current_quantity, received_date, status, 
           wastage_calculation_method, manual_wastage_override, inventory_items(name)`
        )
        .order("received_date", { ascending: false });
      if (error) throw error;

      console.log(`[FETCH DRUMS] Fetched ${data?.length || 0} drums from database`)

      // Fetch drum usage data for all drums
      const { data: usageData, error: usageError } = await supabase
        .from("drum_usage")
        .select(
          "drum_id, quantity_used, usage_date, wastage_calculated, cable_start_point, cable_end_point, line_details(telephone_no, name)"
        )
        .order("usage_date", { ascending: false });

      if (usageError) throw usageError;

      // Calculate metrics using the enhanced logic
      const drumsWithUsage = (data || []).map((drum: any) => {
        console.log(`[FETCH DRUMS] Processing drum ${drum.drum_number} with status: ${drum.status}`)
        const metrics = calculateDrumMetrics(drum, usageData || [])

        const processedDrum = {
          ...drum,
          item_name: drum.inventory_items?.name || "",
          calculated_current_quantity: metrics.calculatedCurrentQuantity,
          suggested_status: metrics.suggestedStatus,
          total_used: metrics.totalUsed,
          total_wastage: metrics.totalWastage,
          remaining_cable: metrics.remainingCable,
          usage_count: metrics.usageCount,
          last_usage_date: metrics.lastUsageDate,
          usages: metrics.usages,
        }
        
        console.log(`[FETCH DRUMS] Processed drum ${drum.drum_number} - final status: ${processedDrum.status}`)
        return processedDrum
      })

      console.log(`[FETCH DRUMS] Setting drums state with ${drumsWithUsage.length} drums`)
      setDrums(drumsWithUsage as DrumTracking[])
    } catch (error) {
      console.error("[FETCH DRUMS] Error fetching drums:", error)
    }
  };

  const fetchWasteReports = async () => {
    try {
      const { data, error } = await supabase
        .from("waste_tracking")
        .select(
          `id, item_id, quantity, waste_reason, waste_date, profiles(full_name), created_at, inventory_items(name)`
        )
        .order("waste_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      const wasteWithName = (data || []).map((w: any) => ({
        ...w,
        item_name: w.inventory_items?.name || "",
        full_name: w.profiles?.full_name || "",
      }));
      setWasteReports(wasteWithName as WasteReport[]);
    } catch (error) {
      console.error("Error fetching waste reports:", error);
    }
  };

  const fetchInvoiceItems = async (invoiceId: string) => {
    if (invoiceItems[invoiceId]) return;
    try {
      const { data, error } = await supabase
        .from("inventory_invoice_items")
        .select(
          "id, invoice_id, item_id, description, unit, quantity_requested, quantity_issued"
        )
        .eq("invoice_id", invoiceId);
      if (error) throw error;
      setInvoiceItems((prev) => ({
        ...prev,
        [invoiceId]: (data || []) as InventoryInvoiceItem[],
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
          <Badge variant='default' className='bg-green-100 text-green-800'>
            Completed
          </Badge>
        );
      case "pending":
        return <Badge variant='secondary'>Pending</Badge>;
      case "active":
        return (
          <Badge variant='default' className='bg-blue-100 text-blue-800'>
            Active
          </Badge>
        );
      case "empty":
        return (
          <Badge variant='outline' className='bg-gray-100 text-gray-800'>
            Empty
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant='outline' className='bg-orange-100 text-orange-800'>
            Inactive
          </Badge>
        );
      default:
        return <Badge variant='secondary'>{status}</Badge>;
    }
  };

  const getStockStatus = (currentStock: number, reorderLevel: number) => {
    if (currentStock <= 0) {
      return <Badge variant='destructive'>Out of Stock</Badge>;
    } else if (currentStock <= reorderLevel) {
      return (
        <Badge variant='outline' className='bg-orange-100 text-orange-800'>
          Low Stock
        </Badge>
      );
    } else {
      return (
        <Badge variant='default' className='bg-green-100 text-green-800'>
          In Stock
        </Badge>
      );
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

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const updateDrumStatus = async (
    drumId: string,
    newStatus: string,
    drumNumber: string
  ) => {
    try {
      console.log(`[DRUM STATUS UPDATE] Starting update for drum ${drumNumber} (ID: ${drumId}) to status: ${newStatus}`)
      
      // First, let's verify the current status
      const { data: currentDrum, error: fetchError } = await supabase
        .from("drum_tracking")
        .select("status")
        .eq("id", drumId)
        .single()
      
      if (fetchError) {
        console.error(`[DRUM STATUS UPDATE] Failed to fetch current status:`, fetchError)
        throw fetchError
      }
      
      console.log(`[DRUM STATUS UPDATE] Current status in database: ${currentDrum.status}`)
      
      // Now update the status
      const { data, error } = await supabase
        .from("drum_tracking")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", drumId)
        .select("status") // Return the updated status to verify

      if (error) {
        console.error(`[DRUM STATUS UPDATE] Update failed:`, error)
        throw error
      }

      console.log(`[DRUM STATUS UPDATE] Update successful. New status confirmed: ${data[0]?.status}`)

      addNotification({
        title: "Status Updated",
        message: `Drum ${drumNumber} status changed from ${currentDrum.status} to ${newStatus}`,
        type: "success",
        category: "system",
      });

      // Add a small delay to ensure database transaction is committed
      setTimeout(() => {
        console.log(`[DRUM STATUS UPDATE] Triggering data refresh for drum ${drumNumber}`)
        handleSuccess()
      }, 500)
    } catch (error: any) {
      console.error(`[DRUM STATUS UPDATE] Failed to update drum ${drumNumber} status:`, error)
      addNotification({
        title: "Error",
        message: `Failed to update drum status: ${error?.message || 'Unknown error'}`,
        type: "error",
        category: "system",
      });
    }
  };

  const syncDrumQuantity = async (drum: DrumTracking) => {
    try {
      const calculatedQuantity = drum.calculated_current_quantity ?? drum.current_quantity

      const { error } = await supabase
        .from("drum_tracking")
        .update({
          current_quantity: calculatedQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", drum.id);

      if (error) throw error;

      addNotification({
        title: "Success",
        message: `Drum ${
          drum.drum_number
        } quantity synced successfully (${calculatedQuantity.toFixed(
          1
        )}m remaining)`,
        type: "success",
        category: "system",
      });

      handleSuccess();
    } catch (error) {
      addNotification({
        title: "Error",
        message: "Failed to sync drum quantity",
        type: "error",
        category: "system",
      });
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className='flex-1 space-y-6 p-6'>
          {/* Page Header */}
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
            <div>
              <h1 className='text-3xl font-bold'>Inventory Management</h1>
              <p className='text-muted-foreground'>
                Manage stock receipts, drum tracking, and waste reporting
              </p>
            </div>
            <div className='flex gap-2'>
              <Button
                onClick={() => setAddWasteModalOpen(true)}
                variant='outline'
                className='gap-2'
              >
                <TrendingDown className='h-4 w-4' />
                Record Waste
              </Button>
              <Button
                onClick={() => setAddInvoiceModalOpen(true)}
                className='gap-2'
              >
                <Plus className='h-4 w-4' />
                Add Invoice
              </Button>
              {(role === "admin" || role === "moderator") && (
                <Button
                  onClick={() => setManageItemsModalOpen(true)}
                  variant='secondary'
                  className='gap-2'
                >
                  <Package className='h-4 w-4' />
                  Manage Item List
                </Button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Total Items
                </CardTitle>
                <Package className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {loadingData ? "..." : stats.totalItems}
                </div>
                <p className='text-xs text-muted-foreground'>
                  Active inventory items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Low Stock Alerts
                </CardTitle>
                <AlertTriangle className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    stats.lowStockAlerts > 0 ? "text-orange-600" : ""
                  }`}
                >
                  {loadingData ? "..." : stats.lowStockAlerts}
                </div>
                <p className='text-xs text-muted-foreground'>
                  Items below reorder level
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Active Drums
                </CardTitle>
                <BarChart3 className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {loadingData ? "..." : stats.activeDrums}
                </div>
                <p className='text-xs text-muted-foreground'>
                  Cable drums in use
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Monthly Waste
                </CardTitle>
                <TrendingDown className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {loadingData ? "..." : `${stats.monthlyWastePercentage}%`}
                </div>
                <p className='text-xs text-muted-foreground'>
                  Of total inventory
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue='invoices' className='space-y-6'>
            <TabsList>
              <TabsTrigger value='invoices'>Invoices</TabsTrigger>
              <TabsTrigger value='stock'>Stock Levels</TabsTrigger>
              <TabsTrigger value='drums'>Drum Tracking</TabsTrigger>
              <TabsTrigger value='waste'>Waste Reports</TabsTrigger>
            </TabsList>

            <TabsContent value='invoices'>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>
                    Material receipts and stock updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <div className='text-center py-8'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto'></div>
                      <p className='text-muted-foreground mt-2'>
                        Loading invoices...
                      </p>
                    </div>
                  ) : invoices.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice Number</TableHead>
                          <TableHead>Warehouse</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Issued By</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className='w-20 text-center'>
                            <span className='sr-only'>Actions</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <React.Fragment key={invoice.id}>
                            <TableRow>
                              <TableCell className='font-mono text-sm'>
                                {invoice.invoice_number}
                              </TableCell>
                              <TableCell>{invoice.warehouse}</TableCell>
                              <TableCell>
                                {new Date(invoice.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>{invoice.total_items}</TableCell>
                              <TableCell>{invoice.issued_by}</TableCell>
                              <TableCell>
                                {getStatusBadge(invoice.status)}
                              </TableCell>
                              <TableCell className='text-center align-middle'>
                                <div className='flex gap-1 justify-center items-center min-h-[32px]'>
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={async () => {
                                      if (expandedInvoiceId === invoice.id) {
                                        setExpandedInvoiceId(null);
                                      } else {
                                        setExpandedInvoiceId(invoice.id);
                                        await fetchInvoiceItems(invoice.id);
                                      }
                                    }}
                                  >
                                    <Eye className='h-4 w-4' />
                                  </Button>
                                  {(role === "admin" ||
                                    role === "moderator") && (
                                    <Button
                                      size='sm'
                                      variant='secondary'
                                      onClick={async () => {
                                        if (!invoiceItems[invoice.id]) {
                                          await fetchInvoiceItems(invoice.id);
                                        }
                                        setSelectedInvoice(invoice);
                                        setEditInvoiceModalOpen(true);
                                      }}
                                    >
                                      Edit
                                    </Button>
                                  )}
                                  {role === "admin" && (
                                    <Button
                                      size='sm'
                                      variant='destructive'
                                      onClick={() => {
                                        setInvoiceToDelete(invoice);
                                        setDeleteConfirmOpen(true);
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                            {expandedInvoiceId === invoice.id && (
                              <TableRow>
                                <TableCell
                                  colSpan={7}
                                  className='bg-muted/30 p-0'
                                >
                                  <div className='p-6'>
                                    <h4 className='font-semibold mb-2'>
                                      Invoice Items
                                    </h4>
                                    {invoiceItems[invoice.id] &&
                                    invoiceItems[invoice.id].length > 0 ? (
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Qty Requested</TableHead>
                                            <TableHead>Qty Issued</TableHead>
                                            <TableHead>Unit</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {invoiceItems[invoice.id].map(
                                            (item) => (
                                              <TableRow key={item.id}>
                                                <TableCell>
                                                  {item.description}
                                                </TableCell>
                                                <TableCell>
                                                  {item.quantity_requested}
                                                </TableCell>
                                                <TableCell>
                                                  {item.quantity_issued}
                                                </TableCell>
                                                <TableCell>
                                                  {item.unit}
                                                </TableCell>
                                              </TableRow>
                                            )
                                          )}
                                        </TableBody>
                                      </Table>
                                    ) : (
                                      <div className='text-muted-foreground'>
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
                  ) : (
                    <div className='text-center py-8 text-muted-foreground'>
                      <Package className='h-12 w-12 mx-auto mb-4 opacity-50' />
                      <p>No invoices found</p>
                      <p className='text-sm'>
                        Create your first invoice to get started
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='stock'>
              <Card>
                <CardHeader>
                  <CardTitle>Current Stock Levels</CardTitle>
                  <CardDescription>
                    Real-time inventory status with reorder alerts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <div className='text-center py-8'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto'></div>
                      <p className='text-muted-foreground mt-2'>
                        Loading stock levels...
                      </p>
                    </div>
                  ) : inventoryItems.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Current Stock</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Reorder Level</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Updated</TableHead>
                          <TableHead className='text-right'>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className='font-medium'>
                              {item.name}
                            </TableCell>
                            <TableCell>{item.current_stock}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>{item.reorder_level || 0}</TableCell>
                            <TableCell>
                              {getStockStatus(
                                item.current_stock,
                                item.reorder_level || 0
                              )}
                            </TableCell>
                            <TableCell>
                              {item.last_updated
                                ? new Date(
                                    item.last_updated
                                  ).toLocaleDateString()
                                : "N/A"}
                            </TableCell>
                            <TableCell className='text-right'>
                              {role === "admin" && (
                                <Button
                                  size='icon'
                                  variant='ghost'
                                  aria-label='Edit Item'
                                  className='p-1 h-7 w-7'
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setEditItemModalOpen(true);
                                  }}
                                >
                                  <Pencil className='h-4 w-4' />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className='text-center py-8 text-muted-foreground'>
                      <BarChart3 className='h-12 w-12 mx-auto mb-4 opacity-50' />
                      <p>No inventory items found</p>
                      <p className='text-sm'>
                        Add items through invoices to track stock levels
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='drums'>
              <Card>
                <CardHeader>
                  <CardTitle>Drum Tracking</CardTitle>
                  <CardDescription>
                    Cable drum usage and remaining quantities with enhanced
                    tracking logic
                  </CardDescription>
                  <div className='flex items-center gap-2 mt-4'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setShowInactiveDrums(!showInactiveDrums)}
                      className='gap-2'
                    >
                      {showInactiveDrums ? (
                        <ToggleRight className='h-4 w-4' />
                      ) : (
                        <ToggleLeft className='h-4 w-4' />
                      )}
                      {showInactiveDrums
                        ? "Hide Inactive Drums"
                        : "Show Inactive Drums"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <div className='text-center py-8'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto'></div>
                      <p className='text-muted-foreground mt-2'>
                        Loading drum tracking...
                      </p>
                    </div>
                  ) : drums.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Drum Number</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Initial Qty</TableHead>
                          <TableHead>Current Qty</TableHead>
                          <TableHead>Usage %</TableHead>
                          <TableHead>Received Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className='w-32 text-center'>
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drums
                          .filter(
                            (drum) =>
                              showInactiveDrums || drum.status !== "inactive"
                          )
                          .map((drum) => {
                          const displayQuantity = drum.calculated_current_quantity ?? 0
                          // CRITICAL: Always use database status - this is the authoritative source of truth
                          // User manual changes must ALWAYS be preserved and displayed
                          const displayStatus = drum.status
                          const totalUsed = drum.total_used ?? 0
                          const totalWastage = drum.total_wastage ?? 0
                          const usagePercentage =
                            drum.initial_quantity > 0
                              ? (((totalUsed + totalWastage) / drum.initial_quantity) * 100).toFixed(1)
                              : "0.0"

                          return (
                            <TableRow key={drum.id}>
                              <TableCell className="font-mono">{drum.drum_number}</TableCell>
                              <TableCell>{drum.item_name || "-"}</TableCell>
                              <TableCell>{drum.initial_quantity}m</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-blue-600 font-medium">{displayQuantity.toFixed(1)}m</span>
                                  <span className="text-xs text-muted-foreground">(Calculated)</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span>{usagePercentage}%</span>
                                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all ${
                                        Number(usagePercentage) > 80
                                          ? "bg-red-500"
                                          : Number(usagePercentage) > 60
                                            ? "bg-orange-500"
                                            : "bg-green-500"
                                        }`}
                                        style={{
                                          width: `${Math.min(
                                            100,
                                            Number(usagePercentage)
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                  {drum.usage_count && drum.usage_count > 0 && (
                                    <div className='text-xs text-muted-foreground mt-1'>
                                      {drum.usage_count} installation
                                      {drum.usage_count !== 1 ? "s" : ""}
                                      {totalWastage > 0 && (
                                        <>
                                          <span className='text-orange-600'>
                                            {" "}
                                            • {totalWastage.toFixed(1)}m waste
                                          </span>
                                          {drum.wastage_calculation_method ===
                                            "manual_override" && (
                                            <span className='text-blue-600'>
                                              {" "}
                                              (manual)
                                            </span>
                                          )}
                                          {drum.wastage_calculation_method ===
                                            "smart_segments" && (
                                            <span className='text-green-600'>
                                              {" "}
                                              (smart)
                                            </span>
                                          )}
                                        </>
                                      )}
                                      {drum.remaining_cable !== undefined &&
                                        drum.remaining_cable > 0 && (
                                          <span className='text-gray-600'>
                                            {" "}
                                            • {drum.remaining_cable.toFixed(1)}m
                                            remaining
                                          </span>
                                        )}
                                      {drum.status === "inactive" &&
                                        drum.remaining_cable &&
                                        drum.remaining_cable > 0 && (
                                          <span className='text-red-600'>
                                            {" "}
                                            (added to waste)
                                          </span>
                                        )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className='flex flex-col'>
                                    <span>
                                      {drum.received_date
                                        ? new Date(
                                            drum.received_date
                                          ).toLocaleDateString()
                                        : "N/A"}
                                    </span>
                                    {drum.last_usage_date && (
                                      <span className='text-xs text-muted-foreground'>
                                        Last used:{" "}
                                        {new Date(
                                          drum.last_usage_date
                                        ).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className='flex flex-col gap-1'>
                                    {role === "admin" ||
                                    role === "moderator" ? (
                                      <Select
                                        value={displayStatus}
                                        onValueChange={(value) =>
                                          updateDrumStatus(
                                            drum.id,
                                            value,
                                            drum.drum_number
                                          )
                                        }
                                      >
                                        <SelectTrigger className='w-[100px] h-7 text-xs'>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value='active'>
                                            Active
                                          </SelectItem>
                                          <SelectItem value='inactive'>
                                            Inactive
                                          </SelectItem>
                                          <SelectItem value='empty'>
                                            Empty
                                          </SelectItem>
                                          <SelectItem value='maintenance'>
                                            Maintenance
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      getStatusBadge(displayStatus)
                                    )}
                                    {displayStatus !== drum.status && (
                                      <Badge
                                        variant='outline'
                                        className='text-xs'
                                      >
                                        DB: {drum.status}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className='text-center align-middle'>
                                  <div className='flex gap-1 justify-center items-center min-h-[32px]'>
                                    <Button
                                      size='icon'
                                      variant='outline'
                                      aria-label='View Usage Details'
                                      className='p-1 h-7 w-7 bg-transparent'
                                      onClick={() => {
                                        setSelectedDrumForUsage(drum);
                                        setDrumUsageModalOpen(true);
                                      }}
                                    >
                                      <SelectTrigger className="w-[100px] h-7 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="empty">Empty</SelectItem>
                                        <SelectItem value="maintenance">Maintenance</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    getStatusBadge(displayStatus)
                                  )}
                                  {drum.suggested_status && (
                                    <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800">
                                      Suggest: {drum.suggested_status}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center align-middle">
                                <div className="flex gap-1 justify-center items-center min-h-[32px]">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    aria-label="View Usage Details"
                                    className="p-1 h-7 w-7 bg-transparent"
                                    onClick={() => {
                                      setSelectedDrumForUsage(drum)
                                      setDrumUsageModalOpen(true)
                                    }}
                                  >
                                    <Cable className="h-4 w-4" />
                                  </Button>
                                  {(role === "admin" || role === "moderator") && (
                                    <>
                                      <Button
                                        size='icon'
                                        variant='ghost'
                                        aria-label='Delete Drum'
                                        className='p-1 h-7 w-7'
                                        onClick={() => {
                                          setDrumToDelete(drum);
                                          setDeleteDrumConfirmOpen(true);
                                        }}
                                      >
                                        <Trash className='h-4 w-4 text-red-500' />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className='text-center py-8 text-muted-foreground'>
                      <BarChart3 className='h-12 w-12 mx-auto mb-4 opacity-50' />
                      <p>No drums found</p>
                      <p className='text-sm'>
                        Add cable drums through invoices to track usage
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='waste'>
              <Card>
                <CardHeader>
                  <CardTitle>Waste Reports</CardTitle>
                  <CardDescription>
                    Track reported waste and reasons
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <div className='text-center py-8'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto'></div>
                      <p className='text-muted-foreground mt-2'>
                        Loading waste reports...
                      </p>
                    </div>
                  ) : wasteReports.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Reported By</TableHead>
                          {role === "admin" && (
                            <TableHead className='w-20 text-center'>
                              Actions
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wasteReports.map((waste) => (
                          <TableRow key={waste.id}>
                            <TableCell>{waste.item_name || "-"}</TableCell>
                            <TableCell>{waste.quantity}</TableCell>
                            <TableCell>{waste.waste_reason}</TableCell>
                            <TableCell>
                              {waste.waste_date
                                ? new Date(
                                    waste.waste_date
                                  ).toLocaleDateString()
                                : "N/A"}
                            </TableCell>
                            <TableCell>{waste.full_name}</TableCell>
                            {role === "admin" && (
                              <TableCell className='text-center'>
                                <Button
                                  size='icon'
                                  variant='ghost'
                                  aria-label='Delete Waste'
                                  className='p-1 h-7 w-7'
                                  onClick={() => {
                                    setWasteToDelete(waste);
                                    setDeleteWasteConfirmOpen(true);
                                  }}
                                >
                                  <Trash className='h-4 w-4 text-red-500' />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className='text-center py-8 text-muted-foreground'>
                      <TrendingDown className='h-12 w-12 mx-auto mb-4 opacity-50' />
                      <p>No waste reports found</p>
                      <p className='text-sm'>
                        Record waste to track inventory loss
                      </p>
                    </div>
                  )}
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
        <EditInventoryInvoiceModal
          open={editInvoiceModalOpen}
          invoice={selectedInvoice}
          invoiceItems={
            selectedInvoice ? invoiceItems[selectedInvoice.id] || [] : []
          }
          onClose={() => setEditInvoiceModalOpen(false)}
          onSuccess={handleSuccess}
          supabase={supabase}
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
          supabase={supabase}
          addNotification={addNotification}
        />
        <EditInventoryItemModal
          open={editItemModalOpen}
          onOpenChange={setEditItemModalOpen}
          item={selectedItem}
          onSuccess={handleSuccess}
        />
        <DrumUsageDetailsModal
          open={drumUsageModalOpen}
          onOpenChange={setDrumUsageModalOpen}
          drumId={selectedDrumForUsage?.id || null}
          drumNumber={selectedDrumForUsage?.drum_number || ""}
          onWastageUpdate={fetchDrums}
        />

        {/* Delete Confirmation Dialogs */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Invoice</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to delete this invoice?</p>
            <DialogFooter>
              <Button
                variant='secondary'
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant='destructive'
                onClick={async () => {
                  if (invoiceToDelete) {
                    try {
                      const { error } = await supabase
                        .from("inventory_invoices")
                        .delete()
                        .eq("id", invoiceToDelete.id);
                      if (error) throw error;
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
            <p>Are you sure you want to delete this drum?</p>
            <DialogFooter>
              <Button
                variant='secondary'
                onClick={() => setDeleteDrumConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant='destructive'
                onClick={async () => {
                  if (drumToDelete) {
                    try {
                      const { error } = await supabase
                        .from("drum_tracking")
                        .delete()
                        .eq("id", drumToDelete.id);
                      if (error) throw error;
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
            <p>Are you sure you want to delete this waste record?</p>
            <DialogFooter>
              <Button
                variant='secondary'
                onClick={() => setDeleteWasteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant='destructive'
                onClick={async () => {
                  if (wasteToDelete) {
                    try {
                      const { error: deleteError } = await supabase
                        .from("waste_tracking")
                        .delete()
                        .eq("id", wasteToDelete.id);
                      if (deleteError) throw deleteError;
                      const { data: itemData, error: fetchError } =
                        await supabase
                          .from("inventory_items")
                          .select("current_stock")
                          .eq("id", wasteToDelete.item_id)
                          .single();
                      if (fetchError) throw fetchError;
                      const currentStock =
                        typeof itemData?.current_stock === "number"
                          ? itemData.current_stock
                          : 0;
                      const newStock = currentStock + wasteToDelete.quantity;
                      const { error: updateError } = await supabase
                        .from("inventory_items")
                        .update({ current_stock: newStock })
                        .eq("id", wasteToDelete.item_id);
                      if (updateError) throw updateError;
                      addNotification({
                        title: "Waste Record Deleted",
                        message: `Waste record deleted and stock restored for ${
                          wasteToDelete.item_name || "item"
                        }`,
                        type: "success",
                        category: "system",
                      });
                      setDeleteWasteConfirmOpen(false);
                      setWasteToDelete(null);
                      handleSuccess();
                    } catch (error) {
                      addNotification({
                        title: "Error",
                        message:
                          "Failed to delete waste record or restore stock",
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
      </SidebarInset>
    </SidebarProvider>
  );
}
