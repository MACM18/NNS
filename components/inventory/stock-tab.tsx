"use client";

import React from "react";
import { Search, Pencil, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InventoryItem } from "@/app/dashboard/inventory/page";

interface StockTabProps {
  inventoryItems: InventoryItem[];
  loadingData: boolean;
  role: string | null;
  onEdit: (item: InventoryItem) => void;
  getStockStatus: (currentStock: number, reorderLevel: number) => React.ReactNode;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
}

export function StockTab({
  inventoryItems,
  loadingData,
  role,
  onEdit,
  getStockStatus,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
}: StockTabProps) {
  // Filter inventory items based on search and status
  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isLow = item.current_stock <= (item.reorder_level || 0);
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "low"
        ? isLow
        : !isLow;
    return matchesSearch && matchesStatus;
  });

  return (
    <Card className="glass-card border-border/40 overflow-hidden">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold">Current Stock Levels</CardTitle>
            <CardDescription>
              Real-time inventory status with reorder alerts
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stock..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 w-full sm:w-[220px] bg-background/50 border-border/40 focus:border-primary/50"
              />
            </div>
            {/* Status select */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9 bg-background/50 border-border/40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="ok">Normal Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loadingData ? (
          <TableSkeleton columns={7} rows={6} />
        ) : filteredItems.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[160px]">Item Name</TableHead>
                      <TableHead className="min-w-[100px]">Current Stock</TableHead>
                      <TableHead className="min-w-[60px]">Unit</TableHead>
                      <TableHead className="min-w-[100px]">Reorder Level</TableHead>
                      <TableHead className="min-w-[140px]">Stock Gauge</TableHead>
                      <TableHead className="min-w-[110px]">Status</TableHead>
                      <TableHead className="min-w-[110px]">Last Updated</TableHead>
                      {role === "admin" && (
                        <TableHead className="min-w-[60px] text-right">
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const reorderVal = item.reorder_level || 1;
                      const percentOfReorder = item.reorder_level && item.reorder_level > 0
                        ? Math.round((item.current_stock / item.reorder_level) * 100)
                        : 150;

                      // Determine color scale
                      let progressColor = "bg-green-500";
                      if (percentOfReorder < 100) {
                        progressColor = "bg-red-500";
                      } else if (percentOfReorder < 150) {
                        progressColor = "bg-yellow-500";
                      }

                      // Width is ratio of stock to 1.5x reorder level
                      const widthPercent = Math.min((item.current_stock / (reorderVal * 1.5)) * 100, 100);

                      return (
                        <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-semibold">{item.name}</TableCell>
                          <TableCell className="font-mono tabular-nums">{item.current_stock}</TableCell>
                          <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                          <TableCell className="font-mono tabular-nums text-muted-foreground">
                            {item.reorder_level || 0}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 w-full max-w-[140px]">
                              <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden border border-border/20">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                                  style={{ width: `${widthPercent}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono font-medium">
                                {item.reorder_level && item.reorder_level > 0
                                  ? `${percentOfReorder}% of reorder`
                                  : "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{getStockStatus(item.current_stock, item.reorder_level || 0)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.last_updated
                              ? new Date(item.last_updated).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                          {role === "admin" && (
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label="Edit Item"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => onEdit(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-sm">No inventory items found</p>
            <p className="text-xs mt-1">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search filters"
                : "Add items through invoices to track stock levels"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
