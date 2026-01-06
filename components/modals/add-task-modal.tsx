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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useNotification } from "@/contexts/notification-context";
import { useAuth } from "@/contexts/auth-context";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlertTriangle, Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { cn } from "@/lib/utils";
import type { TaskRecord } from "@/types/tasks";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (task: TaskRecord) => void;
}
interface DPSuggestion {
  dp: string;
  count: number;
}

const connectionServices = [
  { id: "internet", label: "Internet" },
  { id: "voice", label: "Voice" },
  { id: "peo_tv", label: "Peo TV" },
];

export function AddTaskModal({
  open,
  onOpenChange,
  onSuccess,
}: AddTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [dpSuggestions, setDpSuggestions] = useState<DPSuggestion[]>([]);
  const [dpOpen, setDpOpen] = useState(false);

  const [dpValidationError, setDpValidationError] = useState("");

  const [formData, setFormData] = useState({
    task_date: new Date().toISOString().split("T")[0],
    telephone_no: "",
    dp: "",
    contact_no: "",
    customer_name: "",
    address: "",
    connection_type_new: "New",
    connection_services: [] as string[],
    notes: "",
  });

  const { addNotification } = useNotification();
  const { user } = useAuth();

  const handleInputChange = (field: string, value: string | string[]) => {
    if (field === "dp" && typeof value === "string") {
      validateDP(value);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleServiceChange = (serviceId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      connection_services: checked
        ? [...prev.connection_services, serviceId]
        : prev.connection_services.filter((s) => s !== serviceId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.connection_services.length === 0) {
        addNotification({
          title: "Validation Error",
          message: "Please select at least one connection service",
          type: "error",
          category: "system",
        });
        setLoading(false);
        return;
      }
      if (!validateDP(formData.dp)) {
        setLoading(false);
        return;
      }

      // Check DP uniqueness
      const isUnique = await checkDPUniqueness(formData.dp);
      if (!isUnique) {
        setLoading(false);
        return;
      }
      const insertData = {
        task_date: formData.task_date,
        telephone_no: formData.telephone_no,
        dp: formData.dp,
        contact_no: formData.contact_no || null,
        customer_name: formData.customer_name,
        address: formData.address,
        connection_type_new: formData.connection_type_new,
        connection_services: formData.connection_services,
        status: "pending",
        created_by: user?.id,
        notes: formData.notes || null,
      };

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(insertData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create task");
      }

      const { data: insertedTask } = await response.json();

      if (!insertedTask) {
        throw new Error("Task created but no data returned.");
      }

      addNotification({
        title: "Success",
        message: "Task added successfully",
        type: "success",
        category: "system",
      });

      const normalizedTask: TaskRecord = {
        id: insertedTask.id as string,
        task_date: insertedTask.task_date as string,
        telephone_no: insertedTask.telephone_no as string,
        dp: insertedTask.dp as string,
        contact_no: (insertedTask.contact_no as string | null) ?? null,
        customer_name: insertedTask.customer_name as string,
        address: insertedTask.address as string,
        status: insertedTask.status as string,
        connection_type_new: insertedTask.connection_type_new as string,
        connection_services:
          (insertedTask.connection_services as string[] | null) ?? [],
        notes: (insertedTask.notes as string | null) ?? null,
        created_at: insertedTask.created_at as string,
        created_by: (insertedTask.created_by as string | null) ?? null,
        rejection_reason:
          (insertedTask.rejection_reason as string | null) ?? null,
        rejected_by: (insertedTask.rejected_by as string | null) ?? null,
        rejected_at: (insertedTask.rejected_at as string | null) ?? null,
        completed_at: (insertedTask.completed_at as string | null) ?? null,
        completed_by: (insertedTask.completed_by as string | null) ?? null,
        line_details_id:
          (insertedTask.line_details_id as string | null) ?? null,
      };

      onSuccess(normalizedTask);
      onOpenChange(false);

      // Reset form
      setFormData({
        task_date: new Date().toISOString().split("T")[0],
        telephone_no: "",
        dp: "",
        contact_no: "",
        customer_name: "",
        address: "",
        connection_type_new: "New",
        connection_services: [],
        notes: "",
      });
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message,
        type: "error",
        category: "system",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (formData.dp.length >= 3) {
      fetchDPSuggestions();
    }
  }, [formData.dp]);
  const fetchDPSuggestions = async () => {
    try {
      const response = await fetch(
        `/api/lines/dp-suggestions?q=${encodeURIComponent(formData.dp)}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch DP suggestions");
      }

      const { data } = await response.json();
      setDpSuggestions(data || []);
    } catch (error) {
      console.error("Error fetching DP suggestions:", error);
    }
  };

  const validateDP = (dp: string): boolean => {
    const dpPattern = /^[A-Z]{1,4}-[A-Z]{1,4}-\d{4}-\d{3}-0[1-8]$/;

    if (!dpPattern.test(dp)) {
      setDpValidationError(
        "DP format should be: XX-XXXX-XXXX-XXX-0X (e.g., HR-PKJ-0536-021-05)"
      );
      return false;
    }

    setDpValidationError("");
    return true;
  };
  const checkDPUniqueness = async (dp: string): Promise<boolean> => {
    const parts = dp.split("-");
    if (parts.length !== 5) return false;

    try {
      const response = await fetch(
        `/api/lines/validate-dp?dp=${encodeURIComponent(dp)}`
      );

      if (!response.ok) {
        throw new Error("Failed to validate DP");
      }

      const { exists } = await response.json();

      if (exists) {
        setDpValidationError(
          `DP ${dp} already exists. Please use a different last value (01-08).`
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking DP uniqueness:", error);
      return false;
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6'>
        <DialogHeader>
          <DialogTitle className='text-lg sm:text-xl'>Add New Task</DialogTitle>
          <DialogDescription className='text-sm'>
            Enter the details for a new telecom installation task.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 sm:space-y-6'>
          {/* Basic Information */}
          <div className='space-y-3 sm:space-y-4'>
            <h3 className='text-base sm:text-lg font-medium'>
              Task Information
            </h3>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
              <div>
                <Label htmlFor='task_date'>Date</Label>
                <Input
                  id='task_date'
                  type='date'
                  value={formData.task_date}
                  onChange={(e) =>
                    handleInputChange("task_date", e.target.value)
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor='telephone_no'>Telephone No</Label>
                <Input
                  id='telephone_no'
                  value={formData.telephone_no}
                  onChange={(e) =>
                    handleInputChange("telephone_no", e.target.value)
                  }
                  placeholder='e.g., 0342217442'
                  required
                />
              </div>
              <div>
                <Label htmlFor='dp'>DP</Label>
                <Popover open={dpOpen} onOpenChange={setDpOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      role='combobox'
                      aria-expanded={dpOpen}
                      className='w-full justify-between'
                    >
                      {formData.dp || "Enter DP (e.g., HR-PKJ-0536-021-05)"}
                      <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-full p-0'>
                    <Command>
                      <CommandInput
                        placeholder='Type DP...'
                        value={formData.dp}
                        onValueChange={(value) =>
                          handleInputChange("dp", value)
                        }
                      />
                      <CommandList>
                        <CommandEmpty>No DP suggestions found.</CommandEmpty>
                        <CommandGroup>
                          {dpSuggestions.map((suggestion) => (
                            <CommandItem
                              key={suggestion.dp}
                              value={suggestion.dp}
                              onSelect={(currentValue) => {
                                handleInputChange("dp", currentValue);
                                setDpOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.dp === suggestion.dp
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {suggestion.dp}
                              <Badge variant='secondary' className='ml-auto'>
                                {suggestion.count}
                              </Badge>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {dpValidationError && (
                  <div className='flex items-center gap-2 mt-2 text-red-600 text-sm'>
                    <AlertTriangle className='h-4 w-4' />
                    {dpValidationError}
                  </div>
                )}
                <p className='text-xs text-muted-foreground mt-1'>
                  Format: XX-XXXX-XXXX-XXX-0X (2 uppercase strings, 2 numbers,
                  last value 01-08)
                </p>
              </div>
              <div>
                <Label htmlFor='contact_no'>Contact No</Label>
                <Input
                  id='contact_no'
                  value={formData.contact_no}
                  onChange={(e) =>
                    handleInputChange("contact_no", e.target.value)
                  }
                  placeholder='Customer contact number'
                />
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className='space-y-3 sm:space-y-4'>
            <h3 className='text-base sm:text-lg font-medium'>
              Customer Information
            </h3>
            <div className='grid grid-cols-1 gap-3 sm:gap-4'>
              <div>
                <Label htmlFor='customer_name'>Customer Name</Label>
                <Input
                  id='customer_name'
                  value={formData.customer_name}
                  onChange={(e) =>
                    handleInputChange("customer_name", e.target.value)
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor='address'>Address</Label>
                <Textarea
                  id='address'
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Service Configuration */}
          <div className='space-y-3 sm:space-y-4'>
            <h3 className='text-base sm:text-lg font-medium'>
              Service Configuration
            </h3>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
              <div>
                <Label htmlFor='connection_type_new'>Type</Label>
                <Select
                  value={formData.connection_type_new}
                  onValueChange={(value) =>
                    handleInputChange("connection_type_new", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select connection type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='New'>New</SelectItem>
                    <SelectItem value='Upgrade'>Upgrade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className='text-sm sm:text-base'>
                Connection Services
              </Label>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-2'>
                {connectionServices.map((service) => (
                  <div key={service.id} className='flex items-center space-x-2'>
                    <Checkbox
                      id={service.id}
                      checked={formData.connection_services.includes(
                        service.id
                      )}
                      onCheckedChange={(checked) =>
                        handleServiceChange(service.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={service.id} className='text-sm font-normal'>
                      {service.label}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.connection_services.length > 0 && (
                <div className='flex gap-2 mt-2'>
                  {formData.connection_services.map((service) => (
                    <Badge key={service} variant='secondary'>
                      {connectionServices.find((s) => s.id === service)?.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor='notes'>Notes (Optional)</Label>
            <Textarea
              id='notes'
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder='Additional notes or requirements...'
            />
          </div>

          <DialogFooter className='flex-col sm:flex-row gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              className='w-full sm:w-auto'
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={loading}
              className='w-full sm:w-auto'
            >
              {loading ? "Adding..." : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
