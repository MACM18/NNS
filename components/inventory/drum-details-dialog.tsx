"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Package,
  Calendar,
  Ruler,
  Activity,
  Phone,
  MapPin,
  Cable,
  ToggleLeft,
  ToggleRight,
  Loader2,
  TrendingDown,
  Hash,
  Zap,
} from "lucide-react";
import { DrumTracking } from "@/app/dashboard/inventory/page";
import {
  calculateSmartWastage,
  type WastageCalculationResult,
  type DrumUsage as DrumUsageCalc,
} from "@/lib/drum-wastage-calculator";

interface UsageRecord {
  id: string;
  line_details_id: string | null;
  quantity_used: number;
  usage_date: string;
  cable_start_point: number;
  cable_end_point: number;
  wastage_calculated: number;
  line_details: {
    telephone_no: string;
    name: string;
    dp: string;
    address: string;
  };
}

interface DrumDetailsDialogProps {
  drum: DrumTracking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  onDrumUpdate?: () => void;
}

export function DrumDetailsDialog({
  drum,
  open,
  onOpenChange,
  getStatusBadge,
  onDrumUpdate,
}: DrumDetailsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [extendedDrumInfo, setExtendedDrumInfo] = useState<any>(null);
  const [selectedUsageId, setSelectedUsageId] = useState<string | null>(null);

  useEffect(() => {
    if (open && drum) {
      fetchDrumDetails(drum.id);
      setSelectedUsageId(null);
    } else {
      setUsageRecords([]);
      setExtendedDrumInfo(null);
      setSelectedUsageId(null);
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

  const currentDrum = extendedDrumInfo || drum;
  const initialQty = Number(currentDrum?.initial_quantity || 0);

  // Calculate metrics using smart wastage calculator
  const metrics = useMemo<WastageCalculationResult>(() => {
    if (!currentDrum) {
      return {
        totalUsed: 0,
        totalWastage: 0,
        calculatedCurrentQuantity: 0,
        remainingCable: 0,
        usageSegments: [],
        wastedSegments: [],
        calculationMethod: "smart_segments" as const,
      };
    }

    const drumUsageData: DrumUsageCalc[] = usageRecords.map((u) => ({
      id: u.id,
      cable_start_point: u.cable_start_point || 0,
      cable_end_point: u.cable_end_point || 0,
      usage_date: u.usage_date,
      quantity_used: u.quantity_used,
    }));

    return calculateSmartWastage(
      drumUsageData,
      initialQty,
      undefined,
      currentDrum.status || "active"
    );
  }, [usageRecords, currentDrum, initialQty]);

  const handleToggleStatus = async () => {
    if (!drum) return;
    const newStatus = currentDrum?.status === "active" ? "inactive" : "active";

    setToggling(true);
    try {
      const res = await fetch(`/api/drums/${drum.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await fetchDrumDetails(drum.id);
        onDrumUpdate?.();
      }
    } catch (error) {
      console.error("Failed to toggle status:", error);
    } finally {
      setToggling(false);
    }
  };

  if (!drum) return null;

  const percentageRemaining =
    initialQty > 0
      ? (metrics.calculatedCurrentQuantity / initialQty) * 100
      : 0;

  let progressColor = "text-green-500";
  if (percentageRemaining < 25) {
    progressColor = "text-red-500";
  } else if (percentageRemaining < 50) {
    progressColor = "text-amber-500";
  }

  const selectedUsage = usageRecords.find((u) => u.id === selectedUsageId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] max-h-[90vh] p-0 overflow-hidden">
        {/* Compact Header */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold leading-tight">
                  Drum {currentDrum?.drum_number}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Badge variant="outline" className="font-normal text-[10px] gap-1 px-1.5 py-0">
                    <Cable className="h-2.5 w-2.5" />
                    {currentDrum?.cable_type || "Fiber"}
                  </Badge>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5" />
                    {currentDrum?.received_date
                      ? new Date(currentDrum.received_date).toLocaleDateString()
                      : "N/A"}
                  </span>
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 pr-8">
              {getStatusBadge(currentDrum?.status || "active")}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row h-[calc(90vh-90px)] min-h-[450px]">
            {/* LEFT PANEL — Compact Stats & Visualization */}
            <div className="w-full md:w-[360px] md:border-r border-b md:border-b-0 overflow-y-auto shrink-0">
              <div className="p-4 space-y-3">
                {/* Inline Stats Row */}
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Total" value={`${initialQty}m`} />
                  <MiniStat
                    label="Remaining"
                    value={`${metrics.calculatedCurrentQuantity.toFixed(0)}m`}
                    color="text-primary"
                  />
                  <MiniStat
                    label="Used"
                    value={`${metrics.totalUsed.toFixed(0)}m`}
                    color="text-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MiniStat
                    label="Wastage"
                    value={`${metrics.totalWastage.toFixed(1)}m`}
                    color="text-destructive"
                  />
                  <MiniStat
                    label="Connections"
                    value={`${usageRecords.length}`}
                    color="text-purple-500"
                  />
                </div>

                {/* Capacity Bar */}
                <div className="space-y-1.5 px-3 py-2.5 border rounded-lg bg-muted/20">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Capacity</span>
                    <span className={progressColor}>
                      {percentageRemaining.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={percentageRemaining} className="h-2.5" />
                </div>

                {/* Cable Visualization */}
                <div className="px-3 py-2.5 border rounded-lg bg-card space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Cable Map
                    </h4>
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <span className="h-1.5 w-1.5 rounded-sm bg-green-500" /> Used
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="h-1.5 w-1.5 rounded-sm bg-orange-500" /> Waste
                      </span>
                      <span className="flex items-center gap-0.5">
                        <span className="h-1.5 w-1.5 rounded-sm bg-muted-foreground/20" /> Avail
                      </span>
                      {selectedUsageId && (
                        <span className="flex items-center gap-0.5">
                          <span className="h-1.5 w-1.5 rounded-sm bg-blue-500" /> Sel
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-8 bg-muted rounded relative overflow-hidden border">
                    {metrics.usageSegments.map((segment, idx) => (
                      <div
                        key={`used-${idx}`}
                        className="absolute h-full bg-green-500/70 transition-all duration-300"
                        style={{
                          left: `${(segment.start / initialQty) * 100}%`,
                          width: `${Math.max((segment.length / initialQty) * 100, 0.5)}%`,
                        }}
                        title={`Used: ${segment.start.toFixed(1)}m → ${segment.end.toFixed(1)}m`}
                      />
                    ))}
                    {metrics.wastedSegments.map((segment, idx) => (
                      <div
                        key={`waste-${idx}`}
                        className="absolute h-full bg-orange-500/50 transition-all duration-300"
                        style={{
                          left: `${(segment.start / initialQty) * 100}%`,
                          width: `${Math.max((segment.length / initialQty) * 100, 0.5)}%`,
                        }}
                        title={`Waste: ${segment.start.toFixed(1)}m → ${segment.end.toFixed(1)}m`}
                      />
                    ))}
                    {selectedUsage && (
                      <div
                        className="absolute h-full bg-blue-500 ring-2 ring-blue-400 ring-offset-1 z-10 transition-all duration-300 animate-pulse"
                        style={{
                          left: `${(Math.min(selectedUsage.cable_start_point, selectedUsage.cable_end_point) / initialQty) * 100}%`,
                          width: `${Math.max((Math.abs(selectedUsage.cable_end_point - selectedUsage.cable_start_point) / initialQty) * 100, 0.8)}%`,
                        }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                    <span>0m</span>
                    <span>{initialQty}m</span>
                  </div>
                  {selectedUsage && (
                    <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-500/10 rounded px-2 py-1 border border-blue-200 dark:border-blue-500/20">
                      {Math.min(selectedUsage.cable_start_point, selectedUsage.cable_end_point).toFixed(1)}m →{" "}
                      {Math.max(selectedUsage.cable_start_point, selectedUsage.cable_end_point).toFixed(1)}m
                      {" "}({Math.abs(selectedUsage.cable_end_point - selectedUsage.cable_start_point).toFixed(1)}m)
                    </div>
                  )}
                </div>

                {/* Status Toggle */}
                <Button
                  variant={currentDrum?.status === "active" ? "outline" : "default"}
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleToggleStatus}
                  disabled={toggling}
                >
                  {toggling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : currentDrum?.status === "active" ? (
                    <>
                      <ToggleRight className="h-3.5 w-3.5 text-green-600" />
                      Mark Inactive
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-3.5 w-3.5" />
                      Mark Active
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* RIGHT PANEL — Interactive Usage List */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="px-4 py-2.5 border-b bg-muted/20 shrink-0">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  Usage History
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {usageRecords.length}
                  </Badge>
                </h3>
                {usageRecords.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Click to highlight cable segment
                  </p>
                )}
              </div>

              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {usageRecords.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <TrendingDown className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="font-medium text-sm">No usage recorded</p>
                      <p className="text-xs mt-1">
                        Usage appears when cable is used from this drum
                      </p>
                    </div>
                  ) : (
                    usageRecords.map((record, index) => {
                      const isSelected = selectedUsageId === record.id;
                      const actualUsage = Math.abs(
                        record.cable_end_point - record.cable_start_point
                      );

                      return (
                        <div
                          key={record.id}
                          className={`
                            group relative p-3 rounded-xl border cursor-pointer transition-all duration-200
                            ${isSelected
                              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-sm shadow-blue-500/10 ring-1 ring-blue-500/20"
                              : "border-border/50 bg-card hover:border-border hover:bg-muted/30 hover:shadow-sm"
                            }
                          `}
                          onClick={() =>
                            setSelectedUsageId(isSelected ? null : record.id)
                          }
                        >
                          {/* Number Badge */}
                          <div className="absolute -top-1.5 -left-1">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                isSelected
                                  ? "bg-blue-500 text-white"
                                  : "bg-muted text-muted-foreground border"
                              }`}
                            >
                              #{index + 1}
                            </span>
                          </div>

                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm truncate">
                                  {record.line_details.name || "Unknown"}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 font-mono shrink-0"
                                >
                                  DP: {record.line_details.dp || "—"}
                                </Badge>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                {record.line_details.telephone_no && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {record.line_details.telephone_no}
                                  </span>
                                )}
                                {record.line_details.address && (
                                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {record.line_details.address}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded text-[11px]">
                                  {record.cable_start_point.toFixed(1)}m → {record.cable_end_point.toFixed(1)}m
                                </span>
                                <span className="text-muted-foreground/40">•</span>
                                <span className="flex items-center gap-1 text-[11px]">
                                  <Calendar className="h-2.5 w-2.5 text-muted-foreground" />
                                  {new Date(record.usage_date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-base font-bold tabular-nums text-blue-600 dark:text-blue-400">
                                {actualUsage.toFixed(1)}m
                              </div>
                              <div className="text-[10px] text-muted-foreground">used</div>
                              {record.wastage_calculated > 0 && (
                                <div className="text-[10px] text-destructive">
                                  +{record.wastage_calculated.toFixed(1)}m waste
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* --- Compact stat helper --- */
function MiniStat({
  label,
  value,
  color = "text-foreground",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="px-2.5 py-2 rounded-lg border bg-card/50 text-center">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
