"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface TelephoneLine {
  id: string;
  line_number: string;
  customer_name: string;
  customer_address: string;
  installation_date: string;
  status: "active" | "inactive" | "suspended";
  monthly_fee: number;
  notes?: string;
  drum_id?: string;
  cable_used?: number;
}

interface Drum {
  id: string;
  drum_number: string;
  cable_type: string;
  total_length: number;
  used_length: number;
  available_length: number;
  status: "active" | "empty" | "damaged";
}

interface DrumUsage {
  id: string;
  drum_id: string;
  telephone_line_id: string;
  cable_used: number;
  usage_date: string;
  wastage: number;
}

interface EditTelephoneLineModalProps {
  isOpen: boolean;
  onClose: () => void;
  line: TelephoneLine | null;
  onSuccess: () => void;
}

export function EditTelephoneLineModal({
  isOpen,
  onClose,
  line,
  onSuccess,
}: EditTelephoneLineModalProps) {
  const [formData, setFormData] = useState<{
    line_number: string;
    customer_name: string;
    customer_address: string;
    installation_date: string;
    status: TelephoneLine["status"];
    monthly_fee: number;
    notes: string;
    drum_id: string;
    cable_used: number;
  }>({
    line_number: "",
    customer_name: "",
    customer_address: "",
    installation_date: "",
    status: "active",
    monthly_fee: 0,
    notes: "",
    drum_id: "",
    cable_used: 0,
  });
  const [drums, setDrums] = useState<Drum[]>([]);
  const [originalDrumUsage, setOriginalDrumUsage] = useState<DrumUsage | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (line && isOpen) {
      setFormData({
        line_number: line.line_number,
        customer_name: line.customer_name,
        customer_address: line.customer_address,
        installation_date: line.installation_date,
        status: line.status,
        monthly_fee: line.monthly_fee,
        notes: line.notes || "",
        drum_id: line.drum_id || "",
        cable_used: line.cable_used || 0,
      });

      // Fetch original drum usage if exists
      if (line.id) {
        fetchOriginalDrumUsage(line.id);
      }
    }
  }, [line, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchDrums();
    }
  }, [isOpen]);

  const fetchOriginalDrumUsage = async (lineId: string) => {
    try {
      const { data, error } = await supabase
        .from("drum_usage")
        .select("*")
        .eq("telephone_line_id", lineId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching original drum usage:", error);
        return;
      }

      setOriginalDrumUsage(data || null);
    } catch (error) {
      console.error("Error fetching original drum usage:", error);
    }
  };

  const fetchDrums = async () => {
    try {
      const { data, error } = await supabase
        .from("drum_tracking")
        .select("*")
        .eq("status", "active")
        .order("drum_number");

      if (error) throw error;
      setDrums(data || []);
    } catch (error) {
      console.error("Error fetching drums:", error);
      toast({
        title: "Error",
        description: "Failed to fetch drums",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!line) return;

    setIsLoading(true);

    try {
      // Update the telephone line
      const { error: lineError } = await supabase
        .from("telephone_lines")
        .update({
          line_number: formData.line_number,
          customer_name: formData.customer_name,
          customer_address: formData.customer_address,
          installation_date: formData.installation_date,
          status: formData.status,
          monthly_fee: formData.monthly_fee,
          notes: formData.notes,
          drum_id: formData.drum_id || null,
          cable_used: formData.cable_used || null,
        })
        .eq("id", line.id);

      if (lineError) throw lineError;

      // Handle drum usage changes
      const newDrumId = formData.drum_id;
      const newTotalCable = formData.cable_used;
      const originalDrumId = originalDrumUsage?.drum_id;

      // Case 1: Restore original drum usage if it exists and drum is being changed or removed
      if (originalDrumUsage && originalDrumId !== newDrumId) {
        // Restore the original drum's available quantity
        const { error: restoreError } = await supabase
          .from("drum_tracking")
          .update({
            used_length: (supabase as any)
              .sql`used_length - ${originalDrumUsage.cable_used}`,
            available_length: (supabase as any)
              .sql`available_length + ${originalDrumUsage.cable_used}`,
          })
          .eq("id", originalDrumId);

        if (restoreError) {
          console.error("Error restoring original drum:", restoreError);
          throw new Error("Failed to restore original drum usage");
        }

        // Update inventory - add back the cable
        const { error: inventoryRestoreError } = await supabase
          .from("inventory_items")
          .update({
            current_stock: (supabase as any)
              .sql`current_stock + ${originalDrumUsage.cable_used}`,
          })
          .eq("name", "Drop Wire Cable");

        if (inventoryRestoreError) {
          console.error("Error restoring inventory:", inventoryRestoreError);
          throw new Error("Failed to restore inventory");
        }

        // Delete the original drum usage record
        const { error: deleteError } = await supabase
          .from("drum_usage")
          .delete()
          .eq("id", originalDrumUsage.id);

        if (deleteError) {
          console.error("Error deleting original drum usage:", deleteError);
          throw new Error("Failed to delete original drum usage");
        }
      }

      // Case 2: Apply new drum usage if a drum is selected
      if (newDrumId && newTotalCable > 0) {
        // Get the selected drum's current state
        const { data: selectedDrum, error: drumError } = await supabase
          .from("drum_tracking")
          .select("*")
          .eq("id", newDrumId)
          .single();

        if (drumError) {
          console.error("Error fetching selected drum:", drumError);
          throw new Error("Failed to fetch selected drum");
        }

        if (!selectedDrum) {
          throw new Error("Selected drum not found");
        }

        // Check if there's enough cable available
        if (selectedDrum.available_length < newTotalCable) {
          throw new Error(
            `Not enough cable available. Available: ${selectedDrum.available_length}m, Required: ${newTotalCable}m`
          );
        }

        // Calculate wastage (5% of cable used)
        const wastage = Math.round(newTotalCable * 0.05);

        // Update drum tracking
        const { error: drumUpdateError } = await supabase
          .from("drum_tracking")
          .update({
            used_length: selectedDrum.used_length + newTotalCable,
            available_length: selectedDrum.available_length - newTotalCable,
          })
          .eq("id", newDrumId);

        if (drumUpdateError) {
          console.error("Error updating drum tracking:", drumUpdateError);
          throw new Error("Failed to update drum tracking");
        }

        // Update inventory
        const { error: inventoryError } = await supabase
          .from("inventory_items")
          .update({
            current_stock: (supabase as any)
              .sql`current_stock - ${newTotalCable}`,
          })
          .eq("name", "Drop Wire Cable");

        if (inventoryError) {
          console.error("Error updating inventory:", inventoryError);
          throw new Error("Failed to update inventory");
        }

        // Create new drum usage record
        const { error: usageError } = await supabase.from("drum_usage").insert({
          drum_id: newDrumId,
          telephone_line_id: line.id,
          cable_used: newTotalCable,
          usage_date: new Date().toISOString(),
          wastage: wastage,
        });

        if (usageError) {
          console.error("Error creating drum usage:", usageError);
          throw new Error("Failed to create drum usage record");
        }
      }

      toast({
        title: "Success",
        description: "Telephone line updated successfully",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating telephone line:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update telephone line",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableCable = (drumId: string) => {
    const drum = drums.find((d) => d.id === drumId);
    if (!drum) return 0;

    // If this is the same drum as originally used, include the original usage in available calculation
    if (originalDrumUsage && originalDrumUsage.drum_id === drumId) {
      return drum.available_length + originalDrumUsage.cable_used;
    }

    return drum.available_length;
  };

  const selectedDrum = drums.find((d) => d.id === formData.drum_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Edit Telephone Line</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label htmlFor='line_number'>Line Number</Label>
              <Input
                id='line_number'
                value={formData.line_number}
                onChange={(e) =>
                  setFormData({ ...formData, line_number: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor='status'>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='inactive'>Inactive</SelectItem>
                  <SelectItem value='suspended'>Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor='customer_name'>Customer Name</Label>
            <Input
              id='customer_name'
              value={formData.customer_name}
              onChange={(e) =>
                setFormData({ ...formData, customer_name: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor='customer_address'>Customer Address</Label>
            <Textarea
              id='customer_address'
              value={formData.customer_address}
              onChange={(e) =>
                setFormData({ ...formData, customer_address: e.target.value })
              }
              required
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label htmlFor='installation_date'>Installation Date</Label>
              <Input
                id='installation_date'
                type='date'
                value={formData.installation_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    installation_date: e.target.value,
                  })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor='monthly_fee'>Monthly Fee ($)</Label>
              <Input
                id='monthly_fee'
                type='number'
                step='0.01'
                value={formData.monthly_fee}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    monthly_fee: Number.parseFloat(e.target.value) || 0,
                  })
                }
                required
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label htmlFor='drum_id'>Drum</Label>
              <Select
                value={formData.drum_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, drum_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select a drum (optional)' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>No drum selected</SelectItem>
                  {drums.map((drum) => (
                    <SelectItem key={drum.id} value={drum.id}>
                      {drum.drum_number} - {drum.cable_type} (Available:{" "}
                      {getAvailableCable(drum.id)}m)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor='cable_used'>Cable Used (meters)</Label>
              <Input
                id='cable_used'
                type='number'
                step='0.1'
                value={formData.cable_used}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cable_used: Number.parseFloat(e.target.value) || 0,
                  })
                }
                max={
                  selectedDrum ? getAvailableCable(selectedDrum.id) : undefined
                }
              />
              {selectedDrum && (
                <p className='text-sm text-muted-foreground mt-1'>
                  Available: {getAvailableCable(selectedDrum.id)}m
                </p>
              )}
            </div>
          </div>

          {originalDrumUsage && (
            <div className='p-3 bg-muted rounded-lg'>
              <p className='text-sm font-medium'>Current Usage Info:</p>
              <p className='text-sm text-muted-foreground'>
                Currently using {originalDrumUsage.cable_used}m from drum{" "}
                {
                  drums.find((d) => d.id === originalDrumUsage.drum_id)
                    ?.drum_number
                }
              </p>
            </div>
          )}

          <div>
            <Label htmlFor='notes'>Notes</Label>
            <Textarea
              id='notes'
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder='Additional notes...'
            />
          </div>

          <div className='flex justify-end space-x-2'>
            <Button type='button' variant='outline' onClick={onClose}>
              Cancel
            </Button>
            <Button type='submit' disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Line"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
