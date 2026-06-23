"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users } from "lucide-react";

interface WorkerData {
  name: string;
  lines: number;
}

interface TopWorkersChartProps {
  data: WorkerData[];
  isLoading?: boolean;
}

const COLORS = [
  "hsl(199, 89%, 48%)",
  "hsl(199, 89%, 55%)",
  "hsl(199, 89%, 62%)",
  "hsl(199, 89%, 69%)",
  "hsl(199, 89%, 76%)",
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs font-medium">
          {payload[0].payload.name}: <span className="font-bold">{payload[0].value} lines</span>
        </p>
      </div>
    );
  }
  return null;
};

export function TopWorkersChart({ data, isLoading = false }: TopWorkersChartProps) {
  return (
    <Card className="glass-card hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Top Workers</CardTitle>
        </div>
        <CardDescription>By completed lines this month</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[240px] bg-muted/30 animate-pulse rounded-lg" />
        ) : data.length === 0 ? (
          <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
            No worker data available
          </div>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                <Bar dataKey="lines" radius={[0, 6, 6, 0]} barSize={20}>
                  {data.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
