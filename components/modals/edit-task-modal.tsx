"use client";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSupabaseClient } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface EditTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
  onSuccess: () => void;
}

export function EditTaskModal({
  open,
  onOpenChange,
  task,
  onSuccess,
}: EditTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ ...task });

  useEffect(() => {
    setFormData({ ...task });
  }, [task]);

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await getSupabaseClient()
        .from("tasks")
        .update(formData)
        .eq("id", task.id);
      if (error) throw error;
      toast({
        title: "Task Updated",
        description: "The task was updated successfully.",
        variant: "default",
        duration: 3000,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description:
          error.message || "An error occurred while updating the task.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update the details for this task.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <Label htmlFor='customer_name'>Customer Name</Label>
            <Input
              id='customer_name'
              value={formData.customer_name || ""}
              onChange={(e) =>
                handleInputChange("customer_name", e.target.value)
              }
              required
            />
          </div>
          <div>
            <Label htmlFor='telephone_no'>Telephone No</Label>
            <Input
              id='telephone_no'
              value={formData.telephone_no || ""}
              onChange={(e) =>
                handleInputChange("telephone_no", e.target.value)
              }
              required
            />
          </div>
          <div>
            <Label htmlFor='address'>Address</Label>
            <Textarea
              id='address'
              value={formData.address || ""}
              onChange={(e) => handleInputChange("address", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor='status'>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='pending'>Pending</SelectItem>
                <SelectItem value='accepted'>Accepted</SelectItem>
                <SelectItem value='completed'>Completed</SelectItem>
                <SelectItem value='rejected'>Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={loading}>
              {loading ? "Saving..." : "Update Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
