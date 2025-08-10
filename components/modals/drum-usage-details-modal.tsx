"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { Cable, AlertTriangle, TrendingDown } from "lucide-react"

interface DrumUsage {
  id: string
  drum_id: string
  line_no: string
  used_date: string
  quantity_used: number
}

interface DrumUsageDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  drumUsage: DrumUsage | null
  onSuccess: () => void
}

interface DrumUsageRecord {
  id: string
  quantity_used: number
  usage_date: string
  cable_start_point: number
  cable_end_point: number
  wastage_calculated: number
  line_details: {
    telephone_no: string
    name: string
    dp: string
  }
}

interface DrumInfo {
  initial_quantity: number
  current_quantity: number
}

// Enhanced calculation logic for drum usage details
const calculateDetailedMetrics = (usageRecords: DrumUsageRecord[], initialQuantity: number) => {
  if (usageRecords.length === 0) {
    return {
      totalUsed: 0,
      totalWastage: 0,
      remainingLength: initialQuantity,
      usageCount: 0,
      processedRecords: [],
    }
  }

  // Sort records by date to process chronologically
  const sortedRecords = [...usageRecords].sort(
    (a, b) => new Date(a.usage_date).getTime() - new Date(b.usage_date).getTime(),
  )

  let totalUsed = 0
  let totalWastage = 0
  let lastEndPoint = 0

  const processedRecords = sortedRecords.map((record, index) => {
    const startPoint = record.cable_start_point || 0
    const endPoint = record.cable_end_point || 0

    // Calculate actual usage (absolute difference)
    const actualUsage = Math.abs(endPoint - startPoint)
    totalUsed += actualUsage

    // Calculate wastage based on gap from last usage
    let calculatedWastage = 0
    if (index > 0) {
      const gap = Math.abs(startPoint - lastEndPoint)
      if (gap > 0) {
        calculatedWastage = gap
        totalWastage += gap
      }
    }

    // Update last end point (use the higher value to track cable progression)
    lastEndPoint = Math.max(startPoint, endPoint)

    return {
      ...record,
      actualUsage,
      calculatedWastage,
      cumulativeUsed: totalUsed,
      cumulativeWastage: totalWastage,
    }
  })

  // Ensure totals don't exceed initial drum length
  const maxCapacity = initialQuantity
  const totalDeducted = totalUsed + totalWastage

  if (totalDeducted > maxCapacity) {
    // Cap the wastage to fit within capacity
    totalWastage = Math.max(0, maxCapacity - totalUsed)
  }

  const remainingLength = Math.max(0, maxCapacity - totalUsed - totalWastage)

  return {
    totalUsed,
    totalWastage,
    remainingLength,
    usageCount: sortedRecords.length,
    processedRecords,
  }
}

export function DrumUsageDetailsModal({ open, onOpenChange, drumUsage, onSuccess }: DrumUsageDetailsModalProps) {
  const [drumId, setDrumId] = useState("")
  const [lineNo, setLineNo] = useState("")
  const [usedDate, setUsedDate] = useState("")
  const [quantityUsed, setQuantityUsed] = useState("")
  const [loading, setLoading] = useState(false)
  const [usageRecords, setUsageRecords] = useState<DrumUsageRecord[]>([])
  const [drumInfo, setDrumInfo] = useState<DrumInfo>({ initial_quantity: 0, current_quantity: 0 })
  const [calculatedMetrics, setCalculatedMetrics] = useState({
    totalUsed: 0,
    totalWastage: 0,
    remainingLength: 0,
    usageCount: 0,
    processedRecords: [] as any[],
  })

  useEffect(() => {
    if (drumUsage) {
      setDrumId(drumUsage.drum_id)
      setLineNo(drumUsage.line_no)
      setUsedDate(drumUsage.used_date)
      setQuantityUsed(drumUsage.quantity_used.toString())
    } else {
      // Reset form if no drumUsage is provided (e.g., for adding new)
      setDrumId("")
      setLineNo("")
      setUsedDate("")
      setQuantityUsed("")
    }
  }, [drumUsage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const dataToSave = {
      drum_id: drumId,
      line_no: lineNo,
      used_date: usedDate,
      quantity_used: Number.parseFloat(quantityUsed),
    }

    let error = null
    if (drumUsage) {
      // Update existing
      const { error: updateError } = await supabase.from("drum_usage").update(dataToSave).eq("id", drumUsage.id)
      error = updateError
    } else {
      // Add new
      const { error: insertError } = await supabase.from("drum_usage").insert(dataToSave)
      error = insertError
    }

    if (error) {
      console.error("Error saving drum usage:", error)
      toast({
        title: "Error",
        description: `Failed to save drum usage: ${error.message}`,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Drum usage saved successfully.",
      })
      onSuccess()
      onOpenChange(false) // Close modal on success
    }
    setLoading(false)
  }

  useEffect(() => {
    if (open && drumId) {
      fetchDrumUsage()
    }
  }, [open, drumId])

  const fetchDrumUsage = async () => {
    if (!drumId) return

    setLoading(true)
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
        `,
        )
        .eq("drum_id", drumId)
        .order("usage_date", { ascending: true })

      if (usageError) throw usageError

      // Fetch drum info
      const { data: drum, error: drumError } = await supabase
        .from("drum_tracking")
        .select("initial_quantity, current_quantity")
        .eq("id", drumId)
        .single()

      if (drumError) throw drumError

      setUsageRecords(usage || [])
      setDrumInfo(drum)

      // Calculate metrics using enhanced logic
      const metrics = calculateDetailedMetrics(usage || [], drum.initial_quantity)
      setCalculatedMetrics(metrics)
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch drum usage: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {drumUsage ? (
              <>
                <Cable className="h-5 w-5" />
                Edit Drum Usage
              </>
            ) : (
              <>
                <Cable className="h-5 w-5" />
                Add New Drum Usage
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {drumUsage
              ? "Edit the details of this drum usage entry."
              : "Fill in the details for a new drum usage entry."}
          </DialogDescription>
        </DialogHeader>
        {drumUsage ? (
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="drumId">Drum ID</Label>
              <Input id="drumId" value={drumId} onChange={(e) => setDrumId(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lineNo">Telephone Line Number</Label>
              <Input id="lineNo" value={lineNo} onChange={(e) => setLineNo(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="usedDate">Used Date</Label>
              <Input
                id="usedDate"
                type="date"
                value={usedDate}
                onChange={(e) => setUsedDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantityUsed">Quantity Used (kg)</Label>
              <Input
                id="quantityUsed"
                type="number"
                step="0.01"
                value={quantityUsed}
                onChange={(e) => setQuantityUsed(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="col-span-2 md:col-span-1">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Cable className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Drum Info</span>
                  </div>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>
                      • <strong>Initial Length:</strong> {drumInfo.initial_quantity.toFixed(1)}m
                    </p>
                    <p>
                      • <strong>Current Length:</strong> {drumInfo.current_quantity.toFixed(1)}m
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-span-2 md:col-span-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Cable className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Usage Metrics</span>
                    </div>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>
                        • <strong>Total Used:</strong> {calculatedMetrics.totalUsed.toFixed(1)}m
                      </p>
                      <p>
                        • <strong>Total Wastage:</strong> {calculatedMetrics.totalWastage.toFixed(1)}m
                      </p>
                      <p>
                        • <strong>Remaining:</strong> {calculatedMetrics.remainingLength.toFixed(1)}m
                      </p>
                      <p>
                        • <strong>Usage Count:</strong> {calculatedMetrics.usageCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Records Table */}
            <div className="border rounded-lg">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Line No.</th>
                    <th>Customer</th>
                    <th>DP</th>
                    <th>Cable Points</th>
                    <th>Used (m)</th>
                    <th>Wastage (m)</th>
                    <th>Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-sm text-muted-foreground">Loading usage records...</p>
                      </td>
                    </tr>
                  ) : calculatedMetrics.processedRecords.length > 0 ? (
                    calculatedMetrics.processedRecords.map((record, index) => (
                      <tr key={record.id}>
                        <td>{new Date(record.usage_date).toLocaleDateString()}</td>
                        <td className="font-mono text-sm">{record.line_details?.telephone_no || "N/A"}</td>
                        <td>{record.line_details?.name || "N/A"}</td>
                        <td>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                            <span className="font-medium text-orange-600">{record.line_details?.dp || "N/A"}</span>
                          </div>
                        </td>
                        <td>
                          <div className="text-xs">
                            <div>Start: {record.cable_start_point?.toFixed(1) || "0"}m</div>
                            <div>End: {record.cable_end_point?.toFixed(1) || "0"}m</div>
                          </div>
                        </td>
                        <td>
                          <span className="font-medium text-blue-600">{record.actualUsage.toFixed(1)}m</span>
                        </td>
                        <td>
                          {record.calculatedWastage > 0 ? (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-orange-500" />
                              <span className="font-medium text-orange-600">
                                {record.calculatedWastage.toFixed(1)}m
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">0m</span>
                          )}
                        </td>
                        <td>
                          <div className="text-xs">
                            <div>Used: {record.cumulativeUsed.toFixed(1)}m</div>
                            <div className="text-orange-600">Waste: {record.cumulativeWastage.toFixed(1)}m</div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No usage records found for this drum</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Enhanced Wastage Analysis */}
            {calculatedMetrics.totalWastage > 0 && (
              <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-800 dark:text-orange-200">Enhanced Wastage Analysis</span>
                </div>
                <div className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                  <p>
                    This drum has {calculatedMetrics.totalWastage.toFixed(1)}m of calculated wastage across{" "}
                    {calculatedMetrics.usageCount} installations.
                  </p>
                  <p>
                    Wastage is calculated based on gaps between cable usage points, accounting for bidirectional cable
                    usage.
                  </p>
                  <p>
                    Total deducted: {(calculatedMetrics.totalUsed + calculatedMetrics.totalWastage).toFixed(1)}m (
                    {(
                      ((calculatedMetrics.totalUsed + calculatedMetrics.totalWastage) / drumInfo.initial_quantity) *
                      100
                    ).toFixed(1)}
                    % of initial length)
                  </p>
                </div>
              </div>
            )}

            {/* Calculation Method Info */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Cable className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800 dark:text-blue-200">Enhanced Calculation Method</span>
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p>
                  • <strong>Usage:</strong> Calculated as absolute difference between start and end points (supports
                  bidirectional usage)
                </p>
                <p>
                  • <strong>Wastage:</strong> Calculated as gaps between consecutive usage end points and start points
                </p>
                <p>
                  • <strong>Validation:</strong> Total usage + wastage cannot exceed initial drum length
                </p>
                <p>
                  • <strong>Remaining:</strong> Initial length - total used - total wastage
                </p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
