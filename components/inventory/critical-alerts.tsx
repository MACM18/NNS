"use client";

import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, CornerDownRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InventoryItem } from "@/app/dashboard/inventory/page";

interface CriticalAlertsProps {
  items: InventoryItem[];
  onFilterLowStock: () => void;
  isLoading?: boolean;
}

type StockAlert = "out" | "critical" | "low";

function getAlertType(item: InventoryItem): StockAlert | null {
  if (item.current_stock <= 0) return "out";
  if (item.reorder_level > 0 && item.current_stock / item.reorder_level <= 1) return "critical";
  if (item.reorder_level > 0 && item.current_stock / item.reorder_level < 1.5) return "low";
  return null;
}

function alertLabel(type: StockAlert) {
  if (type === "out") return "Out of stock";
  if (type === "critical") return "Critical";
  return "Low stock";
}

export function CriticalAlerts({ items, onFilterLowStock, isLoading = false }: CriticalAlertsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const attentionItems = items
    .map((item) => ({ item, type: getAlertType(item) }))
    .filter((entry): entry is { item: InventoryItem; type: StockAlert } => entry.type !== null)
    .sort((a, b) => a.item.current_stock - b.item.current_stock);

  if (!isLoading && attentionItems.length === 0) return null;

  const outCount = attentionItems.filter(({ type }) => type === "out").length;
  const criticalCount = attentionItems.filter(({ type }) => type === "critical").length;
  const lowCount = attentionItems.filter(({ type }) => type === "low").length;

  return (
    <Card className="overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/5 via-transparent to-transparent shadow-sm shadow-red-500/5 backdrop-blur-md">
      <CardHeader className="flex flex-col gap-3 p-4 pb-2 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-red-500/10 p-1.5 text-red-500" aria-hidden="true">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-1.5 text-sm font-bold">
              Needs attention
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{attentionItems.length}</Badge>
            </CardTitle>
            <CardDescription className="text-[11px]">
              {outCount > 0 && `${outCount} out of stock`}
              {outCount > 0 && (criticalCount > 0 || lowCount > 0) && " · "}
              {criticalCount > 0 && `${criticalCount} critical`}
              {criticalCount > 0 && lowCount > 0 && " · "}
              {lowCount > 0 && `${lowCount} low stock`}
              {isLoading && "Checking current stock levels"}
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onFilterLowStock}
            className="h-8 border-red-500/20 px-2.5 text-[11px] text-red-500 hover:border-red-500/30 hover:bg-red-500/5"
          >
            View stock list
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen((open) => !open)}
            className="h-8 w-8 text-muted-foreground"
            aria-label={isOpen ? "Collapse stock alerts" : "Expand stock alerts"}
            aria-expanded={isOpen}
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="px-4 pb-4 pt-1 sm:px-5">
          {isLoading ? (
            <div className="space-y-2" aria-label="Loading stock alerts">
              <div className="h-10 animate-pulse rounded-lg bg-muted" />
              <div className="h-10 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {attentionItems.slice(0, 4).map(({ item, type }) => (
                <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-red-500/10 bg-red-500/5 p-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-red-500/60" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{alertLabel(type)}</p>
                    </div>
                  </div>
                  <p className="shrink-0 text-right text-xs font-bold tabular-nums text-red-500">
                    {item.current_stock} {item.unit}
                  </p>
                </div>
              ))}
            </div>
          )}
          {!isLoading && attentionItems.length > 4 && (
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              +{attentionItems.length - 4} more item{attentionItems.length - 4 === 1 ? "" : "s"} in the stock list
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
