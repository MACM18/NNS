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
  current_quantity: number;
  status: "active" | "inactive" | "empty" | "damaged";
  item_name?: string;
}

interface DrumUsage {
  id: string;
  drum_id: string;
  line_id: string;
  quantity_used: number;
  usage_date: string;
  wastage_calculated: number;
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
      const res = await fetch(`/api/lines/${lineId}/usage`);
      if (!res.ok) throw new Error("Failed to fetch original usage");
      const json = await res.json();
      const u = json.data;
      if (!u) {
        setOriginalDrumUsage(null);
        return;
      }
      setOriginalDrumUsage({
        id: u.id,
        drum_id: u.drum_id,
        line_id: u.line_id,
        quantity_used: u.quantity_used,
        usage_date: u.usage_date,
        wastage_calculated: u.wastage_calculated,
      });
    } catch (error) {
      console.error("Error fetching original drum usage:", error);
    }
  };

  const fetchDrums = async () => {
    try {
      const res = await fetch(`/api/drums?status=active&all=true`);
      if (!res.ok) throw new Error("Failed to fetch drums");
      const json = await res.json();
      const mapped = (json.data || []).map((d: any) => ({
        id: d.id,
        drum_number: d.drum_number,
        current_quantity: d.current_quantity,
        status: d.status,
        item_name: d.item_name,
      }));
      setDrums(mapped);
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
      // Delegate all reconciliation to server API
      const res = await fetch(`/api/lines/${line.id}/update-with-usage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drum_id: formData.drum_id || null,
          cable_used: formData.cable_used || 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to update line");
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
      return (
        (drum.current_quantity || 0) + (originalDrumUsage.quantity_used || 0)
      );
    }

    return drum.current_quantity || 0;
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
                      {drum.drum_number} (Available:{" "}
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
                Currently using {(originalDrumUsage as any).cableUsed}m from drum{" "}
                {
                  drums.find((d) => d.id === (originalDrumUsage as any).drumId)
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
