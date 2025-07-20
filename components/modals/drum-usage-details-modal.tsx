"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSupabaseClient } from "@/lib/supabase"
import type { DrumTracking } from "@/app/inventory/page" // re-use the type defined there

interface DrumUsage {
  id: string
  line_id: string
  cable_start: number
  cable_end: number
  used_length: number
  wastage: number
  created_at: string
}

interface DrumUsageDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  drum: DrumTracking | null
}

/**
 * Shows a table of all usage records (start/end points, wastage)
 * for the selected drum. You can wire in additional actions later.
 */
export function DrumUsageDetailsModal({ open, onOpenChange, drum }: DrumUsageDetailsModalProps) {
  const supabase = getSupabaseClient()
  const [loading, setLoading] = React.useState(false)
  const [records, setRecords] = React.useState<DrumUsage[]>([])

  React.useEffect(() => {
    if (!open || !drum) return

    const fetchUsage = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("drum_usage") // ← ensure this table exists in Supabase
        .select("id, line_id, cable_start, cable_end, used_length, wastage, created_at")
        .eq("drum_id", drum.id)
        .order("created_at", { ascending: false })

      if (!error) {
        setRecords((data as DrumUsage[]) || [])
      }
      setLoading(false)
    }

    fetchUsage()
  }, [open, drum, supabase])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{`Drum #${drum?.drum_number ?? ""} • Usage History`}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-center py-6">Loading usage records…</p>
        ) : records.length === 0 ? (
          <p className="text-center py-6 text-muted-foreground">No usage records for this drum.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Line ID</TableHead>
                <TableHead>Cable Start (m)</TableHead>
                <TableHead>Cable End (m)</TableHead>
                <TableHead>Used (m)</TableHead>
                <TableHead>Wastage (m)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell>{new Date(rec.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono">{rec.line_id}</TableCell>
                  <TableCell>{rec.cable_start}</TableCell>
                  <TableCell>{rec.cable_end}</TableCell>
                  <TableCell>{rec.used_length}</TableCell>
                  <TableCell>{rec.wastage}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
