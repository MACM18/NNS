"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Calendar, Cable } from "lucide-react";
import { DrumTracking } from "@/app/dashboard/inventory/page";

interface DrumGaugeCardProps {
  drum: DrumTracking;
  onEdit: (drum: DrumTracking) => void;
  onDelete: (drum: DrumTracking) => void;
  isAdminOrManager: boolean;
}

export function DrumGaugeCard({
  drum,
  onEdit,
  onDelete,
  isAdminOrManager,
}: DrumGaugeCardProps) {
  const percentRemaining = drum.initial_quantity > 0
    ? Math.round((drum.current_quantity / drum.initial_quantity) * 100)
    : 0;

  // Gauge colors based on percentage
  let gaugeColor = "stroke-green-500 text-green-500";
  let gaugeBgColor = "stroke-green-500/10";
  if (percentRemaining < 25) {
    gaugeColor = "stroke-red-500 text-red-500";
    gaugeBgColor = "stroke-red-500/10";
  } else if (percentRemaining < 50) {
    gaugeColor = "stroke-amber-500 text-amber-500";
    gaugeBgColor = "stroke-amber-500/10";
  }

  // Circular gauge config
  const size = 72;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentRemaining / 100) * circumference;

  return (
    <Card className="glass-card hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 overflow-hidden border-border/40">
      <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
        {/* Left Info Section */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-muted-foreground uppercase tracking-tight bg-muted/40 px-2 py-0.5 rounded border border-border/20">
              #{drum.drum_number}
            </span>
            <Badge
              variant={
                drum.status === "active"
                  ? "default"
                  : drum.status === "depleted"
                  ? "secondary"
                  : "outline"
              }
              className="text-[10px] px-1.5 py-0 capitalize"
            >
              {drum.status}
            </Badge>
          </div>

          <h4 className="text-sm font-bold text-foreground truncate mt-1">
            {drum.item_name || "Unknown Cable Type"}
          </h4>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Rec: {new Date(drum.received_date).toLocaleDateString()}</span>
          </div>

          {/* Render admin options */}
          {isAdminOrManager && (
            <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-border/30">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(drum)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(drum)}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          )}
        </div>

        {/* Right Circular Gauge Section */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="-rotate-90">
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                className={gaugeBgColor}
              />
              {/* Progress circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                className={`${gaugeColor} transition-all duration-700 ease-out`}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: offset,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-bold tabular-nums">
                {percentRemaining}%
              </span>
              <span className="text-[8px] text-muted-foreground uppercase font-medium tracking-tight">
                left
              </span>
            </div>
          </div>
          <div className="mt-2 text-center">
            <p className="text-xs font-bold tabular-nums">
              {drum.current_quantity}m
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">
              of {drum.initial_quantity}m
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
