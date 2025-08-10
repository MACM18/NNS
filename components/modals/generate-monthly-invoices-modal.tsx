"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MonthYearPicker } from "@/components/ui/month-year-picker"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface GenerateMonthlyInvoicesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function GenerateMonthlyInvoicesModal({ open, onOpenChange, onSuccess }: GenerateMonthlyInvoicesModalProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const year = selectedDate.getFullYear()
      const month = selectedDate.getMonth() + 1 // Month is 0-indexed

      // Fetch all active lines
      const { data: lines, error: linesError } = await supabase
        .from("line_details")
        .select("telephone_no, customer_name, monthly_fee")
        .eq("status", "active")

      if (linesError) throw linesError

      if (!lines || lines.length === 0) {
        toast({
          title: "No Active Lines",
          description: "No active telephone lines found to generate invoices for.",
          variant: "default",
        })
        setLoading(false)
        onOpenChange(false)
        return
      }

      const invoicesToInsert = lines.map((line) => ({
        customer_name: line.customer_name,
        invoice_date: new Date().toISOString().split("T")[0], // Current date
        due_date: new Date(year, month, 7).toISOString().split("T")[0], // Due by 7th of next month
        total_amount: line.monthly_fee,
        status: "pending",
        job_month: `${year}-${month.toString().padStart(2, "0")}-01`, // First day of the selected month
      }))

      const { error: insertError } = await supabase.from("generated_invoices").insert(invoicesToInsert)

      if (insertError) throw insertError

      toast({
        title: "Invoices Generated",
        description: `${invoicesToInsert.length} invoices generated successfully for ${selectedDate.toLocaleString(
          "default",
          { month: "long", year: "numeric" },
        )}.`,
      })
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error generating invoices:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate invoices. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Monthly Invoices</DialogTitle>
          <DialogDescription>Select the month for which to generate invoices.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="monthYear">Month and Year</Label>
            <MonthYearPicker date={selectedDate} onDateChange={setSelectedDate} />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Invoices"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
