"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronDown, ChevronUp, BellRing, CornerDownRight } from "lucide-react";
import { InventoryItem } from "@/app/dashboard/inventory/page";

interface CriticalAlertsProps {
  items: InventoryItem[];
  onFilterLowStock: () => void;
  isLoading?: boolean;
}

export function CriticalAlerts({
  items,
  onFilterLowStock,
  isLoading = false,
}: CriticalAlertsProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Filter low stock items
  const lowStockItems = items.filter(
    (item) => item.current_stock <= item.reorder_level
  );

  if (lowStockItems.length === 0) return null;

  return (
    <Card className="border border-red-500/20 bg-gradient-to-br from-red-500/5 via-transparent to-transparent shadow-lg shadow-red-500/2 backdrop-blur-md transition-all duration-300">
      <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500 animate-pulse-glow">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              Critical Stock Alerts
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px] animate-pulse">
                {lowStockItems.length}
              </Badge>
            </CardTitle>
            <CardDescription className="text-[11px] hidden sm:block">
              Items at or below reorder threshold
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onFilterLowStock}
            className="text-[11px] h-8 px-2.5 border-red-500/20 hover:border-red-500/30 hover:bg-red-500/5 text-red-500"
          >
            Filter Table
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="h-8 w-8 text-muted-foreground"
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="px-4 sm:px-5 pb-4 pt-1">
          <div className="space-y-2 mt-1">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-10 bg-muted animate-pulse rounded" />
                <div className="h-10 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-red-500/10 bg-red-500/5/10 hover:bg-red-500/5/20 transition-all duration-200"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CornerDownRight className="h-3.5 w-3.5 text-red-500/60 shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                        Stock
                      </p>
                      <p className="text-xs font-bold text-red-500 tabular-nums">
                        {item.current_stock} {item.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                        Min
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground tabular-nums">
                        {item.reorder_level} {item.unit}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
