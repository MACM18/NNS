"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getSupabaseClient } from "@/lib/supabase";
import { useNotification } from "@/contexts/notification-context";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  reorder_level: number;
  last_updated: string;
}

interface EditInventoryItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onSuccess: () => void;
}

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Item name must be at least 2 characters.",
  }),
  reorder_level: z.coerce
    .number({ invalid_type_error: "Reorder level must be a number." })
    .min(0, { message: "Reorder level cannot be negative." }),
  current_stock: z.coerce
    .number({ invalid_type_error: "Current stock must be a number." })
    .min(0, { message: "Current stock cannot be negative." }),
});

export function EditInventoryItemModal({
  open,
  onOpenChange,
  item,
  onSuccess,
}: EditInventoryItemModalProps) {
  const supabase = getSupabaseClient();
  const { addNotification } = useNotification();
  const [stockEditable, setStockEditable] = React.useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      reorder_level: 0,
      current_stock: 0,
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        reorder_level: item.reorder_level || 0,
        current_stock: item.current_stock || 0,
      });
      setStockEditable(false);
    }
  }, [item, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!item) return;
    try {
      const updateData: any = {
        name: values.name,
        reorder_level: values.reorder_level,
      };
      if (stockEditable) {
        updateData.current_stock = values.current_stock;
      }
      const { error } = await supabase
        .from("inventory_items")
        .update(updateData)
        .eq("id", item.id);
      if (error) throw error;
      addNotification({
        title: "Success",
        message: "Inventory item updated successfully.",
        type: "success",
        category: "system",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message || "An error occurred while updating the item.",
        type: "error",
        category: "system",
      });
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Inventory Item</DialogTitle>
          <DialogDescription>
            Update the details for &quot;{item.name}&quot;.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g., Cat 6 Cable' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='reorder_level'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reorder Level</FormLabel>
                  <FormControl>
                    <Input type='number' placeholder='e.g., 10' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='current_stock'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Stock</FormLabel>
                  <div className='flex gap-2 items-center'>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='e.g., 100'
                        {...field}
                        disabled={!stockEditable}
                      />
                    </FormControl>
                    <Button
                      type='button'
                      variant={stockEditable ? "secondary" : "outline"}
                      onClick={() => setStockEditable((v) => !v)}
                      tabIndex={-1}
                    >
                      {stockEditable ? "Lock" : "Edit"}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type='button'
                variant='secondary'
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
