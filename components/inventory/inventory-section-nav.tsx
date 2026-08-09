"use client";

import { Boxes, FileText, Layers3, Package, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

type InventoryTab = "stock" | "invoices" | "drums" | "waste" | "material-balance";

interface InventorySectionNavProps {
  counts: Record<InventoryTab, number>;
}

const sections = [
  { value: "stock" as const, label: "Stock", description: "Availability and reorder health", icon: Package },
  { value: "invoices" as const, label: "Receipts", description: "Manual and free-issued records", icon: FileText },
  { value: "drums" as const, label: "Drums", description: "Cable capacity and usage", icon: Layers3 },
  { value: "waste" as const, label: "Waste", description: "Loss and damage history", icon: TrendingDown },
  { value: "material-balance" as const, label: "Material Balance", description: "Google Sheet reconciliation", icon: Boxes },
];

export function InventorySectionNav({ counts }: InventorySectionNavProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <TabsList className="flex h-auto min-w-max gap-1.5 rounded-2xl border border-border/50 bg-muted/30 p-1.5 shadow-sm backdrop-blur-md lg:grid lg:min-w-0 lg:grid-cols-5">
        {sections.map(({ value, label, description, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="group h-auto min-w-[170px] justify-start gap-3 rounded-xl px-3 py-2.5 text-left data-[state=active]:bg-background data-[state=active]:shadow-sm lg:min-w-0"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background/70 text-muted-foreground ring-1 ring-border/40 transition-colors group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary group-data-[state=active]:ring-primary/20">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-xs font-bold sm:text-sm">{label}</span>
                {counts[value] > 0 && <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] tabular-nums">{counts[value]}</Badge>}
              </span>
              <span className="mt-0.5 hidden truncate text-[10px] font-normal text-muted-foreground xl:block">{description}</span>
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}
