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
  reorder_level: number;
}

interface ManageInventoryItemsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: string;
}

export function ManageInventoryItemsModal({
  open,
  onOpenChange,
  userRole,
}: ManageInventoryItemsModalProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [newItem, setNewItem] = useState<Omit<InventoryItem, "id">>({
    name: "",
    unit: "",
    reorder_level: 0,
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);

  const totalPages = Math.ceil(items.length / pageSize);
  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (open) fetchItems();
  }, [open]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/inventory?all=true");
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
      fetchItems();
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
      setNewItem({ name: "", unit: "", reorder_level: 0 });
      fetchItems();
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
      if (!response.ok) throw new Error("Failed to delete item");
      toast({ title: "Item Deleted" });
      fetchItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (open) {
      fetchItems();
      setPage(1);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Manage Inventory Items</DialogTitle>
        </DialogHeader>
        <div className='mb-4'>
          <div className='flex gap-2 mb-2'>
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
            <Button
              onClick={saveNew}
              disabled={userRole === "user"}
              variant='default'
            >
              <Plus className='h-4 w-4' />
            </Button>
          </div>
        </div>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4}>Loading...</TableCell>
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
                            disabled={userRole === "user"}
                          >
                            <Pencil className='h-4 w-4' />
                          </Button>
                          {userRole === "admin" && (
                            <Button
                              size='icon'
                              variant='destructive'
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
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
            Page {page} of {totalPages || 1}
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
  );
}
