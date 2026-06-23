"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, MapPin } from "lucide-react";

interface ActivityItem {
  id: string;
  action: string;
  location: string;
  status: string;
  time: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; dotColor: string }> = {
  completed: { variant: "default", dotColor: "bg-green-500" },
  in_progress: { variant: "secondary", dotColor: "bg-amber-500" },
  pending: { variant: "destructive", dotColor: "bg-red-500" },
};

export function ActivityFeed({ activities, isLoading = false }: ActivityFeedProps) {
  return (
    <Card className="glass-card hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </div>
        <CardDescription>Latest telecom operations</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No recent activities</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map((activity, index) => {
              const config = statusConfig[activity.status] || statusConfig.pending;
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center pt-1">
                    <div className={`w-2 h-2 rounded-full ${config.dotColor} ring-2 ring-background`} />
                    {index < activities.length - 1 && (
                      <div className="w-px h-full bg-border mt-1 min-h-[24px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {activity.action}
                      </p>
                      <Badge variant={config.variant} className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                        {activity.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.location}
                      </p>
                      <span className="text-xs text-muted-foreground/60 ml-auto shrink-0">
                        {activity.time}
                      </span>
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
