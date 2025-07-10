import React, { useState, useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import { getSupabaseClient } from "@/lib/supabase";
import { useNotification } from "@/contexts/notification-context";
import { Package, Calculator, AlertTriangle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditTelephoneLineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  lineData: any;
}

interface DrumOption {
  id: string;
  drum_number: string;
  current_quantity: number;
  item_name: string;
}

export function EditTelephoneLineModal({
  open,
  onOpenChange,
  onSuccess,
  lineData,
}: EditTelephoneLineModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ ...lineData });
  const [dpValidationError, setDpValidationError] = useState("");
  const [drumOptions, setDrumOptions] = useState<DrumOption[]>([]);
  const [drumOpen, setDrumOpen] = useState(false);
  const supabase = getSupabaseClient();
  const { addNotification } = useNotification();

  useEffect(() => {
    if (lineData) {
      // Support both possible field names for phone number
      setFormData({
        ...lineData,
        phone_number: lineData.phone_number || lineData.telephone_no || "",
      });
    }
  }, [lineData]);

  // Auto-calculate F1, G1, and Total when cable values change
  useEffect(() => {
    const start = Number.parseFloat(formData.cable_start) || 0;
    const middle = Number.parseFloat(formData.cable_middle) || 0;
    const end = Number.parseFloat(formData.cable_end) || 0;
    const f1 = Math.abs(start - middle);
    const g1 = Math.abs(middle - end);
    const total = f1 + g1;
    setFormData((prev: any) => ({
      ...prev,
      f1_calc: f1,
      g1_calc: g1,
      total_calc: total,
    }));
  }, [formData.cable_start, formData.cable_middle, formData.cable_end]);

  // Auto-calculate Nut & Bolt (½ of L-Hook)
  useEffect(() => {
    const lHook = Number(formData.l_hook) || 0;
    const nutBolt = Math.ceil(lHook / 2);
    setFormData((prev: any) => ({
      ...prev,
      nut_bolt: String(nutBolt),
    }));
  }, [formData.l_hook]);

  // Auto-sync Screw Nail with Roll Plug
  useEffect(() => {
    const rollPlug = Number(formData.roll_plug) || 0;
    setFormData((prev: any) => ({
      ...prev,
      screw_nail: String(rollPlug),
    }));
  }, [formData.roll_plug]);

  useEffect(() => {
    if (open) {
      fetchDrumOptions();
    }
  }, [open]);

  const fetchDrumOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("drum_tracking")
        .select(`id, drum_number, current_quantity, inventory_items(name)`)
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

  const isPowerInvalid = (value: string) => {
    const num = Number.parseFloat(value);
    return !isNaN(num) && num >= 25;
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (field === "dp" && typeof value === "string") {
      validateDP(value);
    }
    // Auto-fill drum number when drum is selected
    if (field === "selected_drum_id" && value) {
      const selectedDrum = drumOptions.find((drum) => drum.id === value);
      if (selectedDrum) {
        setFormData((prev: any) => ({
          ...prev,
          drum_number: selectedDrum.drum_number,
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate DP format
      if (!validateDP(formData.dp)) {
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
      // Prepare data for update
      const updateData = {
        date: formData.date,
        phone_number: formData.phone_number,
        dp: formData.dp,
        power_dp: Number.parseFloat(formData.power_dp),
        power_inbox: Number.parseFloat(formData.power_inbox),
        name: formData.name,
        address: formData.address,
        cable_start: Number.parseFloat(formData.cable_start),
        cable_middle: Number.parseFloat(formData.cable_middle),
        cable_end: Number.parseFloat(formData.cable_end),
        f1_calc: formData.f1_calc,
        g1_calc: formData.g1_calc,
        total_calc: formData.total_calc,
        wastage_input: Number.parseFloat(formData.wastage_input) || 0,
        drum_number: formData.drum_number,
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
      const { error } = await supabase
        .from("line_details")
        .update(updateData)
        .eq("id", lineData.id);
      if (error) throw error;
      addNotification({
        title: "Success",
        message: "Line details updated successfully",
        type: "success",
        category: "system",
      });
      onSuccess();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-6xl max-h-[95vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Edit Telephone Line Details</DialogTitle>
          <DialogDescription>
            Update the details for this telephone line.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Basic Information */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium'>Basic Information</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='date'>Date</Label>
                <Input
                  id='date'
                  type='date'
                  value={formData.date || ""}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor='phone_number'>Phone Number</Label>
                <Input
                  id='phone_number'
                  value={formData.phone_number || ""}
                  onChange={(e) =>
                    handleInputChange("phone_number", e.target.value)
                  }
                  required
                />
              </div>
            </div>
          </div>
          {/* DP Configuration */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium'>DP Configuration</h3>
            <div>
              <Label htmlFor='dp'>DP</Label>
              <Input
                id='dp'
                value={formData.dp || ""}
                onChange={(e) => handleInputChange("dp", e.target.value)}
                required
              />
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
                  value={formData.power_dp || ""}
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
                  value={formData.power_inbox || ""}
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
          {/* Customer Information */}
          <div className='space-y-4'>
            <h3 className='text-lg font-medium'>Customer Information</h3>
            <div className='grid grid-cols-1 gap-4'>
              <div>
                <Label htmlFor='name'>Name</Label>
                <Input
                  id='name'
                  value={formData.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
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
                  value={formData.cable_start || ""}
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
                  value={formData.cable_middle || ""}
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
                  value={formData.cable_end || ""}
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
                  {Number(formData.f1_calc).toFixed(2)}m
                </div>
              </div>
              <div>
                <Label className='text-sm font-medium'>
                  G1 (|Middle - End|)
                </Label>
                <div className='text-lg font-bold text-blue-600'>
                  {Number(formData.g1_calc).toFixed(2)}m
                </div>
              </div>
              <div>
                <Label className='text-sm font-medium'>Total (F1 + G1)</Label>
                <div className='text-lg font-bold text-green-600'>
                  {Number(formData.total_calc).toFixed(2)}m
                </div>
              </div>
              <div>
                <Label htmlFor='wastage_input'>Wastage</Label>
                <Input
                  id='wastage_input'
                  type='number'
                  step='0.01'
                  value={formData.wastage_input || ""}
                  onChange={(e) =>
                    handleInputChange("wastage_input", e.target.value)
                  }
                  placeholder='0.00'
                />
              </div>
            </div>
          </div>
          <Separator />
          {/* Inventory Section */}
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
                    value={formData.retainers || ""}
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
                    value={formData.l_hook || ""}
                    onChange={(e) =>
                      handleInputChange("l_hook", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='nut_bolt' className='flex items-center gap-1'>
                    Nut & Bolt
                    <Calculator className='h-3 w-3 text-blue-500' />
                  </Label>
                  <Input
                    id='nut_bolt'
                    type='number'
                    min='0'
                    value={formData.nut_bolt || ""}
                    onChange={(e) =>
                      handleInputChange("nut_bolt", e.target.value)
                    }
                    className='bg-blue-50 dark:bg-blue-950'
                  />
                  <p className='text-xs text-blue-600 mt-1'>
                    Auto: ½ of L-Hook (
                    {Math.ceil(
                      Number.parseInt(formData.l_hook?.toString() || "0") / 2
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
                    value={formData.top_bolt || ""}
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
                    value={formData.c_hook || ""}
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
                    value={formData.u_clip || ""}
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
                    value={formData.concrete_nail || ""}
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
                    value={formData.roll_plug || ""}
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
                    <Calculator className='h-3 w-3 text-blue-500' />
                  </Label>
                  <Input
                    id='screw_nail'
                    type='number'
                    min='0'
                    value={formData.screw_nail || ""}
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
                    value={formData.fiber_rosette || ""}
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
                    value={formData.s_rosette || ""}
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
                    value={formData.fac || ""}
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
                    value={formData.rj45 || ""}
                    onChange={(e) => handleInputChange("rj45", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='rj11'>RJ11</Label>
                  <Input
                    id='rj11'
                    type='number'
                    min='0'
                    value={formData.rj11 || ""}
                    onChange={(e) => handleInputChange("rj11", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='rj12'>RJ12</Label>
                  <Input
                    id='rj12'
                    type='number'
                    min='0'
                    value={formData.rj12 || ""}
                    onChange={(e) => handleInputChange("rj12", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='socket'>Socket</Label>
                  <Input
                    id='socket'
                    type='number'
                    min='0'
                    value={formData.socket || ""}
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
                    value={formData.bend || ""}
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
                    value={formData.internal_wire || ""}
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
                    value={formData.cat5 || ""}
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
                    value={formData.casing || ""}
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
                    value={formData.conduit || ""}
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
                    value={formData.c_tie || ""}
                    onChange={(e) => handleInputChange("c_tie", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='c_clip'>C-clip</Label>
                  <Input
                    id='c_clip'
                    type='number'
                    min='0'
                    value={formData.c_clip || ""}
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
                    value={formData.tag_tie || ""}
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
                    value={formData.flexible || ""}
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
                    value={formData.pole_67 || ""}
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
                    value={formData.pole || ""}
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
                    value={formData.ont_serial || ""}
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
                    value={formData.voice_test_no || ""}
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
                    value={formData.stb_serial || ""}
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
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
