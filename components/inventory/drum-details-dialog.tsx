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

  // Calculate metrics using smart wastage calculator
  const metrics = useMemo<WastageCalculationResult>(() => {
    const currentDrum = extendedDrumInfo || drum;
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

    const initialQty = Number(currentDrum.initial_quantity || 0);
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
  }, [usageRecords, extendedDrumInfo, drum]);

  const handleToggleStatus = async () => {
    if (!drum) return;
    const currentDrum = extendedDrumInfo || drum;
    const newStatus = currentDrum.status === "active" ? "inactive" : "active";

    setToggling(true);
    try {
      const res = await fetch(`/api/drums/${drum.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Refresh drum details
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

  const currentDrum = extendedDrumInfo || drum;
  const initialQty = Number(currentDrum.initial_quantity || 0);
  const percentageRemaining =
    initialQty > 0
      ? (metrics.calculatedCurrentQuantity / initialQty) * 100
      : 0;

  // Color for progress
  let progressColor = "text-green-500";
  let progressBg = "bg-green-500/10";
  if (percentageRemaining < 25) {
    progressColor = "text-red-500";
    progressBg = "bg-red-500/10";
  } else if (percentageRemaining < 50) {
    progressColor = "text-amber-500";
    progressBg = "bg-amber-500/10";
  }

  // Find selected usage record for highlighting
  const selectedUsage = usageRecords.find((u) => u.id === selectedUsageId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <span>Drum {currentDrum.drum_number}</span>
              </DialogTitle>
              <DialogDescription className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                <Badge
                  variant="outline"
                  className="font-normal text-xs gap-1"
                >
                  <Cable className="h-3 w-3" />
                  {currentDrum.cable_type || "Fiber"}
                </Badge>
                <span className="text-muted-foreground/50">•</span>
                <span className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  Received{" "}
                  {currentDrum.received_date
                    ? new Date(
                        currentDrum.received_date
                      ).toLocaleDateString()
                    : "N/A"}
                </span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 pr-8">
              {getStatusBadge(currentDrum.status)}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          /* Two-panel layout */
          <div className="flex flex-col md:flex-row h-[calc(90vh-120px)] min-h-[500px]">
            {/* LEFT PANEL — Stats & Visualization */}
            <div className="w-full md:w-[420px] md:border-r border-b md:border-b-0 p-5 overflow-y-auto space-y-5 shrink-0">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<Ruler className="h-4 w-4" />}
                  label="Total Length"
                  value={`${initialQty}m`}
                  color="text-foreground"
                />
                <StatCard
                  icon={<Activity className="h-4 w-4" />}
                  label="Remaining"
                  value={`${metrics.calculatedCurrentQuantity.toFixed(1)}m`}
                  color="text-primary"
                />
                <StatCard
                  icon={<Zap className="h-4 w-4" />}
                  label="Total Used"
                  value={`${metrics.totalUsed.toFixed(1)}m`}
                  color="text-blue-500"
                />
                <StatCard
                  icon={<TrendingDown className="h-4 w-4" />}
                  label="Wastage"
                  value={`${metrics.totalWastage.toFixed(1)}m`}
                  color="text-destructive"
                />
                <StatCard
                  icon={<Hash className="h-4 w-4" />}
                  label="Usage Count"
                  value={`${usageRecords.length}`}
                  color="text-purple-500"
                  className="col-span-2"
                />
              </div>

              {/* Capacity Progress */}
              <div className="space-y-2 p-4 border rounded-xl bg-muted/20">
                <div className="flex justify-between text-sm font-medium">
                  <span>Capacity Remaining</span>
                  <span className={progressColor}>
                    {percentageRemaining.toFixed(1)}%
                  </span>
                </div>
                <Progress value={percentageRemaining} className="h-3" />
              </div>

              {/* Cable Visualization */}
              <div className="space-y-2 p-4 border rounded-xl bg-card">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cable Usage Map
                </h4>
                <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-green-500 inline-block" />{" "}
                    Used
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-orange-500 inline-block" />{" "}
                    Waste
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-muted inline-block" />{" "}
                    Available
                  </span>
                  {selectedUsageId && (
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm bg-blue-500 inline-block" />{" "}
                      Selected
                    </span>
                  )}
                </div>
                <div className="h-10 bg-muted rounded-lg relative overflow-hidden border">
                  {/* Used segments */}
                  {metrics.usageSegments.map((segment, idx) => (
                    <div
                      key={`used-${idx}`}
                      className="absolute h-full bg-green-500/70 transition-all duration-300"
                      style={{
                        left: `${(segment.start / initialQty) * 100}%`,
                        width: `${Math.max(
                          (segment.length / initialQty) * 100,
                          0.5
                        )}%`,
                      }}
                      title={`Used: ${segment.start.toFixed(
                        1
                      )}m → ${segment.end.toFixed(
                        1
                      )}m (${segment.length.toFixed(1)}m)`}
                    />
                  ))}
                  {/* Wasted segments */}
                  {metrics.wastedSegments.map((segment, idx) => (
                    <div
                      key={`waste-${idx}`}
                      className="absolute h-full bg-orange-500/50 transition-all duration-300"
                      style={{
                        left: `${(segment.start / initialQty) * 100}%`,
                        width: `${Math.max(
                          (segment.length / initialQty) * 100,
                          0.5
                        )}%`,
                      }}
                      title={`Waste: ${segment.start.toFixed(
                        1
                      )}m → ${segment.end.toFixed(
                        1
                      )}m (${segment.length.toFixed(1)}m)`}
                    />
                  ))}
                  {/* Highlighted selected usage */}
                  {selectedUsage && (
                    <div
                      className="absolute h-full bg-blue-500 ring-2 ring-blue-400 ring-offset-1 z-10 transition-all duration-300 animate-pulse"
                      style={{
                        left: `${
                          (Math.min(
                            selectedUsage.cable_start_point,
                            selectedUsage.cable_end_point
                          ) /
                            initialQty) *
                          100
                        }%`,
                        width: `${Math.max(
                          (Math.abs(
                            selectedUsage.cable_end_point -
                              selectedUsage.cable_start_point
                          ) /
                            initialQty) *
                            100,
                          0.8
                        )}%`,
                      }}
                    />
                  )}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>0m</span>
                  <span>{initialQty}m</span>
                </div>
                {selectedUsage && (
                  <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-500/10 rounded-md px-2.5 py-1.5 border border-blue-200 dark:border-blue-500/20">
                    Selected:{" "}
                    {Math.min(
                      selectedUsage.cable_start_point,
                      selectedUsage.cable_end_point
                    ).toFixed(1)}
                    m →{" "}
                    {Math.max(
                      selectedUsage.cable_start_point,
                      selectedUsage.cable_end_point
                    ).toFixed(1)}
                    m (
                    {Math.abs(
                      selectedUsage.cable_end_point -
                        selectedUsage.cable_start_point
                    ).toFixed(1)}
                    m used)
                  </div>
                )}
              </div>

              {/* Status Toggle Button */}
              <Button
                variant={
                  currentDrum.status === "active" ? "outline" : "default"
                }
                className="w-full gap-2"
                onClick={handleToggleStatus}
                disabled={toggling}
              >
                {toggling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : currentDrum.status === "active" ? (
                  <>
                    <ToggleRight className="h-4 w-4 text-green-600" />
                    Mark as Inactive
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-4 w-4" />
                    Mark as Active
                  </>
                )}
              </Button>
            </div>

            {/* RIGHT PANEL — Interactive Usage List */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="px-5 py-3 border-b bg-muted/20 shrink-0">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Usage History
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {usageRecords.length}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click an entry to highlight its cable segment
                </p>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2.5">
                  {usageRecords.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium text-sm">No usage recorded</p>
                      <p className="text-xs mt-1">
                        Usage will appear here when cable is used from this drum
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
                            group relative p-3.5 rounded-xl border cursor-pointer transition-all duration-200
                            ${
                              isSelected
                                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-sm shadow-blue-500/10 ring-1 ring-blue-500/20"
                                : "border-border/50 bg-card hover:border-border hover:bg-muted/30 hover:shadow-sm"
                            }
                          `}
                          onClick={() =>
                            setSelectedUsageId(isSelected ? null : record.id)
                          }
                        >
                          {/* Usage Number Badge */}
                          <div className="absolute -top-2 -left-1">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                isSelected
                                  ? "bg-blue-500 text-white"
                                  : "bg-muted text-muted-foreground border"
                              }`}
                            >
                              #{index + 1}
                            </span>
                          </div>

                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-1.5">
                              {/* Customer info */}
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

                              {/* Phone & Address */}
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

                              {/* Cable range */}
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                  {record.cable_start_point.toFixed(1)}m →{" "}
                                  {record.cable_end_point.toFixed(1)}m
                                </span>
                                <span className="text-muted-foreground/50">
                                  •
                                </span>
                                <span className="flex items-center gap-1 text-xs">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  {new Date(
                                    record.usage_date
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            {/* Usage amount */}
                            <div className="text-right shrink-0">
                              <div className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
                                {actualUsage.toFixed(1)}m
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                used
                              </div>
                              {record.wastage_calculated > 0 && (
                                <div className="text-[10px] text-destructive mt-0.5">
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

/* --- Helper component --- */
function StatCard({
  icon,
  label,
  value,
  color,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  className?: string;
}) {
  return (
    <div
      className={`p-3 rounded-xl border bg-card/50 space-y-1 ${className}`}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
