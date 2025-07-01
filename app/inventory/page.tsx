"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Package,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Eye,
  ChevronDown,
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
import { AddInventoryInvoiceModal } from "@/components/modals/add-inventory-invoice-modal";
import { AddWasteModal } from "@/components/modals/add-waste-modal";
import { ManageInventoryItemsModal } from "@/components/modals/manage-inventory-items-modal";
import { EditInventoryInvoiceModal } from "@/components/modals/edit-inventory-invoice-modal";
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
  item_type: string;
  current_stock: number;
  reorder_level: number;
  last_updated: string;
}

// Fix DrumTracking and WasteReport interfaces to use item_id, and join to inventory_items for name
interface DrumTracking {
  id: string;
  drum_number: string;
  item_id: string;
  initial_quantity: number;
  current_quantity: number;
  received_date: string;
  status: string;
  item_name?: string; // populated via join
}

interface WasteReport {
  id: string;
  item_id: string;
  quantity: number;
  waste_reason: string;
  waste_date: string;
  reported_by: string;
  created_at: string;
  item_name?: string; // populated via join
}

// Update the interface to match your DB columns
interface InventoryInvoiceItem {
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
      // Get total items
      const { count: totalItems } = await supabase
        .from("inventory_items")
        .select("*", { count: "exact", head: true });

      // // Get low stock alerts
      // const { count: lowStockAlerts } = await supabase
      //   .from("inventory_items")
      //   .select("*", { count: "exact", head: true })
      //   .lt("current_stock", "reorder_level");
      // // ...existing code...
      // Get low stock alerts
      const { data: lowStockData, error: lowStockError } = await supabase.rpc(
        "low_stock_alert_count"
      );
      const lowStockAlerts = lowStockData ?? 0;
      // ...existing code...
      // Get active drums
      const { count: activeDrums } = await supabase
        .from("drum_tracking")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Calculate monthly waste percentage
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM format
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // getMonth() is zero-based

      // Calculate the last day of the current month
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
          ? data.filter(
              (d): d is InventoryInvoice =>
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
          ? data.filter(
              (d): d is InventoryItem =>
                d &&
                typeof d.id === "string" &&
                typeof d.name === "string" &&
                typeof d.unit === "string" &&
                typeof d.item_type === "string" &&
                typeof d.current_stock === "number" &&
                typeof d.reorder_level === "number" &&
                typeof d.last_updated === "string"
            )
          : []
      );
    } catch (error) {
      console.error("Error fetching inventory items:", error);
    }
  };

  // Fix: Remove broken left join select for drum_tracking and waste_tracking
  const fetchDrums = async () => {
    try {
      const { data, error } = await supabase
        .from("drum_tracking")
        .select(
          `id, drum_number, item_id, initial_quantity, current_quantity, received_date, status, inventory_items(name)`
        )
        .order("received_date", { ascending: false });
      if (error) throw error;
      // Map item_name from join
      const drumsWithName = (data || []).map((drum: any) => ({
        ...drum,
        item_name: drum.inventory_items?.name || "",
      }));
      setDrums(drumsWithName as DrumTracking[]);
    } catch (error) {
      console.error("Error fetching drums:", error);
    }
  };

  // Update fetchWasteReports to join inventory_items for item_name
  const fetchWasteReports = async () => {
    try {
      const { data, error } = await supabase
        .from("waste_tracking")
        .select(
          `id, item_id, quantity, waste_reason, waste_date, reported_by, created_at, inventory_items(name)`
        )
        .order("waste_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      // Map item_name from join
      const wasteWithName = (data || []).map((w: any) => ({
        ...w,
        item_name: w.inventory_items?.name || "",
      }));
      setWasteReports(wasteWithName as WasteReport[]);
    } catch (error) {
      console.error("Error fetching waste reports:", error);
    }
  };

  const fetchInvoiceItems = async (invoiceId: string) => {
    if (invoiceItems[invoiceId]) return; // Already fetched
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
                          <TableHead>Actions</TableHead>
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
                              <TableCell>
                                <div className='flex gap-2'>
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
                                        // Ensure invoice items are fetched before opening modal
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
                          <TableHead>Type</TableHead>
                          <TableHead>Current Stock</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Reorder Level</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className='font-medium'>
                              {item.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant='outline'>{item.item_type}</Badge>
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
                    Cable drum usage and remaining quantities
                  </CardDescription>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drums.map((drum) => {
                          const usagePercentage =
                            drum.initial_quantity > 0
                              ? (
                                  ((drum.initial_quantity -
                                    drum.current_quantity) /
                                    drum.initial_quantity) *
                                  100
                                ).toFixed(1)
                              : "0.0";
                          return (
                            <TableRow key={drum.id}>
                              <TableCell>{drum.drum_number}</TableCell>
                              <TableCell>{drum.item_name || "-"}</TableCell>
                              <TableCell>{drum.initial_quantity}</TableCell>
                              <TableCell>{drum.current_quantity}</TableCell>
                              <TableCell>{usagePercentage}%</TableCell>
                              <TableCell>
                                {drum.received_date
                                  ? new Date(
                                      drum.received_date
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(drum.status)}
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
                            <TableCell>{waste.reported_by}</TableCell>
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
        />
        <ManageInventoryItemsModal
          open={manageItemsModalOpen}
          onOpenChange={setManageItemsModalOpen}
          userRole={role}
        />
        {/* Delete Confirmation Dialog */}
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
      </SidebarInset>
    </SidebarProvider>
  );
}
