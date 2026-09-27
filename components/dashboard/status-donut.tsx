"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface StatusBreakdown {
  completed: number;
  inProgress: number;
  pending: number;
}

interface StatusDonutProps {
  data: StatusBreakdown;
  isLoading?: boolean;
}

const COLORS = [
  "hsl(160, 84%, 39%)",  // green - completed
  "hsl(32, 95%, 60%)",   // amber - in progress
  "hsl(0, 84%, 60%)",    // red - pending
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs font-medium">
          {payload[0].name}: <span className="font-bold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function StatusDonut({ data, isLoading = false }: StatusDonutProps) {
  const total = data.completed + data.inProgress + data.pending;
  const chartData = [
    { name: "Completed", value: data.completed, color: COLORS[0] },
    { name: "In Progress", value: data.inProgress, color: COLORS[1] },
    { name: "Pending", value: data.pending, color: COLORS[2] },
  ].filter((d) => d.value > 0);

  return (
    <Card className="glass-card min-w-0 hover:shadow-md transition-shadow duration-300">
      <CardHeader className="p-4 pb-2 2xl:p-6 2xl:pb-2">
        <CardTitle className="text-sm 2xl:text-base">Status Breakdown</CardTitle>
        <CardDescription className="text-xs 2xl:text-sm">Line completion overview</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 p-4 pt-0 2xl:p-6 2xl:pt-0">
        {isLoading ? (
          <div className="h-[210px] 2xl:h-[260px] bg-muted/30 animate-pulse rounded-lg" />
        ) : (
          <div className="h-[210px] 2xl:h-[260px] w-full flex flex-col items-center">
            <div className="relative min-h-0 w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold 2xl:text-3xl">{total}</span>
                <span className="text-[11px] text-muted-foreground 2xl:text-xs">Total Lines</span>
              </div>
            </div>
            {/* Legend */}
            <div className="mt-1 flex w-full flex-wrap items-center justify-center gap-x-2.5 gap-y-1 2xl:gap-x-4">
              {chartData.map((entry) => (
                <div key={entry.name} className="flex min-w-0 items-center gap-1">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-[11px] text-muted-foreground 2xl:text-xs">
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
