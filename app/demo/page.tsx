"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Calculator, Package, Settings } from "lucide-react"
import {
  getWastageCalculation,
  formatWastagePercentage,
  formatWastageAmount,
  DEFAULT_WASTAGE_PERCENTAGE,
  MAX_WASTAGE_PERCENTAGE,
  type WastageSettings
} from "@/lib/wastage-utils"

export default function WastageDemo() {
  const [totalCable, setTotalCable] = useState("100")
  const [manualWastage, setManualWastage] = useState("")
  const [isManual, setIsManual] = useState(false)
  const [wastagePercentage, setWastagePercentage] = useState(DEFAULT_WASTAGE_PERCENTAGE * 100)
  
  const wastageSettings: WastageSettings = {
    default_wastage_percentage: wastagePercentage / 100,
    max_wastage_percentage: MAX_WASTAGE_PERCENTAGE,
    auto_calculate_enabled: true
  }

  const calculation = getWastageCalculation({
    totalCableLength: Number.parseFloat(totalCable) || 0,
    customWastagePercentage: wastageSettings.default_wastage_percentage,
    manualWastage: isManual ? (Number.parseFloat(manualWastage) || 0) : undefined
  })

  const handleAutoCalculate = () => {
    setManualWastage(calculation.autoWastage.toString())
    setIsManual(false)
  }

  const handleManualChange = (value: string) => {
    setManualWastage(value)
    setIsManual(true)
  }

  // Mock drum data for demonstration
  const mockDrums = [
    {
      id: "1",
      drum_number: "DRUM-001",
      initial_quantity: 2000,
      current_quantity: 1750,
      total_used: 250,
      total_wastage: 12.5,
      wastage_percentage: 5.0,
      status: "active"
    },
    {
      id: "2", 
      drum_number: "DRUM-002",
      initial_quantity: 2000,
      current_quantity: 1200,
      total_used: 800,
      total_wastage: 45.0,
      wastage_percentage: 5.6,
      status: "active"
    },
    {
      id: "3",
      drum_number: "DRUM-003", 
      initial_quantity: 2000,
      current_quantity: 1500,
      total_used: 500,
      total_wastage: 125.0,
      wastage_percentage: 25.0,
      status: "active"
    }
  ]

  const getStatusBadge = (status: string) => {
    return <Badge variant="default">Active</Badge>
  }

  const getWastageStatus = (percentage: number) => {
    if (percentage > MAX_WASTAGE_PERCENTAGE * 100) {
      return { color: "text-red-600", icon: <AlertTriangle className="h-4 w-4" /> }
    }
    if (percentage > (MAX_WASTAGE_PERCENTAGE * 100) * 0.75) {
      return { color: "text-orange-600", icon: <AlertTriangle className="h-4 w-4" /> }
    }
    return { color: "text-green-600", icon: null }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Wire Wastage Calculation System Demo</h1>
        <p className="text-muted-foreground mt-2">
          Demonstration of automated wastage calculation with configurable settings
        </p>
      </div>

      {/* Wastage Calculator Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Wastage Calculator
          </CardTitle>
          <CardDescription>
            Configure cable measurements and see automatic wastage calculation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="total_cable">Total Cable Length (m)</Label>
              <Input
                id="total_cable"
                type="number"
                value={totalCable}
                onChange={(e) => setTotalCable(e.target.value)}
                placeholder="100"
              />
            </div>
            <div>
              <Label htmlFor="wastage_percentage">Default Wastage %</Label>
              <Input
                id="wastage_percentage"
                type="number"
                step="0.1"
                value={wastagePercentage}
                onChange={(e) => setWastagePercentage(Number.parseFloat(e.target.value) || 5)}
                placeholder="5.0"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="manual_wastage">Wastage Amount (m)</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAutoCalculate}
                  className="h-6 text-xs gap-1"
                >
                  <Calculator className="h-3 w-3" />
                  Auto ({formatWastagePercentage(wastageSettings.default_wastage_percentage)})
                </Button>
              </div>
              <Input
                id="manual_wastage"
                type="number"
                step="0.01"
                value={manualWastage}
                onChange={(e) => handleManualChange(e.target.value)}
                placeholder="Auto-calculated"
                className={isManual ? "border-orange-200 bg-orange-50" : ""}
              />
              {manualWastage && totalCable && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {((Number.parseFloat(manualWastage) / Number.parseFloat(totalCable)) * 100).toFixed(1)}% of total cable
                  {isManual && <span className="text-orange-600 ml-1">(Manual override)</span>}
                </div>
              )}
            </div>
          </div>

          {/* Calculation Results */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Calculation Results</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Auto Wastage</div>
                <div className="font-medium text-blue-600">{formatWastageAmount(calculation.autoWastage)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Final Wastage</div>
                <div className="font-medium text-green-600">{formatWastageAmount(calculation.finalWastage)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Percentage</div>
                <div className="font-medium">{calculation.validation.wastagePercentage.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">Status</div>
                <div className={`font-medium ${calculation.validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                  {calculation.validation.isValid ? 'Valid' : 'Invalid'}
                </div>
              </div>
            </div>
            
            {!calculation.validation.isValid && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {calculation.validation.message}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Drum Tracking Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Drum Tracking & Wastage Management
          </CardTitle>
          <CardDescription>
            Monitor cable drum usage and manage wastage calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Drum Number</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Initial (m)</th>
                  <th className="text-right p-2">Current (m)</th>
                  <th className="text-right p-2">Used (m)</th>
                  <th className="text-right p-2">Wastage (m)</th>
                  <th className="text-right p-2">Wastage %</th>
                </tr>
              </thead>
              <tbody>
                {mockDrums.map((drum) => {
                  const wastageStatus = getWastageStatus(drum.wastage_percentage)
                  return (
                    <tr key={drum.id} className="border-b">
                      <td className="p-2 font-medium">{drum.drum_number}</td>
                      <td className="p-2">{getStatusBadge(drum.status)}</td>
                      <td className="p-2 text-right">{drum.initial_quantity.toFixed(2)}</td>
                      <td className="p-2 text-right">{drum.current_quantity.toFixed(2)}</td>
                      <td className="p-2 text-right">{drum.total_used.toFixed(2)}</td>
                      <td className="p-2 text-right">
                        <span className={wastageStatus.color}>
                          {drum.total_wastage.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <div className={`flex items-center justify-end gap-1 ${wastageStatus.color}`}>
                          {wastageStatus.icon}
                          {drum.wastage_percentage.toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Normal (≤15%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Warning (15-20%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Exceeded (>20%)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">✅ Automated Calculation</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Configurable default wastage percentage</li>
                <li>• Real-time calculation based on cable length</li>
                <li>• Business rule validation (20% max)</li>
                <li>• Auto-suggestion in telephone line forms</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">✅ Manual Override</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Editable wastage values in drum tracking</li>
                <li>• Visual indicators for manual changes</li>
                <li>• Validation warnings for excessive waste</li>
                <li>• Settings panel for configuration</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}