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
    { name: "Completed", value: data.completed },
    { name: "In Progress", value: data.inProgress },
    { name: "Pending", value: data.pending },
  ].filter((d) => d.value > 0);

  return (
    <Card className="glass-card hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Status Breakdown</CardTitle>
        <CardDescription>Line completion overview</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[280px] bg-muted/30 animate-pulse rounded-lg" />
        ) : (
          <div className="h-[280px] w-full flex flex-col items-center">
            <div className="relative flex-1 w-full">
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
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold">{total}</span>
                <span className="text-xs text-muted-foreground">Total Lines</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-2">
              {chartData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs text-muted-foreground">
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
