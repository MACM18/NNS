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
  Search,
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
import { useAuth } from "@/contexts/auth-context";
import { AuthWrapper } from "@/components/auth/auth-wrapper";
import { useNotification } from "@/contexts/notification-context";
import { recalculateAllDrumQuantities } from "@/app/dashboard/integrations/google-sheets/actions";
import { AddDrumModal } from "@/components/modals/add-drum-modal";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

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
  received_date: string;
  status: string;
  item_name?: string;
  // Legacy/Calculated fields (kept optional to avoid breaking other components temporarily)
  calculated_current_quantity?: number;
  calculated_status?: string;
  total_used?: number;
  total_wastage?: number;
  remaining_cable?: number;
  usage_count?: number;
  last_usage_date?: string;
  usages?: any[];
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
// Simplified drum metrics - removed complex usage tracking
// const calculateDrumMetrics = (drum: any, usageData: any[]) => { ... };

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
  const [addDrumModalOpen, setAddDrumModalOpen] = useState(false);


  const { addNotification } = useNotification();

  const [searchDrumQuery, setSearchDrumQuery] = useState("");
  const [drumStatusFilter, setDrumStatusFilter] = useState("all");

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
      // Simplied: Fetch drums without complex usage calculation
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

  const syncDrumQuantity = async (drum: DrumTracking) => {
    try {
      const calculatedQuantity =
        drum.calculated_current_quantity ?? drum.current_quantity;
      const calculatedStatus = drum.calculated_status ?? drum.status;

      const response = await fetch(`/api/drums/${drum.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_quantity: calculatedQuantity,
          status: calculatedStatus,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error("Failed to sync drum quantity");

      addNotification({
        title: "Success",
        message: `Drum ${drum.drum_number
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

  const filteredDrums = drums.filter((drum) => {
    const matchesSearch =
      drum.drum_number.toLowerCase().includes(searchDrumQuery.toLowerCase()) ||
      (drum.item_name || "").toLowerCase().includes(searchDrumQuery.toLowerCase());
    const matchesStatus =
      drumStatusFilter === "all"
        ? true
        : drum.status === drumStatusFilter;
    return matchesSearch && matchesStatus;
  });

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
                  className={`text-2xl font-bold ${stats.lowStockAlerts > 0 ? "text-orange-600" : ""
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
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <CardTitle>Drum Inventory</CardTitle>
                  <CardDescription>
                    Manage cable drums and their status
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => setAddDrumModalOpen(true)}
                    size="sm"
                    className="h-9 gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">New Drum</span>
                  </Button>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search drums..."
                      value={searchDrumQuery}
                      onChange={(e) => setSearchDrumQuery(e.target.value)}
                      className="pl-8 w-full sm:w-[200px]"
                    />
                  </div>
                  <Select
                    value={drumStatusFilter}
                    onValueChange={setDrumStatusFilter}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="empty">Empty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <TableSkeleton columns={6} rows={6} />
              ) : filteredDrums.length > 0 ? (
                <div className='overflow-x-auto -mx-4 sm:mx-0'>
                  <div className='inline-block min-w-full align-middle'>
                    <div className='overflow-hidden'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Drum Number</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Initial Qty</TableHead>
                            <TableHead>Current Qty</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className='text-right'>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDrums.map((drum) => (
                            <TableRow key={drum.id}>
                              <TableCell className='font-mono'>
                                {drum.drum_number}
                              </TableCell>
                              <TableCell>{drum.item_name || "-"}</TableCell>
                              <TableCell>{drum.initial_quantity}m</TableCell>
                              <TableCell>{drum.current_quantity}m</TableCell>
                              <TableCell>{getStatusBadge(drum.status)}</TableCell>
                              <TableCell className='text-right'>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedDrum(drum);
                                      setEditDrumModalOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  {/* Quick Status Toggle */}
                                  {drum.status === 'active' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Mark Inactive"
                                      onClick={() => updateDrumStatus(drum.id, 'inactive', drum.drum_number)}
                                    >
                                      <ToggleRight className="h-4 w-4 text-green-600" />
                                    </Button>
                                  )}
                                  {drum.status === 'inactive' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Mark Active"
                                      onClick={() => updateDrumStatus(drum.id, 'active', drum.drum_number)}
                                    >
                                      <ToggleLeft className="h-4 w-4 text-orange-600" />
                                    </Button>
                                  )}
                                </div>
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
                  <Package className='h-12 w-12 mx-auto mb-4 opacity-50' />
                  <p>No drums match your filter</p>
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
                    const response = await fetch(
                      `/api/inventory/waste/${wasteToDelete.id}`,
                      { method: "DELETE" }
                    );
                    if (!response.ok)
                      throw new Error("Failed to delete waste record");
                    addNotification({
                      title: "Waste Record Deleted",
                      message: `Waste record deleted and stock restored for ${wasteToDelete.item_name || "item"
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
