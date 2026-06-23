"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, AlertTriangle, FileText, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";

interface SystemAlertsProps {
  drumStats?: {
    lowStockDrumsCount: number;
  };
  taskStats?: {
    pendingTasksCount: number;
  };
  invoiceStats?: {
    unpaidInvoicesCount: number;
  };
  isLoading?: boolean;
}

export function SystemAlerts({
  drumStats,
  taskStats,
  invoiceStats,
  isLoading = false,
}: SystemAlertsProps) {
  const router = useRouter();

  const lowStockCount = drumStats?.lowStockDrumsCount ?? 0;
  const pendingTasksCount = taskStats?.pendingTasksCount ?? 0;
  const unpaidInvoicesCount = invoiceStats?.unpaidInvoicesCount ?? 0;

  const totalAlerts = lowStockCount + pendingTasksCount + unpaidInvoicesCount;

  return (
    <Card className="glass-card hover:shadow-md transition-shadow duration-300 h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4.5 w-4.5 text-muted-foreground" />
          System Operational Alerts
        </CardTitle>
        <CardDescription>Critical warnings across NNS modules</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-muted/30 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : totalAlerts === 0 ? (
          <div className="text-center py-8 text-muted-foreground h-full flex flex-col items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-500/80 mb-2.5" />
            <p className="font-semibold text-sm text-foreground">All Systems Operational</p>
            <p className="text-xs mt-1">No active stock or billing alerts found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {lowStockCount > 0 && (
              <div
                onClick={() => router.push("/dashboard/inventory")}
                className="flex items-start gap-3 p-3 rounded-xl border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 transition-colors duration-200 cursor-pointer"
              >
                <AlertTriangle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Low Cable Stock Warning</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {lowStockCount} active {lowStockCount === 1 ? "drum is" : "drums are"} below the 300m threshold.
                  </p>
                </div>
              </div>
            )}

            {unpaidInvoicesCount > 0 && (
              <div
                onClick={() => router.push("/dashboard/accounting")}
                className="flex items-start gap-3 p-3 rounded-xl border border-amber-500/10 bg-amber-500/5 hover:bg-amber-500/10 transition-colors duration-200 cursor-pointer"
              >
                <FileText className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Unpaid Invoices</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {unpaidInvoicesCount} inventory {unpaidInvoicesCount === 1 ? "invoice" : "invoices"} require payment review.
                  </p>
                </div>
              </div>
            )}

            {pendingTasksCount > 0 && (
              <div
                onClick={() => router.push("/dashboard/tasks")}
                className="flex items-start gap-3 p-3 rounded-xl border border-purple-500/10 bg-purple-500/5 hover:bg-purple-500/10 transition-colors duration-200 cursor-pointer"
              >
                <ClipboardList className="h-4.5 w-4.5 text-purple-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Task Allocation Backlog</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {pendingTasksCount} operations {pendingTasksCount === 1 ? "task is" : "tasks are"} pending engineer assignment.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
