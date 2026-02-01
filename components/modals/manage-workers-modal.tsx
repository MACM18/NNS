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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Pencil, Trash2, User, Phone, Mail, FileText, Activity, ShieldCheck, UserCircle } from "lucide-react";
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

        <Tabs defaultValue="list" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-4 md:hidden">
            <TabsTrigger value="list">Workers List</TabsTrigger>
            <TabsTrigger value="form">{editingWorker ? "Edit Worker" : "Add New"}</TabsTrigger>
          </TabsList>

          <div className="grid gap-6 md:grid-cols-[1fr,380px] flex-1 overflow-hidden min-h-0">
            {/* Workers List */}
            <TabsContent value="list" className="flex-1 mt-0 flex flex-col min-h-0 data-[state=inactive]:hidden md:data-[state=inactive]:flex">
              <div className='flex-1 overflow-auto border rounded-xl p-4 bg-muted/30 space-y-3'>
                <div className="flex items-center justify-between mb-4">
                  <h3 className='font-semibold flex items-center gap-2'>
                    <UserCircle className="h-4 w-4 text-primary" />
                    Team Members
                  </h3>
                  <Badge variant="secondary" className="font-mono">{workers.length}</Badge>
                </div>

                {loading ? (
                  <div className='flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground'>
                    <Loader2 className='h-8 w-8 animate-spin text-primary' />
                    <p className="text-sm">Loading team...</p>
                  </div>
                ) : workers.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-xl bg-background/50'>
                    <UserCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <h4 className="font-medium text-foreground">No workers found</h4>
                    <p className='text-sm text-muted-foreground mt-1 max-w-[200px]'>
                      Start by adding your first team member using the form.
                    </p>
                  </div>
                ) : (
                  workers.map((worker) => (
                    <div
                      key={worker.id}
                      className='group relative bg-background border rounded-xl p-4 transition-all hover:shadow-md hover:border-primary/30'
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div className='flex-1 space-y-2'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <h4 className='font-bold text-foreground leading-none'>{worker.full_name}</h4>
                            <Badge
                              variant={worker.status === "active" ? "default" : "secondary"}
                              className={cn(
                                "text-[10px] h-5 px-1.5 uppercase font-bold",
                                worker.status === "active" ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20" : ""
                              )}
                            >
                              {worker.status}
                            </Badge>
                            {worker.employee_no && (
                              <Badge variant='outline' className='text-[10px] h-5 px-1.5 font-mono uppercase bg-muted/50'>
                                {worker.employee_no}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
                            {worker.role && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <ShieldCheck className="h-3.5 w-3.5 text-primary/70" />
                                <span className="capitalize">{worker.role}</span>
                              </div>
                            )}
                            {worker.phone_number && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="h-3.5 w-3.5 text-primary/70" />
                                {worker.phone_number}
                              </div>
                            )}
                            {worker.email && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground col-span-full">
                                <Mail className="h-3.5 w-3.5 text-primary/70" />
                                <span className="truncate">{worker.email}</span>
                              </div>
                            )}
                          </div>

                          {worker.notes && (
                            <div className='flex items-start gap-2 bg-muted/50 rounded-lg p-2 mt-2'>
                              <FileText className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                              <p className='text-[11px] text-muted-foreground line-clamp-2 italic'>
                                {worker.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className='flex flex-col gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity'>
                          <Button
                            variant='ghost'
                            size='icon'
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                            onClick={() => {
                              handleEdit(worker);
                              // On mobile, switch to form tab automatically
                              if (window.innerWidth < 768) {
                                const tabTrigger = document.querySelector('[value="form"]') as HTMLElement;
                                tabTrigger?.click();
                              }
                            }}
                          >
                            <Pencil className='h-4 w-4' />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant='ghost' size='icon' className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                                <Trash2 className='h-4 w-4' />
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
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Add/Edit Form */}
            <TabsContent value="form" className="flex-1 mt-0 flex flex-col min-h-0 data-[state=inactive]:hidden md:data-[state=inactive]:flex">
              <div className='border rounded-xl p-5 bg-background shadow-sm space-y-6 overflow-auto'>
                <div className="space-y-1">
                  <h3 className='font-bold text-lg'>
                    {editingWorker ? "Edit Team Member" : "New Team Member"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {editingWorker ? "Update worker profile and roles." : "Fill in the details to add a new worker."}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className='space-y-6'>
                  {/* Basic Info Group */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-primary flex items-center gap-2">
                      <User className="h-3 w-3" />
                      Basic Information
                    </h4>

                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor='full_name' className="text-xs font-semibold">
                          Full Name <span className='text-destructive'>*</span>
                        </Label>
                        <Input
                          id='full_name'
                          value={formData.full_name}
                          onChange={(e) =>
                            setFormData({ ...formData, full_name: e.target.value })
                          }
                          placeholder='John Doe'
                          className="h-10 border-muted-foreground/20 focus-visible:ring-primary"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor='employee_no' className="text-xs font-semibold">Employee No</Label>
                          <Input
                            id='employee_no'
                            value={formData.employee_no}
                            onChange={(e) =>
                              setFormData({ ...formData, employee_no: e.target.value })
                            }
                            placeholder='EMP-001'
                            className="h-10 font-mono text-sm border-muted-foreground/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor='status' className="text-xs font-semibold">Status</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value) =>
                              setFormData({ ...formData, status: value })
                            }
                          >
                            <SelectTrigger id='status' className="h-10 border-muted-foreground/20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='active'>Active</SelectItem>
                              <SelectItem value='inactive'>Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info Group */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-primary flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      Contact Details
                    </h4>

                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor='phone_number' className="text-xs font-semibold">Phone Number</Label>
                        <Input
                          id='phone_number'
                          value={formData.phone_number}
                          onChange={(e) =>
                            setFormData({ ...formData, phone_number: e.target.value })
                          }
                          placeholder='+94 77 123 4567'
                          className="h-10 border-muted-foreground/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor='email' className="text-xs font-semibold">Email Address</Label>
                        <Input
                          id='email'
                          type='email'
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          placeholder='worker@example.com'
                          className="h-10 border-muted-foreground/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Role & Notes Group */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-primary flex items-center gap-2">
                      <Activity className="h-3 w-3" />
                      Role & Preferences
                    </h4>

                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor='role' className="text-xs font-semibold">Specialization / Role</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value) =>
                            setFormData({ ...formData, role: value })
                          }
                        >
                          <SelectTrigger id='role' className="h-10 border-muted-foreground/20">
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

                      <div className="space-y-2">
                        <Label htmlFor='notes' className="text-xs font-semibold">Administrative Notes</Label>
                        <Textarea
                          id='notes'
                          value={formData.notes}
                          onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                          }
                          placeholder='Any additional information for the office...'
                          className="resize-none border-muted-foreground/20 focus-visible:ring-primary min-h-[80px]"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  <div className='flex gap-3 pt-4 sticky bottom-0 bg-background'>
                    <Button
                      type='submit'
                      disabled={submitting}
                      className='flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-all active:scale-[0.98]'
                    >
                      {submitting ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : editingWorker ? (
                        "Update Profile"
                      ) : (
                        <>
                          <Plus className='h-4 w-4 mr-2' />
                          Add to Team
                        </>
                      )}
                    </Button>
                    {editingWorker && (
                      <Button
                        type='button'
                        variant='outline'
                        className="h-11 rounded-lg border-muted-foreground/20"
                        onClick={() => {
                          resetForm();
                          // Optional: switch back to list
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
