"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "./progress-ring";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  fullValue?: string;
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
  fullValue,
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
      <CardContent className="p-3.5 2xl:p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex min-w-0 items-center gap-1.5 2xl:gap-2">
              <div className={`shrink-0 rounded-lg p-1.5 ${colors.bg}`}>
                <Icon className={`h-3.5 w-3.5 2xl:h-4 2xl:w-4 ${colors.icon}`} />
              </div>
              <p title={title} className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-normal text-muted-foreground 2xl:text-xs 2xl:tracking-wide">
                {title}
              </p>
            </div>
            <div className="mt-1.5 min-w-0">
              {isLoading ? (
                <div className="h-8 w-24 bg-muted animate-pulse rounded" />
              ) : (
                <p title={fullValue ?? String(value)} aria-label={fullValue ?? String(value)} className="truncate text-xl font-extrabold tabular-nums tracking-tight 2xl:text-2xl">
                  {value}
                </p>
              )}
            </div>
            {subtitle && (
              <p title={subtitle} className="mt-1 truncate text-[11px] text-muted-foreground 2xl:text-xs">
                {subtitle}
              </p>
            )}
            {change !== undefined && (
              <div className="mt-1.5 flex min-w-0 items-center gap-1">
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
                <span className="hidden truncate text-[10px] text-muted-foreground/80 2xl:inline">vs last month</span>
              </div>
            )}
          </div>
          {ringValue !== undefined && (
            <div className="ml-1 mt-1 flex-shrink-0 2xl:ml-2">
              <ProgressRing
                value={ringValue}
                size={42}
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
