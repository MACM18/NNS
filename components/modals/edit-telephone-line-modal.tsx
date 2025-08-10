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

interface LineDetails {
  id: string
  telephone_no: string
  customer_name: string
  address: string
  status: string
  installation_date: string
  service_type: string
  monthly_fee: number
}

interface EditTelephoneLineModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  line: LineDetails | null
  onSuccess: () => void
}

export function EditTelephoneLineModal({ open, onOpenChange, line, onSuccess }: EditTelephoneLineModalProps) {
  const [telephoneNo, setTelephoneNo] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [address, setAddress] = useState("")
  const [status, setStatus] = useState("")
  const [installationDate, setInstallationDate] = useState("")
  const [serviceType, setServiceType] = useState("")
  const [monthlyFee, setMonthlyFee] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (line) {
      setTelephoneNo(line.telephone_no)
      setCustomerName(line.customer_name)
      setAddress(line.address)
      setStatus(line.status)
      setInstallationDate(line.installation_date)
      setServiceType(line.service_type)
      setMonthlyFee(line.monthly_fee.toString())
    }
  }, [line])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!line) {
      toast({
        title: "Error",
        description: "No line selected for editing.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from("line_details")
      .update({
        telephone_no: telephoneNo,
        customer_name: customerName,
        address,
        status,
        installation_date: installationDate,
        service_type: serviceType,
        monthly_fee: Number.parseFloat(monthlyFee),
      })
      .eq("id", line.id)

    if (error) {
      console.error("Error updating telephone line:", error)
      toast({
        title: "Error",
        description: "Failed to update telephone line. Please try again.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Telephone line updated successfully.",
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
          <DialogTitle>Edit Telephone Line</DialogTitle>
          <DialogDescription>Make changes to the telephone line details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="telephoneNo">Telephone Number</Label>
            <Input id="telephoneNo" value={telephoneNo} onChange={(e) => setTelephoneNo(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus} required>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="installationDate">Installation Date</Label>
            <Input
              id="installationDate"
              type="date"
              value={installationDate}
              onChange={(e) => setInstallationDate(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="serviceType">Service Type</Label>
            <Select value={serviceType} onValueChange={setServiceType} required>
              <SelectTrigger id="serviceType">
                <SelectValue placeholder="Select service type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fiber">Fiber Optic</SelectItem>
                <SelectItem value="dsl">DSL</SelectItem>
                <SelectItem value="cable">Cable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="monthlyFee">Monthly Fee</Label>
            <Input
              id="monthlyFee"
              type="number"
              step="0.01"
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
              required
            />
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
