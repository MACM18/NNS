"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { X, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

export interface SearchFilters {
  query: string;
  categories: ("line" | "task" | "invoice" | "inventory")[];
  dateRange?: DateRange;
  lineStatus?: "all" | "completed" | "pending";
  taskStatus?: "all" | "pending" | "in_progress" | "completed" | "cancelled";
  invoiceType?: "all" | "monthly" | "inventory";
  amountRange?: { min: number; max: number };
  lengthRange?: { min: number; max: number };
  inventoryLowStock?: boolean;
}

interface AdvancedSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  onClear: () => void;
  isSearching: boolean;
}

export function AdvancedSearchFilters({
  filters,
  onFiltersChange,
  onSearch,
  onClear,
  isSearching,
}: AdvancedSearchFiltersProps) {
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isLineFiltersOpen, setIsLineFiltersOpen] = useState(false);
  const [isTaskFiltersOpen, setIsTaskFiltersOpen] = useState(false);
  const [isInvoiceFiltersOpen, setIsInvoiceFiltersOpen] = useState(false);
  const [isInventoryFiltersOpen, setIsInventoryFiltersOpen] = useState(false);

  const handleCategoryChange = (
    category: "line" | "task" | "invoice" | "inventory",
    checked: boolean
  ) => {
    onFiltersChange({
      ...filters,
      categories: checked
        ? [...filters.categories, category]
        : filters.categories.filter((c) => c !== category),
    });
  };

  const handleAmountRangeChange = (field: "min" | "max", value: string) => {
    const numValue = Number.parseFloat(value);
    const current = filters.amountRange ?? { min: 0, max: 0 };
    onFiltersChange({
      ...filters,
      amountRange: {
        ...current,
        [field]: isNaN(numValue) ? (current as any)[field] : numValue,
      },
    });
  };

  const handleLengthRangeChange = (field: "min" | "max", value: string) => {
    const numValue = Number.parseFloat(value);
    const current = filters.lengthRange ?? { min: 0, max: 0 };
    onFiltersChange({
      ...filters,
      lengthRange: {
        ...current,
        [field]: isNaN(numValue) ? (current as any)[field] : numValue,
      },
    });
  };

  const handleClearAll = () => {
    onFiltersChange({
      query: "",
      categories: ["line", "task", "invoice", "inventory"],
      dateRange: undefined,
      lineStatus: "all",
      taskStatus: "all",
      invoiceType: "all",
      amountRange: undefined,
      lengthRange: undefined,
      inventoryLowStock: false,
    });
    onClear();
  };

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2'>
          <Filter className='h-5 w-5' />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Search Query */}
        <div>
          <Label htmlFor='search-query'>Search Term</Label>
          <Input
            id='search-query'
            placeholder='Enter keywords...'
            value={filters.query}
            onChange={(e) =>
              onFiltersChange({ ...filters, query: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSearch();
              }
            }}
          />
        </div>

        {/* Categories */}
        <Collapsible open={isCategoriesOpen} onOpenChange={setIsCategoriesOpen}>
          <CollapsibleTrigger className='flex w-full items-center justify-between py-2 font-semibold text-sm [&[data-state=open]>svg]:rotate-180'>
            Categories
            <ChevronDown className='h-4 w-4 transition-transform' />
          </CollapsibleTrigger>
          <CollapsibleContent className='space-y-2'>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='category-line'
                checked={filters.categories.includes("line")}
                onCheckedChange={(checked) =>
                  handleCategoryChange("line", !!checked)
                }
              />
              <Label htmlFor='category-line'>Line Details</Label>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='category-task'
                checked={filters.categories.includes("task")}
                onCheckedChange={(checked) =>
                  handleCategoryChange("task", !!checked)
                }
              />
              <Label htmlFor='category-task'>Tasks</Label>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='category-invoice'
                checked={filters.categories.includes("invoice")}
                onCheckedChange={(checked) =>
                  handleCategoryChange("invoice", !!checked)
                }
              />
              <Label htmlFor='category-invoice'>Invoices</Label>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='category-inventory'
                checked={filters.categories.includes("inventory")}
                onCheckedChange={(checked) =>
                  handleCategoryChange("inventory", !!checked)
                }
              />
              <Label htmlFor='category-inventory'>Inventory</Label>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Date Range */}
        <Collapsible open={isDateRangeOpen} onOpenChange={setIsDateRangeOpen}>
          <CollapsibleTrigger className='flex w-full items-center justify-between py-2 font-semibold text-sm [&[data-state=open]>svg]:rotate-180'>
            Date Range
            <ChevronDown className='h-4 w-4 transition-transform' />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <DatePickerWithRange
              date={filters.dateRange}
              setDate={(date) =>
                onFiltersChange({ ...filters, dateRange: date || undefined })
              }
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Line Filters */}
        {filters.categories.includes("line") && (
          <Collapsible
            open={isLineFiltersOpen}
            onOpenChange={setIsLineFiltersOpen}
          >
            <CollapsibleTrigger className='flex w-full items-center justify-between py-2 font-semibold text-sm [&[data-state=open]>svg]:rotate-180'>
              Line Filters
              <ChevronDown className='h-4 w-4 transition-transform' />
            </CollapsibleTrigger>
            <CollapsibleContent className='space-y-4'>
              <div>
                <Label htmlFor='line-status'>Status</Label>
                <Select
                  value={filters.lineStatus || "all"}
                  onValueChange={(value: "all" | "completed" | "pending") =>
                    onFiltersChange({ ...filters, lineStatus: value })
                  }
                >
                  <SelectTrigger id='line-status'>
                    <SelectValue placeholder='Select status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All</SelectItem>
                    <SelectItem value='completed'>Completed</SelectItem>
                    <SelectItem value='pending'>Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Length (meters)</Label>
                <div className='flex gap-2'>
                  <Input
                    type='number'
                    placeholder='Min'
                    value={filters.lengthRange?.min || ""}
                    onChange={(e) =>
                      handleLengthRangeChange("min", e.target.value)
                    }
                  />
                  <Input
                    type='number'
                    placeholder='Max'
                    value={filters.lengthRange?.max || ""}
                    onChange={(e) =>
                      handleLengthRangeChange("max", e.target.value)
                    }
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Task Filters */}
        {filters.categories.includes("task") && (
          <Collapsible
            open={isTaskFiltersOpen}
            onOpenChange={setIsTaskFiltersOpen}
          >
            <CollapsibleTrigger className='flex w-full items-center justify-between py-2 font-semibold text-sm [&[data-state=open]>svg]:rotate-180'>
              Task Filters
              <ChevronDown className='h-4 w-4 transition-transform' />
            </CollapsibleTrigger>
            <CollapsibleContent className='space-y-4'>
              <div>
                <Label htmlFor='task-status'>Status</Label>
                <Select
                  value={filters.taskStatus || "all"}
                  onValueChange={(
                    value:
                      | "all"
                      | "pending"
                      | "in_progress"
                      | "completed"
                      | "cancelled"
                  ) => onFiltersChange({ ...filters, taskStatus: value })}
                >
                  <SelectTrigger id='task-status'>
                    <SelectValue placeholder='Select status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All</SelectItem>
                    <SelectItem value='pending'>Pending</SelectItem>
                    <SelectItem value='in_progress'>In Progress</SelectItem>
                    <SelectItem value='completed'>Completed</SelectItem>
                    <SelectItem value='cancelled'>Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Invoice Filters */}
        {filters.categories.includes("invoice") && (
          <Collapsible
            open={isInvoiceFiltersOpen}
            onOpenChange={setIsInvoiceFiltersOpen}
          >
            <CollapsibleTrigger className='flex w-full items-center justify-between py-2 font-semibold text-sm [&[data-state=open]>svg]:rotate-180'>
              Invoice Filters
              <ChevronDown className='h-4 w-4 transition-transform' />
            </CollapsibleTrigger>
            <CollapsibleContent className='space-y-4'>
              <div>
                <Label htmlFor='invoice-type'>Invoice Type</Label>
                <Select
                  value={filters.invoiceType || "all"}
                  onValueChange={(value: "all" | "monthly" | "inventory") =>
                    onFiltersChange({ ...filters, invoiceType: value })
                  }
                >
                  <SelectTrigger id='invoice-type'>
                    <SelectValue placeholder='Select type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All</SelectItem>
                    <SelectItem value='monthly'>Monthly</SelectItem>
                    <SelectItem value='inventory'>Inventory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount (LKR)</Label>
                <div className='flex gap-2'>
                  <Input
                    type='number'
                    placeholder='Min'
                    value={filters.amountRange?.min || ""}
                    onChange={(e) =>
                      handleAmountRangeChange("min", e.target.value)
                    }
                  />
                  <Input
                    type='number'
                    placeholder='Max'
                    value={filters.amountRange?.max || ""}
                    onChange={(e) =>
                      handleAmountRangeChange("max", e.target.value)
                    }
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Inventory Filters */}
        {filters.categories.includes("inventory") && (
          <Collapsible
            open={isInventoryFiltersOpen}
            onOpenChange={setIsInventoryFiltersOpen}
          >
            <CollapsibleTrigger className='flex w-full items-center justify-between py-2 font-semibold text-sm [&[data-state=open]>svg]:rotate-180'>
              Inventory Filters
              <ChevronDown className='h-4 w-4 transition-transform' />
            </CollapsibleTrigger>
            <CollapsibleContent className='space-y-4'>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='inventory-low-stock'
                  checked={filters.inventoryLowStock || false}
                  onCheckedChange={(checked) =>
                    onFiltersChange({
                      ...filters,
                      inventoryLowStock: !!checked,
                    })
                  }
                />
                <Label htmlFor='inventory-low-stock'>Low Stock Only</Label>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className='flex gap-2'>
          <Button onClick={onSearch} className='flex-1' disabled={isSearching}>
            {isSearching ? "Searching..." : "Search"}
          </Button>
          <Button
            variant='outline'
            onClick={handleClearAll}
            disabled={isSearching}
          >
            <X className='h-4 w-4 mr-2' />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
