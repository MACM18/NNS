"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  reorder_level: number;
  is_active?: boolean;
}

interface ManageInventoryItemsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: string;
  onSuccess?: () => void;
}

export function ManageInventoryItemsModal({
  open,
  onOpenChange,
  userRole,
  onSuccess,
}: ManageInventoryItemsModalProps) {
  const canManageItems = ["admin", "moderator", "superadmin"].includes(userRole.toLowerCase());
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [newItem, setNewItem] = useState<Omit<InventoryItem, "id">>({
    name: "",
    unit: "",
    current_stock: 0,
    reorder_level: 0,
    is_active: true,
  });
  const [statusFilter, setStatusFilter] = useState<"active" | "archived">("active");
  const [itemPendingDelete, setItemPendingDelete] = useState<InventoryItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);

  const visibleItems = items.filter((item) => statusFilter === "active" ? item.is_active !== false : item.is_active === false);
  const totalPages = Math.ceil(visibleItems.length / pageSize);
  const paginatedItems = visibleItems.slice((page - 1) * pageSize, page * pageSize);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/inventory?all=true&includeInactive=true");
      if (!response.ok) throw new Error("Failed to fetch items");
      const result = await response.json();
      setItems((result.data as InventoryItem[]) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleEdit = (item: InventoryItem) => setEditingItem(item);
  const handleEditChange = (
    field: keyof InventoryItem,
    value: string | number
  ) => setEditingItem((prev) => (prev ? { ...prev, [field]: value } : prev));
  const handleNewChange = (
    field: keyof Omit<InventoryItem, "id">,
    value: string | number
  ) => setNewItem((prev) => ({ ...prev, [field]: value }));

  const saveEdit = async () => {
    if (!editingItem) return;
    const { id, ...updateData } = editingItem;
    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error("Failed to update item");
      toast({ title: "Item Updated" });
      setEditingItem(null);
      await fetchItems();
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const saveNew = async () => {
    if (!newItem.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }
    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      if (!response.ok) throw new Error("Failed to create item");
      toast({ title: "Item Added" });
      setNewItem({ name: "", unit: "", current_stock: 0, reorder_level: 0, is_active: true });
      fetchItems();
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    try {
      const response = await fetch(`/api/inventory/${item.id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Failed to remove item");
      toast({
        title: result.action === "archived" ? "Item Archived" : "Item Deleted",
        description: result.action === "archived"
          ? "The item history was preserved and the item was hidden from active stock."
          : "The unused item was permanently deleted.",
      });
      setDeleteDialogOpen(false);
      setItemPendingDelete(null);
      await fetchItems();
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const restoreItem = async (item: InventoryItem) => {
    try {
      const response = await fetch(`/api/inventory/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Failed to restore item");
      toast({ title: "Item Restored", description: `${item.name} is active again.` });
      await fetchItems();
      onSuccess?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (open) {
      fetchItems();
      setPage(1);
    }
  }, [open]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Manage Inventory Items</DialogTitle>
        </DialogHeader>
        <div className='mb-4 space-y-3'>
          <div className='flex flex-col gap-2 sm:flex-row'>
            <Input
              placeholder='Name'
              value={newItem.name}
              onChange={(e) => handleNewChange("name", e.target.value)}
            />
            <Input
              placeholder='Unit'
              value={newItem.unit}
              onChange={(e) => handleNewChange("unit", e.target.value)}
            />
            <Input
              placeholder='Reorder Level'
              type='number'
              value={newItem.reorder_level}
              onChange={(e) =>
                handleNewChange("reorder_level", Number(e.target.value))
              }
            />
            <Input
              placeholder='Initial Stock (can be negative)'
              type='number'
              step='any'
              value={newItem.current_stock}
              onChange={(e) => handleNewChange("current_stock", Number(e.target.value))}
            />
            <Button
              onClick={saveNew}
              disabled={!canManageItems}
              variant='default'
            >
              <Plus className='h-4 w-4' />
            </Button>
          </div>
          <div className='flex items-center justify-between gap-2'>
            <p className='text-xs text-muted-foreground'>Negative initial stock is allowed when it reflects a real opening balance.</p>
            <div className='flex gap-1 rounded-lg border p-1'>
              <Button size='sm' variant={statusFilter === "active" ? "secondary" : "ghost"} className='h-7 text-xs' onClick={() => setStatusFilter("active")}>Active</Button>
              <Button size='sm' variant={statusFilter === "archived" ? "secondary" : "ghost"} className='h-7 text-xs' onClick={() => setStatusFilter("archived")}>Archived</Button>
            </div>
          </div>
        </div>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                    <TableCell colSpan={6}>Loading...</TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {editingItem?.id === item.id ? (
                        <Input
                          value={editingItem.name}
                          onChange={(e) =>
                            handleEditChange("name", e.target.value)
                          }
                        />
                      ) : (
                        item.name
                      )}
                    </TableCell>
                    <TableCell>
                      {editingItem?.id === item.id ? (
                        <Input
                          value={editingItem.unit}
                          onChange={(e) =>
                            handleEditChange("unit", e.target.value)
                          }
                        />
                      ) : (
                        item.unit
                      )}
                    </TableCell>
                    <TableCell>
                      {editingItem?.id === item.id ? (
                        <Input
                          type='number'
                          value={editingItem.reorder_level}
                          onChange={(e) =>
                            handleEditChange(
                              "reorder_level",
                              Number(e.target.value)
                            )
                          }
                        />
                      ) : (
                        item.reorder_level
                      )}
                    </TableCell>
                    <TableCell className={item.current_stock < 0 ? "font-semibold text-destructive" : ""}>{item.current_stock} {item.unit}</TableCell>
                    <TableCell>
                      {item.reorder_level}
                    </TableCell>
                    <TableCell>
                      {item.is_active === false ? <span className='rounded-full border border-muted-foreground/30 px-2 py-0.5 text-xs text-muted-foreground'>Archived</span> : item.current_stock < 0 ? <span className='rounded-full border border-destructive/30 px-2 py-0.5 text-xs text-destructive'>Negative stock</span> : <span className='rounded-full border border-emerald-500/30 px-2 py-0.5 text-xs text-emerald-600'>Active</span>}
                    </TableCell>
                    <TableCell className='flex gap-2'>
                      {editingItem?.id === item.id ? (
                        <>
                          <Button
                            size='sm'
                            onClick={saveEdit}
                            variant='default'
                          >
                            Save
                          </Button>
                          <Button
                            size='sm'
                            onClick={() => setEditingItem(null)}
                            variant='outline'
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size='icon'
                            variant='outline'
                            onClick={() => handleEdit(item)}
                            disabled={!canManageItems}
                          >
                            <Pencil className='h-4 w-4' />
                          </Button>
                          {canManageItems && item.is_active !== false && (
                            <Button
                              size='icon'
                              variant='destructive'
                              onClick={() => { setItemPendingDelete(item); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          )}
                          {canManageItems && item.is_active === false && (
                            <Button size='sm' variant='outline' onClick={() => void restoreItem(item)}>Restore</Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {/* Pagination Controls */}
        <div className='flex justify-between items-center mt-4'>
          <span className='text-sm text-muted-foreground'>
            Page {page} of {totalPages || 1} · {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"}
          </span>
          <div className='flex gap-2'>
            <Button
              size='sm'
              variant='outline'
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
            >
              Next
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {itemPendingDelete?.name || "this item"}?</AlertDialogTitle>
          <AlertDialogDescription>
            If this item has stock or historical records, it will be archived and all invoices, mappings, and stock history will remain available. Only an unused zero-stock item can be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => itemPendingDelete && void handleDelete(itemPendingDelete)}>Remove item</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
