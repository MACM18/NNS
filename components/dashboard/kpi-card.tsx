"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "./progress-ring";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number; // percentage change
  icon: LucideIcon;
  color: "blue" | "green" | "amber" | "red" | "purple";
  subtitle?: string;
  ringValue?: number; // 0-100 for progress ring
  isLoading?: boolean;
  delay?: number; // stagger animation delay in ms
}

const colorMap = {
  blue: {
    icon: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-l-blue-500/70",
    glow: "hover:shadow-blue-500/10",
    ring: "text-blue-500",
  },
  green: {
    icon: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-l-green-500/70",
    glow: "hover:shadow-green-500/10",
    ring: "text-green-500",
  },
  amber: {
    icon: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-l-amber-500/70",
    glow: "hover:shadow-amber-500/10",
    ring: "text-amber-500",
  },
  red: {
    icon: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-l-red-500/70",
    glow: "hover:shadow-red-500/10",
    ring: "text-red-500",
  },
  purple: {
    icon: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-l-purple-500/70",
    glow: "hover:shadow-purple-500/10",
    ring: "text-purple-500",
  },
};

export function KpiCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  subtitle,
  ringValue,
  isLoading = false,
  delay = 0,
}: KpiCardProps) {
  const [visible, setVisible] = useState(false);
  const colors = colorMap[color];

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Card
      className={`glass-card border-l-4 ${colors.border} hover:-translate-y-1 ${colors.glow} hover:shadow-lg transition-all duration-300 overflow-hidden ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } transition-all duration-500`}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-lg ${colors.bg}`}>
                <Icon className={`h-4 w-4 ${colors.icon}`} />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                {title}
              </p>
            </div>
            <div className="mt-2">
              {isLoading ? (
                <div className="h-8 w-24 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold tabular-nums tracking-tight whitespace-nowrap">
                  {value}
                </p>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {subtitle}
              </p>
            )}
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {change >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-green-500 shrink-0" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-red-500 shrink-0" />
                )}
                <span
                  className={`text-xs font-semibold shrink-0 ${
                    change >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(1)}%
                </span>
                <span className="text-[10px] text-muted-foreground/80 whitespace-nowrap">vs last month</span>
              </div>
            )}
          </div>
          {ringValue !== undefined && (
            <div className="flex-shrink-0 ml-2 mt-1">
              <ProgressRing
                value={ringValue}
                size={52}
                strokeWidth={4}
                color={colors.ring}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
