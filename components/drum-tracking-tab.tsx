"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Settings, Save, Package, TrendingDown, AlertTriangle } from "lucide-react"
import { useNotification } from "@/contexts/notification-context"
import { wastageConfigService, type WastageConfig, DEFAULT_WASTAGE_CONFIG } from "@/lib/wastage-config"

interface DrumTrackingTabProps {
  refreshTrigger?: number
}

export function DrumTrackingTab({ refreshTrigger }: DrumTrackingTabProps) {
  const [wastageConfig, setWastageConfig] = useState<WastageConfig>(DEFAULT_WASTAGE_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tempConfig, setTempConfig] = useState<WastageConfig>(DEFAULT_WASTAGE_CONFIG)
  const { addNotification } = useNotification()

  useEffect(() => {
    loadWastageConfig()
  }, [refreshTrigger])

  const loadWastageConfig = async () => {
    try {
      setLoading(true)
      const config = await wastageConfigService.getWastageConfig()
      setWastageConfig(config)
      setTempConfig(config)
    } catch (error) {
      console.error("Error loading wastage config:", error)
      addNotification({
        title: "Error",
        message: "Failed to load wastage configuration",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    try {
      setSaving(true)
      
      // Validate the configuration
      if (tempConfig.default_wastage_percentage < 0 || tempConfig.default_wastage_percentage > 50) {
        throw new Error("Default wastage percentage must be between 0% and 50%")
      }
      
      if (tempConfig.max_wastage_percentage < tempConfig.default_wastage_percentage) {
        throw new Error("Maximum wastage percentage must be greater than or equal to default percentage")
      }

      if (tempConfig.max_wastage_percentage > 100) {
        throw new Error("Maximum wastage percentage cannot exceed 100%")
      }

      const updatedConfig = await wastageConfigService.updateWastageConfig(tempConfig)
      setWastageConfig(updatedConfig)
      
      addNotification({
        title: "Success",
        message: "Wastage configuration updated successfully",
        type: "success",
      })
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message || "Failed to update wastage configuration",
        type: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setTempConfig(wastageConfig)
  }

  const hasChanges = () => {
    return (
      tempConfig.default_wastage_percentage !== wastageConfig.default_wastage_percentage ||
      tempConfig.max_wastage_percentage !== wastageConfig.max_wastage_percentage ||
      tempConfig.auto_calculate !== wastageConfig.auto_calculate
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Wastage Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Wastage Configuration
          </CardTitle>
          <CardDescription>
            Configure automatic wastage calculation for cable installations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Calculate Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Auto-calculate wastage</Label>
              <p className="text-sm text-muted-foreground">
                Automatically calculate wastage based on total cable length
              </p>
            </div>
            <Switch
              checked={tempConfig.auto_calculate}
              onCheckedChange={(checked) =>
                setTempConfig(prev => ({ ...prev, auto_calculate: checked }))
              }
            />
          </div>

          <Separator />

          {/* Percentage Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="default_percentage">Default Wastage Percentage</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="default_percentage"
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={tempConfig.default_wastage_percentage}
                  onChange={(e) =>
                    setTempConfig(prev => ({
                      ...prev,
                      default_wastage_percentage: Number.parseFloat(e.target.value) || 0
                    }))
                  }
                  disabled={!tempConfig.auto_calculate}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Default percentage applied to all new installations
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_percentage">Maximum Wastage Percentage</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="max_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={tempConfig.max_wastage_percentage}
                  onChange={(e) =>
                    setTempConfig(prev => ({
                      ...prev,
                      max_wastage_percentage: Number.parseFloat(e.target.value) || 0
                    }))
                  }
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum allowable wastage before warning
              </p>
            </div>
          </div>

          {/* Example Calculation */}
          {tempConfig.auto_calculate && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Example Calculation
              </h4>
              <div className="text-sm space-y-1">
                <p>For a 100m cable installation:</p>
                <p>• Wastage: {wastageConfigService.calculateWastage(100, tempConfig).toFixed(2)}m ({tempConfig.default_wastage_percentage}%)</p>
                <p>• Total usage: {(100 + wastageConfigService.calculateWastage(100, tempConfig)).toFixed(2)}m</p>
              </div>
            </div>
          )}

          {/* Validation Warning */}
          {tempConfig.default_wastage_percentage > tempConfig.max_wastage_percentage && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Default percentage cannot exceed maximum percentage</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2">
            {hasChanges() && (
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            )}
            <Button 
              onClick={handleSaveConfig} 
              disabled={saving || !hasChanges() || tempConfig.default_wastage_percentage > tempConfig.max_wastage_percentage}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Configuration Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Current Drum Tracking Settings
          </CardTitle>
          <CardDescription>
            Active configuration for cable drum tracking and wastage calculation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {wastageConfig.auto_calculate ? "ON" : "OFF"}
              </div>
              <div className="text-sm text-muted-foreground">Auto Calculation</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {wastageConfig.default_wastage_percentage}%
              </div>
              <div className="text-sm text-muted-foreground">Default Wastage</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {wastageConfig.max_wastage_percentage}%
              </div>
              <div className="text-sm text-muted-foreground">Maximum Allowed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drum Tracking Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Cable Drum Inventory</CardTitle>
          <CardDescription>Track cable drum quantities and usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Drum inventory table will be implemented here</p>
            <p className="text-sm">Features: Real-time quantities, usage tracking, automatic updates</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}