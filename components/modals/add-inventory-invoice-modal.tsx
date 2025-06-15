"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Camera, Loader2, CheckCircle } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { useNotification } from "@/contexts/notification-context"
import { useAuth } from "@/contexts/auth-context"

interface InventoryItem {
  id: string
  name: string
  unit: string
  item_type: string
  current_stock: number
  drum_size?: number
}

interface InvoiceItem {
  id: string
  item_id: string
  description: string
  unit: string
  quantity_requested: number
  quantity_issued: number
}

interface AddInventoryInvoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddInventoryInvoiceModal({ open, onOpenChange, onSuccess }: AddInventoryInvoiceModalProps) {
  const [loading, setLoading] = useState(false)
  const [ocrProcessing, setOcrProcessing] = useState(false)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [autoInvoiceNumber, setAutoInvoiceNumber] = useState("")
  const [formData, setFormData] = useState({
    warehouse: "",
    date: new Date().toISOString().split("T")[0],
    issued_by: "",
    drawn_by: "",
    ocr_image_url: "",
  })
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    {
      id: "1",
      item_id: "",
      description: "",
      unit: "",
      quantity_requested: 0,
      quantity_issued: 0,
    },
  ])

  const supabase = getSupabaseClient()
  const { addNotification } = useNotification()
  const { user } = useAuth()

  useEffect(() => {
    if (open) {
      fetchInventoryItems()
      generateInvoiceNumber()
    }
  }, [open])

  const fetchInventoryItems = async () => {
    try {
      const { data, error } = await supabase.from("inventory_items").select("*").order("name")

      if (error) throw error
      setInventoryItems((data as unknown as InventoryItem[]) || [])
    } catch (error) {
      console.error("Error fetching inventory items:", error)
    }
  }

  const generateInvoiceNumber = async () => {
    try {
      const { data, error } = await supabase.rpc("generate_invoice_number")

      if (error) throw error
      setAutoInvoiceNumber(String(data))
    } catch (error) {
      console.error("Error generating invoice number:", error)
      // Fallback to timestamp-based number
      const timestamp = Date.now().toString().slice(-6)
      setAutoInvoiceNumber(`INV-${new Date().getFullYear()}-${timestamp}`)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (index: number, field: string, value: string | number) => {
    setInvoiceItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value }

          // Auto-fill description and unit when item is selected
          if (field === "item_id" && value) {
            const selectedItem = inventoryItems.find((inv) => inv.id === value)
            if (selectedItem) {
              updatedItem.description = selectedItem.name
              updatedItem.unit = selectedItem.unit
            }
          }

          return updatedItem
        }
        return item
      }),
    )
  }

  const addNewRow = () => {
    const newId = (invoiceItems.length + 1).toString()
    setInvoiceItems((prev) => [
      ...prev,
      {
        id: newId,
        item_id: "",
        description: "",
        unit: "",
        quantity_requested: 0,
        quantity_issued: 0,
      },
    ])
  }

  const removeRow = (index: number) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setOcrProcessing(true)

    try {
      // Upload image to Supabase Storage (you'll need to set up a bucket)
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `invoice-images/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("invoice-images")
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage.from("invoice-images").getPublicUrl(filePath)

      setFormData((prev) => ({ ...prev, ocr_image_url: urlData.publicUrl }))

      // Simulate OCR processing (you would integrate with actual OCR service here)
      await simulateOCRProcessing()

      addNotification({
        title: "OCR Processing Complete",
        message: "Invoice items have been extracted. Please review and confirm.",
        type: "success",
      })
    } catch (error: any) {
      addNotification({
        title: "Upload Error",
        message: error.message,
        type: "error",
      })
    } finally {
      setOcrProcessing(false)
    }
  }

  const simulateOCRProcessing = async () => {
    // Simulate OCR delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Simulate extracted items (in real implementation, this would come from OCR service)
    const extractedItems = [
      {
        id: "ocr1",
        item_id: inventoryItems.find((item) => item.name.includes("Drop Wire"))?.id || "",
        description: "Drop Wire Cable",
        unit: "meters",
        quantity_requested: 2000,
        quantity_issued: 2000,
      },
      {
        id: "ocr2",
        item_id: inventoryItems.find((item) => item.name.includes("C-Hook"))?.id || "",
        description: "C-Hook",
        unit: "pieces",
        quantity_requested: 100,
        quantity_issued: 100,
      },
    ]

    setInvoiceItems(extractedItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate items
      const validItems = invoiceItems.filter((item) => item.item_id && item.quantity_issued > 0)

      if (validItems.length === 0) {
        addNotification({
          title: "Validation Error",
          message: "Please add at least one valid item",
          type: "error",
        })
        setLoading(false)
        return
      }

      // Create invoice
      const invoiceData = {
        invoice_number: autoInvoiceNumber,
        warehouse: formData.warehouse,
        date: formData.date,
        issued_by: formData.issued_by,
        drawn_by: formData.drawn_by,
        created_by: user?.id,
        total_items: validItems.length,
        status: "completed",
        ocr_processed: !!formData.ocr_image_url,
        ocr_image_url: formData.ocr_image_url || null,
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from("inventory_invoices")
        .insert([invoiceData])
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Create invoice items and update stock
      for (const item of validItems) {
        // Create invoice item
        const { error: itemError } = await supabase.from("inventory_invoice_items").insert([
          {
            invoice_id: invoice.id,
            item_id: item.item_id,
            description: item.description,
            unit: item.unit,
            quantity_requested: item.quantity_requested,
            quantity_issued: item.quantity_issued,
          },
        ])

        if (itemError) throw itemError

        // Update inventory stock
        const { error: stockError } = await supabase.rpc("update_inventory_stock", {
          item_id: item.item_id,
          quantity_change: item.quantity_issued,
        })

        if (stockError) {
          // If RPC doesn't exist, update manually
          const { data: currentItem } = await supabase
            .from("inventory_items")
            .select("current_stock")
            .eq("id", item.item_id)
            .single()

          if (currentItem) {
            const currentStock = (currentItem as { current_stock: number }).current_stock
            await supabase
              .from("inventory_items")
              .update({
                current_stock: currentStock + item.quantity_issued,
                updated_at: new Date().toISOString(),
              })
              .eq("id", item.item_id)
          }
        }

        // Create drum tracking for cable items
        const inventoryItem = inventoryItems.find((inv) => inv.id === item.item_id)
        if (inventoryItem?.item_type === "cable" && inventoryItem.drum_size) {
          const drumCount = Math.ceil(item.quantity_issued / inventoryItem.drum_size)

          for (let i = 1; i <= drumCount; i++) {
            const drumNumber = `${autoInvoiceNumber}-DRUM-${i.toString().padStart(2, "0")}`
            const drumQuantity = Math.min(
              inventoryItem.drum_size,
              item.quantity_issued - (i - 1) * inventoryItem.drum_size,
            )

            await supabase.from("drum_tracking").insert([
              {
                drum_number: drumNumber,
                item_id: item.item_id,
                initial_quantity: drumQuantity,
                current_quantity: drumQuantity,
                received_date: formData.date,
                status: "active",
              },
            ])
          }
        }
      }

      addNotification({
        title: "Success",
        message: `Invoice ${autoInvoiceNumber} created successfully`,
        type: "success",
      })

      onSuccess()
      onOpenChange(false)

      // Reset form
      setFormData({
        warehouse: "",
        date: new Date().toISOString().split("T")[0],
        issued_by: "",
        drawn_by: "",
        ocr_image_url: "",
      })
      setInvoiceItems([
        {
          id: "1",
          item_id: "",
          description: "",
          unit: "",
          quantity_requested: 0,
          quantity_issued: 0,
        },
      ])
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message,
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Inventory Invoice</DialogTitle>
          <DialogDescription>
            Create a new inventory receipt with automatic stock updates and drum tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Invoice Information
                <Badge variant="outline" className="font-mono">
                  {autoInvoiceNumber}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="warehouse">Warehouse</Label>
                  <Input
                    id="warehouse"
                    value={formData.warehouse}
                    onChange={(e) => handleInputChange("warehouse", e.target.value)}
                    placeholder="Warehouse location"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="issued_by">Issued By</Label>
                  <Input
                    id="issued_by"
                    value={formData.issued_by}
                    onChange={(e) => handleInputChange("issued_by", e.target.value)}
                    placeholder="Person who issued the materials"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="drawn_by">Drawn By</Label>
                  <Input
                    id="drawn_by"
                    value={formData.drawn_by}
                    onChange={(e) => handleInputChange("drawn_by", e.target.value)}
                    placeholder="Person who received the materials"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* OCR Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                OCR Invoice Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="invoice_image">Upload Invoice Image</Label>
                  <div className="mt-2">
                    <Input
                      id="invoice_image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={ocrProcessing}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a photo of the physical invoice to automatically extract item details
                  </p>
                </div>

                {ocrProcessing && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Processing invoice image...</span>
                  </div>
                )}

                {formData.ocr_image_url && !ocrProcessing && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">OCR processing completed. Review items below.</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Invoice Items
                <Button type="button" onClick={addNewRow} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Row
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoiceItems.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <Label>Item</Label>
                      <Select value={item.item_id} onValueChange={(value) => handleItemChange(index, "item_id", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map((invItem) => (
                            <SelectItem key={invItem.id} value={invItem.id}>
                              {invItem.name} ({invItem.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label>Unit</Label>
                      <Input
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                        placeholder="Unit"
                        readOnly
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Qty Requested</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity_requested}
                        onChange={(e) =>
                          handleItemChange(index, "quantity_requested", Number.parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Qty Issued</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity_issued}
                        onChange={(e) =>
                          handleItemChange(index, "quantity_issued", Number.parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeRow(index)}
                        disabled={invoiceItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="text-sm text-muted-foreground">
                <p>
                  <strong>Total Items:</strong>{" "}
                  {invoiceItems.filter((item) => item.item_id && item.quantity_issued > 0).length}
                </p>
                <p>
                  <strong>Total Quantity:</strong>{" "}
                  {invoiceItems.reduce((sum, item) => sum + (item.quantity_issued || 0), 0).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating Invoice..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
