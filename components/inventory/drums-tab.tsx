"use client";

import React, { useState } from "react";
import { Plus, Search, Pencil, ToggleRight, ToggleLeft, LayoutGrid, List, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { DrumTracking } from "@/app/dashboard/inventory/page";
import { DrumGaugeCard } from "./drum-gauge-card";
import { DrumDetailsDialog } from "./drum-details-dialog";

interface DrumsTabProps {
  drums: DrumTracking[];
  loadingData: boolean;
  role: string | null;
  setAddDrumModalOpen: (open: boolean) => void;
  searchDrumQuery: string;
  setSearchDrumQuery: (query: string) => void;
  drumStatusFilter: string;
  setDrumStatusFilter: (filter: string) => void;
  setSelectedDrum: (drum: DrumTracking | null) => void;
  setEditDrumModalOpen: (open: boolean) => void;
  updateDrumStatus: (id: string, status: string, drumNumber: string) => Promise<void>;
  setDrumToDelete: (drum: DrumTracking | null) => void;
  setDeleteDrumConfirmOpen: (open: boolean) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

export function DrumsTab({
  drums,
  loadingData,
  role,
  setAddDrumModalOpen,
  searchDrumQuery,
  setSearchDrumQuery,
  drumStatusFilter,
  setDrumStatusFilter,
  setSelectedDrum,
  setEditDrumModalOpen,
  updateDrumStatus,
  setDrumToDelete,
  setDeleteDrumConfirmOpen,
  getStatusBadge,
}: DrumsTabProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [detailsDrumModalOpen, setDetailsDrumModalOpen] = useState(false);
  const [drumForDetails, setDrumForDetails] = useState<DrumTracking | null>(null);

  const filteredDrums = drums.filter((drum) => {
    const matchesSearch =
      drum.drum_number.toLowerCase().includes(searchDrumQuery.toLowerCase()) ||
      (drum.item_name || "").toLowerCase().includes(searchDrumQuery.toLowerCase());
    const matchesStatus =
      drumStatusFilter === "all" ? true : drum.status === drumStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const isAdminOrManager = role === "admin" || role === "moderator";

  return (
    <Card className="glass-card border-border/40 overflow-hidden">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold">Drum Inventory</CardTitle>
            <CardDescription>
              Manage cable drums and their status
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button
              onClick={() => setAddDrumModalOpen(true)}
              size="sm"
              className="h-9 gap-1 glass-button"
            >
              <Plus className="h-4 w-4" />
              <span>New Drum</span>
            </Button>
            
            {/* View Mode Toggle */}
            <div className="flex items-center border border-border/50 rounded-lg p-0.5 bg-muted/40 shrink-0 h-9">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drums..."
                value={searchDrumQuery}
                onChange={(e) => setSearchDrumQuery(e.target.value)}
                className="pl-8 h-9 w-full sm:w-[180px] bg-background/50 border-border/40"
              />
            </div>
            <Select value={drumStatusFilter} onValueChange={setDrumStatusFilter}>
              <SelectTrigger className="w-[130px] h-9 bg-background/50 border-border/40">
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
          viewMode === "grid" ? (
            /* Card Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDrums.map((drum) => (
                <DrumGaugeCard
                  key={drum.id}
                  drum={drum}
                  onClick={() => {
                    setDrumForDetails(drum);
                    setDetailsDrumModalOpen(true);
                  }}
                  onEdit={(d) => {
                    setSelectedDrum(d);
                    setEditDrumModalOpen(true);
                  }}
                  onDelete={(d) => {
                    setDrumToDelete(d);
                    setDeleteDrumConfirmOpen(true);
                  }}
                  isAdminOrManager={isAdminOrManager}
                />
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Drum Number</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Initial Qty</TableHead>
                        <TableHead>Current Qty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDrums.map((drum) => (
                        <TableRow 
                          key={drum.id} 
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => {
                            setDrumForDetails(drum);
                            setDetailsDrumModalOpen(true);
                          }}
                        >
                          <TableCell className="font-mono font-semibold text-primary hover:underline">
                            {drum.drum_number}
                          </TableCell>
                          <TableCell className="font-medium">{drum.item_name || "-"}</TableCell>
                          <TableCell className="tabular-nums">{drum.initial_quantity}m</TableCell>
                          <TableCell className="tabular-nums font-bold">{drum.current_quantity}m</TableCell>
                          <TableCell>{getStatusBadge(drum.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setSelectedDrum(drum);
                                  setEditDrumModalOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {/* Quick Status Toggle */}
                              {drum.status === "active" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Mark Inactive"
                                  className="h-8 w-8"
                                  onClick={() => updateDrumStatus(drum.id, "inactive", drum.drum_number)}
                                >
                                  <ToggleRight className="h-4.5 w-4.5 text-green-600" />
                                </Button>
                              )}
                              {drum.status === "inactive" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Mark Active"
                                  className="h-8 w-8"
                                  onClick={() => updateDrumStatus(drum.id, "active", drum.drum_number)}
                                >
                                  <ToggleLeft className="h-4.5 w-4.5 text-orange-600" />
                                </Button>
                              )}
                              {isAdminOrManager && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    setDrumToDelete(drum);
                                    setDeleteDrumConfirmOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
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
          )
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-sm">No drums match your filter</p>
            <p className="text-xs mt-1">Try adjusting your search criteria</p>
          </div>
        )}
      </CardContent>

      <DrumDetailsDialog
        drum={drumForDetails}
        open={detailsDrumModalOpen}
        onOpenChange={setDetailsDrumModalOpen}
        getStatusBadge={getStatusBadge}
      />
    </Card>
  );
}

// Add simple Lucide Trash2 import here since it is used inside table view
import { Trash2 } from "lucide-react";
