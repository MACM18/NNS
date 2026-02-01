"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import type { Worker, WorkerFormData } from "@/types/workers";

interface ManageWorkersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkersUpdated?: () => void;
}

export function ManageWorkersModal({
  open,
  onOpenChange,
  onWorkersUpdated,
}: ManageWorkersModalProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    employee_no: "",
    phone_number: "",
    email: "",
    role: "technician",
    status: "active",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workers");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch workers");
      }
      setWorkers(json.workers || []);
    } catch (error: any) {
      toast({
        title: "Failed to load workers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchWorkers();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      full_name: "",
      employee_no: "",
      phone_number: "",
      email: "",
      role: "technician",
      status: "active",
      notes: "",
    });
    setEditingWorker(null);
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      full_name: worker.full_name,
      employee_no: worker.employee_no || "",
      phone_number: worker.phone_number || "",
      email: worker.email || "",
      role: worker.role || "technician",
      status: worker.status,
      notes: worker.notes || "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast({
        title: "Validation error",
        description: "Full name is required",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const method = editingWorker ? "PATCH" : "POST";
      const body = editingWorker
        ? { id: editingWorker.id, ...formData }
        : formData;

      const res = await fetch("/api/workers", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error ||
          `Failed to ${editingWorker ? "update" : "create"} worker`
        );
      }

      toast({
        title: editingWorker ? "Worker updated" : "Worker created",
        description: `${formData.full_name} has been ${editingWorker ? "updated" : "added"
          } successfully.`,
      });

      resetForm();
      await fetchWorkers();
      onWorkersUpdated?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (workerId: string) => {
    try {
      const res = await fetch("/api/workers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: workerId }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete worker");
      }

      toast({
        title: "Worker deleted",
        description: "The worker has been removed successfully.",
      });

      await fetchWorkers();
      onWorkersUpdated?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto md:overflow-hidden flex flex-col'>
        <DialogHeader>
          <DialogTitle>Manage Workers</DialogTitle>
          <DialogDescription>
            Add, edit, or remove workers who can be assigned to line
            installations.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-6 md:grid-cols-[1fr,400px] flex-1 overflow-visible md:overflow-hidden min-h-0'>
          {/* Workers List */}
          <div className='overflow-auto border rounded-lg p-4 space-y-2'>
            <h3 className='font-semibold mb-4'>Workers List</h3>
            {loading ? (
              <div className='flex justify-center py-8'>
                <Loader2 className='h-6 w-6 animate-spin' />
              </div>
            ) : workers.length === 0 ? (
              <p className='text-sm text-muted-foreground text-center py-8'>
                No workers added yet. Add your first worker using the form.
              </p>
            ) : (
              workers.map((worker) => (
                <div
                  key={worker.id}
                  className='border rounded-lg p-3 flex items-start justify-between gap-2'
                >
                  <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                      <h4 className='font-medium'>{worker.full_name}</h4>
                      <Badge
                        variant={
                          worker.status === "active" ? "default" : "secondary"
                        }
                        className='text-xs'
                      >
                        {worker.status}
                      </Badge>
                      {worker.employee_no && (
                        <Badge variant='outline' className='text-xs font-mono uppercase'>
                          {worker.employee_no}
                        </Badge>
                      )}
                      {worker.role && (
                        <Badge variant='outline' className='text-xs'>
                          {worker.role}
                        </Badge>
                      )}
                    </div>
                    {worker.phone_number && (
                      <p className='text-sm text-muted-foreground'>
                        {worker.phone_number}
                      </p>
                    )}
                    {worker.email && (
                      <p className='text-sm text-muted-foreground'>
                        {worker.email}
                      </p>
                    )}
                    {worker.notes && (
                      <p className='text-xs text-muted-foreground mt-1'>
                        {worker.notes}
                      </p>
                    )}
                  </div>
                  <div className='flex gap-1'>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => handleEdit(worker)}
                    >
                      <Pencil className='h-4 w-4' />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant='ghost' size='icon'>
                          <Trash2 className='h-4 w-4 text-destructive' />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete worker?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {worker.full_name} from
                            the system. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(worker.id)}
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add/Edit Form */}
          <div className='border rounded-lg p-4'>
            <h3 className='font-semibold mb-4'>
              {editingWorker ? "Edit Worker" : "Add New Worker"}
            </h3>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div>
                <Label htmlFor='full_name'>
                  Full Name <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='full_name'
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder='John Doe'
                  required
                />
              </div>

              <div>
                <Label htmlFor='employee_no'>Employee No</Label>
                <Input
                  id='employee_no'
                  value={formData.employee_no}
                  onChange={(e) =>
                    setFormData({ ...formData, employee_no: e.target.value })
                  }
                  placeholder='EMP-001'
                />
              </div>

              <div>
                <Label htmlFor='phone_number'>Phone Number</Label>
                <Input
                  id='phone_number'
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                  placeholder='+94 77 123 4567'
                />
              </div>

              <div>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder='worker@example.com'
                />
              </div>

              <div>
                <Label htmlFor='role'>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger id='role'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='technician'>Technician</SelectItem>
                    <SelectItem value='installer'>Installer</SelectItem>
                    <SelectItem value='supervisor'>Supervisor</SelectItem>
                    <SelectItem value='helper'>Helper</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor='status'>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id='status'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='active'>Active</SelectItem>
                    <SelectItem value='inactive'>Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor='notes'>Notes</Label>
                <Textarea
                  id='notes'
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder='Any additional information...'
                  rows={3}
                />
              </div>

              <div className='flex gap-2'>
                <Button type='submit' disabled={submitting} className='flex-1'>
                  {submitting ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : editingWorker ? (
                    "Update Worker"
                  ) : (
                    <>
                      <Plus className='h-4 w-4 mr-2' />
                      Add Worker
                    </>
                  )}
                </Button>
                {editingWorker && (
                  <Button type='button' variant='outline' onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
