"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface RevenueDataPoint {
  month: string;
  revenue: number;
  cable_used?: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
  isLoading?: boolean;
}

const formatValue = (value: number, isRevenue: boolean) => {
  if (isRevenue) {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  } else {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k m`;
    return `${value}m`;
  }
};

export function RevenueChart({ data, isLoading = false }: RevenueChartProps) {
  const [activeTab, setActiveTab] = useState<"revenue" | "cable">("revenue");
  const isRevenue = activeTab === "revenue";

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel rounded-lg px-3 py-2 shadow-xl">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-sm font-bold">
            {isRevenue
              ? `LKR ${payload[0].value.toLocaleString()}`
              : `${payload[0].value.toLocaleString()} meters`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="glass-card hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base">
            {isRevenue ? "Revenue Trend" : "Cable Deployed"}
          </CardTitle>
          <CardDescription>
            {isRevenue ? "Monthly revenue projection (90%)" : "Meters of cable installed"}
          </CardDescription>
        </div>
        
        {/* Toggle Switch */}
        <div className="flex items-center border border-border/50 rounded-lg p-0.5 bg-muted/40 text-xs shrink-0 h-8 self-center">
          <button
            onClick={() => setActiveTab("revenue")}
            className={`px-3 py-1 rounded-md transition-all font-semibold ${
              isRevenue
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Revenue
          </button>
          <button
            onClick={() => setActiveTab("cable")}
            className={`px-3 py-1 rounded-md transition-all font-semibold ${
              !isRevenue
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Cable
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[280px] bg-muted/30 animate-pulse rounded-lg" />
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={isRevenue ? "hsl(199, 89%, 48%)" : "hsl(215, 89%, 55%)"}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={isRevenue ? "hsl(199, 89%, 48%)" : "hsl(215, 89%, 55%)"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(val) => formatValue(val, isRevenue)}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey={isRevenue ? "revenue" : "cable_used"}
                  stroke={isRevenue ? "hsl(199, 89%, 48%)" : "hsl(215, 89%, 55%)"}
                  strokeWidth={2.5}
                  fill="url(#chartGradient)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, fill: "hsl(var(--background))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
