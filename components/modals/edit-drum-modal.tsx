import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Notification } from "@/types/notifications";

interface EditDrumModalProps {
  open: boolean;
  drum: {
    id: string;
    drum_number: string;
    initial_quantity: number;
    current_quantity: number;
    received_date: string;
    status: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
  addNotification: (
    notification: Omit<
      Notification,
      "id" | "user_id" | "is_read" | "created_at" | "updated_at"
    >
  ) => Promise<void>;
}

export function EditDrumModal({
  open,
  drum,
  onClose,
  onSuccess,
  addNotification,
}: EditDrumModalProps) {
  if (!drum) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Drum</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const form = e.target as HTMLFormElement;
              const drum_number = (
                form.elements.namedItem("drum_number") as HTMLInputElement
              ).value;
              const initial_quantity = Number(
                (
                  form.elements.namedItem(
                    "initial_quantity"
                  ) as HTMLInputElement
                ).value
              );
              const current_quantity = Number(
                (
                  form.elements.namedItem(
                    "current_quantity"
                  ) as HTMLInputElement
                ).value
              );
              const received_date = (
                form.elements.namedItem("received_date") as HTMLInputElement
              ).value;
              const status = (
                form.elements.namedItem("status") as HTMLSelectElement
              ).value;

              const response = await fetch(`/api/drums/${drum.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  drum_number,
                  initial_quantity,
                  current_quantity,
                  received_date,
                  status,
                }),
              });

              if (!response.ok) throw new Error("Failed to update drum");

              addNotification({
                title: "Drum Updated",
                message: `Drum #${drum_number} updated successfully`,
                type: "success",
                category: "system",
              });
              onClose();
              onSuccess();
            } catch (error: any) {
              addNotification({
                title: "Error",
                message: error.message || "Failed to update drum",
                type: "error",
                category: "system",
              });
            }
          }}
          className='space-y-4'
        >
          <div>
            <label className='block text-sm font-medium mb-1'>
              Drum Number
            </label>
            <input
              name='drum_number'
              type='text'
              defaultValue={drum.drum_number}
              className='w-full border rounded px-2 py-1'
              required
            />
          </div>
          <div className='flex gap-2'>
            <div className='flex-1'>
              <label className='block text-sm font-medium mb-1'>
                Initial Quantity
              </label>
              <input
                name='initial_quantity'
                type='number'
                min='0'
                step='0.01'
                defaultValue={drum.initial_quantity}
                className='w-full border rounded px-2 py-1'
                required
              />
            </div>
            <div className='flex-1'>
              <label className='block text-sm font-medium mb-1'>
                Current Quantity
              </label>
              <input
                name='current_quantity'
                type='number'
                min='0'
                step='0.01'
                defaultValue={drum.current_quantity}
                className='w-full border rounded px-2 py-1'
                required
              />
            </div>
          </div>
          <div>
            <label className='block text-sm font-medium mb-1'>
              Received Date
            </label>
            <input
              name='received_date'
              type='date'
              defaultValue={
                drum.received_date ? drum.received_date.slice(0, 10) : ""
              }
              className='w-full border rounded px-2 py-1'
              required
            />
          </div>
          <div>
            <label className='block text-sm font-medium mb-1'>Status</label>
            <select
              name='status'
              defaultValue={drum.status}
              className='w-full border rounded px-2 py-1'
              required
            >
              <option value='active'>Active</option>
              <option value='inactive'>Inactive</option>
              <option value='empty'>Empty</option>
              <option value='maintenance'>Maintenance</option>
            </select>
          </div>
          <DialogFooter>
            <Button type='button' variant='secondary' onClick={onClose}>
              Cancel
            </Button>
            <Button type='submit'>Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
