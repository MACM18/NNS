"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Check, ChevronsUpDown, Calculator, Package, TrendingDown } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { useNotification } from "@/contexts/notification-context"
import { cn } from "@/lib/utils"
import { wastageConfigService, type WastageConfig } from "@/lib/wastage-config"

interface AddTelephoneLineModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface DPSuggestion {
  dp: string
  count: number
}

interface DrumOption {
  id: string
  drum_number: string
  current_quantity: number
  item_name: string
}

export function AddTelephoneLineModal({ open, onOpenChange, onSuccess }: AddTelephoneLineModalProps) {
  const [loading, setLoading] = useState(false)
  const [dpSuggestions, setDpSuggestions] = useState<DPSuggestion[]>([])
  const [drumOptions, setDrumOptions] = useState<DrumOption[]>([])
  const [dpOpen, setDpOpen] = useState(false)
  const [drumOpen, setDrumOpen] = useState(false)
  const [dpValidationError, setDpValidationError] = useState("")
  const [wastageConfig, setWastageConfig] = useState<WastageConfig | null>(null)
  const [manualWastageOverride, setManualWastageOverride] = useState(false)
  const [formData, setFormData] = useState({
    // Basic Information
    date: new Date().toISOString().split("T")[0],
    phone_number: "",
    dp: "",
    power_dp_new: "",
    power_inbox_new: "",
    name: "",
    address: "",

    // Cable Measurements
    cable_start_new: "",
    cable_middle_new: "",
    cable_end_new: "",
    wastage_input: "",
    f1_calc: 0,
    g1_calc: 0,
    total_calc: 0,

    // Drum Selection
    selected_drum_id: "",
    drum_number_new: "",

    // Inventory Fields (keeping existing structure)
    retainers: 0,
    l_hook_new: 0,
    nut_bolt_new: 0,
    top_bolt_new: 0,
    c_hook_new: 1,
    fiber_rosette_new: 1,
    internal_wire_new: "",
    s_rosette_new: 0,
    fac_new: 2,
    casing_new: "",
    c_tie_new: 0,
    c_clip_new: 0,
    conduit_new: "",
    tag_tie_new: 1,
    ont_serial: "",
    voice_test_no_new: "",
    stb_serial: "",
    flexible_new: 2,
    rj45_new: 0,
    cat5_new: "",
    pole_67_new: 0,
    pole_new: 0,
    concrete_nail_new: 0,
    roll_plug_new: 0,
    screw_nail_new: 0,
    u_clip_new: 0,
    socket_new: 0,
    bend_new: 0,
    rj11_new: 0,
    rj12_new: 0,
  })

  const supabase = getSupabaseClient()
  const { addNotification } = useNotification()

  // Auto-calculate F1, G1, and Total when cable values change
  useEffect(() => {
    const start = Number.parseFloat(formData.cable_start_new) || 0
    const middle = Number.parseFloat(formData.cable_middle_new) || 0
    const end = Number.parseFloat(formData.cable_end_new) || 0

    const f1 = Math.abs(start - middle)
    const g1 = Math.abs(middle - end)
    const total = f1 + g1

    setFormData((prev) => ({
      ...prev,
      f1_calc: f1,
      g1_calc: g1,
      total_calc: total,
    }))
  }, [formData.cable_start_new, formData.cable_middle_new, formData.cable_end_new])

  // Auto-calculate wastage based on total and configuration
  useEffect(() => {
    if (wastageConfig?.auto_calculate && formData.total_calc > 0 && !manualWastageOverride) {
      const autoWastage = wastageConfigService.calculateWastage(formData.total_calc, wastageConfig)
      setFormData((prev) => ({
        ...prev,
        wastage_input: autoWastage.toFixed(2),
      }))
    }
  }, [formData.total_calc, wastageConfig, manualWastageOverride])

  // Load wastage configuration on mount
  useEffect(() => {
    if (open) {
      loadWastageConfig()
    }
  }, [open])

  const loadWastageConfig = async () => {
    try {
      const config = await wastageConfigService.getWastageConfig()
      setWastageConfig(config)
    } catch (error) {
      console.error("Error loading wastage config:", error)
    }
  }

  // Auto-calculate Nut & Bolt (½ of L-Hook)
  useEffect(() => {
    const lHook = Number.parseInt(formData.l_hook_new.toString()) || 0
    const nutBolt = Math.ceil(lHook / 2)

    setFormData((prev) => ({
      ...prev,
      nut_bolt_new: nutBolt,
    }))
  }, [formData.l_hook_new])

  // Auto-sync Screw Nail with Roll Plug
  useEffect(() => {
    const rollPlug = Number.parseInt(formData.roll_plug_new.toString()) || 0

    setFormData((prev) => ({
      ...prev,
      screw_nail_new: rollPlug,
    }))
  }, [formData.roll_plug_new])

  // Fetch available drums when modal opens
  useEffect(() => {
    if (open) {
      fetchDrumOptions()
    }
  }, [open])

  // Fetch DP suggestions when DP input changes
  useEffect(() => {
    if (formData.dp.length >= 3) {
      fetchDPSuggestions()
    }
  }, [formData.dp])

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
        `,
        )
        .eq("status", "active")
        .gt("current_quantity", 0)
        .order("drum_number")

      if (error) throw error

      const drums = data.map((drum: any) => ({
        id: drum.id,
        drum_number: drum.drum_number,
        current_quantity: drum.current_quantity,
        item_name: drum.inventory_items?.name || "Unknown",
      }))

      setDrumOptions(drums)
    } catch (error) {
      console.error("Error fetching drum options:", error)
    }
  }

  const fetchDPSuggestions = async () => {
    try {
      const { data, error } = await supabase.from("line_details").select("dp").ilike("dp", `${formData.dp}%`).limit(10)

      if (error) throw error

      const suggestions = data.reduce((acc: Record<string, number>, item) => {
        if (item.dp) {
          acc[item.dp] = (acc[item.dp] || 0) + 1
        }
        return acc
      }, {})

      setDpSuggestions(Object.entries(suggestions).map(([dp, count]) => ({ dp, count })))
    } catch (error) {
      console.error("Error fetching DP suggestions:", error)
    }
  }

  const validateDP = (dp: string): boolean => {
    const dpPattern = /^[A-Z]{1,4}-[A-Z]{1,4}-\d{4}-\d{3}-0[1-8]$/

    if (!dpPattern.test(dp)) {
      setDpValidationError("DP format should be: XX-XXXX-XXXX-XXX-0X (e.g., HR-PKJ-0536-021-05)")
      return false
    }

    setDpValidationError("")
    return true
  }

  const validateHexSerial = (serial: string, fieldName: string): boolean => {
    if (!serial) return true
    const hexPattern = /^[0-9A-Fa-f]+$/
    if (!hexPattern.test(serial)) {
      addNotification({
        title: "Validation Error",
        message: `${fieldName} must be a valid hexadecimal serial number`,
        type: "error",
      })
      return false
    }
    return true
  }

  const checkDPUniqueness = async (dp: string): Promise<boolean> => {
    const parts = dp.split("-")
    if (parts.length !== 5) return false

    const baseDP = parts.slice(0, 4).join("-")
    const lastValue = parts[4]

    try {
      const { data, error } = await supabase.from("line_details").select("dp").ilike("dp", `${baseDP}-${lastValue}`)

      if (error) throw error

      if (data && data.length > 0) {
        setDpValidationError(`DP ${dp} already exists. Please use a different last value (01-08).`)
        return false
      }

      return true
    } catch (error) {
      console.error("Error checking DP uniqueness:", error)
      return false
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    if (field === "dp" && typeof value === "string") {
      validateDP(value)
    }

    // Auto-fill drum number when drum is selected
    if (field === "selected_drum_id" && value) {
      const selectedDrum = drumOptions.find((drum) => drum.id === value)
      if (selectedDrum) {
        setFormData((prev) => ({ ...prev, drum_number_new: selectedDrum.drum_number }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate DP format
      if (!validateDP(formData.dp)) {
        setLoading(false)
        return
      }

      // Check DP uniqueness
      const isUnique = await checkDPUniqueness(formData.dp)
      if (!isUnique) {
        setLoading(false)
        return
      }

      // Validate power values
      const powerDP = Number.parseFloat(formData.power_dp_new)
      const powerInbox = Number.parseFloat(formData.power_inbox_new)

      if (powerDP >= 25 || powerInbox >= 25) {
        addNotification({
          title: "Validation Error",
          message: "Power values must be less than 25",
          type: "error",
        })
        setLoading(false)
        return
      }

      // Validate hexadecimal serials
      if (
        !validateHexSerial(formData.ont_serial, "ONT Serial") ||
        !validateHexSerial(formData.stb_serial, "STB Serial")
      ) {
        setLoading(false)
        return
      }

      // Check if selected drum has enough cable (including wastage)
      if (formData.selected_drum_id && formData.total_calc > 0) {
        const selectedDrum = drumOptions.find((drum) => drum.id === formData.selected_drum_id)
        const totalRequired = formData.total_calc + (Number.parseFloat(formData.wastage_input) || 0)
        if (selectedDrum && totalRequired > selectedDrum.current_quantity) {
          addNotification({
            title: "Insufficient Cable",
            message: `Selected drum only has ${selectedDrum.current_quantity}m available, but ${totalRequired.toFixed(2)}m is required (${formData.total_calc}m + ${(Number.parseFloat(formData.wastage_input) || 0).toFixed(2)}m wastage)`,
            type: "error",
          })
          setLoading(false)
          return
        }
      }

      // Prepare data for insertion
      const insertData = {
        // Basic Information
        date: formData.date,
        phone_number: formData.phone_number,
        dp: formData.dp,
        power_dp_new: Number.parseFloat(formData.power_dp_new),
        power_inbox_new: Number.parseFloat(formData.power_inbox_new),
        name: formData.name,
        address: formData.address,

        // Cable Measurements
        cable_start_new: Number.parseFloat(formData.cable_start_new),
        cable_middle_new: Number.parseFloat(formData.cable_middle_new),
        cable_end_new: Number.parseFloat(formData.cable_end_new),
        f1_calc: formData.f1_calc,
        g1_calc: formData.g1_calc,
        total_calc: formData.total_calc,
        wastage_input: Number.parseFloat(formData.wastage_input) || 0,
        drum_number_new: formData.drum_number_new,

        // Inventory Fields
        retainers: Number.parseInt(formData.retainers.toString()) || 0,
        l_hook_new: Number.parseInt(formData.l_hook_new.toString()) || 0,
        nut_bolt_new: Number.parseInt(formData.nut_bolt_new.toString()) || 0,
        top_bolt_new: Number.parseInt(formData.top_bolt_new.toString()) || 0,
        c_hook_new: Number.parseInt(formData.c_hook_new.toString()) || 1,
        fiber_rosette_new: Number.parseInt(formData.fiber_rosette_new.toString()) || 1,
        internal_wire_new: Number.parseFloat(formData.internal_wire_new) || 0,
        s_rosette_new: Number.parseInt(formData.s_rosette_new.toString()) || 0,
        fac_new: Number.parseInt(formData.fac_new.toString()) || 2,
        casing_new: Number.parseFloat(formData.casing_new) || 0,
        c_tie_new: Number.parseInt(formData.c_tie_new.toString()) || 0,
        c_clip_new: Number.parseInt(formData.c_clip_new.toString()) || 0,
        conduit_new: Number.parseFloat(formData.conduit_new) || 0,
        tag_tie_new: Number.parseInt(formData.tag_tie_new.toString()) || 1,
        ont_serial: formData.ont_serial || null,
        voice_test_no_new: formData.voice_test_no_new || null,
        stb_serial: formData.stb_serial || null,
        flexible_new: Number.parseInt(formData.flexible_new.toString()) || 2,
        rj45_new: Number.parseInt(formData.rj45_new.toString()) || 0,
        cat5_new: Number.parseFloat(formData.cat5_new) || 0,
        pole_67_new: Number.parseInt(formData.pole_67_new.toString()) || 0,
        pole_new: Number.parseInt(formData.pole_new.toString()) || 0,
        concrete_nail_new: Number.parseInt(formData.concrete_nail_new.toString()) || 0,
        roll_plug_new: Number.parseInt(formData.roll_plug_new.toString()) || 0,
        screw_nail_new: Number.parseInt(formData.screw_nail_new.toString()) || 0,
        u_clip_new: Number.parseInt(formData.u_clip_new.toString()) || 0,
        socket_new: Number.parseInt(formData.socket_new.toString()) || 0,
        bend_new: Number.parseInt(formData.bend_new.toString()) || 0,
        rj11_new: Number.parseInt(formData.rj11_new.toString()) || 0,
        rj12_new: Number.parseInt(formData.rj12_new.toString()) || 0,
      }

      const { data: lineDetails, error } = await supabase.from("line_details").insert([insertData]).select().single()

      if (error) throw error

      // Record drum usage if drum was selected and cable was used
      if (formData.selected_drum_id && formData.total_calc > 0) {
        // Record drum usage
        const totalUsageWithWastage = formData.total_calc + (Number.parseFloat(formData.wastage_input) || 0)
        await supabase.from("drum_usage").insert([
          {
            drum_id: formData.selected_drum_id,
            line_details_id: lineDetails.id,
            quantity_used: totalUsageWithWastage,
            usage_date: formData.date,
          },
        ])

        // Update drum current quantity
        const selectedDrum = drumOptions.find((drum) => drum.id === formData.selected_drum_id)
        if (selectedDrum) {
          const newQuantity = selectedDrum.current_quantity - totalUsageWithWastage
          await supabase
            .from("drum_tracking")
            .update({
              current_quantity: newQuantity,
              status: newQuantity <= 0 ? "empty" : "active",
              updated_at: new Date().toISOString(),
            })
            .eq("id", formData.selected_drum_id)
        }
      }

      addNotification({
        title: "Success",
        message: "Telephone line details added successfully with drum tracking",
        type: "success",
      })

      onSuccess()
      onOpenChange(false)

      // Reset form to defaults
      setManualWastageOverride(false)
      setFormData({
        date: new Date().toISOString().split("T")[0],
        phone_number: "",
        dp: "",
        power_dp_new: "",
        power_inbox_new: "",
        name: "",
        address: "",
        cable_start_new: "",
        cable_middle_new: "",
        cable_end_new: "",
        wastage_input: "",
        f1_calc: 0,
        g1_calc: 0,
        total_calc: 0,
        selected_drum_id: "",
        drum_number_new: "",
        retainers: 0,
        l_hook_new: 0,
        nut_bolt_new: 0,
        top_bolt_new: 0,
        c_hook_new: 1,
        fiber_rosette_new: 1,
        internal_wire_new: "",
        s_rosette_new: 0,
        fac_new: 2,
        casing_new: "",
        c_tie_new: 0,
        c_clip_new: 0,
        conduit_new: "",
        tag_tie_new: 1,
        ont_serial: "",
        voice_test_no_new: "",
        stb_serial: "",
        flexible_new: 2,
        rj45_new: 0,
        cat5_new: "",
        pole_67_new: 0,
        pole_new: 0,
        concrete_nail_new: 0,
        roll_plug_new: 0,
        screw_nail_new: 0,
        u_clip_new: 0,
        socket_new: 0,
        bend_new: 0,
        rj11_new: 0,
        rj12_new: 0,
      })
      setDpValidationError("")
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message,
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const isPowerInvalid = (value: string) => {
    const num = Number.parseFloat(value)
    return !isNaN(num) && num >= 25
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Telephone Line Details</DialogTitle>
          <DialogDescription>
            Enter the complete details for a new telephone line installation including inventory usage and drum
            tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange("phone_number", e.target.value)}
                  placeholder="e.g., 0342217442"
                  required
                />
              </div>
            </div>
          </div>

          {/* DP Field with Suggestions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">DP Configuration</h3>
            <div>
              <Label htmlFor="dp">DP</Label>
              <Popover open={dpOpen} onOpenChange={setDpOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={dpOpen} className="w-full justify-between">
                    {formData.dp || "Enter DP (e.g., HR-PKJ-0536-021-05)"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Type DP..."
                      value={formData.dp}
                      onValueChange={(value) => handleInputChange("dp", value)}
                    />
                    <CommandList>
                      <CommandEmpty>No DP suggestions found.</CommandEmpty>
                      <CommandGroup>
                        {dpSuggestions.map((suggestion) => (
                          <CommandItem
                            key={suggestion.dp}
                            value={suggestion.dp}
                            onSelect={(currentValue) => {
                              handleInputChange("dp", currentValue)
                              setDpOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.dp === suggestion.dp ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {suggestion.dp}
                            <Badge variant="secondary" className="ml-auto">
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
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  {dpValidationError}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Format: XX-XXXX-XXXX-XXX-0X (2 uppercase strings, 2 numbers, last value 01-08)
              </p>
            </div>
          </div>

          {/* Power Values */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Power Measurements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="power_dp_new">Power (DP)</Label>
                <Input
                  id="power_dp_new"
                  type="number"
                  step="0.01"
                  value={formData.power_dp_new}
                  onChange={(e) => handleInputChange("power_dp_new", e.target.value)}
                  className={isPowerInvalid(formData.power_dp_new) ? "border-red-500 text-red-600" : ""}
                  required
                />
                {isPowerInvalid(formData.power_dp_new) && (
                  <p className="text-red-600 text-xs mt-1">⚠️ Value must be less than 25</p>
                )}
              </div>
              <div>
                <Label htmlFor="power_inbox_new">Power (Inbox)</Label>
                <Input
                  id="power_inbox_new"
                  type="number"
                  step="0.01"
                  value={formData.power_inbox_new}
                  onChange={(e) => handleInputChange("power_inbox_new", e.target.value)}
                  className={isPowerInvalid(formData.power_inbox_new) ? "border-red-500 text-red-600" : ""}
                  required
                />
                {isPowerInvalid(formData.power_inbox_new) && (
                  <p className="text-red-600 text-xs mt-1">⚠️ Value must be less than 25</p>
                )}
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Customer Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Cable Measurements with Drum Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Cable Measurements & Drum Tracking
            </h3>

            {/* Drum Selection */}
            <div>
              <Label htmlFor="drum_selection">Select Cable Drum</Label>
              <Popover open={drumOpen} onOpenChange={setDrumOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={drumOpen} className="w-full justify-between">
                    {formData.drum_number_new || "Select available drum"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search drums..." />
                    <CommandList>
                      <CommandEmpty>No available drums found.</CommandEmpty>
                      <CommandGroup>
                        {drumOptions.map((drum) => (
                          <CommandItem
                            key={drum.id}
                            value={drum.id}
                            onSelect={(currentValue) => {
                              handleInputChange("selected_drum_id", currentValue)
                              setDrumOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.selected_drum_id === drum.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{drum.drum_number}</span>
                              <span className="text-xs text-muted-foreground">
                                {drum.item_name} - {drum.current_quantity}m available
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground mt-1">
                Select a drum to track cable usage. Drums contain 2000m of cable.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cable_start_new">Cable Start</Label>
                <Input
                  id="cable_start_new"
                  type="number"
                  step="0.01"
                  value={formData.cable_start_new}
                  onChange={(e) => handleInputChange("cable_start_new", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cable_middle_new">Cable Middle</Label>
                <Input
                  id="cable_middle_new"
                  type="number"
                  step="0.01"
                  value={formData.cable_middle_new}
                  onChange={(e) => handleInputChange("cable_middle_new", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cable_end_new">Cable End</Label>
                <Input
                  id="cable_end_new"
                  type="number"
                  step="0.01"
                  value={formData.cable_end_new}
                  onChange={(e) => handleInputChange("cable_end_new", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Auto-calculated values */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">F1 (|Start - Middle|)</Label>
                <div className="text-lg font-bold text-blue-600">{formData.f1_calc.toFixed(2)}m</div>
              </div>
              <div>
                <Label className="text-sm font-medium">G1 (|Middle - End|)</Label>
                <div className="text-lg font-bold text-blue-600">{formData.g1_calc.toFixed(2)}m</div>
              </div>
              <div>
                <Label className="text-sm font-medium">Total (F1 + G1)</Label>
                <div className="text-lg font-bold text-green-600">{formData.total_calc.toFixed(2)}m</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="wastage_input" className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Wastage
                  </Label>
                  {wastageConfig?.auto_calculate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setManualWastageOverride(!manualWastageOverride)
                        if (manualWastageOverride && formData.total_calc > 0) {
                          // Reset to auto-calculated value
                          const autoWastage = wastageConfigService.calculateWastage(formData.total_calc, wastageConfig)
                          setFormData(prev => ({
                            ...prev,
                            wastage_input: autoWastage.toFixed(2),
                          }))
                        }
                      }}
                    >
                      {manualWastageOverride ? "Auto" : "Manual"}
                    </Button>
                  )}
                </div>
                <Input
                  id="wastage_input"
                  type="number"
                  step="0.01"
                  value={formData.wastage_input}
                  onChange={(e) => {
                    handleInputChange("wastage_input", e.target.value)
                    setManualWastageOverride(true)
                  }}
                  placeholder="0.00"
                  disabled={wastageConfig?.auto_calculate && !manualWastageOverride}
                />
                {wastageConfig?.auto_calculate && !manualWastageOverride && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    Auto-calculated at {wastageConfig.default_wastage_percentage}%
                  </p>
                )}
                {/* Wastage validation */}
                {formData.wastage_input && formData.total_calc > 0 && (() => {
                  const validation = wastageConfigService.validateWastage(
                    Number.parseFloat(formData.wastage_input) || 0,
                    formData.total_calc,
                    wastageConfig || undefined
                  )
                  if (!validation.isValid) {
                    return (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {validation.message}
                      </p>
                    )
                  }
                  return null
                })()}
              </div>
            </div>

            {/* Drum availability check */}
            {formData.selected_drum_id && formData.total_calc > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Drum Usage Check</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Cable needed: {formData.total_calc.toFixed(2)}m + Wastage: {(Number.parseFloat(formData.wastage_input) || 0).toFixed(2)}m = Total: {(formData.total_calc + (Number.parseFloat(formData.wastage_input) || 0)).toFixed(2)}m
                </p>
                <p className="text-sm text-muted-foreground">
                  Available: {drumOptions.find((d) => d.id === formData.selected_drum_id)?.current_quantity.toFixed(2)}m
                </p>
                {(formData.total_calc + (Number.parseFloat(formData.wastage_input) || 0)) >
                  (drumOptions.find((d) => d.id === formData.selected_drum_id)?.current_quantity || 0) && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Insufficient cable in selected drum
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Inventory Section - keeping the existing comprehensive inventory fields */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory & Materials Used
            </h3>

            {/* Hardware Components */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-muted-foreground">Hardware Components</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="retainers">Retainers</Label>
                  <Input
                    id="retainers"
                    type="number"
                    min="0"
                    value={formData.retainers}
                    onChange={(e) => handleInputChange("retainers", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="l_hook_new">L-Hook</Label>
                  <Input
                    id="l_hook_new"
                    type="number"
                    min="0"
                    value={formData.l_hook_new}
                    onChange={(e) => handleInputChange("l_hook_new", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="nut_bolt_new" className="flex items-center gap-1">
                    Nut & Bolt
                    <Calculator className="h-3 w-3 text-blue-500" title="Auto-calculated: ½ of L-Hook" />
                  </Label>
                  <Input
                    id="nut_bolt_new"
                    type="number"
                    min="0"
                    value={formData.nut_bolt_new}
                    onChange={(e) => handleInputChange("nut_bolt_new", Number.parseInt(e.target.value) || 0)}
                    className="bg-blue-50 dark:bg-blue-950"
                  />
                  <p className="text-xs text-blue-600 mt-1">
                    Auto: ½ of L-Hook ({Math.ceil((Number.parseInt(formData.l_hook_new.toString()) || 0) / 2)})
                  </p>
                </div>
                <div>
                  <Label htmlFor="top_bolt_new">Top-Bolt</Label>
                  <Input
                    id="top_bolt_new"
                    type="number"
                    min="0"
                    value={formData.top_bolt_new}
                    onChange={(e) => handleInputChange("top_bolt_new", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="c_hook_new">C-Hook (Default: 1)</Label>
                  <Input
                    id="c_hook_new"
                    type="number"
                    min="0"
                    value={formData.c_hook_new}
                    onChange={(e) => handleInputChange("c_hook_new", Number.parseInt(e.target.value) || 1)}
                    className="bg-green-50 dark:bg-green-950"
                  />
                </div>
                <div>
                  <Label htmlFor="u_clip_new">U-clip</Label>
                  <Input
                    id="u_clip_new"
                    type="number"
                    min="0"
                    value={formData.u_clip_new}
                    onChange={(e) => handleInputChange("u_clip_new", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="concrete_nail_new">Concrete Nail</Label>
                  <Input
                    id="concrete_nail_new"
                    type="number"
                    min="0"
                    value={formData.concrete_nail_new}
                    onChange={(e) => handleInputChange("concrete_nail_new", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="roll_plug_new">Roll Plug</Label>
                  <Input
                    id="roll_plug_new"
                    type="number"
                    min="0"
                    value={formData.roll_plug_new}
                    onChange={(e) => handleInputChange("roll_plug_new", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="screw_nail_new" className="flex items-center gap-1">
                    Screw Nail
                    <Calculator className="h-3 w-3 text-blue-500" title="Auto-synced with Roll Plug" />
                  </Label>
                  <Input
                    id="screw_nail_new"
                    type="number"
                    min="0"
                    value={formData.screw_nail_new}
                    onChange={(e) => handleInputChange("screw_nail_new", Number.parseInt(e.target.value) || 0)}
                    className="bg-blue-50 dark:bg-blue-950"
                  />
                  <p className="text-xs text-blue-600 mt-1">Auto: Same as Roll Plug ({formData.roll_plug_new})</p>
                </div>
              </div>
            </div>

            {/* Fiber & Network Components */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-muted-foreground">Fiber & Network Components</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="fiber_rosette_new">Fiber-Rosette (Default: 1)</Label>
                  <Input
                    id="fiber_rosette_new"
                    type="number"
                    min="0"
                    value={formData.fiber_rosette_new}
                    onChange={(e) => handleInputChange("fiber_rosette_new", Number.parseInt(e.target.value) || 1)}
                    className="bg-green-50 dark:bg-green-950"
                  />
                </div>
                <div>
                  <Label htmlFor="s_rosette_new">S-Rosette</Label>
                  <Input
                    id="s_rosette_new"
                    type="number"
                    min="0"
                    value={formData.s_rosette_new}
                    onChange={(e) => handleInputChange("s_rosette_new", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="fac_new">FAC (Default: 2)</Label>
                  <Input
                    id="fac_new"
                    type="number"
                    min="0"
                    value={formData.fac_new}
                    onChange={(e) => handleInputChange("fac_new", Number.parseInt(e.target.value) || 2)}
                    className="bg-green-50 dark:bg-green-950"
                  />
                </div>
                <div>
                  <Label htmlFor="rj45_new">RJ45</Label>
                  <Input
                    id="rj45_new"
                    type="number"
                    min="0"
                    value={formData.rj45_new}
                    onChange={(e) => handleInputChange("rj45_new", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="rj11_new">RJ11</Label>
                  <Input
                    id="rj11_new"
                    type="number"
                    min="0"
                    value={formData.rj11_new}
                    onChange={(e) => handleInputChange("rj11_new", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="rj12_new">RJ12</Label>
                  <Input
                    id="rj12_new"
                    type="number"
                    min="0"
                    value={formData.rj12_new}
                    onChange={(e) => handleInputChange("rj12_new", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="socket_new">Socket</Label>
                  <Input
                    id="socket_new"
                    type="number"
                    min="0"
                    value={formData.socket_new}
                    onChange={(e) => handleInputChange("socket_new", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="bend_new">Bend</Label>
                  <Input
                    id="bend_new"
                    type="number"
                    min="0"
                    value={formData.bend_new}
                    onChange={(e) => handleInputChange("bend_new", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Cables & Wiring */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-muted-foreground">Cables & Wiring (meters)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="internal_wire_new">Internal Wire</Label>
                  <Input
                    id="internal_wire_new"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.internal_wire_new}
                    onChange={(e) => handleInputChange("internal_wire_new", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cat5_new">Cat 5</Label>
                  <Input
                    id="cat5_new"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cat5_new}
                    onChange={(e) => handleInputChange("cat5_new", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="casing_new">Casing</Label>
                  <Input
                    id="casing_new"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.casing_new}
                    onChange={(e) => handleInputChange("casing_new", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="conduit_new">Conduit</Label>
                  <Input
                    id="conduit_new"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.conduit_new}
                    onChange={(e) => handleInputChange("conduit_new", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Accessories & Ties */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-muted-foreground">Accessories & Ties</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="c_tie_new">C-tie</Label>
                  <Input
                    id="c_tie_new"
                    type="number"
                    min="0"
                    value={formData.c_tie_new}
                    onChange={(e) => handleInputChange("c_tie_new", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="c_clip_new">C-clip</Label>
                  <Input
                    id="c_clip_new"
                    type="number"
                    min="0"
                    value={formData.c_clip_new}
                    onChange={(e) => handleInputChange("c_clip_new", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="tag_tie_new">Tag tie (Default: 1)</Label>
                  <Input
                    id="tag_tie_new"
                    type="number"
                    min="0"
                    value={formData.tag_tie_new}
                    onChange={(e) => handleInputChange("tag_tie_new", Number.parseInt(e.target.value) || 1)}
                    className="bg-green-50 dark:bg-green-950"
                  />
                </div>
                <div>
                  <Label htmlFor="flexible_new">Flexible (Default: 2)</Label>
                  <Input
                    id="flexible_new"
                    type="number"
                    min="0"
                    value={formData.flexible_new}
                    onChange={(e) => handleInputChange("flexible_new", Number.parseInt(e.target.value) || 2)}
                    className="bg-green-50 dark:bg-green-950"
                  />
                </div>
              </div>
            </div>

            {/* Infrastructure */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-muted-foreground">Infrastructure</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="pole_67_new">Pole 6.7</Label>
                  <Input
                    id="pole_67_new"
                    type="number"
                    min="0"
                    value={formData.pole_67_new}
                    onChange={(e) => handleInputChange("pole_67_new", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="pole_new">Pole</Label>
                  <Input
                    id="pole_new"
                    type="number"
                    min="0"
                    value={formData.pole_new}
                    onChange={(e) => handleInputChange("pole_new", Number.parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Device Serials */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-muted-foreground">Device Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="ont_serial">ONT (Hexadecimal Serial)</Label>
                  <Input
                    id="ont_serial"
                    value={formData.ont_serial}
                    onChange={(e) => handleInputChange("ont_serial", e.target.value.toUpperCase())}
                    placeholder="e.g., 48575443A1B2C3D4"
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="voice_test_no_new">Voice Test No</Label>
                  <Input
                    id="voice_test_no_new"
                    value={formData.voice_test_no_new}
                    onChange={(e) => handleInputChange("voice_test_no_new", e.target.value)}
                    placeholder="Voice test number"
                  />
                </div>
                <div>
                  <Label htmlFor="stb_serial">STB (Hexadecimal Serial)</Label>
                  <Input
                    id="stb_serial"
                    value={formData.stb_serial}
                    onChange={(e) => handleInputChange("stb_serial", e.target.value.toUpperCase())}
                    placeholder="e.g., 12345ABCDEF67890"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !!dpValidationError}>
              {loading ? "Adding..." : "Add Telephone Line"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
