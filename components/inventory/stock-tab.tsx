"use client";

import React, { useMemo, useState } from "react";
import { BarChart3, Check, Package, Pencil, Search, SlidersHorizontal, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InventoryItem } from "@/app/dashboard/inventory/page";

interface StockTabProps {
  inventoryItems: InventoryItem[];
  loadingData: boolean;
  error?: string;
  role: string | null;
  onEdit: (item: InventoryItem) => void;
  onAddReceipt?: () => void;
  onOpenMaterialBalance?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
}

type StockStatus = "out" | "critical" | "low" | "normal";
type SortMode = "attention" | "name" | "updated";

function getStockStatusKey(item: InventoryItem): StockStatus {
  if (item.current_stock <= 0) return "out";
  if (item.reorder_level > 0 && item.current_stock / item.reorder_level <= 1) return "critical";
  if (item.reorder_level > 0 && item.current_stock / item.reorder_level < 1.5) return "low";
  return "normal";
}

function getStatusText(status: StockStatus) {
  if (status === "out") return "Out of stock";
  if (status === "critical") return "Critical";
  if (status === "low") return "Low stock";
  return "Normal";
}

function getStatusClasses(status: StockStatus) {
  if (status === "out" || status === "critical") return "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400";
  if (status === "low") return "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
}

function StockGauge({ item, status }: { item: InventoryItem; status: StockStatus }) {
  const percent = item.reorder_level > 0 ? Math.round((item.current_stock / item.reorder_level) * 100) : null;
  const width = percent === null ? (item.current_stock > 0 ? 100 : 0) : Math.max(0, Math.min(percent / 1.5, 100));
  const color = status === "normal" ? "bg-emerald-500" : status === "low" ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex w-full max-w-[150px] flex-col gap-1">
      <div className="h-2 w-full overflow-hidden rounded-full border border-border/20 bg-muted/40" aria-hidden="true">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
        {percent === null ? (item.current_stock > 0 ? "No reorder level" : "No stock") : `${percent}% of reorder`}
      </span>
    </div>
  );
}

function StockStatusBadge({ status }: { status: StockStatus }) {
  return <Badge variant="outline" className={`font-semibold ${getStatusClasses(status)}`}>{getStatusText(status)}</Badge>;
}

export function StockTab({
  inventoryItems,
  loadingData,
  error,
  role,
  onEdit,
  onAddReceipt,
  onOpenMaterialBalance,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
}: StockTabProps) {
  const [sortMode, setSortMode] = useState<SortMode>("attention");
  const canEditItems = role === "admin" || role === "moderator" || role === "superadmin";
  const statusCounts = useMemo(() => inventoryItems.reduce<Record<StockStatus, number>>((counts, item) => {
    counts[getStockStatusKey(item)] += 1;
    return counts;
  }, { out: 0, critical: 0, low: 0, normal: 0 }), [inventoryItems]);

  const filteredItems = useMemo(() => {
    const filtered = inventoryItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const status = getStockStatusKey(item);
      const matchesStatus = statusFilter === "all"
        ? true
        : statusFilter === "attention"
          ? status !== "normal"
          : status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name);
      if (sortMode === "updated") return new Date(b.last_updated || 0).getTime() - new Date(a.last_updated || 0).getTime();
      const rank: Record<StockStatus, number> = { out: 0, critical: 1, low: 2, normal: 3 };
      return rank[getStockStatusKey(a)] - rank[getStockStatusKey(b)] || a.current_stock - b.current_stock;
    });
  }, [inventoryItems, searchQuery, sortMode, statusFilter]);

  const hasFilters = Boolean(searchQuery || statusFilter !== "all");
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  return (
    <Card className="glass-card overflow-hidden border-border/40">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-base font-bold">Stock on hand</CardTitle>
            <CardDescription>Current quantities compared with each item&apos;s reorder level.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{inventoryItems.length} item{inventoryItems.length === 1 ? "" : "s"}</span>
            <span aria-hidden="true">·</span>
            <span>{statusCounts.normal} healthy</span>
            {statusCounts.out + statusCounts.critical + statusCounts.low > 0 && (
              <Badge variant="outline" className="border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400">
                {statusCounts.out + statusCounts.critical + statusCounts.low} need attention
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search item name"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-9 bg-background/50 pl-8"
                aria-label="Search inventory items"
              />
            </div>
            <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
              <SelectTrigger className="h-9 w-full bg-background/50 sm:w-[170px]" aria-label="Sort stock items">
                <SlidersHorizontal className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="attention">Needs attention first</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
                <SelectItem value="updated">Recently updated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 justify-start gap-1.5 px-2 text-muted-foreground sm:justify-center">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear filters
            </Button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Stock status filters">
          {[
            ["all", "All", inventoryItems.length],
            ["attention", "Needs attention", statusCounts.out + statusCounts.critical + statusCounts.low],
            ["out", "Out of stock", statusCounts.out],
            ["critical", "Critical", statusCounts.critical],
            ["low", "Low", statusCounts.low],
            ["normal", "Normal", statusCounts.normal],
          ].map(([value, label, count]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={statusFilter === value ? "secondary" : "ghost"}
              onClick={() => setStatusFilter(String(value))}
              className="h-8 shrink-0 gap-1.5 rounded-full px-3 text-xs"
              aria-pressed={statusFilter === value}
            >
              {statusFilter === value && <Check className="h-3 w-3" aria-hidden="true" />}
              {label}
              <span className="text-muted-foreground">{count}</span>
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-300" role="alert">{error}</div>
        ) : loadingData ? (
          <TableSkeleton columns={5} rows={6} />
        ) : filteredItems.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>On hand</TableHead>
                    <TableHead>Reorder level</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Updated</TableHead>
                    {canEditItems && <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const status = getStockStatusKey(item);
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="rounded-md bg-muted/60 p-1.5 text-muted-foreground"><Package className="h-4 w-4" aria-hidden="true" /></div>
                            <div>
                              <p className="font-semibold">{item.name}</p>
                              <p className="text-xs text-muted-foreground">Measured in {item.unit}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-sm font-bold tabular-nums ${item.current_stock < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{item.current_stock}</span>
                            <span className="text-xs text-muted-foreground">{item.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">{item.reorder_level || 0} {item.unit}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <StockGauge item={item} status={status} />
                            <StockStatusBadge status={status} />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.last_updated ? new Date(item.last_updated).toLocaleDateString() : "Not recorded"}</TableCell>
                        {canEditItems && <TableCell className="text-right"><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}><Pencil className="h-4 w-4" /></Button></TableCell>}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="grid gap-3 md:hidden">
              {filteredItems.map((item) => {
                const status = getStockStatusKey(item);
                return (
                  <div key={item.id} className="rounded-xl border bg-card/60 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Reorder at {item.reorder_level || 0} {item.unit}</p>
                      </div>
                      <StockStatusBadge status={status} />
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className={`font-mono text-2xl font-bold tabular-nums ${item.current_stock < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{item.current_stock}</p>
                        <p className="text-xs text-muted-foreground">{item.unit} on hand</p>
                      </div>
                      <StockGauge item={item} status={status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                      <span>Updated {item.last_updated ? new Date(item.last_updated).toLocaleDateString() : "not recorded"}</span>
                      {canEditItems && <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" />Edit</Button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center sm:p-12">
            <BarChart3 className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
            <p className="font-semibold text-sm">{hasFilters ? "No stock matches these filters" : "No inventory items yet"}</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              {hasFilters ? "Try clearing a filter or searching for another item." : "Add a receipt or run the Google Sheets Material Balance sync to start tracking stock."}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {hasFilters && <Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button>}
              {!hasFilters && onAddReceipt && <Button size="sm" onClick={onAddReceipt}>Add receipt</Button>}
              {!hasFilters && onOpenMaterialBalance && <Button size="sm" variant="outline" onClick={onOpenMaterialBalance}>Open Material Balance</Button>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
