"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, Cable } from "lucide-react";
import { useRouter } from "next/navigation";

interface ActiveDrum {
  id: string;
  drum_number: string;
  cable_type: string;
  initial_quantity: number;
  current_quantity: number;
}

interface ActiveDrumsProps {
  data: ActiveDrum[];
  isLoading?: boolean;
}

export function ActiveDrums({ data, isLoading = false }: ActiveDrumsProps) {
  const router = useRouter();

  return (
    <Card className="glass-card hover:shadow-md transition-shadow duration-300 h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between shrink-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4.5 w-4.5 text-muted-foreground" />
            Active Drum Inventory
          </CardTitle>
          <CardDescription>Status of currently deployed cable drums</CardDescription>
        </div>
        <button
          onClick={() => router.push("/dashboard/inventory")}
          className="text-xs text-primary font-semibold hover:underline"
        >
          View All
        </button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted/30 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground h-full flex flex-col items-center justify-center">
            <Package className="h-10 w-10 opacity-30 mb-2" />
            <p className="font-semibold text-sm">No Active Drums</p>
            <p className="text-xs mt-1">Drums appear here when added to inventory</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {data.map((drum) => {
              const remainingPercent = drum.initial_quantity > 0
                ? (drum.current_quantity / drum.initial_quantity) * 100
                : 0;

              const isLowStock = drum.current_quantity < 300;

              let barColor = "[&>div]:bg-green-500";
              if (remainingPercent < 25) {
                barColor = "[&>div]:bg-red-500";
              } else if (remainingPercent < 50) {
                barColor = "[&>div]:bg-amber-500";
              }

              return (
                <div
                  key={drum.id}
                  onClick={() => router.push("/dashboard/inventory")}
                  className="p-3 rounded-xl border border-border/40 bg-card/40 hover:bg-muted/30 hover:border-border/80 transition-all duration-200 cursor-pointer flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/20 uppercase tracking-tight shrink-0">
                        #{drum.drum_number}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate flex items-center gap-1 min-w-0">
                        <Cable className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{drum.cable_type}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isLowStock && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0 gap-0.5 animate-pulse">
                          <AlertTriangle className="h-2 w-2" />
                          Low
                        </Badge>
                      )}
                      <span className="text-xs font-semibold text-muted-foreground">
                        {Math.round(remainingPercent)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Progress value={remainingPercent} className={`h-1.5 ${barColor}`} />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>{Math.round(drum.current_quantity)}m remaining</span>
                      <span>of {drum.initial_quantity}m</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
