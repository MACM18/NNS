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

interface InventoryItem {
  id: string
  item_name: string
  quantity: number
  unit_price: number
  supplier: string | null
  last_restock: string | null
}

interface EditDrumModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  drum: InventoryItem | null
  onSuccess: () => void
}

export function EditDrumModal({ open, onOpenChange, drum, onSuccess }: EditDrumModalProps) {
  const [itemName, setItemName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unitPrice, setUnitPrice] = useState("")
  const [supplier, setSupplier] = useState("")
  const [lastRestock, setLastRestock] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (drum) {
      setItemName(drum.item_name)
      setQuantity(drum.quantity.toString())
      setUnitPrice(drum.unit_price.toString())
      setSupplier(drum.supplier || "")
      setLastRestock(drum.last_restock || "")
    }
  }, [drum])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!drum) {
      toast({
        title: "Error",
        description: "No drum selected for editing.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from("inventory")
      .update({
        item_name: itemName,
        quantity: Number.parseInt(quantity),
        unit_price: Number.parseFloat(unitPrice),
        supplier: supplier || null,
        last_restock: lastRestock || null,
      })
      .eq("id", drum.id)

    if (error) {
      console.error("Error updating drum:", error)
      toast({
        title: "Error",
        description: "Failed to update drum. Please try again.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Drum updated successfully.",
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
          <DialogTitle>Edit Drum Details</DialogTitle>
          <DialogDescription>Make changes to the drum inventory details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="itemName">Item Name</Label>
            <Input id="itemName" value={itemName} onChange={(e) => setItemName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="unitPrice">Unit Price</Label>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Input id="supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastRestock">Last Restock Date</Label>
            <Input id="lastRestock" type="date" value={lastRestock} onChange={(e) => setLastRestock(e.target.value)} />
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
