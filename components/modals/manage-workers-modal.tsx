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

  const [activeTab, setActiveTab] = useState<"list" | "form">("list");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        <div className="p-6 pb-4 border-b">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-bold">Manage Workers</DialogTitle>
                <DialogDescription className="mt-1">
                  Add, edit, or remove workers who can be assigned to line installations.
                </DialogDescription>
              </div>
              <Button
                onClick={() => {
                  resetForm();
                  setActiveTab("form");
                }}
                size="sm"
                className="md:hidden h-9 px-4 gap-2 rounded-full"
              >
                <Plus className="h-4 w-4" />
                Add New
              </Button>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6 overflow-hidden bg-muted/20">
          {/* Mobile Tab Switcher */}
          <div className="flex md:hidden bg-muted p-1 rounded-xl mb-4 border shadow-sm">
            <button
              onClick={() => setActiveTab("list")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all",
                activeTab === "list" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserCircle className="h-4 w-4" />
              Workers List
            </button>
            <button
              onClick={() => setActiveTab("form")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all",
                activeTab === "form" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {editingWorker ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingWorker ? "Edit Profile" : "Add Profile"}
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr,400px] lg:grid-cols-[1fr,420px] flex-1 overflow-hidden min-h-0">
            {/* Workers List Column */}
            <div className={cn(
              "flex-1 flex flex-col min-h-0 bg-background border rounded-2xl shadow-sm overflow-hidden",
              activeTab !== "list" && "hidden md:flex"
            )}>
              <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                <h3 className='font-bold flex items-center gap-2 text-foreground/80'>
                  <UserCircle className="h-4 w-4 text-primary" />
                  Team Directory
                  <Badge variant="secondary" className="ml-1 text-[10px] h-5 bg-background border-muted-foreground/20">{workers.length}</Badge>
                </h3>
              </div>

              <div className='flex-1 overflow-auto p-3 space-y-3 custom-scrollbar'>
                {loading ? (
                  <div className='flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground'>
                    <Loader2 className='h-8 w-8 animate-spin text-primary opacity-50' />
                    <p className="text-sm font-medium">Synchronizing team data...</p>
                  </div>
                ) : workers.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed rounded-xl bg-muted/10'>
                    <div className="bg-background p-4 rounded-full shadow-sm mb-4">
                      <UserCircle className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                    <h4 className="font-bold text-foreground">No workers assigned</h4>
                    <p className='text-sm text-muted-foreground mt-2 max-w-[240px]'>
                      Assign your first worker to start managing line installations and payroll.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-6 rounded-full px-6"
                      onClick={() => setActiveTab("form")}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Worker Now
                    </Button>
                  </div>
                ) : (
                  workers.map((worker) => (
                    <div
                      key={worker.id}
                      className={cn(
                        'group relative bg-background border rounded-xl p-4 transition-all hover:shadow-lg hover:border-primary/40 active:scale-[0.99]',
                        editingWorker?.id === worker.id && "border-primary bg-primary/5 ring-1 ring-primary/20"
                      )}
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div className='flex-1 space-y-3'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <h4 className='font-bold text-foreground text-sm uppercase tracking-tight'>{worker.full_name}</h4>
                            <div className="flex gap-1">
                              <Badge
                                variant={worker.status === "active" ? "default" : "secondary"}
                                className={cn(
                                  "text-[9px] h-4 px-1.5 uppercase font-black",
                                  worker.status === "active" ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20" : ""
                                )}
                              >
                                {worker.status}
                              </Badge>
                              {worker.employee_no && (
                                <Badge variant='outline' className='text-[9px] h-4 px-1.5 font-mono uppercase bg-muted/80 text-muted-foreground border-muted-foreground/30'>
                                  {worker.employee_no}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-4 gap-y-2">
                            {worker.role && (
                              <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                                <ShieldCheck className="h-3.5 w-3.5 text-primary/60" />
                                <span className="capitalize">{worker.role}</span>
                              </div>
                            )}
                            {worker.phone_number && (
                              <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                                <Phone className="h-3.5 w-3.5 text-primary/60" />
                                {worker.phone_number}
                              </div>
                            )}
                            {worker.email && (
                              <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground col-span-full">
                                <Mail className="h-3.5 w-3.5 text-primary/60" />
                                <span className="truncate">{worker.email}</span>
                              </div>
                            )}
                          </div>

                          {worker.notes && (
                            <div className='flex items-start gap-2 bg-muted/30 rounded-lg p-2.5 mt-2 border border-muted/50'>
                              <FileText className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                              <p className='text-[10px] text-muted-foreground leading-relaxed italic line-clamp-2'>
                                {worker.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className='flex flex-col gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all duration-200'>
                          <Button
                            variant='ghost'
                            size='icon'
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg border border-transparent hover:border-primary/20 shadow-sm transition-all"
                            onClick={() => {
                              handleEdit(worker);
                              setActiveTab("form");
                            }}
                          >
                            <Pencil className='h-4 w-4' />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant='ghost' size='icon' className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive rounded-lg border border-transparent hover:border-destructive/20 shadow-sm transition-all">
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Team Member?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove <b>{worker.full_name}</b> from the system.
                                  They will no longer be assignable to new installations.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-full">Keep Worker</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(worker.id)}
                                  className='bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full'
                                >
                                  Confirm Delete
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
            </div>

            {/* Add/Edit Form Column */}
            <div className={cn(
              "flex-1 flex flex-col min-h-0",
              activeTab !== "form" && "hidden md:flex"
            )}>
              <div className='flex-1 flex flex-col bg-background border rounded-2xl shadow-lg border-primary/10 overflow-hidden'>
                <div className="p-5 border-b bg-gradient-to-r from-primary/5 to-transparent flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className='font-black text-foreground flex items-center gap-2 tracking-tight uppercase text-xs'>
                      {editingWorker ? <Activity className="h-3.5 w-3.5 text-primary" /> : <Plus className="h-3.5 w-3.5 text-primary" />}
                      {editingWorker ? "Edit Profile" : "Create Profile"}
                    </h3>
                  </div>
                  {editingWorker && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetForm}
                      className="h-7 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary"
                    >
                      Clear / New
                    </Button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className='flex-1 flex flex-col min-h-0'>
                  <div className="flex-1 overflow-auto p-5 space-y-8 custom-scrollbar">
                    {/* Basic Info Group */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/60 flex items-center gap-2">
                        <User className="h-3 w-3" />
                        Identity
                      </h4>

                      <div className="grid gap-5">
                        <div className="space-y-2">
                          <Label htmlFor='full_name' className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Legal Full Name <span className='text-destructive'>*</span>
                          </Label>
                          <Input
                            id='full_name'
                            value={formData.full_name}
                            onChange={(e) =>
                              setFormData({ ...formData, full_name: e.target.value })
                            }
                            placeholder='e.g. Johnathan Smith'
                            className="h-11 border-muted-foreground/20 focus-visible:ring-primary focus-visible:border-primary/50 bg-muted/5 rounded-xl transition-all"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor='employee_no' className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">ID Number</Label>
                            <Input
                              id='employee_no'
                              value={formData.employee_no}
                              onChange={(e) =>
                                setFormData({ ...formData, employee_no: e.target.value })
                              }
                              placeholder='EMP-123'
                              className="h-11 font-mono text-xs border-muted-foreground/20 bg-muted/5 rounded-xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor='status' className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Availability</Label>
                            <Select
                              value={formData.status}
                              onValueChange={(value) =>
                                setFormData({ ...formData, status: value })
                              }
                            >
                              <SelectTrigger id='status' className="h-11 border-muted-foreground/20 bg-muted/5 rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value='active'>Active</SelectItem>
                                <SelectItem value='inactive'>Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info Group */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/60 flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        Communication
                      </h4>

                      <div className="grid gap-5">
                        <div className="space-y-2">
                          <Label htmlFor='phone_number' className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Primary Contact</Label>
                          <Input
                            id='phone_number'
                            value={formData.phone_number}
                            onChange={(e) =>
                              setFormData({ ...formData, phone_number: e.target.value })
                            }
                            placeholder='+94 XX XXX XXXX'
                            className="h-11 border-muted-foreground/20 bg-muted/5 rounded-xl"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor='email' className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email Correspondence</Label>
                          <Input
                            id='email'
                            type='email'
                            value={formData.email}
                            onChange={(e) =>
                              setFormData({ ...formData, email: e.target.value })
                            }
                            placeholder='worker@organisation.com'
                            className="h-11 border-muted-foreground/20 bg-muted/5 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Role & Notes Group */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/60 flex items-center gap-2">
                        <Activity className="h-3 w-3" />
                        Assignment & Notes
                      </h4>

                      <div className="grid gap-5">
                        <div className="space-y-2">
                          <Label htmlFor='role' className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Expertise Domain</Label>
                          <Select
                            value={formData.role}
                            onValueChange={(value) =>
                              setFormData({ ...formData, role: value })
                            }
                          >
                            <SelectTrigger id='role' className="h-11 border-muted-foreground/20 bg-muted/5 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value='technician'>Technician</SelectItem>
                              <SelectItem value='installer'>Installer</SelectItem>
                              <SelectItem value='supervisor'>Supervisor</SelectItem>
                              <SelectItem value='helper'>Helper</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor='notes' className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Office Reference</Label>
                          <Textarea
                            id='notes'
                            value={formData.notes}
                            onChange={(e) =>
                              setFormData({ ...formData, notes: e.target.value })
                            }
                            placeholder='Internal only notes...'
                            className="resize-none border-muted-foreground/20 focus-visible:ring-primary focus-visible:border-primary/50 bg-muted/5 min-h-[100px] rounded-xl transition-all"
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className='p-5 border-t bg-muted/10 backdrop-blur-sm sticky bottom-0 flex gap-3'>
                    <Button
                      type='submit'
                      disabled={submitting}
                      className='flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-[0.97]'
                    >
                      {submitting ? (
                        <Loader2 className='h-5 w-5 animate-spin' />
                      ) : editingWorker ? (
                        "Save Changes"
                      ) : (
                        <>
                          <Plus className='h-5 w-5 mr-3' />
                          Add to Team
                        </>
                      )}
                    </Button>
                    {editingWorker && (
                      <Button
                        type='button'
                        variant='outline'
                        className="h-12 w-12 rounded-xl border-muted-foreground/30 hover:bg-muted p-0"
                        onClick={resetForm}
                        title="Cancel editing"
                      >
                        <Trash2 className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
