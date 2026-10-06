"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Check, Package, Pencil, RefreshCw, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InventoryItem } from "@/app/dashboard/inventory/page";

interface StockTabProps {
  inventoryItems: InventoryItem[];
  loadingData: boolean;
  error?: string;
  role: string | null;
  onEdit: (item: InventoryItem) => void;
  onDelete?: (item: InventoryItem) => void;
  onAddReceipt?: () => void;
  onOpenMaterialBalance?: () => void;
  onRefreshFromSheet?: (updatedCount: number, sourceDate: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
}

type StockStatus = "out" | "critical" | "low" | "normal";
type SortMode = "attention" | "name" | "updated";
type SheetRefreshPreview = {
  previewId: string;
  sheetName: string;
  sheetUrl: string;
  period: string;
  sourceDate: string;
  matchedCount: number;
  changedCount: number;
  unchangedCount: number;
  skipped: Array<{ itemName: string; reason: string }>;
  rows: Array<{ inventoryItemId: string; itemName: string; unit: string; sourceDate: string; currentStock: number; sheetStock: number; delta: number }>;
};

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

function getStatusAccent(status: StockStatus) {
  if (status === "out" || status === "critical") return "bg-red-500";
  if (status === "low") return "bg-amber-500";
  return "bg-emerald-500";
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

function StockStatusBadge({ status, negative = false }: { status: StockStatus; negative?: boolean }) {
  if (negative) return <Badge variant="outline" className="border-red-500/30 bg-red-500/10 font-semibold text-red-600 dark:text-red-400">Negative stock</Badge>;
  return <Badge variant="outline" className={`font-semibold ${getStatusClasses(status)}`}>{getStatusText(status)}</Badge>;
}

export function StockTab({
  inventoryItems,
  loadingData,
  error,
  role,
  onEdit,
  onDelete,
  onAddReceipt,
  onOpenMaterialBalance,
  onRefreshFromSheet,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
}: StockTabProps) {
  const [sortMode, setSortMode] = useState<SortMode>("attention");
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [refreshApplying, setRefreshApplying] = useState(false);
  const [refreshConfirmed, setRefreshConfirmed] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshPreview, setRefreshPreview] = useState<SheetRefreshPreview | null>(null);
  const canEditItems = ["admin", "moderator", "superadmin"].includes((role || "").toLowerCase());
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
  const prepareSheetRefresh = async () => {
    setRefreshLoading(true);
    setRefreshError(null);
    setRefreshPreview(null);
    setRefreshConfirmed(false);
    setRefreshDialogOpen(true);
    try {
      const response = await fetch("/api/inventory/refresh-from-sheet/preview", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not read current sheet balances.");
      setRefreshPreview(result.data);
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "Could not read current sheet balances.");
    } finally {
      setRefreshLoading(false);
    }
  };

  const applySheetRefresh = async () => {
    if (!refreshPreview || !refreshConfirmed) return;
    setRefreshApplying(true);
    setRefreshError(null);
    try {
      const response = await fetch("/api/inventory/refresh-from-sheet/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId: refreshPreview.previewId, confirmed: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update inventory.");
      setRefreshDialogOpen(false);
      setRefreshPreview(null);
      setRefreshConfirmed(false);
      onRefreshFromSheet?.(result.data.updatedCount, result.data.sourceDate);
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "Could not update inventory.");
    } finally {
      setRefreshApplying(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  return (
    <Card className="glass-card overflow-hidden rounded-3xl border-border/40 shadow-xs">
      <CardHeader className="space-y-5 border-b border-border/40 bg-muted/12">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Stock on hand</CardTitle>
            <CardDescription>Search, review health, and manage each operational stock item.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEditItems && (
              <Button type="button" variant="outline" size="sm" onClick={prepareSheetRefresh} disabled={refreshLoading} className="h-9 gap-2 rounded-xl">
                <RefreshCw className={`h-3.5 w-3.5 ${refreshLoading ? "animate-spin" : ""}`} aria-hidden="true" />
                Refresh from current sheet
              </Button>
            )}
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
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search materials and stock items"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-11 rounded-xl bg-background/80 pl-9 shadow-xs"
                aria-label="Search inventory items"
              />
            </div>
            <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
              <SelectTrigger className="h-11 w-full rounded-xl bg-background/80 sm:w-[190px]" aria-label="Sort stock items">
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
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-11 justify-start gap-1.5 rounded-xl px-3 text-muted-foreground sm:justify-center">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear filters
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" role="group" aria-label="Stock status filters">
          {[
            ["all", "All", inventoryItems.length],
            ["attention", "Needs attention", statusCounts.out + statusCounts.critical + statusCounts.low],
            ["out", "Out of stock", statusCounts.out],
            ["critical", "Critical", statusCounts.critical],
            ["low", "Low", statusCounts.low],
            ["normal", "Normal", statusCounts.normal],
          ].map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(String(value))}
              className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${statusFilter === value ? "border-primary/30 bg-background shadow-xs" : "border-border/40 bg-background/35 hover:border-border hover:bg-background/60"}`}
              aria-pressed={statusFilter === value}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 truncate text-[11px] font-semibold text-muted-foreground">
                  {statusFilter === value && <Check className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />}
                  {label}
                </span>
              </span>
              <span className="text-lg font-black tabular-nums text-foreground">{count}</span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {error ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-300" role="alert">{error}</div>
        ) : loadingData ? (
          <TableSkeleton columns={5} rows={6} />
        ) : filteredItems.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto rounded-2xl border border-border/50 md:block">
              <Table>
                <TableHeader className="bg-muted/30">
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
                      <TableRow key={item.id} className="group hover:bg-muted/25">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="relative rounded-lg bg-muted/60 p-2 text-muted-foreground">
                              <Package className="h-4 w-4" aria-hidden="true" />
                              <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${getStatusAccent(status)}`} aria-hidden="true" />
                            </div>
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
                            <StockStatusBadge status={status} negative={item.current_stock < 0} />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.last_updated ? new Date(item.last_updated).toLocaleDateString() : "Not recorded"}</TableCell>
                        {canEditItems && <TableCell className="text-right"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}><Pencil className="h-4 w-4" /></Button>{onDelete && <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(item)} aria-label={`Remove ${item.name}`}><Trash2 className="h-4 w-4" /></Button>}</div></TableCell>}
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
                  <div key={item.id} className="relative overflow-hidden rounded-2xl border bg-card/70 p-4 pl-5 shadow-xs">
                    <span className={`absolute inset-y-0 left-0 w-1 ${getStatusAccent(status)}`} aria-hidden="true" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Reorder at {item.reorder_level || 0} {item.unit}</p>
                      </div>
                      <StockStatusBadge status={status} negative={item.current_stock < 0} />
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
                      {canEditItems && <div className="flex gap-1.5"><Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onEdit(item)}><Pencil className="h-3.5 w-3.5" />Edit</Button>{onDelete && <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(item)} aria-label={`Remove ${item.name}`}><Trash2 className="h-4 w-4" /></Button>}</div>}
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
      <Dialog open={refreshDialogOpen} onOpenChange={(open) => {
        setRefreshDialogOpen(open);
        if (!open && !refreshApplying) { setRefreshConfirmed(false); setRefreshError(null); }
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Refresh inventory from this month’s sheet</DialogTitle>
            <DialogDescription>Review the latest daily material balances before replacing on-hand quantities.</DialogDescription>
          </DialogHeader>
          {refreshLoading ? (
            <div className="flex items-center gap-3 rounded-xl border p-5 text-sm text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" /> Reading the connected sheet and matching inventory items…</div>
          ) : refreshError ? (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{refreshError}</div>
          ) : refreshPreview ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">Source</div><div className="truncate text-sm font-semibold" title={refreshPreview.sheetName}>{refreshPreview.sheetName}</div><a className="text-xs text-primary underline" href={refreshPreview.sheetUrl} target="_blank" rel="noreferrer">Open sheet</a></div>
                <div className="rounded-xl border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">Latest daily balance</div><div className="text-sm font-semibold">{refreshPreview.sourceDate}</div><div className="text-xs text-muted-foreground">Period {refreshPreview.period}</div></div>
                <div className="rounded-xl border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">Inventory impact</div><div className="text-sm font-semibold">{refreshPreview.changedCount} changing</div><div className="text-xs text-muted-foreground">{refreshPreview.unchangedCount} unchanged · {refreshPreview.skipped.length} skipped</div></div>
              </div>
              <div className="max-h-64 overflow-auto rounded-xl border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="sticky top-0 bg-muted text-left text-xs"><tr><th className="p-2.5">Item</th><th className="p-2.5">Balance date</th><th className="p-2.5 text-right">Current</th><th className="p-2.5 text-right">Sheet</th><th className="p-2.5 text-right">Change</th></tr></thead>
                  <tbody>{refreshPreview.rows.map((row) => <tr key={row.inventoryItemId} className="border-t"><td className="p-2.5">{row.itemName} <span className="text-xs text-muted-foreground">{row.unit}</span></td><td className="p-2.5 text-xs text-muted-foreground">{row.sourceDate}</td><td className="p-2.5 text-right tabular-nums">{row.currentStock}</td><td className="p-2.5 text-right tabular-nums">{row.sheetStock}</td><td className={`p-2.5 text-right tabular-nums ${Math.abs(row.delta) > 0.01 ? "font-semibold" : "text-muted-foreground"}`}>{row.delta > 0 ? "+" : ""}{row.delta}</td></tr>)}</tbody>
                </table>
              </div>
              {refreshPreview.skipped.length > 0 && <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-medium">Skipped sheet rows ({refreshPreview.skipped.length})</summary><ul className="mt-2 space-y-1 text-xs text-muted-foreground">{refreshPreview.skipped.map((item, index) => <li key={`${item.itemName}-${index}`}><span className="font-medium text-foreground">{item.itemName}:</span> {item.reason}</li>)}</ul></details>}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                <Checkbox checked={refreshConfirmed} onCheckedChange={(checked) => setRefreshConfirmed(checked === true)} className="mt-0.5" />
                <span>I confirm replacing the matched on-hand balances with the quantities shown from this month’s daily sheet.</span>
              </label>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRefreshDialogOpen(false)} disabled={refreshApplying}>Cancel</Button>
            <Button type="button" onClick={applySheetRefresh} disabled={!refreshPreview || !refreshConfirmed || refreshApplying || refreshLoading}>
              {refreshApplying && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {refreshApplying ? "Updating inventory…" : `Update ${refreshPreview?.changedCount ?? 0} items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
