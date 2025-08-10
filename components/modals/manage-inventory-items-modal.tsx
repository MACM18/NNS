"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface InventoryItem {
  id: string
  item_name: string
  quantity: number
  unit_price: number
  supplier: string | null
  last_restock: string | null
}

interface ManageInventoryItemsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ManageInventoryItemsModal({ open, onOpenChange, onSuccess }: ManageInventoryItemsModalProps) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState("")
  const [newQuantity, setNewQuantity] = useState("")
  const [newUnitPrice, setNewUnitPrice] = useState("")
  const [newSupplier, setNewSupplier] = useState("")
  const [newLastRestock, setNewLastRestock] = useState("")
  const [isAddingItem, setIsAddingItem] = useState(false)

  useEffect(() => {
    if (open) {
      fetchItems()
    }
  }, [open])

  const fetchItems = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from("inventory").select("*").order("item_name", { ascending: true })

    if (error) {
      console.error("Error fetching inventory items:", error)
      setError("Failed to load inventory items.")
      toast({
        title: "Error",
        description: "Failed to load inventory items.",
        variant: "destructive",
      })
    } else {
      setItems(data as InventoryItem[])
    }
    setLoading(false)
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingItem(true)
    try {
      const { error } = await supabase.from("inventory").insert({
        item_name: newItemName,
        quantity: Number.parseInt(newQuantity),
        unit_price: Number.parseFloat(newUnitPrice),
        supplier: newSupplier || null,
        last_restock: newLastRestock || null,
      })

      if (error) throw error

      toast({
        title: "Item Added",
        description: `${newItemName} added to inventory.`,
      })
      setNewItemName("")
      setNewQuantity("")
      setNewUnitPrice("")
      setNewSupplier("")
      setNewLastRestock("")
      fetchItems() // Refresh the list
      onSuccess()
    } catch (error: any) {
      console.error("Error adding item:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add item.",
        variant: "destructive",
      })
    } finally {
      setIsAddingItem(false)
    }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from("inventory").delete().eq("id", id)
      if (error) throw error
      toast({
        title: "Item Deleted",
        description: "Inventory item removed successfully.",
      })
      fetchItems() // Refresh the list
      onSuccess()
    } catch (error: any) {
      console.error("Error deleting item:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete item.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Inventory Items</DialogTitle>
          <DialogDescription>Add, edit, or remove items from your inventory.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <h3 className="text-lg font-medium">Add New Item</h3>
          <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="newItemName">Item Name</Label>
              <Input id="newItemName" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newQuantity">Quantity</Label>
              <Input
                id="newQuantity"
                type="number"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newUnitPrice">Unit Price</Label>
              <Input
                id="newUnitPrice"
                type="number"
                step="0.01"
                value={newUnitPrice}
                onChange={(e) => setNewUnitPrice(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newSupplier">Supplier</Label>
              <Input id="newSupplier" value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="newLastRestock">Last Restock Date</Label>
              <Input
                id="newLastRestock"
                type="date"
                value={newLastRestock}
                onChange={(e) => setNewLastRestock(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isAddingItem} className="md:col-span-2">
              {isAddingItem ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding Item...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </>
              )}
            </Button>
          </form>

          <h3 className="text-lg font-medium mt-6">Existing Items</h3>
          {loading ? (
            <div className="flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground">No inventory items found.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 border rounded-md">
                  <div>
                    <p className="font-medium">{item.item_name}</p>
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    <p className="text-xs text-muted-foreground">Price: {item.unit_price}</p>
                  </div>
                  <div className="flex gap-2">
                    {/* <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button> */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the inventory item.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
