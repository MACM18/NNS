"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Package, Edit, AlertTriangle, Calculator, Settings } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { useNotification } from "@/contexts/notification-context"
import {
  getWastageCalculation,
  getWastageSettings,
  updateWastageSettings,
  formatWastagePercentage,
  formatWastageAmount,
  validateWastage,
  type WastageSettings
} from "@/lib/wastage-utils"

interface DrumTrackingData {
  id: string
  drum_number: string
  initial_quantity: number
  current_quantity: number
  status: string
  usage_data?: DrumUsageData[]
  total_used: number
  total_wastage: number
  wastage_percentage: number
}

interface DrumUsageData {
  id: string
  quantity_used: number
  usage_date: string
  line_details: {
    phone_number: string
    name: string
    wastage_input: number
  }
}

interface DrumTrackingTableProps {
  onRefresh?: () => void
}

export function DrumTrackingTable({ onRefresh }: DrumTrackingTableProps) {
  const [drums, setDrums] = useState<DrumTrackingData[]>([])
  const [loading, setLoading] = useState(true)
  const [editingWastage, setEditingWastage] = useState<{
    drumId: string
    usageId: string
    currentWastage: number
    totalCable: number
  } | null>(null)
  const [newWastage, setNewWastage] = useState("")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [wastageSettings, setWastageSettings] = useState<WastageSettings | null>(null)
  const [settingsForm, setSettingsForm] = useState({
    default_wastage_percentage: 5,
    max_wastage_percentage: 20,
    auto_calculate_enabled: true
  })

  const supabase = getSupabaseClient()
  const { addNotification } = useNotification()

  useEffect(() => {
    fetchDrumData()
    fetchWastageSettings()
  }, [])

  const fetchWastageSettings = async () => {
    try {
      const settings = await getWastageSettings()
      setWastageSettings(settings)
      setSettingsForm({
        default_wastage_percentage: (settings.default_wastage_percentage || 0.05) * 100,
        max_wastage_percentage: (settings.max_wastage_percentage || 0.20) * 100,
        auto_calculate_enabled: settings.auto_calculate_enabled ?? true
      })
    } catch (error) {
      console.error("Error fetching wastage settings:", error)
    }
  }

  const fetchDrumData = async () => {
    try {
      setLoading(true)
      
      // Fetch drums with their usage data
      const { data: drums, error: drumsError } = await supabase
        .from("drum_tracking")
        .select(`
          id,
          drum_number,
          initial_quantity,
          current_quantity,
          status,
          drum_usage (
            id,
            quantity_used,
            usage_date,
            line_details (
              phone_number,
              name,
              wastage_input
            )
          )
        `)
        .order("drum_number")

      if (drumsError) throw drumsError

      // Process the data to calculate totals and wastage
      const processedDrums: DrumTrackingData[] = drums?.map((drum) => {
        const usageData = drum.drum_usage || []
        const totalUsed = usageData.reduce((sum, usage) => sum + usage.quantity_used, 0)
        const totalWastage = usageData.reduce((sum, usage) => 
          sum + (usage.line_details?.wastage_input || 0), 0)
        const wastagePercentage = totalUsed > 0 ? (totalWastage / totalUsed) * 100 : 0

        return {
          id: drum.id,
          drum_number: drum.drum_number,
          initial_quantity: drum.initial_quantity,
          current_quantity: drum.current_quantity,
          status: drum.status,
          usage_data: usageData,
          total_used: totalUsed,
          total_wastage: totalWastage,
          wastage_percentage: wastagePercentage
        }
      }) || []

      setDrums(processedDrums)
    } catch (error) {
      console.error("Error fetching drum data:", error)
      addNotification({
        title: "Error",
        message: "Failed to fetch drum tracking data",
        type: "error"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditWastage = (drumId: string, usageId: string, currentWastage: number, totalCable: number) => {
    setEditingWastage({ drumId, usageId, currentWastage, totalCable })
    setNewWastage(currentWastage.toString())
  }

  const handleUpdateWastage = async () => {
    if (!editingWastage) return

    try {
      const wastageValue = Number.parseFloat(newWastage) || 0
      const validation = validateWastage(editingWastage.totalCable, wastageValue)

      if (!validation.isValid) {
        addNotification({
          title: "Validation Error",
          message: validation.message || "Invalid wastage value",
          type: "error"
        })
        return
      }

      // Update the wastage in line_details
      const { error } = await supabase
        .from("line_details")
        .update({ wastage_input: wastageValue })
        .eq("id", editingWastage.usageId)

      if (error) throw error

      addNotification({
        title: "Success",
        message: "Wastage updated successfully",
        type: "success"
      })

      setEditingWastage(null)
      setNewWastage("")
      fetchDrumData()
      onRefresh?.()
    } catch (error) {
      console.error("Error updating wastage:", error)
      addNotification({
        title: "Error",
        message: "Failed to update wastage",
        type: "error"
      })
    }
  }

  const handleUpdateSettings = async () => {
    try {
      const success = await updateWastageSettings({
        default_wastage_percentage: settingsForm.default_wastage_percentage / 100,
        max_wastage_percentage: settingsForm.max_wastage_percentage / 100,
        auto_calculate_enabled: settingsForm.auto_calculate_enabled
      })

      if (success) {
        addNotification({
          title: "Success",
          message: "Wastage settings updated successfully",
          type: "success"
        })
        setSettingsOpen(false)
        fetchWastageSettings()
      } else {
        throw new Error("Failed to update settings")
      }
    } catch (error) {
      addNotification({
        title: "Error",
        message: "Failed to update wastage settings",
        type: "error"
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default" as const, label: "Active" },
      empty: { variant: "secondary" as const, label: "Empty" },
      retired: { variant: "outline" as const, label: "Retired" }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getWastageStatus = (percentage: number) => {
    if (percentage > (wastageSettings?.max_wastage_percentage || 0.20) * 100) {
      return { color: "text-red-600", icon: <AlertTriangle className="h-4 w-4" /> }
    }
    if (percentage > ((wastageSettings?.max_wastage_percentage || 0.20) * 100) * 0.75) {
      return { color: "text-orange-600", icon: <AlertTriangle className="h-4 w-4" /> }
    }
    return { color: "text-green-600", icon: null }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Drum Tracking & Wastage Management
              </CardTitle>
              <CardDescription>
                Monitor cable drum usage and manage wastage calculations
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDrumData}
                className="gap-2"
              >
                <Package className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {drums.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No drum tracking data available</p>
              <p className="text-sm">Drums will appear here once cable usage is recorded</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drum Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Initial (m)</TableHead>
                    <TableHead className="text-right">Current (m)</TableHead>
                    <TableHead className="text-right">Used (m)</TableHead>
                    <TableHead className="text-right">Wastage (m)</TableHead>
                    <TableHead className="text-right">Wastage %</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drums.map((drum) => {
                    const wastageStatus = getWastageStatus(drum.wastage_percentage)
                    return (
                      <TableRow key={drum.id}>
                        <TableCell className="font-medium">{drum.drum_number}</TableCell>
                        <TableCell>{getStatusBadge(drum.status)}</TableCell>
                        <TableCell className="text-right">{drum.initial_quantity.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{drum.current_quantity.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{drum.total_used.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <span className={wastageStatus.color}>
                            {drum.total_wastage.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`flex items-center justify-end gap-1 ${wastageStatus.color}`}>
                            {wastageStatus.icon}
                            {drum.wastage_percentage.toFixed(1)}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {drum.usage_data?.map((usage) => (
                              <Button
                                key={usage.id}
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditWastage(
                                  drum.id,
                                  usage.id,
                                  usage.line_details?.wastage_input || 0,
                                  usage.quantity_used
                                )}
                                className="h-8 w-8 p-0"
                                title={`Edit wastage for ${usage.line_details?.phone_number}`}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Wastage Modal */}
      <Dialog open={!!editingWastage} onOpenChange={() => setEditingWastage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Wastage Amount</DialogTitle>
            <DialogDescription>
              Adjust the wastage amount for this cable installation
            </DialogDescription>
          </DialogHeader>
          
          {editingWastage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Total Cable Used</Label>
                  <div className="font-medium">{editingWastage.totalCable.toFixed(2)}m</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Current Wastage</Label>
                  <div className="font-medium">{editingWastage.currentWastage.toFixed(2)}m</div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="new_wastage">New Wastage Amount (m)</Label>
                <Input
                  id="new_wastage"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newWastage}
                  onChange={(e) => setNewWastage(e.target.value)}
                  placeholder="Enter wastage amount"
                />
              </div>
              
              {newWastage && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Calculator className="h-4 w-4" />
                    <span>Wastage Percentage: </span>
                    <span className="font-medium">
                      {((Number.parseFloat(newWastage) / editingWastage.totalCable) * 100).toFixed(1)}%
                    </span>
                  </div>
                  {Number.parseFloat(newWastage) / editingWastage.totalCable > 0.20 && (
                    <div className="text-red-600 text-sm mt-1">
                      ⚠️ Exceeds maximum allowed wastage of 20%
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWastage(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateWastage}>
              Update Wastage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wastage Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wastage Calculation Settings</DialogTitle>
            <DialogDescription>
              Configure automatic wastage calculation parameters
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="default_wastage">Default Wastage Percentage (%)</Label>
              <Input
                id="default_wastage"
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={settingsForm.default_wastage_percentage}
                onChange={(e) => setSettingsForm(prev => ({
                  ...prev,
                  default_wastage_percentage: Number.parseFloat(e.target.value) || 0
                }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for automatic wastage calculation in new installations
              </p>
            </div>
            
            <div>
              <Label htmlFor="max_wastage">Maximum Allowed Wastage (%)</Label>
              <Input
                id="max_wastage"
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={settingsForm.max_wastage_percentage}
                onChange={(e) => setSettingsForm(prev => ({
                  ...prev,
                  max_wastage_percentage: Number.parseFloat(e.target.value) || 0
                }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum wastage percentage before validation error
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto_calculate"
                checked={settingsForm.auto_calculate_enabled}
                onChange={(e) => setSettingsForm(prev => ({
                  ...prev,
                  auto_calculate_enabled: e.target.checked
                }))}
                className="rounded"
              />
              <Label htmlFor="auto_calculate">Enable Automatic Wastage Calculation</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSettings}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}