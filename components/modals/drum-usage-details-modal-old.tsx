// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSupabaseClient } from "@/lib/supabase";
import { useNotification } from "@/contexts/notification-context";
import {
  Cable,
  AlertTriangle,
  TrendingDown,
  Settings,
  Save,
  RotateCcw,
} from "lucide-react";
import {
  calculateSmartWastage,
  calculateLegacyWastage,
  validateManualWastage,
  type DrumUsage,
  type WastageCalculationResult,
} from "@/lib/drum-wastage-calculator";

interface DrumUsageDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drumId: string | null;
  drumNumber: string;
  onWastageUpdate?: () => void; // Callback to refresh parent data
}

interface DrumUsageRecord {
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

interface DrumInfo {
  initial_quantity: number;
  current_quantity: number;
  manual_wastage_override?: number;
  wastage_calculation_method?:
    | "smart_segments"
    | "legacy_gaps"
    | "manual_override";
}

export function DrumUsageDetailsModal({
  open,
  onOpenChange,
  drumId,
  drumNumber,
  onWastageUpdate,
}: DrumUsageDetailsModalProps) {
  const [usageRecords, setUsageRecords] = useState<DrumUsageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drumInfo, setDrumInfo] = useState<DrumInfo>({
    initial_quantity: 0,
    current_quantity: 0,
    wastage_calculation_method: "smart_segments",
  });

  const [calculatedMetrics, setCalculatedMetrics] =
    useState<WastageCalculationResult>({
      totalUsed: 0,
      totalWastage: 0,
      calculatedCurrentQuantity: 0,
      usageSegments: [],
      wastedSegments: [],
      calculationMethod: "smart_segments",
    });

  // Manual adjustment state
  const [manualWastageInput, setManualWastageInput] = useState<string>("");
  const [calculationMethod, setCalculationMethod] = useState<
    "smart_segments" | "legacy_gaps" | "manual_override"
  >("smart_segments");
  const [validationError, setValidationError] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);

  const supabase = getSupabaseClient();
  const { addNotification } = useNotification();

  useEffect(() => {
    if (open && drumId) {
      fetchDrumUsage();
    }
  }, [open, drumId]);

  const fetchDrumUsage = async () => {
    if (!drumId) return;

    setLoading(true);
    try {
      // Fetch drum usage records
      const { data: usage, error: usageError } = await supabase
        .from("drum_usage")
        .select(
          `
          id,
          quantity_used,
          usage_date,
          cable_start_point,
          cable_end_point,
          wastage_calculated,
          line_details(telephone_no, name, dp)
        `
        )
        .eq("drum_id", drumId)
        .order("usage_date", { ascending: true });

      if (usageError) throw usageError;

      // Fetch drum info including manual wastage settings
      const { data: drum, error: drumError } = await supabase
        .from("drum_tracking")
        .select(
          "initial_quantity, current_quantity, manual_wastage_override, wastage_calculation_method"
        )
        .eq("id", drumId)
        .single();

      if (drumError) throw drumError;

      setUsageRecords(usage || []);
      setDrumInfo(drum);

      // Set current calculation method and manual input
      const currentMethod = drum.wastage_calculation_method || "smart_segments";
      setCalculationMethod(currentMethod);
      setManualWastageInput(drum.manual_wastage_override?.toString() || "");

      // Calculate metrics using the new logic
      recalculateMetrics(
        usage || [],
        drum,
        currentMethod,
        drum.manual_wastage_override
      );
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: `Failed to fetch drum usage: ${error.message}`,
        type: "error",
        category: "system",
      });
    } finally {
      setLoading(false);
    }
  };

  const recalculateMetrics = (
    usages: DrumUsageRecord[],
    drum: DrumInfo,
    method: "smart_segments" | "legacy_gaps" | "manual_override",
    manualOverride?: number
  ) => {
    // Convert to the format expected by our calculation functions
    const drumUsageData: DrumUsage[] = usages.map((usage) => ({
      id: usage.id,
      cable_start_point: usage.cable_start_point || 0,
      cable_end_point: usage.cable_end_point || 0,
      usage_date: usage.usage_date,
      quantity_used: usage.quantity_used,
    }));

    let metrics: WastageCalculationResult;

    if (method === "legacy_gaps") {
      metrics = calculateLegacyWastage(drumUsageData, drum.initial_quantity);
    } else {
      // Use smart calculation (handles manual override internally)
      metrics = calculateSmartWastage(
        drumUsageData,
        drum.initial_quantity,
        method === "manual_override" ? manualOverride : undefined
      );
    }

    setCalculatedMetrics(metrics);
  };

  const handleCalculationMethodChange = (
    method: "smart_segments" | "legacy_gaps" | "manual_override"
  ) => {
    setCalculationMethod(method);
    setValidationError("");

    if (method === "manual_override") {
      const manualValue = parseFloat(manualWastageInput) || 0;
      recalculateMetrics(usageRecords, drumInfo, method, manualValue);
    } else {
      recalculateMetrics(usageRecords, drumInfo, method);
    }
  };

  const handleManualWastageChange = (value: string) => {
    setManualWastageInput(value);
    setValidationError("");

    if (calculationMethod === "manual_override") {
      const numValue = parseFloat(value) || 0;
      const validation = validateManualWastage(
        numValue,
        calculatedMetrics.totalUsed,
        drumInfo.initial_quantity
      );

      if (!validation.isValid) {
        setValidationError(validation.error || "Invalid value");
      }

      recalculateMetrics(usageRecords, drumInfo, "manual_override", numValue);
    }
  };

  const saveWastageSettings = async () => {
    if (!drumId) return;

    setSaving(true);
    try {
      const updateData: any = {
        wastage_calculation_method: calculationMethod,
      };

      if (calculationMethod === "manual_override") {
        const manualValue = parseFloat(manualWastageInput) || 0;
        const validation = validateManualWastage(
          manualValue,
          calculatedMetrics.totalUsed,
          drumInfo.initial_quantity
        );

        if (!validation.isValid) {
          setValidationError(validation.error || "Invalid value");
          setSaving(false);
          return;
        }

        updateData.manual_wastage_override = manualValue;
      } else {
        updateData.manual_wastage_override = null;
      }

      const { error } = await supabase
        .from("drum_tracking")
        .update(updateData)
        .eq("id", drumId);

      if (error) throw error;

      addNotification({
        title: "Settings Saved",
        message: "Wastage calculation settings updated successfully",
        type: "success",
        category: "system",
      });

      // Refresh parent data if callback provided
      if (onWastageUpdate) {
        onWastageUpdate();
      }

      setShowSettings(false);
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: `Failed to save settings: ${error.message}`,
        type: "error",
        category: "system",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-5xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Cable className='h-5 w-5' />
            Drum Usage Details - {drumNumber}
          </DialogTitle>
          <DialogDescription>
            Enhanced usage history with improved wastage calculation based on
            cable point gaps
          </DialogDescription>
        </DialogHeader>

        {/* Stats Cards */}
        <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-6'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Initial Length</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-gray-600'>
                {drumInfo.initial_quantity.toFixed(1)}m
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Total Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-blue-600'>
                {calculatedMetrics.totalUsed.toFixed(1)}m
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Total Wastage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-orange-600'>
                {calculatedMetrics.totalWastage.toFixed(1)}m
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-green-600'>
                {calculatedMetrics.remainingLength.toFixed(1)}m
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Usage Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {calculatedMetrics.usageCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Records Table */}
        <div className='border rounded-lg'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Line No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>DP</TableHead>
                <TableHead>Cable Points</TableHead>
                <TableHead>Used (m)</TableHead>
                <TableHead>Wastage (m)</TableHead>
                <TableHead>Cumulative</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className='text-center py-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto'></div>
                    <p className='mt-2 text-sm text-muted-foreground'>
                      Loading usage records...
                    </p>
                  </TableCell>
                </TableRow>
              ) : calculatedMetrics.processedRecords.length > 0 ? (
                calculatedMetrics.processedRecords.map((record, index) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {new Date(record.usage_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className='font-mono text-sm'>
                      {record.line_details?.telephone_no || "N/A"}
                    </TableCell>
                    <TableCell>{record.line_details?.name || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant='outline' className='font-mono text-xs'>
                        {record.line_details?.dp || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='text-xs'>
                        <div>
                          Start: {record.cable_start_point?.toFixed(1) || "0"}m
                        </div>
                        <div>
                          End: {record.cable_end_point?.toFixed(1) || "0"}m
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className='font-medium text-blue-600'>
                        {record.actualUsage.toFixed(1)}m
                      </span>
                    </TableCell>
                    <TableCell>
                      {record.calculatedWastage > 0 ? (
                        <div className='flex items-center gap-1'>
                          <AlertTriangle className='h-3 w-3 text-orange-500' />
                          <span className='font-medium text-orange-600'>
                            {record.calculatedWastage.toFixed(1)}m
                          </span>
                        </div>
                      ) : (
                        <span className='text-muted-foreground'>0m</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className='text-xs'>
                        <div>Used: {record.cumulativeUsed.toFixed(1)}m</div>
                        <div className='text-orange-600'>
                          Waste: {record.cumulativeWastage.toFixed(1)}m
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className='text-center py-8 text-muted-foreground'
                  >
                    <TrendingDown className='h-12 w-12 mx-auto mb-4 opacity-50' />
                    <p>No usage records found for this drum</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Enhanced Wastage Analysis */}
        {calculatedMetrics.totalWastage > 0 && (
          <div className='mt-4 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200'>
            <div className='flex items-center gap-2 mb-2'>
              <AlertTriangle className='h-4 w-4 text-orange-600' />
              <span className='font-medium text-orange-800 dark:text-orange-200'>
                Enhanced Wastage Analysis
              </span>
            </div>
            <div className='text-sm text-orange-700 dark:text-orange-300 space-y-1'>
              <p>
                This drum has {calculatedMetrics.totalWastage.toFixed(1)}m of
                calculated wastage across {calculatedMetrics.usageCount}{" "}
                installations.
              </p>
              <p>
                Wastage is calculated based on gaps between cable usage points,
                accounting for bidirectional cable usage.
              </p>
              <p>
                Total deducted:{" "}
                {(
                  calculatedMetrics.totalUsed + calculatedMetrics.totalWastage
                ).toFixed(1)}
                m (
                {(
                  ((calculatedMetrics.totalUsed +
                    calculatedMetrics.totalWastage) /
                    drumInfo.initial_quantity) *
                  100
                ).toFixed(1)}
                % of initial length)
              </p>
            </div>
          </div>
        )}

        {/* Calculation Method Info */}
        <div className='mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200'>
          <div className='flex items-center gap-2 mb-2'>
            <Cable className='h-4 w-4 text-blue-600' />
            <span className='font-medium text-blue-800 dark:text-blue-200'>
              Enhanced Calculation Method
            </span>
          </div>
          <div className='text-sm text-blue-700 dark:text-blue-300 space-y-1'>
            <p>
              • <strong>Usage:</strong> Calculated as absolute difference
              between start and end points (supports bidirectional usage)
            </p>
            <p>
              • <strong>Wastage:</strong> Calculated as gaps between consecutive
              usage end points and start points
            </p>
            <p>
              • <strong>Validation:</strong> Total usage + wastage cannot exceed
              initial drum length
            </p>
            <p>
              • <strong>Remaining:</strong> Initial length - total used - total
              wastage
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
