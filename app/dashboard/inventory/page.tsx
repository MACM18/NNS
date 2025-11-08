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
  RefreshCw,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { recalculateAllDrumQuantities } from "@/app/dashboard/integrations/google-sheets/actions";
import {
  calculateSmartWastage,
  calculateLegacyWastage,
  type DrumUsage,
} from "@/lib/drum-wastage-calculator";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

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
  id: string;
  drum_number: string;
  item_id: string;
  initial_quantity: number;
  current_quantity: number;
  calculated_current_quantity?: number;
  calculated_status?: string;
  total_used?: number;
  total_wastage?: number;
  remaining_cable?: number;
  usage_count?: number;
  last_usage_date?: string;
  usages?: any[];
  received_date: string;
  status: string;
  item_name?: string;
  wastage_calculation_method?:
    | "smart_segments"
    | "legacy_gaps"
    | "manual_override";
  manual_wastage_override?: number;
  usageSegments?: { start: number; end: number; length: number }[];
  wastedSegments?: { start: number; end: number; length: number }[];
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
const calculateDrumMetrics = (drum: any, usageData: any[]) => {
  const drumUsages = usageData.filter((usage) => usage.drum_id === drum.id);

  if (drumUsages.length === 0) {
    return {
      totalUsed: 0,
      totalWastage:
        drum.manual_wastage_override ||
        (drum.status === "inactive" ? drum.initial_quantity : 0),
      calculatedCurrentQuantity:
        drum.initial_quantity -
        (drum.manual_wastage_override ||
          (drum.status === "inactive" ? drum.initial_quantity : 0)),
      remainingCable: drum.status === "inactive" ? 0 : drum.initial_quantity,
      calculatedStatus: drum.initial_quantity > 10 ? drum.status : "inactive",
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
  let drumUsageData: DrumUsage[] = drumUsages.map((usage) => ({
    id: usage.id,
    cable_start_point: usage.cable_start_point || 0,
    cable_end_point: usage.cable_end_point || 0,
    usage_date: usage.usage_date,
    quantity_used: usage.quantity_used,
  }));

  // Fallback: if start/end points are missing (zero-length) but quantities exist,
  // synthesize sequential segments based on quantity_used ordered by date
  const hasValidSegments = drumUsageData.some(
    (u) => (u.cable_end_point || 0) !== (u.cable_start_point || 0)
  );
  const hasQuantities = drumUsageData.some(
    (u) => typeof u.quantity_used === "number" && (u.quantity_used || 0) > 0
  );
  if (!hasValidSegments && hasQuantities) {
    const sorted = [...drumUsageData].sort(
      (a, b) =>
        new Date(a.usage_date).getTime() - new Date(b.usage_date).getTime()
    );
    let pos = 0;
    drumUsageData = sorted.map((u) => {
      const len = Number(u.quantity_used || 0);
      const start = pos;
      const end = pos + Math.max(0, len);
      pos = end;
      return {
        ...u,
        cable_start_point: start,
        cable_end_point: end,
      };
    });
  }

  // Use smart calculation by default, with manual override if set
  const calculation = calculateSmartWastage(
    drumUsageData,
    drum.initial_quantity,
    drum.manual_wastage_override,
    drum.status
  );

  // Sort usages by date for UI display
  const sortedUsages = [...drumUsages].sort(
    (a, b) =>
      new Date(a.usage_date).getTime() - new Date(b.usage_date).getTime()
  );

  // Determine status based on calculated quantity
  let calculatedStatus = drum.status;
  if (calculation.calculatedCurrentQuantity <= 0) {
    calculatedStatus = "empty";
  } else if (
    calculation.calculatedCurrentQuantity <= 10 &&
    drum.status !== "inactive"
  ) {
    calculatedStatus = "inactive";
  }

  return {
    totalUsed: calculation.totalUsed,
    totalWastage: calculation.totalWastage,
    calculatedCurrentQuantity: calculation.calculatedCurrentQuantity,
    remainingCable: calculation.remainingCable,
    calculatedStatus,
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
      const { data, error } = await supabase
        .from("drum_tracking")
        .select(
          `id, drum_number, item_id, initial_quantity, current_quantity, received_date, status, 
           wastage_calculation_method, manual_wastage_override, inventory_items(name)`
        )
        .order("received_date", { ascending: false });
      if (error) throw error;

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
        const metrics = calculateDrumMetrics(drum, usageData || []);

        return {
          ...drum,
          item_name: drum.inventory_items?.name || "",
          calculated_current_quantity: metrics.calculatedCurrentQuantity,
          calculated_status: metrics.calculatedStatus,
          total_used: metrics.totalUsed,
          total_wastage: metrics.totalWastage,
          remaining_cable: metrics.remainingCable,
          usage_count: metrics.usageCount,
          last_usage_date: metrics.lastUsageDate,
          usages: metrics.usages,
          usageSegments: metrics.usageSegments,
          wastedSegments: metrics.wastedSegments,
        };
      });

      setDrums(drumsWithUsage as DrumTracking[]);
    } catch (error) {
      console.error("Error fetching drums:", error);
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
      const { error } = await supabase
        .from("drum_tracking")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", drumId);

      if (error) throw error;

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

  const syncDrumQuantity = async (drum: DrumTracking) => {
    try {
      const calculatedQuantity =
        drum.calculated_current_quantity ?? drum.current_quantity;
      const calculatedStatus = drum.calculated_status ?? drum.status;

      const { error } = await supabase
        .from("drum_tracking")
        .update({
          current_quantity: calculatedQuantity,
          status: calculatedStatus,
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
    <div className='space-y-6'>
      {/* Page Header */}
      <div className='flex flex-col gap-4'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold'>
            Inventory Management
          </h1>
          <p className='text-sm sm:text-base text-muted-foreground'>
            Manage stock receipts, drum tracking, and waste reporting
          </p>
        </div>
        <div className='flex flex-col sm:flex-row gap-2'>
          <Button
            onClick={() => setAddWasteModalOpen(true)}
            variant='outline'
            className='w-full sm:w-auto gap-2'
          >
            <TrendingDown className='h-4 w-4' />
            <span className='sm:inline'>Record Waste</span>
          </Button>
          <Button
            onClick={() => setAddInvoiceModalOpen(true)}
            className='w-full sm:w-auto gap-2'
          >
            <Plus className='h-4 w-4' />
            <span className='sm:inline'>Add Invoice</span>
          </Button>
          {(role === "admin" || role === "moderator") && (
            <Button
              onClick={() => setManageItemsModalOpen(true)}
              variant='secondary'
              className='w-full sm:w-auto gap-2'
            >
              <Package className='h-4 w-4' />
              <span className='sm:inline'>Manage Items</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Items</CardTitle>
            <Package className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <>
                <Skeleton className='h-8 w-16 mb-2' />
                <Skeleton className='h-3 w-32' />
              </>
            ) : (
              <>
                <div className='text-2xl font-bold'>{stats.totalItems}</div>
                <p className='text-xs text-muted-foreground'>
                  Active inventory items
                </p>
              </>
            )}
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
            {loadingData ? (
              <>
                <Skeleton className='h-8 w-16 mb-2' />
                <Skeleton className='h-3 w-32' />
              </>
            ) : (
              <>
                <div
                  className={`text-2xl font-bold ${
                    stats.lowStockAlerts > 0 ? "text-orange-600" : ""
                  }`}
                >
                  {stats.lowStockAlerts}
                </div>
                <p className='text-xs text-muted-foreground'>
                  Items below reorder level
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Active Drums</CardTitle>
            <BarChart3 className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <>
                <Skeleton className='h-8 w-16 mb-2' />
                <Skeleton className='h-3 w-32' />
              </>
            ) : (
              <>
                <div className='text-2xl font-bold'>{stats.activeDrums}</div>
                <p className='text-xs text-muted-foreground'>
                  Cable drums in use
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Monthly Waste</CardTitle>
            <TrendingDown className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <>
                <Skeleton className='h-8 w-16 mb-2' />
                <Skeleton className='h-3 w-32' />
              </>
            ) : (
              <>
                <div className='text-2xl font-bold'>
                  {`${stats.monthlyWastePercentage}%`}
                </div>
                <p className='text-xs text-muted-foreground'>
                  Of total inventory
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue='invoices' className='space-y-6'>
        <TabsList className='w-full grid grid-cols-2 sm:grid-cols-4 gap-1 h-auto p-1'>
          <TabsTrigger value='invoices' className='text-xs sm:text-sm'>
            Invoices
          </TabsTrigger>
          <TabsTrigger value='stock' className='text-xs sm:text-sm'>
            Stock
          </TabsTrigger>
          <TabsTrigger value='drums' className='text-xs sm:text-sm'>
            Drums
          </TabsTrigger>
          <TabsTrigger value='waste' className='text-xs sm:text-sm'>
            Waste
          </TabsTrigger>
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
                <TableSkeleton columns={7} rows={6} />
              ) : invoices.length > 0 ? (
                <div className='overflow-x-auto -mx-4 sm:mx-0'>
                  <div className='inline-block min-w-full align-middle'>
                    <div className='overflow-hidden'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className='min-w-[120px]'>
                              Invoice Number
                            </TableHead>
                            <TableHead className='min-w-[100px]'>
                              Warehouse
                            </TableHead>
                            <TableHead className='min-w-[100px]'>
                              Date
                            </TableHead>
                            <TableHead className='min-w-[60px]'>
                              Items
                            </TableHead>
                            <TableHead className='min-w-[100px]'>
                              Issued By
                            </TableHead>
                            <TableHead className='min-w-[80px]'>
                              Status
                            </TableHead>
                            <TableHead className='min-w-[120px] text-center'>
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
                                              <TableHead>
                                                Qty Requested
                                              </TableHead>
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
                    </div>
                  </div>
                </div>
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
                <TableSkeleton columns={7} rows={6} />
              ) : inventoryItems.length > 0 ? (
                <div className='overflow-x-auto -mx-4 sm:mx-0'>
                  <div className='inline-block min-w-full align-middle'>
                    <div className='overflow-hidden'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className='min-w-[150px]'>
                              Item Name
                            </TableHead>
                            <TableHead className='min-w-[100px]'>
                              Current Stock
                            </TableHead>
                            <TableHead className='min-w-[60px]'>Unit</TableHead>
                            <TableHead className='min-w-[100px]'>
                              Reorder Level
                            </TableHead>
                            <TableHead className='min-w-[100px]'>
                              Status
                            </TableHead>
                            <TableHead className='min-w-[120px]'>
                              Last Updated
                            </TableHead>
                            <TableHead className='min-w-[80px] text-right'>
                              Actions
                            </TableHead>
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
                    </div>
                  </div>
                </div>
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
                Cable drum usage and remaining quantities with enhanced tracking
                logic
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
                {(role === "admin" || role === "moderator") && (
                  <Button
                    variant='secondary'
                    size='sm'
                    onClick={async () => {
                      try {
                        // Retrieve the Supabase access token to authorize the server action
                        const { data: sessionData } =
                          await supabase.auth.getSession();
                        const accessToken = sessionData?.session?.access_token;

                        if (!accessToken) {
                          throw new Error(
                            "Missing access token. Please sign in again and try."
                          );
                        }

                        await recalculateAllDrumQuantities(accessToken);
                        addNotification({
                          title: "Success",
                          message:
                            "All drum quantities recalculated successfully",
                          type: "success",
                          category: "system",
                        });
                        handleSuccess();
                      } catch (error: any) {
                        const msg =
                          error?.message ||
                          "Failed to recalculate drum quantities";
                        addNotification({
                          title: "Error",
                          message: msg,
                          type: "error",
                          category: "system",
                        });
                      }
                    }}
                    className='gap-2'
                  >
                    <RefreshCw className='h-4 w-4' />
                    Recalculate All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <TableSkeleton columns={8} rows={6} />
              ) : drums.length > 0 ? (
                <div className='overflow-x-auto -mx-4 sm:mx-0'>
                  <div className='inline-block min-w-full align-middle'>
                    <div className='overflow-hidden'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className='min-w-[120px]'>
                              Drum Number
                            </TableHead>
                            <TableHead className='min-w-[150px]'>
                              Item
                            </TableHead>
                            <TableHead className='min-w-[90px]'>
                              Initial Qty
                            </TableHead>
                            <TableHead className='min-w-[100px]'>
                              Current Qty
                            </TableHead>
                            <TableHead className='min-w-[140px]'>
                              Usage %
                            </TableHead>
                            <TableHead className='min-w-[120px]'>
                              Received Date
                            </TableHead>
                            <TableHead className='min-w-[120px]'>
                              Status
                            </TableHead>
                            <TableHead className='min-w-[150px] text-center'>
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
                              const displayQuantity =
                                drum.calculated_current_quantity ?? 0;
                              const displayStatus = drum.status;
                              const totalUsed = drum.total_used ?? 0;
                              const totalWastage = drum.total_wastage ?? 0;
                              const usagePercentage =
                                drum.initial_quantity > 0
                                  ? (
                                      ((totalUsed + totalWastage) /
                                        drum.initial_quantity) *
                                      100
                                    ).toFixed(1)
                                  : "0.0";

                              return (
                                <TableRow key={drum.id}>
                                  <TableCell className='font-mono'>
                                    {drum.drum_number}
                                  </TableCell>
                                  <TableCell>{drum.item_name || "-"}</TableCell>
                                  <TableCell>
                                    {drum.initial_quantity}m
                                  </TableCell>
                                  <TableCell>
                                    <div className='flex flex-col'>
                                      <span className='text-blue-600 font-medium'>
                                        {displayQuantity.toFixed(1)}m
                                      </span>
                                      <span className='text-xs text-muted-foreground'>
                                        (Calculated)
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className='flex items-center gap-2'>
                                      <span>{usagePercentage}%</span>
                                      <div className='flex flex-col gap-1'>
                                        <div className='w-24 h-2 bg-gray-200 rounded-full overflow-hidden relative'>
                                          {/* Composite bar: green usage segments */}
                                          {drum.usageSegments &&
                                            drum.initial_quantity > 0 &&
                                            drum.usageSegments.map((seg, i) => (
                                              <div
                                                key={`u-${i}`}
                                                className='absolute top-0 h-full bg-green-500/80'
                                                style={{
                                                  left: `${
                                                    (seg.start /
                                                      drum.initial_quantity) *
                                                    100
                                                  }%`,
                                                  width: `${
                                                    (seg.length /
                                                      drum.initial_quantity) *
                                                    100
                                                  }%`,
                                                }}
                                                title={`Used ${seg.length.toFixed(
                                                  1
                                                )}m (${seg.start.toFixed(
                                                  1
                                                )}-${seg.end.toFixed(1)})`}
                                              />
                                            ))}

                                          {/* Remaining (implicit background) */}
                                        </div>
                                      </div>
                                    </div>
                                    {drum.usage_count &&
                                      drum.usage_count > 0 && (
                                        <div className='text-xs text-muted-foreground mt-1'>
                                          {drum.usage_count} installation
                                          {drum.usage_count !== 1 ? "s" : ""}
                                          {totalWastage > 0 && (
                                            <>
                                              <span className='text-orange-600'>
                                                {" "}
                                                • {totalWastage.toFixed(1)}m
                                                waste
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
                                                •{" "}
                                                {drum.remaining_cable.toFixed(
                                                  1
                                                )}
                                                m remaining
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
                                        <Cable className='h-4 w-4' />
                                      </Button>
                                      {(role === "admin" ||
                                        role === "moderator") && (
                                        <>
                                          <Button
                                            size='icon'
                                            variant='ghost'
                                            aria-label='Edit Drum'
                                            className='p-1 h-7 w-7'
                                            onClick={() => {
                                              setSelectedDrum(drum);
                                              setEditDrumModalOpen(true);
                                            }}
                                          >
                                            <Pencil className='h-4 w-4' />
                                          </Button>
                                          {displayQuantity !==
                                            drum.current_quantity && (
                                            <Button
                                              size='icon'
                                              variant='secondary'
                                              aria-label='Sync Database'
                                              className='p-1 h-7 w-7'
                                              onClick={() =>
                                                syncDrumQuantity(drum)
                                              }
                                            >
                                              <Package className='h-4 w-4' />
                                            </Button>
                                          )}
                                        </>
                                      )}
                                      {role === "admin" && (
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
                    </div>
                  </div>
                </div>
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
                <TableSkeleton columns={role === "admin" ? 6 : 5} rows={6} />
              ) : wasteReports.length > 0 ? (
                <div className='overflow-x-auto -mx-4 sm:mx-0'>
                  <div className='inline-block min-w-full align-middle'>
                    <div className='overflow-hidden'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className='min-w-[150px]'>
                              Item
                            </TableHead>
                            <TableHead className='min-w-[80px]'>
                              Quantity
                            </TableHead>
                            <TableHead className='min-w-[200px]'>
                              Reason
                            </TableHead>
                            <TableHead className='min-w-[100px]'>
                              Date
                            </TableHead>
                            <TableHead className='min-w-[120px]'>
                              Reported By
                            </TableHead>
                            {role === "admin" && (
                              <TableHead className='min-w-[80px] text-center'>
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
                    </div>
                  </div>
                </div>
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
                    // Delete dependent invoice items first to avoid FK violations
                    const { error: itemsError } = await supabase
                      .from("inventory_invoice_items")
                      .delete()
                      .eq("invoice_id", invoiceToDelete.id);
                    if (itemsError) throw itemsError;

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
                    // Delete dependent drum_usage rows first to avoid FK violations
                    const { error: usageError } = await supabase
                      .from("drum_usage")
                      .delete()
                      .eq("drum_id", drumToDelete.id);
                    if (usageError) throw usageError;

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
                    const { data: itemData, error: fetchError } = await supabase
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
