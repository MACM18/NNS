"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface InventoryInvoice {
  id: string
  invoice_number: string
  supplier_name: string
  invoice_date: string
  total_amount: number
  status: string
}

interface EditInventoryInvoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: InventoryInvoice | null
  onSuccess: () => void
}

export function EditInventoryInvoiceModal({ open, onOpenChange, invoice, onSuccess }: EditInventoryInvoiceModalProps) {
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [invoiceDate, setInvoiceDate] = useState("")
  const [totalAmount, setTotalAmount] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (invoice) {
      setInvoiceNumber(invoice.invoice_number)
      setSupplierName(invoice.supplier_name)
      setInvoiceDate(invoice.invoice_date)
      setTotalAmount(invoice.total_amount.toString())
      setStatus(invoice.status)
    }
  }, [invoice])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!invoice) {
      toast({
        title: "Error",
        description: "No invoice selected for editing.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from("inventory_invoices")
      .update({
        invoice_number: invoiceNumber,
        supplier_name: supplierName,
        invoice_date: invoiceDate,
        total_amount: Number.parseFloat(totalAmount),
        status,
      })
      .eq("id", invoice.id)

    if (error) {
      console.error("Error updating inventory invoice:", error)
      toast({
        title: "Error",
        description: "Failed to update inventory invoice. Please try again.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Inventory invoice updated successfully.",
      })
      onSuccess()
      onOpenChange(false)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Inventory Invoice</DialogTitle>
          <DialogDescription>Make changes to the inventory invoice details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input
              id="invoiceNumber"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="supplierName">Supplier Name</Label>
            <Input id="supplierName" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invoiceDate">Invoice Date</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="totalAmount">Total Amount</Label>
            <Input
              id="totalAmount"
              type="number"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus} required>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="due">Due</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
