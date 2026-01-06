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
      const response = await fetch(`/api/drums/${drumId}/usage`);
      if (!response.ok) throw new Error("Failed to fetch drum usage");

      const result = await response.json();
      const { drum, usageRecords: usage } = result.data;

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

      const response = await fetch(`/api/drums/${drumId}/usage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error("Failed to save settings");

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
      <DialogContent className='max-w-6xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center justify-between'>
            <div>
              <DialogTitle className='flex items-center gap-2'>
                <Cable className='h-5 w-5' />
                Drum Usage Details - {drumNumber}
              </DialogTitle>
              <DialogDescription>
                Advanced usage tracking with configurable wastage calculation
                methods
              </DialogDescription>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowSettings(!showSettings)}
              className='flex items-center gap-2'
            >
              <Settings className='h-4 w-4' />
              Settings
            </Button>
          </div>
        </DialogHeader>

        {/* Wastage Calculation Settings Panel */}
        {showSettings && (
          <Card className='border-dashed border-blue-200 bg-blue-50/50 dark:bg-blue-950/50'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm flex items-center gap-2'>
                <Settings className='h-4 w-4' />
                Wastage Calculation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <Label
                  htmlFor='calculation-method'
                  className='text-sm font-medium'
                >
                  Calculation Method
                </Label>
                <Select
                  value={calculationMethod}
                  onValueChange={handleCalculationMethodChange}
                >
                  <SelectTrigger className='mt-1'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='smart_segments'>
                      Smart Segments (Recommended) - Handles overlapping usage
                      intelligently
                    </SelectItem>
                    <SelectItem value='legacy_gaps'>
                      Legacy Gaps - Original method based on chronological gaps
                    </SelectItem>
                    <SelectItem value='manual_override'>
                      Manual Override - Set wastage value manually
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {calculationMethod === "manual_override" && (
                <div>
                  <Label
                    htmlFor='manual-wastage'
                    className='text-sm font-medium'
                  >
                    Manual Wastage (meters)
                  </Label>
                  <Input
                    id='manual-wastage'
                    type='number'
                    min='0'
                    step='0.1'
                    value={manualWastageInput}
                    onChange={(e) => handleManualWastageChange(e.target.value)}
                    className='mt-1'
                    placeholder='Enter wastage amount in meters'
                  />
                  {validationError && (
                    <p className='text-sm text-red-600 mt-1'>
                      {validationError}
                    </p>
                  )}
                </div>
              )}

              <div className='flex gap-2'>
                <Button
                  onClick={saveWastageSettings}
                  disabled={saving || !!validationError}
                  size='sm'
                  className='flex items-center gap-2'
                >
                  <Save className='h-4 w-4' />
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
                <Button
                  variant='outline'
                  onClick={() => setShowSettings(false)}
                  size='sm'
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
              <div className='text-xs text-muted-foreground mt-1'>
                {calculatedMetrics.calculationMethod === "manual_override" &&
                  "(Manual)"}
                {calculatedMetrics.calculationMethod === "smart_segments" &&
                  "(Smart)"}
                {calculatedMetrics.calculationMethod === "legacy_gaps" &&
                  "(Legacy)"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-green-600'>
                {calculatedMetrics.calculatedCurrentQuantity.toFixed(1)}m
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Usage Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-purple-600'>
                {usageRecords.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Segments Visualization */}
        {calculatedMetrics.usageSegments.length > 0 && (
          <Card className='mb-4'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm'>Cable Usage Segments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-xs text-muted-foreground mb-2'>
                Visual representation of cable usage (green = used, orange =
                waste, gray = remaining)
              </div>
              <div className='h-8 bg-gray-200 rounded relative overflow-hidden'>
                {calculatedMetrics.usageSegments.map((segment, idx) => (
                  <div
                    key={idx}
                    className='absolute h-full bg-green-500 opacity-80'
                    style={{
                      left: `${
                        (segment.start / drumInfo.initial_quantity) * 100
                      }%`,
                      width: `${
                        (segment.length / drumInfo.initial_quantity) * 100
                      }%`,
                    }}
                    title={`Used: ${segment.start}m - ${
                      segment.end
                    }m (${segment.length.toFixed(1)}m)`}
                  />
                ))}
                {calculatedMetrics.wastedSegments.map((segment, idx) => (
                  <div
                    key={`waste-${idx}`}
                    className='absolute h-full bg-orange-500 opacity-60'
                    style={{
                      left: `${
                        (segment.start / drumInfo.initial_quantity) * 100
                      }%`,
                      width: `${
                        (segment.length / drumInfo.initial_quantity) * 100
                      }%`,
                    }}
                    title={`Waste: ${segment.start}m - ${
                      segment.end
                    }m (${segment.length.toFixed(1)}m)`}
                  />
                ))}
              </div>
              <div className='flex justify-between text-xs text-muted-foreground mt-1'>
                <span>0m</span>
                <span>{drumInfo.initial_quantity}m</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage History Table */}
        <div className='border rounded-lg overflow-hidden'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>DP</TableHead>
                <TableHead>Cable Points</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Segment Waste</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className='text-center py-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto'></div>
                    <p className='text-muted-foreground mt-2'>
                      Loading usage records...
                    </p>
                  </TableCell>
                </TableRow>
              ) : usageRecords.length > 0 ? (
                usageRecords.map((record, index) => {
                  const actualUsage = Math.abs(
                    (record.cable_end_point || 0) -
                      (record.cable_start_point || 0)
                  );

                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        {new Date(record.usage_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className='font-mono text-sm'>
                        {record.line_details?.telephone_no || "N/A"}
                      </TableCell>
                      <TableCell>
                        {record.line_details?.name || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline' className='font-mono text-xs'>
                          {record.line_details?.dp || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className='text-xs'>
                          <div>
                            Start: {(record.cable_start_point || 0).toFixed(1)}m
                          </div>
                          <div>
                            End: {(record.cable_end_point || 0).toFixed(1)}m
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className='font-medium text-blue-600'>
                          {actualUsage.toFixed(1)}m
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className='text-sm text-muted-foreground'>
                          Calculated by method
                        </span>
                      </TableCell>
                      <TableCell className='text-xs text-muted-foreground'>
                        {calculatedMetrics.calculationMethod ===
                          "smart_segments" && "Smart calculation"}
                        {calculatedMetrics.calculationMethod ===
                          "legacy_gaps" && "Legacy method"}
                        {calculatedMetrics.calculationMethod ===
                          "manual_override" && "Manual override"}
                      </TableCell>
                    </TableRow>
                  );
                })
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

        {/* Calculation Method Information */}
        <Card className='mt-4'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <AlertTriangle className='h-4 w-4 text-blue-600' />
              Calculation Method:{" "}
              {calculatedMetrics.calculationMethod
                .replace("_", " ")
                .toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-sm text-blue-700 dark:text-blue-300 space-y-1'>
              {calculatedMetrics.calculationMethod === "smart_segments" && (
                <>
                  <p>
                    • <strong>Smart Segments:</strong> Merges overlapping cable
                    usage to calculate actual consumption
                  </p>
                  <p>
                    • <strong>Handles bidirectional usage:</strong> Accounts for
                    cable being pulled from either end
                  </p>
                  <p>
                    • <strong>Waste calculation:</strong> Only counts truly
                    unused cable segments as waste
                  </p>
                </>
              )}
              {calculatedMetrics.calculationMethod === "legacy_gaps" && (
                <>
                  <p>
                    • <strong>Legacy Method:</strong> Calculates waste as gaps
                    between consecutive usage points
                  </p>
                  <p>
                    • <strong>Chronological processing:</strong> Processes usage
                    records in date order
                  </p>
                  <p>
                    • <strong>Gap-based waste:</strong> May overestimate waste
                    with bidirectional usage
                  </p>
                </>
              )}
              {calculatedMetrics.calculationMethod === "manual_override" && (
                <>
                  <p>
                    • <strong>Manual Override:</strong> Uses manually specified
                    wastage value
                  </p>
                  <p>
                    • <strong>Direct control:</strong> Allows precise adjustment
                    based on field knowledge
                  </p>
                  <p>
                    • <strong>Validation:</strong> Ensures total doesn&apos;t
                    exceed drum capacity
                  </p>
                </>
              )}
              <p>
                • <strong>Total deducted:</strong>{" "}
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
                % of capacity)
              </p>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
