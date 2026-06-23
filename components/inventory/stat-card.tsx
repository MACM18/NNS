"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: "blue" | "red" | "green" | "purple";
  trend?: string;
  subtitle?: string;
  onClick?: () => void;
  isActive?: boolean;
  isLoading?: boolean;
}

const colorMap = {
  blue: {
    bg: "from-blue-500/10 to-indigo-500/10 border-blue-500/20 hover:border-blue-500/30",
    icon: "text-blue-500 bg-blue-500/10",
    activeBorder: "border-blue-500/60 shadow-blue-500/5",
  },
  red: {
    bg: "from-red-500/15 to-orange-500/10 border-red-500/25 hover:border-red-500/35",
    icon: "text-red-500 bg-red-500/10 animate-pulse-glow",
    activeBorder: "border-red-500/60 shadow-red-500/5",
  },
  green: {
    bg: "from-green-500/10 to-emerald-500/10 border-green-500/20 hover:border-green-500/30",
    icon: "text-green-500 bg-green-500/10",
    activeBorder: "border-green-500/60 shadow-green-500/5",
  },
  purple: {
    bg: "from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/30",
    icon: "text-purple-500 bg-purple-500/10",
    activeBorder: "border-purple-500/60 shadow-purple-500/5",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  subtitle,
  onClick,
  isActive = false,
  isLoading = false,
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <Card
      onClick={onClick}
      className={cn(
        "bg-gradient-to-br backdrop-blur-md border hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group cursor-pointer",
        colors.bg,
        isActive && colors.activeBorder,
        isActive && "shadow-lg scale-[1.02]"
      )}
    >
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            {isLoading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <h3 className="text-3xl font-extrabold tracking-tight">
                {value}
              </h3>
            )}
          </div>
          <div className={cn("p-2.5 rounded-xl transition-colors", colors.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          {subtitle && (
            <p className="text-xs text-muted-foreground font-medium">
              {subtitle}
            </p>
          )}
          {trend && (
            <span className="text-xs font-semibold text-green-500 ml-auto">
              {trend}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
