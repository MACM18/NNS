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
import { Plus, Trash2 } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { useNotification } from "@/contexts/notification-context"
import { useAuth } from "@/contexts/auth-context"
import { Loader2 } from "lucide-react"

interface InventoryItem {
  id: string
  name: string
  unit: string
  current_stock: number
}

interface WasteItem {
  id: string
  item_id: string
  item_name: string
  quantity: number | string
  waste_reason: string
}

interface AddWasteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddWasteModal({ open, onOpenChange, onSuccess }: AddWasteModalProps) {
  const [itemName, setItemName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [disposalDate, setDisposalDate] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [wasteItems, setWasteItems] = useState<WasteItem[]>([
    {
      id: "1",
      item_id: "",
      item_name: "",
      quantity: "", // Start as empty string
      waste_reason: "",
    },
  ])

  const supabase = getSupabaseClient()
  const { addNotification } = useNotification()
  const { user } = useAuth()

  useEffect(() => {
    if (open) {
      fetchInventoryItems()
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

  const handleItemChange = (index: number, field: string, value: string | number) => {
    setWasteItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value }

          // Auto-fill item name when item is selected
          if (field === "item_id" && value) {
            const selectedItem = inventoryItems.find((inv) => inv.id === value)
            if (selectedItem) {
              updatedItem.item_name = selectedItem.name
            }
          }

          // If quantity is cleared, set to empty string
          if (field === "quantity" && value === "") {
            updatedItem.quantity = ""
          }

          return updatedItem
        }
        return item
      }),
    )
  }

  const addNewRow = () => {
    const newId = (wasteItems.length + 1).toString()
    setWasteItems((prev) => [
      ...prev,
      {
        id: newId,
        item_id: "",
        item_name: "",
        quantity: "", // Start as empty string
        waste_reason: "",
      },
    ])
  }

  const removeRow = (index: number) => {
    if (wasteItems.length > 1) {
      setWasteItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate items
      const validItems = wasteItems.filter(
        (item) => item.item_id && Number(item.quantity) > 0, // waste_reason can be empty
      )

      if (validItems.length === 0) {
        addNotification({
          title: "Validation Error",
          message: "Please add at least one valid waste item with positive quantity",
          type: "error",
          category: "system",
        })
        setLoading(false)
        return
      }

      const reporterName = user?.id

      // Create waste records and update stock
      for (const item of validItems) {
        // Create waste record
        const { error: wasteError } = await supabase.from("waste_tracking").insert([
          {
            item_id: item.item_id,
            quantity: Number(item.quantity),
            waste_reason: item.waste_reason,
            waste_date: disposalDate || new Date().toISOString().split("T")[0],
            reported_by: reporterName,
          },
        ])

        if (wasteError) throw wasteError

        // Update inventory stock (reduce by waste amount)
        const { data: currentItem } = await supabase
          .from("inventory_items")
          .select("current_stock")
          .eq("id", item.item_id)
          .single()

        if (currentItem) {
          const newStock = Math.max(0, (currentItem.current_stock as number) - Number(item.quantity))
          await supabase
            .from("inventory_items")
            .update({
              current_stock: newStock,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.item_id)
        }
      }

      addNotification({
        title: "Success",
        message: `${validItems.length} waste items recorded successfully`,
        type: "success",
        category: "system",
      })

      onSuccess()
      onOpenChange(false)

      // Reset form
      setDisposalDate("")
      setWasteItems([
        {
          id: "1",
          item_id: "",
          item_name: "",
          quantity: "", // Reset to empty string
          waste_reason: "",
        },
      ])
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message,
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
          <DialogTitle>Add New Waste Entry</DialogTitle>
          <DialogDescription>Record details of disposed inventory items.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Waste Date */}
          <div>
            <Label htmlFor="disposalDate">Disposal Date</Label>
            <Input
              id="disposalDate"
              type="date"
              value={disposalDate}
              onChange={(e) => setDisposalDate(e.target.value)}
              required
            />
          </div>

          {/* Waste Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Waste Items
                <Button type="button" onClick={addNewRow} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {wasteItems.map((item, index) => (
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
                              {invItem.name} (Stock: {invItem.current_stock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "quantity",
                            e.target.value === "" ? "" : Number.parseFloat(e.target.value) || "",
                          )
                        }
                        placeholder="Waste qty"
                      />
                    </div>
                    <div className="col-span-6">
                      <Label>Waste Reason</Label>
                      <Input
                        value={item.waste_reason}
                        onChange={(e) => handleItemChange(index, "waste_reason", e.target.value)}
                        placeholder="Reason for waste (damaged, expired, etc.)"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeRow(index)}
                        disabled={wasteItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                <p>
                  <strong>Total Waste Items:</strong>{" "}
                  {wasteItems.filter((item) => item.item_id && Number(item.quantity) > 0).length}
                </p>
                <p>
                  <strong>Total Waste Quantity:</strong>{" "}
                  {wasteItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding Entry...
                </>
              ) : (
                "Add Entry"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
