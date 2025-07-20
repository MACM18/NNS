"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase"
import { useNotification } from "@/contexts/notification-context"
import { Cable, AlertTriangle, TrendingDown } from "lucide-react"

interface DrumUsageDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  drumId: string | null
  drumNumber: string
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

export function DrumUsageDetailsModal({ open, onOpenChange, drumId, drumNumber }: DrumUsageDetailsModalProps) {
  const [usageRecords, setUsageRecords] = useState<DrumUsageRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [drumStats, setDrumStats] = useState({
    totalUsed: 0,
    totalWastage: 0,
    remainingLength: 0,
    usageCount: 0,
    totalDeducted: 0,
  })

  const supabase = getSupabaseClient()
  const { addNotification } = useNotification()

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

      // Calculate stats
      const totalUsed = (usage || []).reduce((sum, record) => sum + record.quantity_used, 0)
      const totalWastage = (usage || []).reduce((sum, record) => sum + (record.wastage_calculated || 0), 0)
      const totalDeducted = totalUsed + totalWastage

      setDrumStats({
        totalUsed,
        totalWastage,
        remainingLength: drum.current_quantity, // Use actual current_quantity from drum_tracking
        usageCount: (usage || []).length,
        totalDeducted, // Add this new field
      })
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: `Failed to fetch drum usage: ${error.message}`,
        type: "error",
        category: "system",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cable className="h-5 w-5" />
            Drum Usage Details - {drumNumber}
          </DialogTitle>
          <DialogDescription>Detailed usage history and wastage tracking for this cable drum</DialogDescription>
        </DialogHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{drumStats.totalUsed.toFixed(1)}m</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Wastage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{drumStats.totalWastage.toFixed(1)}m</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{drumStats.remainingLength.toFixed(1)}m</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Deducted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {(drumStats.totalUsed + drumStats.totalWastage).toFixed(1)}m
              </div>
              <div className="text-xs text-muted-foreground">Used + Wastage</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Usage Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{drumStats.usageCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Records Table */}
        <div className="border rounded-lg">
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading usage records...</p>
                  </TableCell>
                </TableRow>
              ) : usageRecords.length > 0 ? (
                usageRecords.map((record, index) => (
                  <TableRow key={record.id}>
                    <TableCell>{new Date(record.usage_date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-sm">{record.line_details?.telephone_no || "N/A"}</TableCell>
                    <TableCell>{record.line_details?.name || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {record.line_details?.dp || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div>Start: {record.cable_start_point?.toFixed(1) || "0"}m</div>
                        <div>End: {record.cable_end_point?.toFixed(1) || "0"}m</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-blue-600">{record.quantity_used.toFixed(1)}m</span>
                    </TableCell>
                    <TableCell>
                      {record.wastage_calculated > 0 ? (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-orange-500" />
                          <span className="font-medium text-orange-600">{record.wastage_calculated.toFixed(1)}m</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">0m</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No usage records found for this drum</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Wastage Alert */}
        {drumStats.totalWastage > 0 && (
          <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-orange-800 dark:text-orange-200">Wastage Alert</span>
            </div>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
              This drum has {drumStats.totalWastage.toFixed(1)}m of wastage across {drumStats.usageCount} installations.
              Consider reviewing installation procedures to minimize waste.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
