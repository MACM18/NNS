"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Calendar, Ruler, Info, Activity } from "lucide-react";
import { DrumTracking } from "@/app/dashboard/inventory/page";

interface UsageRecord {
  id: string;
  quantity_used: number;
  usage_date: string;
  cable_start_point: number;
  cable_end_point: number;
  wastage_calculated: number;
  line_details: {
    telephone_no: string;
    name: string;
    dp: string;
  };
}

interface DrumDetailsDialogProps {
  drum: DrumTracking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}

export function DrumDetailsDialog({ drum, open, onOpenChange, getStatusBadge }: DrumDetailsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [extendedDrumInfo, setExtendedDrumInfo] = useState<any>(null);

  useEffect(() => {
    if (open && drum) {
      fetchDrumDetails(drum.id);
    } else {
      setUsageRecords([]);
      setExtendedDrumInfo(null);
    }
  }, [open, drum]);

  const fetchDrumDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/drums/${id}/usage`);
      if (res.ok) {
        const json = await res.json();
        setUsageRecords(json.data.usageRecords || []);
        setExtendedDrumInfo(json.data.drum || null);
      }
    } catch (error) {
      console.error("Failed to fetch drum details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!drum) return null;

  const currentDrum = extendedDrumInfo || drum;
  const initialQty = Number(currentDrum.initial_quantity || 0);
  const currentQty = Number(currentDrum.current_quantity || 0);
  const usedQty = initialQty - currentQty;
  const percentageRemaining = initialQty > 0 ? (currentQty / initialQty) * 100 : 0;
  
  const totalWastage = usageRecords.reduce((acc, curr) => acc + (curr.wastage_calculated || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between mt-2">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                Drum {currentDrum.drum_number}
              </DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="font-normal text-xs">{currentDrum.cable_type || "Fiber"}</Badge>
                {currentDrum.item_name && <span>{currentDrum.item_name}</span>}
              </DialogDescription>
            </div>
            <div className="pr-4">
              {getStatusBadge(currentDrum.status)}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border bg-card/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Ruler className="h-4 w-4" />
                <span className="text-xs font-medium uppercase">Total Length</span>
              </div>
              <div className="text-2xl font-bold">{initialQty}m</div>
            </div>
            <div className="p-4 rounded-xl border bg-card/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-medium uppercase">Current Stock</span>
              </div>
              <div className="text-2xl font-bold text-primary">{currentQty.toFixed(2)}m</div>
            </div>
            <div className="p-4 rounded-xl border bg-card/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Info className="h-4 w-4" />
                <span className="text-xs font-medium uppercase">Total Used</span>
              </div>
              <div className="text-2xl font-bold">{usedQty.toFixed(2)}m</div>
            </div>
            <div className="p-4 rounded-xl border bg-card/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium uppercase">Wastage</span>
              </div>
              <div className="text-2xl font-bold text-destructive">{totalWastage.toFixed(2)}m</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 p-4 border rounded-xl bg-muted/20">
            <div className="flex justify-between text-sm font-medium">
              <span>Capacity Remaining</span>
              <span>{percentageRemaining.toFixed(1)}%</span>
            </div>
            <Progress 
              value={percentageRemaining} 
              className="h-3"
            />
          </div>

          {/* Usage Table */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Usage History</h3>
            {loading ? (
              <div className="text-center p-8 text-muted-foreground animate-pulse">Loading usages...</div>
            ) : usageRecords.length === 0 ? (
              <div className="text-center p-8 border rounded-xl border-dashed bg-muted/20 text-muted-foreground">
                No usage recorded for this drum yet.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Line Details</TableHead>
                      <TableHead className="text-right">Used Qty</TableHead>
                      <TableHead className="text-right">Wastage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {new Date(record.usage_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div>{record.line_details.name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{record.line_details.telephone_no}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {record.cable_start_point}m - {record.cable_end_point}m
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {record.quantity_used}m
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {record.wastage_calculated > 0 ? `${record.wastage_calculated}m` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
