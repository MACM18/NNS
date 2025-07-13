"use client";

import type React from "react";

import { useState, useEffect } from "react";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Check,
  ChevronsUpDown,
  Calculator,
  Package,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useNotification } from "@/contexts/notification-context";
import { cn } from "@/lib/utils";

interface AddTelephoneLineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface DPSuggestion {
  dp: string;
  count: number;
}

interface DrumOption {
  id: string;
  drum_number: string;
  current_quantity: number;
  item_name: string;
}

export function AddTelephoneLineModal({
  open,
  onOpenChange,
  onSuccess,
}: AddTelephoneLineModalProps) {
  const [loading, setLoading] = useState(false);
  const [dpSuggestions, setDpSuggestions] = useState<DPSuggestion[]>([]);
  const [drumOptions, setDrumOptions] = useState<DrumOption[]>([]);
  const [dpOpen, setDpOpen] = useState(false);
  const [drumOpen, setDrumOpen] = useState(false);
  const [dpValidationError, setDpValidationError] = useState("");
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);
  const [taskOpen, setTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [formData, setFormData] = useState({
    // Basic Information
    date: new Date().toISOString().split("T")[0],
    phone_number: "",
    dp: "",
    power_dp: "",
    power_inbox: "",
    name: "",
    address: "",

    // Cable Measurements
    cable_start: "",
    cable_middle: "",
    cable_end: "",
    wastage_input: "",
    f1: "",
    g1: "",
    total_cable: "",

    // Drum Selection
    selected_drum_id: "",
    drum_number: "",

    // Inventory Fields (default values, but editable)
    retainers: "0",
    l_hook: "0",
    nut_bolt: "0",
    top_bolt: "0",
    c_hook: "1",
    fiber_rosette: "1",
    internal_wire: "",
    s_rosette: "0",
    fac: "2",
    casing: "",
    c_tie: "0",
    c_clip: "0",
    conduit: "",
    tag_tie: "1",
    ont_serial: "",
    voice_test_no: "",
    stb_serial: "",
    flexible: "2",
    rj45: "0",
    cat5: "",
    pole_67: "0",
    pole: "0",
    concrete_nail: "0",
    roll_plug: "0",
    screw_nail: "0",
    u_clip: "0",
    socket: "0",
    bend: "0",
    rj11: "0",
    rj12: "0",
  });

  const supabase = getSupabaseClient();
  const { addNotification } = useNotification();

  // Auto-calculate F1, G1, and Total when cable values change
  useEffect(() => {
    const start = Number.parseFloat(formData.cable_start) || 0;
    const middle = Number.parseFloat(formData.cable_middle) || 0;
    const end = Number.parseFloat(formData.cable_end) || 0;
    const f1 = Math.abs(start - middle);
    const g1 = Math.abs(middle - end);
    const total_cable = f1 + g1;

    setFormData((prev) => ({
      ...prev,
      f1: f1.toFixed(2),
      g1: g1.toFixed(2),
      total_cable: total_cable.toFixed(2),
    }));
  }, [formData.cable_start, formData.cable_middle, formData.cable_end]);

  // Auto-calculate Nut & Bolt (½ of L-Hook)
  useEffect(() => {
    const lHook = Number(formData.l_hook) || 0;
    const nutBolt = Math.ceil(lHook / 2);
    setFormData((prev) => ({
      ...prev,
      nut_bolt: String(nutBolt),
    }));
  }, [formData.l_hook]);

  // Auto-sync Screw Nail with Roll Plug
  useEffect(() => {
    const rollPlug = Number(formData.roll_plug) || 0;
    setFormData((prev) => ({
      ...prev,
      screw_nail: String(rollPlug),
    }));
  }, [formData.roll_plug]);

  // Fetch available drums when modal opens
  useEffect(() => {
    if (open) {
      fetchDrumOptions();
      fetchAvailableTasks();
    }
  }, [open]);

  // Fetch DP suggestions when DP input changes
  useEffect(() => {
    if (formData.dp.length >= 3) {
      fetchDPSuggestions();
    }
  }, [formData.dp]);

  const fetchDrumOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("drum_tracking")
        .select(
          `
          id,
          drum_number,
          current_quantity,
          inventory_items(name)
        `
        )
        .eq("status", "active")
        .gt("current_quantity", 0)
        .order("drum_number");

      if (error) throw error;

      const drums = data.map((drum: any) => ({
        id: drum.id,
        drum_number: drum.drum_number,
        current_quantity: drum.current_quantity,
        item_name: drum.inventory_items?.name || "Unknown",
      }));

      setDrumOptions(drums);
    } catch (error) {
      console.error("Error fetching drum options:", error);
    }
  };

  const fetchDPSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from("line_details")
        .select("dp")
        .ilike("dp", `${formData.dp}%`)
        .limit(10);

      if (error) throw error;

      // Fix DP suggestions accumulator type
      const suggestions = (data as { dp: string }[]).reduce(
        (acc: Record<string, number>, item) => {
          if (item.dp) {
            acc[item.dp] = (acc[item.dp] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>
      );

      setDpSuggestions(
        Object.entries(suggestions).map(([dp, count]) => ({ dp, count }))
      );
    } catch (error) {
      console.error("Error fetching DP suggestions:", error);
    }
  };

  const fetchAvailableTasks = async () => {
    try {
      // 1. Get all assigned task_ids
      const { data: assigned, error: assignedError } = await supabase
        .from("line_details")
        .select("task_id")
        .not("task_id", "is", null);

      const assignedTaskIds = assigned?.map((row) => row.task_id) ?? [];

      // 2. Get all accepted tasks not in assignedTaskIds
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "accepted")
        .not(
          "id",
          "in",
          `(${assignedTaskIds.map((id) => `"${id}"`).join(",")})`
        );
      // const { data: lineDetails, error } = await supabase
      //   .from("line_details")
      //   .select("task_id")
      //   .not("task_id", "is", null);
      // const taskIds =
      //   lineDetails?.map((ld) => ld.task_id).filter(Boolean) ?? [];

      // const { data: tasks, error: tasksError } = await supabase
      //   .from("tasks")
      //   .select("*")
      //   .in("id", taskIds)
      //   .order("created_at", { ascending: false });

      if (assignedError) throw assignedError;
      setAvailableTasks(tasks || []);
    } catch (error) {
      console.error("Error fetching available tasks:", error);
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

    const baseDP = parts.slice(0, 4).join("-");
    const lastValue = parts[4];

    try {
      const { data, error } = await supabase
        .from("line_details")
        .select("dp")
        .ilike("dp", `${baseDP}-${lastValue}`);

      if (error) throw error;

      if (data && data.length > 0) {
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

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "dp" && typeof value === "string") {
      validateDP(value);
    }

    // Auto-fill drum number when drum is selected
    if (field === "selected_drum_id" && value) {
      const selectedDrum = drumOptions.find((drum) => drum.id === value);
      if (selectedDrum) {
        setFormData((prev) => ({
          ...prev,
          drum_number: selectedDrum.drum_number,
        }));
      }
    }
  };

  const handleTaskSelection = (task: any) => {
    setSelectedTask(task);
    setFormData((prev) => ({
      ...prev,
      phone_number: task.telephone_no || "",
      dp: task.dp || "",
      name: task.customer_name || "",
      address: task.address || "",
    }));
    setTaskOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!selectedTask) {
      addNotification({
        title: "Validation Error",
        message: "Please select a task before submitting",
        type: "error",
        category: "system",
      });
      setLoading(false);
      return;
    }

    try {
      // Validate DP format
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

      // Validate power values
      const powerDP = Number.parseFloat(formData.power_dp);
      const powerInbox = Number.parseFloat(formData.power_inbox);

      if (powerDP >= 25 || powerInbox >= 25) {
        addNotification({
          title: "Validation Error",
          message: "Power values must be less than 25",
          type: "error",
          category: "system",
        });
        setLoading(false);
        return;
      }

      // Check if selected drum has enough cable
      if (formData.selected_drum_id && formData.total_cable > 0) {
        const selectedDrum = drumOptions.find(
          (drum) => drum.id === formData.selected_drum_id
        );
        if (
          selectedDrum &&
          formData.total_cable > selectedDrum.current_quantity
        ) {
          addNotification({
            title: "Insufficient Cable",
            message: `Selected drum only has ${selectedDrum.current_quantity}m available, but ${formData.total_cable}m is required`,
            type: "error",
            category: "system",
          });
          setLoading(false);
          return;
        }
      }

      // Prepare data for insertion
      const insertData = {
        task_id: selectedTask?.id || null,
        // Basic Information
        date: formData.date,
        telephone_no: formData.phone_number,
        dp: formData.dp,
        power_dp: Number.parseFloat(formData.power_dp),
        power_inbox: Number.parseFloat(formData.power_inbox),
        name: formData.name,
        address: formData.address,
        // Cable Measurements
        cable_start: Number.parseFloat(formData.cable_start),
        cable_middle: Number.parseFloat(formData.cable_middle),
        cable_end: Number.parseFloat(formData.cable_end),
        wastage_input: Number.parseFloat(formData.wastage_input) || 0,
        drum_number: formData.drum_number,

        // Inventory Fields
        retainers: Number(formData.retainers) || 0,
        l_hook: Number(formData.l_hook) || 0,
        nut_bolt: Number(formData.nut_bolt) || 0,
        top_bolt: Number(formData.top_bolt) || 0,
        c_hook: Number(formData.c_hook) || 1,
        fiber_rosette: Number(formData.fiber_rosette) || 1,
        internal_wire: Number(formData.internal_wire) || 0,
        s_rosette: Number(formData.s_rosette) || 0,
        fac: Number(formData.fac) || 2,
        casing: Number(formData.casing) || 0,
        c_tie: Number(formData.c_tie) || 0,
        c_clip: Number(formData.c_clip) || 0,
        conduit: Number(formData.conduit) || 0,
        tag_tie: Number(formData.tag_tie) || 1,
        ont_serial: formData.ont_serial || null,
        voice_test_no: formData.voice_test_no || null,
        stb_serial: formData.stb_serial || null,
        flexible: Number(formData.flexible) || 2,
        rj45: Number(formData.rj45) || 0,
        cat5: Number(formData.cat5) || 0,
        pole_67: Number(formData.pole_67) || 0,
        pole: Number(formData.pole) || 0,
        concrete_nail: Number(formData.concrete_nail) || 0,
        roll_plug: Number(formData.roll_plug) || 0,
        screw_nail: Number(formData.screw_nail) || 0,
        u_clip: Number(formData.u_clip) || 0,
        socket: Number(formData.socket) || 0,
        bend: Number(formData.bend) || 0,
        rj11: Number(formData.rj11) || 0,
        rj12: Number(formData.rj12) || 0,
      };

      const { data: lineDetails, error } = await supabase
        .from("line_details")
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Record drum usage if drum was selected and cable was used
      if (formData.selected_drum_id && Number(formData.total_cable) > 0) {
        // Record drum usage
        await supabase.from("drum_usage").insert([
          {
            drum_id: formData.selected_drum_id,
            line_details_id: lineDetails.id,
            quantity_used: Number(formData.total_cable),
            usage_date: formData.date,
          },
        ]);

        // Update drum current quantity
        const selectedDrum = drumOptions.find(
          (drum) => drum.id === formData.selected_drum_id
        );
        if (selectedDrum) {
          const newQuantity =
            selectedDrum.current_quantity - Number(formData.total_cable);
          await supabase
            .from("drum_tracking")
            .update({
              current_quantity: newQuantity,
              status: newQuantity <= 0 ? "empty" : "active",
              updated_at: new Date().toISOString(),
            })
            .eq("id", formData.selected_drum_id);
        }
        // Update inventory_items current_stock for Drop wire cable
        const { data: dropWireItem } = await supabase
          .from("inventory_items")
          .select("id,current_stock")
          .eq("name", "Drop Wire Cable")
          .single();
        if (dropWireItem) {
          const newStock =
            dropWireItem.current_stock - Number(formData.total_cable);
          await supabase
            .from("inventory_items")
            .update({
              current_stock: newStock,
              updated_at: new Date().toISOString(),
            })
            .eq("id", dropWireItem.id);
        }
      }

      addNotification({
        title: "Success",
        message: "Telephone line details added successfully with drum tracking",
        type: "success",
        category: "system",
      });

      onSuccess();
      onOpenChange(false);

      // Reset form to defaults
      setFormData({
        date: new Date().toISOString().split("T")[0],
        phone_number: "",
        dp: "",
        power_dp: "",
        power_inbox: "",
        name: "",
        address: "",
        cable_start: "",
        cable_middle: "",
        cable_end: "",
        wastage_input: "",
        f1: "",
        g1: "",
        total_cable: "",
        selected_drum_id: "",
        drum_number: "",
        retainers: "0",
        l_hook: "0",
        nut_bolt: "0",
        top_bolt: "0",
        c_hook: "1",
        fiber_rosette: "1",
        internal_wire: "",
        s_rosette: "0",
        fac: "2",
        casing: "",
        c_tie: "0",
        c_clip: "0",
        conduit: "",
        tag_tie: "1",
        ont_serial: "",
        voice_test_no: "",
        stb_serial: "",
        flexible: "2",
        rj45: "0",
        cat5: "",
        pole_67: "0",
        pole: "0",
        concrete_nail: "0",
        roll_plug: "0",
        screw_nail: "0",
        u_clip: "0",
        socket: "0",
        bend: "0",
        rj11: "0",
        rj12: "0",
      });
      setDpValidationError("");
      setSelectedTask(null);
      setAvailableTasks([]);
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

  const isPowerInvalid = (value: string) => {
    const num = Number.parseFloat(value);
    return !isNaN(num) && num >= 25;
  };

  const taskLabel = (task: any) =>
    task?.title ??
    task?.name ??
    `Task ${task.id?.toString().slice(0, 8) ?? ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-6xl max-h-[95vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Add Telephone Line Details</DialogTitle>
          <DialogDescription>
            Enter the complete details for a new telephone line installation
            including inventory usage and drum tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Task Selection */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium'>Task Selection</h3>
            <div>
              <Label htmlFor='task_selection'>Select Task</Label>
              <Popover open={taskOpen} onOpenChange={setTaskOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    role='combobox'
                    aria-expanded={taskOpen}
                    className='w-full justify-between'
                  >
                    {selectedTask
                      ? selectedTask.title
                      : "Select an available task"}
                    <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-full p-0'>
                  <Command>
                    <CommandInput placeholder='Search tasks...' />
                    <CommandList>
                      <CommandEmpty>No available tasks found.</CommandEmpty>
                      <CommandGroup>
                        {availableTasks.map((task) => (
                          <CommandItem
                            key={task.id}
                            value={task.id}
                            onSelect={() => handleTaskSelection(task)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedTask?.id === task.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className='flex flex-col'>
                              <span className='font-medium'>
                                {task.telephone_no}
                              </span>
                              <span className='text-xs text-muted-foreground'>
                                {task.customer_name} - {task.dp}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className='text-xs text-muted-foreground mt-1'>
                Select an accepted task to convert to a telephone line
                installation.
              </p>
            </div>
          </div>

          {/* Basic Information - Auto-populated from Task */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium'>
              Basic Information (From Task)
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='date'>Date</Label>
                <Input
                  id='date'
                  type='date'
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor='phone_number'>Phone Number</Label>
                <Input
                  id='phone_number'
                  value={formData.phone_number}
                  onChange={(e) =>
                    handleInputChange("phone_number", e.target.value)
                  }
                  placeholder='e.g., 0342217442'
                  className='bg-blue-50 dark:bg-blue-950'
                  readOnly={!!selectedTask}
                  required
                />
                {selectedTask && (
                  <p className='text-xs text-blue-600 mt-1'>
                    Auto-filled from selected task
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* DP Configuration - Auto-populated from Task */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium'>
              DP Configuration (From Task)
            </h3>
            <div>
              <Label htmlFor='dp'>DP</Label>
              <Input
                id='dp'
                value={formData.dp}
                onChange={(e) => handleInputChange("dp", e.target.value)}
                placeholder='e.g., HR-PKJ-0536-021-05'
                className='bg-blue-50 dark:bg-blue-950'
                readOnly={!!selectedTask}
                required
              />
              {selectedTask && (
                <p className='text-xs text-blue-600 mt-1'>
                  Auto-filled from selected task
                </p>
              )}
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
          </div>

          {/* Power Values */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium'>Power Measurements</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='power_dp'>Power (DP)</Label>
                <Input
                  id='power_dp'
                  type='number'
                  step='0.01'
                  value={formData.power_dp}
                  onChange={(e) =>
                    handleInputChange("power_dp", e.target.value)
                  }
                  className={
                    isPowerInvalid(formData.power_dp)
                      ? "border-red-500 text-red-600"
                      : ""
                  }
                  required
                />
                {isPowerInvalid(formData.power_dp) && (
                  <p className='text-red-600 text-xs mt-1'>
                    ⚠️ Value must be less than 25
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='power_inbox'>Power (Inbox)</Label>
                <Input
                  id='power_inbox'
                  type='number'
                  step='0.01'
                  value={formData.power_inbox}
                  onChange={(e) =>
                    handleInputChange("power_inbox", e.target.value)
                  }
                  className={
                    isPowerInvalid(formData.power_inbox)
                      ? "border-red-500 text-red-600"
                      : ""
                  }
                  required
                />
                {isPowerInvalid(formData.power_inbox) && (
                  <p className='text-red-600 text-xs mt-1'>
                    ⚠️ Value must be less than 25
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Customer Information - Auto-populated from Task */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium'>
              Customer Information (From Task)
            </h3>
            <div className='grid grid-cols-1 gap-4'>
              <div>
                <Label htmlFor='name'>Name</Label>
                <Input
                  id='name'
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className='bg-blue-50 dark:bg-blue-950'
                  readOnly={!!selectedTask}
                  required
                />
                {selectedTask && (
                  <p className='text-xs text-blue-600 mt-1'>
                    Auto-filled from selected task
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor='address'>Address</Label>
                <Textarea
                  id='address'
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className='bg-blue-50 dark:bg-blue-950'
                  readOnly={!!selectedTask}
                  required
                />
                {selectedTask && (
                  <p className='text-xs text-blue-600 mt-1'>
                    Auto-filled from selected task
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Cable Measurements with Drum Selection */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium flex items-center gap-2'>
              <Calculator className='h-5 w-5' />
              Cable Measurements & Drum Tracking
            </h3>

            {/* Drum Selection */}
            <div>
              <Label htmlFor='drum_selection'>Select Cable Drum</Label>
              <Popover open={drumOpen} onOpenChange={setDrumOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    role='combobox'
                    aria-expanded={drumOpen}
                    className='w-full justify-between'
                  >
                    {formData.drum_number || "Select available drum"}
                    <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-full p-0'>
                  <Command>
                    <CommandInput placeholder='Search drums...' />
                    <CommandList>
                      <CommandEmpty>No available drums found.</CommandEmpty>
                      <CommandGroup>
                        {drumOptions.map((drum) => (
                          <CommandItem
                            key={drum.id}
                            value={drum.id}
                            onSelect={(currentValue) => {
                              handleInputChange(
                                "selected_drum_id",
                                currentValue
                              );
                              setDrumOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.selected_drum_id === drum.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className='flex flex-col'>
                              <span>{drum.drum_number}</span>
                              <span className='text-xs text-muted-foreground'>
                                {drum.item_name} - {drum.current_quantity}m
                                available
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className='text-xs text-muted-foreground mt-1'>
                Select a drum to track cable usage. Drums contain 2000m of
                cable.
              </p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div>
                <Label htmlFor='cable_start'>Cable Start</Label>
                <Input
                  id='cable_start'
                  type='number'
                  step='0.01'
                  value={formData.cable_start}
                  onChange={(e) =>
                    handleInputChange("cable_start", e.target.value)
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor='cable_middle'>Cable Middle</Label>
                <Input
                  id='cable_middle'
                  type='number'
                  step='0.01'
                  value={formData.cable_middle}
                  onChange={(e) =>
                    handleInputChange("cable_middle", e.target.value)
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor='cable_end'>Cable End</Label>
                <Input
                  id='cable_end'
                  type='number'
                  step='0.01'
                  value={formData.cable_end}
                  onChange={(e) =>
                    handleInputChange("cable_end", e.target.value)
                  }
                  required
                />
              </div>
            </div>

            {/* Auto-calculated values */}
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg'>
              <div>
                <Label className='text-sm font-medium'>
                  F1 (|Start - Middle|)
                </Label>
                <div className='text-lg font-bold text-blue-600'>
                  {formData.f1}m
                </div>
              </div>
              <div>
                <Label className='text-sm font-medium'>
                  G1 (|Middle - End|)
                </Label>
                <div className='text-lg font-bold text-blue-600'>
                  {formData.g1}m
                </div>
              </div>
              <div>
                <Label className='text-sm font-medium'>Total (F1 + G1)</Label>
                <div className='text-lg font-bold text-green-600'>
                  {formData.total_cable}m
                </div>
              </div>
              <div>
                <Label htmlFor='wastage_input'>Wastage</Label>
                <Input
                  id='wastage_input'
                  type='number'
                  step='0.01'
                  value={formData.wastage_input}
                  onChange={(e) =>
                    handleInputChange("wastage_input", e.target.value)
                  }
                  placeholder='0.00'
                />
              </div>
            </div>

            {/* Drum availability check */}
            {formData.selected_drum_id && formData.total_cable > 0 && (
              <div className='p-3 bg-blue-50 dark:bg-blue-950 rounded-lg'>
                <div className='flex items-center gap-2'>
                  <Package className='h-4 w-4 text-blue-600' />
                  <span className='text-sm font-medium'>Drum Usage Check</span>
                </div>
                <p className='text-sm text-muted-foreground mt-1'>
                  Required: {formData.total_cable}m | Available:{" "}
                  {drumOptions
                    .find((d) => d.id === formData.selected_drum_id)
                    ?.current_quantity.toFixed(2)}
                  m
                </p>
                {formData.total_cable >
                  (drumOptions.find((d) => d.id === formData.selected_drum_id)
                    ?.current_quantity || 0) && (
                  <p className='text-sm text-red-600 mt-1'>
                    ⚠️ Insufficient cable in selected drum
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Inventory Section - keeping the existing comprehensive inventory fields */}
          <div className='space-y-6'>
            <h3 className='text-lg font-medium flex items-center gap-2'>
              <Package className='h-5 w-5' />
              Inventory & Materials Used
            </h3>

            {/* Hardware Components */}
            <div className='space-y-4'>
              <h4 className='text-md font-medium text-muted-foreground'>
                Hardware Components
              </h4>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <div>
                  <Label htmlFor='retainers'>Retainers</Label>
                  <Input
                    id='retainers'
                    type='number'
                    min='0'
                    value={formData.retainers}
                    onChange={(e) =>
                      handleInputChange("retainers", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='l_hook'>L-Hook</Label>
                  <Input
                    id='l_hook'
                    type='number'
                    min='0'
                    value={formData.l_hook}
                    onChange={(e) =>
                      handleInputChange("l_hook", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='nut_bolt' className='flex items-center gap-1'>
                    Nut & Bolt
                    <span title='Auto-calculated: ½ of L-Hook'>
                      <Calculator className='h-3 w-3 text-blue-500' />
                    </span>
                  </Label>
                  <Input
                    id='nut_bolt'
                    type='number'
                    min='0'
                    value={formData.nut_bolt}
                    onChange={(e) =>
                      handleInputChange("nut_bolt", e.target.value)
                    }
                    className='bg-blue-50 dark:bg-blue-950'
                  />
                  <p className='text-xs text-blue-600 mt-1'>
                    Auto: ½ of L-Hook (
                    {Math.ceil(
                      (Number.parseInt(formData.l_hook.toString()) || 0) / 2
                    )}
                    )
                  </p>
                </div>
                <div>
                  <Label htmlFor='top_bolt'>Top-Bolt</Label>
                  <Input
                    id='top_bolt'
                    type='number'
                    min='0'
                    value={formData.top_bolt}
                    onChange={(e) =>
                      handleInputChange("top_bolt", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='c_hook'>C-Hook (Default: 1)</Label>
                  <Input
                    id='c_hook'
                    type='number'
                    min='0'
                    value={formData.c_hook}
                    onChange={(e) =>
                      handleInputChange("c_hook", e.target.value)
                    }
                    className='bg-green-50 dark:bg-green-950'
                  />
                </div>
                <div>
                  <Label htmlFor='u_clip'>U-clip</Label>
                  <Input
                    id='u_clip'
                    type='number'
                    min='0'
                    value={formData.u_clip}
                    onChange={(e) =>
                      handleInputChange("u_clip", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='concrete_nail'>Concrete Nail</Label>
                  <Input
                    id='concrete_nail'
                    type='number'
                    min='0'
                    value={formData.concrete_nail}
                    onChange={(e) =>
                      handleInputChange("concrete_nail", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='roll_plug'>Roll Plug</Label>
                  <Input
                    id='roll_plug'
                    type='number'
                    min='0'
                    value={formData.roll_plug}
                    onChange={(e) =>
                      handleInputChange("roll_plug", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label
                    htmlFor='screw_nail'
                    className='flex items-center gap-1'
                  >
                    Screw Nail
                    <span title='Auto-synced with Roll Plug'>
                      <Calculator className='h-3 w-3 text-blue-500' />
                    </span>
                  </Label>
                  <Input
                    id='screw_nail'
                    type='number'
                    min='0'
                    value={formData.screw_nail}
                    onChange={(e) =>
                      handleInputChange("screw_nail", e.target.value)
                    }
                    className='bg-blue-50 dark:bg-blue-950'
                  />
                  <p className='text-xs text-blue-600 mt-1'>
                    Auto: Same as Roll Plug ({formData.roll_plug})
                  </p>
                </div>
              </div>
            </div>

            {/* Fiber & Network Components */}
            <div className='space-y-4'>
              <h4 className='text-md font-medium text-muted-foreground'>
                Fiber & Network Components
              </h4>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <div>
                  <Label htmlFor='fiber_rosette'>
                    Fiber-Rosette (Default: 1)
                  </Label>
                  <Input
                    id='fiber_rosette'
                    type='number'
                    min='0'
                    value={formData.fiber_rosette}
                    onChange={(e) =>
                      handleInputChange("fiber_rosette", e.target.value)
                    }
                    className='bg-green-50 dark:bg-green-950'
                  />
                </div>
                <div>
                  <Label htmlFor='s_rosette'>S-Rosette</Label>
                  <Input
                    id='s_rosette'
                    type='number'
                    min='0'
                    value={formData.s_rosette}
                    onChange={(e) =>
                      handleInputChange("s_rosette", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='fac'>FAC (Default: 2)</Label>
                  <Input
                    id='fac'
                    type='number'
                    min='0'
                    value={formData.fac}
                    onChange={(e) => handleInputChange("fac", e.target.value)}
                    className='bg-green-50 dark:bg-green-950'
                  />
                </div>
                <div>
                  <Label htmlFor='rj45'>RJ45</Label>
                  <Input
                    id='rj45'
                    type='number'
                    min='0'
                    value={formData.rj45}
                    onChange={(e) => handleInputChange("rj45", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='rj11'>RJ11</Label>
                  <Input
                    id='rj11'
                    type='number'
                    min='0'
                    value={formData.rj11}
                    onChange={(e) => handleInputChange("rj11", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='rj12'>RJ12</Label>
                  <Input
                    id='rj12'
                    type='number'
                    min='0'
                    value={formData.rj12}
                    onChange={(e) => handleInputChange("rj12", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='socket'>Socket</Label>
                  <Input
                    id='socket'
                    type='number'
                    min='0'
                    value={formData.socket}
                    onChange={(e) =>
                      handleInputChange("socket", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='bend'>Bend</Label>
                  <Input
                    id='bend'
                    type='number'
                    min='0'
                    value={formData.bend}
                    onChange={(e) => handleInputChange("bend", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Cables & Wiring */}
            <div className='space-y-4'>
              <h4 className='text-md font-medium text-muted-foreground'>
                Cables & Wiring (meters)
              </h4>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <div>
                  <Label htmlFor='internal_wire'>Internal Wire</Label>
                  <Input
                    id='internal_wire'
                    type='number'
                    step='0.01'
                    min='0'
                    value={formData.internal_wire}
                    onChange={(e) =>
                      handleInputChange("internal_wire", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='cat5'>Cat 5</Label>
                  <Input
                    id='cat5'
                    type='number'
                    step='0.01'
                    min='0'
                    value={formData.cat5}
                    onChange={(e) => handleInputChange("cat5", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='casing'>Casing</Label>
                  <Input
                    id='casing'
                    type='number'
                    step='0.01'
                    min='0'
                    value={formData.casing}
                    onChange={(e) =>
                      handleInputChange("casing", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='conduit'>Conduit</Label>
                  <Input
                    id='conduit'
                    type='number'
                    step='0.01'
                    min='0'
                    value={formData.conduit}
                    onChange={(e) =>
                      handleInputChange("conduit", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Accessories & Ties */}
            <div className='space-y-4'>
              <h4 className='text-md font-medium text-muted-foreground'>
                Accessories & Ties
              </h4>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <div>
                  <Label htmlFor='c_tie'>C-tie</Label>
                  <Input
                    id='c_tie'
                    type='number'
                    min='0'
                    value={formData.c_tie}
                    onChange={(e) => handleInputChange("c_tie", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='c_clip'>C-clip</Label>
                  <Input
                    id='c_clip'
                    type='number'
                    min='0'
                    value={formData.c_clip}
                    onChange={(e) =>
                      handleInputChange("c_clip", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='tag_tie'>Tag tie (Default: 1)</Label>
                  <Input
                    id='tag_tie'
                    type='number'
                    min='0'
                    value={formData.tag_tie}
                    onChange={(e) =>
                      handleInputChange("tag_tie", e.target.value)
                    }
                    className='bg-green-50 dark:bg-green-950'
                  />
                </div>
                <div>
                  <Label htmlFor='flexible'>Flexible (Default: 2)</Label>
                  <Input
                    id='flexible'
                    type='number'
                    min='0'
                    value={formData.flexible}
                    onChange={(e) =>
                      handleInputChange("flexible", e.target.value)
                    }
                    className='bg-green-50 dark:bg-green-950'
                  />
                </div>
              </div>
            </div>

            {/* Infrastructure */}
            <div className='space-y-4'>
              <h4 className='text-md font-medium text-muted-foreground'>
                Infrastructure
              </h4>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <div>
                  <Label htmlFor='pole_67'>Pole 6.7</Label>
                  <Input
                    id='pole_67'
                    type='number'
                    min='0'
                    value={formData.pole_67}
                    onChange={(e) =>
                      handleInputChange("pole_67", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='pole'>Pole 5.6</Label>
                  <Input
                    id='pole'
                    type='number'
                    min='0'
                    value={formData.pole}
                    onChange={(e) => handleInputChange("pole", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Device Serials */}
            <div className='space-y-4'>
              <h4 className='text-md font-medium text-muted-foreground'>
                Device Information
              </h4>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div>
                  <Label htmlFor='ont_serial'>ONT (Hexadecimal Serial)</Label>
                  <Input
                    id='ont_serial'
                    value={formData.ont_serial}
                    onChange={(e) =>
                      handleInputChange(
                        "ont_serial",
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder='e.g., 48575443A1B2C3D4'
                    className='font-mono'
                  />
                </div>
                <div>
                  <Label htmlFor='voice_test_no'>Voice Test No</Label>
                  <Input
                    id='voice_test_no'
                    value={formData.voice_test_no}
                    onChange={(e) =>
                      handleInputChange("voice_test_no", e.target.value)
                    }
                    placeholder='Voice test number'
                  />
                </div>
                <div>
                  <Label htmlFor='stb_serial'>STB (Hexadecimal Serial)</Label>
                  <Input
                    id='stb_serial'
                    value={formData.stb_serial}
                    onChange={(e) =>
                      handleInputChange(
                        "stb_serial",
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder='e.g., 12345ABCDEF67890'
                    className='font-mono'
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={loading || !!dpValidationError}>
              {loading ? "Adding..." : "Add Telephone Line"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
