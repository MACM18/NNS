"use client"

import type React from "react"

import { useState } from "react"
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
import { getSupabaseClient } from "@/lib/supabase"
import { useNotification } from "@/contexts/notification-context"

interface AddLineDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddLineDetailsModal({ open, onOpenChange, onSuccess }: AddLineDetailsModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    telephone_no: "",
    dp: "",
    ont: "",
    voice_test_number: "",
    stb: "",
    drum_number: "",
    date: new Date().toISOString().split("T")[0],
    // Material quantities
    c_hook: 0,
    l_hook: 0,
    retainers: 0,
    nut_bolt: 0,
    u_clip: 0,
    concrete_nail: 0,
    roll_plug: 0,
    screw_nail: 0,
    socket: 0,
    bend: 0,
    rj11: 0,
    rj12: 0,
    rj45: 0,
    fiber_rosette: 0,
    s_rosette: 0,
    fac: 0,
    // Measurements
    power_dp: 0,
    power_inbox: 0,
    cable_start: 0,
    cable_middle: 0,
    cable_end: 0,
    total_cable: 0,
    wastage: 0,
    internal_wire: 0,
    casing: 0,
    conduit: 0,
    cat5: 0,
    c_tie: 0,
    c_clip: 0,
    tag_tie: 0,
    flexible: 0,
    pole: 0,
    pole_67: 0,
    top_bolt: 0,
    f1: 0,
    g1: 0,
  })

  const supabase = getSupabaseClient()
  const { addNotification } = useNotification()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from("line_details").insert([formData])

      if (error) throw error

      addNotification({
        title: "Success",
        message: "Line details added successfully",
        type: "success",
      })

      onSuccess()
      onOpenChange(false)

      // Reset form
      setFormData({
        name: "",
        address: "",
        telephone_no: "",
        dp: "",
        ont: "",
        voice_test_number: "",
        stb: "",
        drum_number: "",
        date: new Date().toISOString().split("T")[0],
        c_hook: 0,
        l_hook: 0,
        retainers: 0,
        nut_bolt: 0,
        u_clip: 0,
        concrete_nail: 0,
        roll_plug: 0,
        screw_nail: 0,
        socket: 0,
        bend: 0,
        rj11: 0,
        rj12: 0,
        rj45: 0,
        fiber_rosette: 0,
        s_rosette: 0,
        fac: 0,
        power_dp: 0,
        power_inbox: 0,
        cable_start: 0,
        cable_middle: 0,
        cable_end: 0,
        total_cable: 0,
        wastage: 0,
        internal_wire: 0,
        casing: 0,
        conduit: 0,
        cat5: 0,
        c_tie: 0,
        c_clip: 0,
        tag_tie: 0,
        flexible: 0,
        pole: 0,
        pole_67: 0,
        top_bolt: 0,
        f1: 0,
        g1: 0,
      })
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

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Line Details</DialogTitle>
          <DialogDescription>Enter the details for a new telecom line installation.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Customer Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="telephone_no">Telephone Number</Label>
                <Input
                  id="telephone_no"
                  value={formData.telephone_no}
                  onChange={(e) => handleInputChange("telephone_no", e.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  required
                />
              </div>
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
                <Label htmlFor="dp">DP</Label>
                <Input id="dp" value={formData.dp} onChange={(e) => handleInputChange("dp", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Technical Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="ont">ONT</Label>
                <Input id="ont" value={formData.ont} onChange={(e) => handleInputChange("ont", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="voice_test_number">Voice Test Number</Label>
                <Input
                  id="voice_test_number"
                  value={formData.voice_test_number}
                  onChange={(e) => handleInputChange("voice_test_number", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="stb">STB</Label>
                <Input id="stb" value={formData.stb} onChange={(e) => handleInputChange("stb", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="drum_number">Drum Number</Label>
                <Input
                  id="drum_number"
                  value={formData.drum_number}
                  onChange={(e) => handleInputChange("drum_number", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Materials Used */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Materials Used</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: "c_hook", label: "C Hook" },
                { key: "l_hook", label: "L Hook" },
                { key: "retainers", label: "Retainers" },
                { key: "nut_bolt", label: "Nut & Bolt" },
                { key: "u_clip", label: "U Clip" },
                { key: "concrete_nail", label: "Concrete Nail" },
                { key: "roll_plug", label: "Roll Plug" },
                { key: "screw_nail", label: "Screw Nail" },
                { key: "socket", label: "Socket" },
                { key: "bend", label: "Bend" },
                { key: "rj11", label: "RJ11" },
                { key: "rj12", label: "RJ12" },
                { key: "rj45", label: "RJ45" },
                { key: "fiber_rosette", label: "Fiber Rosette" },
                { key: "s_rosette", label: "S Rosette" },
                { key: "fac", label: "FAC" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    type="number"
                    min="0"
                    value={formData[key as keyof typeof formData]}
                    onChange={(e) => handleInputChange(key, Number.parseInt(e.target.value) || 0)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Measurements */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Measurements</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: "power_dp", label: "Power DP" },
                { key: "power_inbox", label: "Power Inbox" },
                { key: "cable_start", label: "Cable Start" },
                { key: "cable_middle", label: "Cable Middle" },
                { key: "cable_end", label: "Cable End" },
                { key: "total_cable", label: "Total Cable" },
                { key: "wastage", label: "Wastage" },
                { key: "internal_wire", label: "Internal Wire" },
                { key: "casing", label: "Casing" },
                { key: "conduit", label: "Conduit" },
                { key: "cat5", label: "CAT5" },
                { key: "pole", label: "Pole" },
                { key: "pole_67", label: "Pole 6.7m" },
                { key: "f1", label: "F1" },
                { key: "g1", label: "G1" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData[key as keyof typeof formData]}
                    onChange={(e) => handleInputChange(key, Number.parseFloat(e.target.value) || 0)}
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Line Details"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
