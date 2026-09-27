"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import {
  Cable,
  FileText,
  Package,
  ClipboardList,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

interface QuickAction {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  bgColor: string;
}

const actions: QuickAction[] = [
  {
    title: "Add Line",
    description: "New fiber line details",
    icon: Cable,
    href: "/dashboard/lines",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 group-hover:bg-blue-500/20",
  },
  {
    title: "Reports",
    description: "Generate monthly report",
    icon: FileText,
    href: "/dashboard/reports",
    color: "text-green-500",
    bgColor: "bg-green-500/10 group-hover:bg-green-500/20",
  },
  {
    title: "Inventory",
    description: "Update stock levels",
    icon: Package,
    href: "/dashboard/inventory",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10 group-hover:bg-amber-500/20",
  },
  {
    title: "Tasks",
    description: "Review pending tasks",
    icon: ClipboardList,
    href: "/dashboard/tasks",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10 group-hover:bg-purple-500/20",
  },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <Card className="glass-card h-full min-w-0 hover:shadow-md transition-shadow duration-300">
      <CardHeader className="p-4 pb-2 2xl:p-6 2xl:pb-3">
        <CardTitle className="text-sm 2xl:text-base">Quick Actions</CardTitle>
        <CardDescription className="text-xs 2xl:text-sm">Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 2xl:p-6 2xl:pt-0">
        <div className="flex flex-col gap-2">
          {actions.map((action) => (
            <button
              key={action.title}
              onClick={() => router.push(action.href)}
              className="group flex items-center justify-between rounded-xl p-2.5 2xl:p-3 border border-border/40 hover:border-border/80 hover:bg-muted/40 transition-all duration-200 hover:-translate-y-0.5 text-left w-full"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-1.5 2xl:p-2 rounded-xl ${action.bgColor} transition-colors duration-200 shrink-0`}>
                  <action.icon className={`h-4.5 w-4.5 ${action.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-none text-foreground 2xl:text-sm">
                    {action.title}
                  </p>
                  <p className="mt-1 truncate text-[11px] leading-none text-muted-foreground 2xl:mt-1.5 2xl:text-xs">
                    {action.description}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/55 group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

