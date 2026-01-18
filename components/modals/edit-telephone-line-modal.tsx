"use client";

import React, { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { AddDrumModal } from "@/components/modals/add-drum-modal";

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
  // Material fields (optional as they might not be in the initial prop)
  [key: string]: any;
}

interface Drum {
  id: string;
  drum_number: string;
  current_quantity: number;
  status: "active" | "inactive" | "empty" | "damaged";
  item_name?: string;
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
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [drums, setDrums] = useState<Drum[]>([]);
  const [isAddDrumOpen, setIsAddDrumOpen] = useState(false);

  // Combine all data into one state object
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (isOpen && line) {
      // Initialize with prop data first
      setFormData({
        ...line,
        // Ensure defaults for materials if not present
        retainers: line.retainers || 0,
        l_hook: line.l_hook || 0,
        top_bolt: line.top_bolt || 0,
        c_hook: line.c_hook || 0,
        fiber_rosette: line.fiber_rosette || 0,
        internal_wire: line.internal_wire || 0,
        s_rosette: line.s_rosette || 0,
        fac: line.fac || 2, // Default from schema
        casing: line.casing || 0,
        c_tie: line.c_tie || 0,
        c_clip: line.c_clip || 0,
        conduit: line.conduit || 0,
        tag_tie: line.tag_tie || 1, // Default from schema
        flexible: line.flexible || 2, // Default from schema
        rj45: line.rj45 || 0,
        cat5: line.cat5 || 0,
        pole_67: line.pole_67 || 0,
        pole: line.pole || 0,
        concrete_nail: line.concrete_nail || 0,
        roll_plug: line.roll_plug || 0,
        u_clip: line.u_clip || 0,
        socket: line.socket || 0,
        bend: line.bend || 0,
        rj11: line.rj11 || 0,
        rj12: line.rj12 || 0,
        nut_bolt: line.nut_bolt || 0,
        screw_nail: line.screw_nail || 0,
      });

      fetchFullLineDetails(line.id);
      fetchDrums();
    }
  }, [isOpen, line]);

  const fetchFullLineDetails = async (id: string) => {
    try {
      // 1. Fetch Line Details (Materials etc)
      const lineRes = await fetch(`/api/lines/${id}`);
      const lineData = await lineRes.json();

      // 2. Fetch Usage Details (Drum ID)
      const usageRes = await fetch(`/api/lines/${id}/usage`);
      const usageData = await usageRes.json();

      if (lineData.data) {
        // Merge data carefully
        setFormData((prev: any) => ({
          ...prev,
          ...lineData.data, // This generally has snake_case fields as verified in API
          // If usage exists, prefer it for drum_id and cable_used
          drum_id: usageData.data?.drum_id || prev.drum_id || (lineData.data.drum_number ? 'none' : ''), // Fallback if needed
          cable_used: usageData.data?.quantity_used ?? prev.cable_used ?? 0,
        }));

        // If API returned drum_number but not drum_id (because usages table was empty),
        // we might not know the ID. The `update-with-usage` API needs ID.
        // However, if usage is empty, then `create-with-usage` or `update-with-usage` will create it.
        // If we have a `drum_number` string but no `drum_id`, it might be tricky.
        // But usually lines are linked via `DrumUsage`. If `DrumUsage` is missing, then it's not linked properly.
        // We will rely on user selecting a drum if it's missing.
      }
    } catch (error) {
      console.error("Error fetching line details:", error);
    }
  };

  const fetchDrums = async () => {
    try {
      const res = await fetch(`/api/drums?status=active&all=true`);
      if (!res.ok) throw new Error("Failed to fetch drums");
      const json = await res.json();
      setDrums(json.data || []);
    } catch (error) {
      console.error("Error fetching drums:", error);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!line) return;
    setIsLoading(true);

    try {
      // 1. Update General Line Details (Materials)
      const updateRes = await fetch(`/api/lines/${line.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!updateRes.ok) throw new Error("Failed to update line details");

      // 2. Update Drum Usage (if relevant)
      // Call if drum_id or cable_used is involved
      const usageRes = await fetch(`/api/lines/${line.id}/update-with-usage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drum_id: formData.drum_id || null,
          cable_used: formData.cable_used || 0,
        }),
      });

      if (!usageRes.ok) throw new Error("Failed to update drum usage");

      toast({
        title: "Success",
        description: "Line details updated successfully",
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating line:", error);
      toast({
        title: "Error",
        description: "Failed to update line",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to render integer inputs
  const renderNumberInput = (label: string, field: string) => (
    <div className="space-y-2">
      <Label htmlFor={field}>{label}</Label>
      <Input
        id={field}
        type="number"
        min="0"
        value={formData[field]}
        onChange={(e) => handleChange(field, Number(e.target.value))}
      />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Line Details: {formData.telephone_no || formData.line_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center pr-1">
              <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                <TabsTrigger value="details">Line Details</TabsTrigger>
                <TabsTrigger value="materials">Materials</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 px-1 pr-2">
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="line_number">Line Number</Label>
                    <Input
                      id="line_number"
                      value={formData.telephone_no || formData.line_number || ""}
                      onChange={(e) => handleChange("telephone_no", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(val) => handleChange("status", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Customer Name</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name || formData.name || ""}
                      onChange={(e) => handleChange("customer_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_address">Address</Label>
                    <Input
                      id="customer_address"
                      value={formData.customer_address || formData.address || ""}
                      onChange={(e) => handleChange("customer_address", e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="space-y-2 flex-1">
                      <Label htmlFor="drum_id">Drum</Label>
                      <Select
                        value={formData.drum_id?.toString() || "none"}
                        onValueChange={(val) => handleChange("drum_id", val === "none" ? "" : val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select drum" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Drum</SelectItem>
                          {drums.map((drum) => (
                            <SelectItem key={drum.id} value={drum.id}>
                              {drum.drum_number} ({drum.current_quantity}m)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setIsAddDrumOpen(true)}
                      title="Add New Drum"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cable_used">Cable Used (meters)</Label>
                    <Input
                      id="cable_used"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.cable_used}
                      onChange={(e) => handleChange("cable_used", parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly_fee">Monthly Fee</Label>
                    <Input
                      id="monthly_fee"
                      type="number"
                      value={formData.monthly_fee}
                      onChange={(e) => handleChange("monthly_fee", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="completed_date">Completed Date</Label>
                    <Input
                      id="completed_date"
                      type="date"
                      value={formData.completed_date ? new Date(formData.completed_date).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleChange("completed_date", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ""}
                    onChange={(e) => handleChange("notes", e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="materials">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                  {/* Accessories */}
                  <div className="col-span-full font-semibold border-b pb-2 mt-2">Accessories</div>
                  {renderNumberInput("Retainers", "retainers")}
                  {renderNumberInput("L Hooks", "l_hook")}
                  {renderNumberInput("C Hooks", "c_hook")}
                  {renderNumberInput("Top Bolts", "top_bolt")}
                  {renderNumberInput("Nut & Bolts", "nut_bolt")}
                  {renderNumberInput("Concrete Nails", "concrete_nail")}
                  {renderNumberInput("Screw Nails", "screw_nail")}

                  {/* Connectors & Rosettes */}
                  <div className="col-span-full font-semibold border-b pb-2 mt-2">Connectors</div>
                  {renderNumberInput("Fiber Rosette", "fiber_rosette")}
                  {renderNumberInput("S Rosette", "s_rosette")}
                  {renderNumberInput("RJ45", "rj45")}
                  {renderNumberInput("RJ11", "rj11")}
                  {renderNumberInput("RJ12", "rj12")}
                  {renderNumberInput("FAC", "fac")}
                  {renderNumberInput("Socket", "socket")}

                  {/* Cabling Supports */}
                  <div className="col-span-full font-semibold border-b pb-2 mt-2">Supports</div>
                  {renderNumberInput("C Ties", "c_tie")}
                  {renderNumberInput("Tag Ties", "tag_tie")}
                  {renderNumberInput("C Clips", "c_clip")}
                  {renderNumberInput("U Clips", "u_clip")}
                  {renderNumberInput("Roll Plugs", "roll_plug")}

                  {/* Pipes & Poles */}
                  <div className="col-span-full font-semibold border-b pb-2 mt-2">Infrastructure</div>
                  {renderNumberInput("Poles", "pole")}
                  {renderNumberInput("Poles (6-7m)", "pole_67")}
                  {renderNumberInput("Flexible Hose (m)", "flexible")}
                  {renderNumberInput("Conduit (m)", "conduit")}
                  {renderNumberInput("Casing (m)", "casing")}
                  {renderNumberInput("Bends", "bend")}

                  {/* Wires */}
                  <div className="col-span-full font-semibold border-b pb-2 mt-2">Extra Wire (meters)</div>
                  {renderNumberInput("Internal Wire", "internal_wire")}
                  {renderNumberInput("CAT5 Cable", "cat5")}
                </div>
              </TabsContent>
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </Tabs>
        </form>
      </DialogContent>
      <AddDrumModal isOpen={isAddDrumOpen} onClose={() => setIsAddDrumOpen(false)} onSuccess={() => { fetchDrums(); setIsAddDrumOpen(false); }} />
    </Dialog>
  );
}
