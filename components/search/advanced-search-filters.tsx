"use client"

import { useState } from "react"
import { Filter, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"

export interface SearchFilters {
  query: string
  dateRange?: {
    from: Date
    to: Date
  }
  categories: string[]
  status?: string
  lineStatus?: string
  taskStatus?: string
  invoiceType?: string
  inventoryLowStock?: boolean
  amountRange?: {
    min: number
    max: number
  }
  lengthRange?: {
    min: number
    max: number
  }
}

interface AdvancedSearchFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  onSearch: () => void
  onClear: () => void
  isSearching?: boolean
}

export function AdvancedSearchFilters({
  filters,
  onFiltersChange,
  onSearch,
  onClear,
  isSearching = false,
}: AdvancedSearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const updateFilters = (updates: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category]
    updateFilters({ categories: newCategories })
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.dateRange) count++
    if (filters.status) count++
    if (filters.lineStatus) count++
    if (filters.taskStatus) count++
    if (filters.invoiceType) count++
    if (filters.inventoryLowStock) count++
    if (filters.amountRange) count++
    if (filters.lengthRange) count++
    return count
  }

  const clearAllFilters = () => {
    onFiltersChange({
      query: "",
      categories: ["line", "task", "invoice", "inventory"],
    })
    onClear()
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Search
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFiltersCount()} active
              </Badge>
            )}
          </CardTitle>
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Query */}
        <div className="space-y-2">
          <Label htmlFor="search-query">Search Query</Label>
          <Input
            id="search-query"
            placeholder="Enter search terms..."
            value={filters.query}
            onChange={(e) => updateFilters({ query: e.target.value })}
          />
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <Label>Search Categories</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "line", label: "Lines", icon: "📞" },
              { value: "task", label: "Tasks", icon: "📋" },
              { value: "invoice", label: "Invoices", icon: "💰" },
              { value: "inventory", label: "Inventory", icon: "📦" },
            ].map((category) => (
              <div key={category.value} className="flex items-center space-x-2">
                <Checkbox
                  id={category.value}
                  checked={filters.categories.includes(category.value)}
                  onCheckedChange={() => toggleCategory(category.value)}
                />
                <Label htmlFor={category.value} className="flex items-center gap-1 cursor-pointer">
                  <span>{category.icon}</span>
                  {category.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="space-y-4">
            <Separator />

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <DateRangePicker date={filters.dateRange} onDateChange={(dateRange) => updateFilters({ dateRange })} />
            </div>

            {/* Line-specific filters */}
            {filters.categories.includes("line") && (
              <div className="space-y-2">
                <Label>Line Status</Label>
                <Select value={filters.lineStatus} onValueChange={(value) => updateFilters({ lineStatus: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select line status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Lines</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Task-specific filters */}
            {filters.categories.includes("task") && (
              <div className="space-y-2">
                <Label>Task Status</Label>
                <Select value={filters.taskStatus} onValueChange={(value) => updateFilters({ taskStatus: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select task status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Invoice-specific filters */}
            {filters.categories.includes("invoice") && (
              <div className="space-y-2">
                <Label>Invoice Type</Label>
                <Select value={filters.invoiceType} onValueChange={(value) => updateFilters({ invoiceType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Inventory-specific filters */}
            {filters.categories.includes("inventory") && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="low-stock"
                    checked={filters.inventoryLowStock || false}
                    onCheckedChange={(checked) => updateFilters({ inventoryLowStock: checked as boolean })}
                  />
                  <Label htmlFor="low-stock">Show only low stock items</Label>
                </div>
              </div>
            )}

            {/* Amount Range (for invoices) */}
            {filters.categories.includes("invoice") && (
              <div className="space-y-2">
                <Label>Amount Range (LKR)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min amount"
                    value={filters.amountRange?.min || ""}
                    onChange={(e) =>
                      updateFilters({
                        amountRange: {
                          min: Number(e.target.value),
                          max: filters.amountRange?.max || 0,
                        },
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max amount"
                    value={filters.amountRange?.max || ""}
                    onChange={(e) =>
                      updateFilters({
                        amountRange: {
                          min: filters.amountRange?.min || 0,
                          max: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}

            {/* Length Range (for lines) */}
            {filters.categories.includes("line") && (
              <div className="space-y-2">
                <Label>Length Range (meters)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min length"
                    value={filters.lengthRange?.min || ""}
                    onChange={(e) =>
                      updateFilters({
                        lengthRange: {
                          min: Number(e.target.value),
                          max: filters.lengthRange?.max || 0,
                        },
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max length"
                    value={filters.lengthRange?.max || ""}
                    onChange={(e) =>
                      updateFilters({
                        lengthRange: {
                          min: filters.lengthRange?.min || 0,
                          max: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button onClick={onSearch} disabled={isSearching} className="flex-1">
            {isSearching ? "Searching..." : "Search"}
          </Button>
          <Button variant="outline" onClick={clearAllFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
