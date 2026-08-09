"use client";

import {
  AlertTriangle,
  Boxes,
  Clock3,
  Layers3,
  PackageCheck,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  TrendingDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InventoryWorkspaceHeaderProps {
  totalItems: number;
  attentionCount: number;
  activeDrums: number;
  wastePercentage: number;
  lastRefreshedAt: Date | null;
  loading: boolean;
  errorCount: number;
  canManageItems: boolean;
  onRefresh: () => void;
  onAddReceipt: () => void;
  onRecordWaste: () => void;
  onManageItems: () => void;
  onShowAllStock: () => void;
  onShowAttention: () => void;
  onShowDrums: () => void;
  onShowWaste: () => void;
}

export function InventoryWorkspaceHeader({
  totalItems,
  attentionCount,
  activeDrums,
  wastePercentage,
  lastRefreshedAt,
  loading,
  errorCount,
  canManageItems,
  onRefresh,
  onAddReceipt,
  onRecordWaste,
  onManageItems,
  onShowAllStock,
  onShowAttention,
  onShowDrums,
  onShowWaste,
}: InventoryWorkspaceHeaderProps) {
  const healthyItems = Math.max(totalItems - attentionCount, 0);
  const healthyPercentage = totalItems > 0 ? Math.round((healthyItems / totalItems) * 100) : 0;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm">
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-60 w-60 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="relative grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-center">
        <div className="min-w-0 space-y-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1.5 border-primary/20 bg-primary/5 px-2.5 py-1 text-primary">
                  <Boxes className="h-3.5 w-3.5" aria-hidden="true" />
                  Inventory control
                </Badge>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {lastRefreshedAt
                    ? `Updated ${lastRefreshedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                    : "Loading latest stock"}
                </span>
                {errorCount > 0 && (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    {errorCount} section{errorCount === 1 ? "" : "s"} unavailable
                  </Badge>
                )}
              </div>
              <div>
                <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Know what is available. Act before work slows down.
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  One operational view for stock, free-issued receipts, cable drums, waste, and Google Sheet reconciliation.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-[330px] lg:justify-end">
              <Button onClick={onAddReceipt} className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add receipt
              </Button>
              <Button onClick={onRecordWaste} variant="outline" className="gap-2 bg-background/70">
                <TrendingDown className="h-4 w-4" aria-hidden="true" />
                Record waste
              </Button>
              {canManageItems && (
                <Button onClick={onManageItems} variant="outline" className="gap-2 bg-background/70">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  Manage items
                </Button>
              )}
              <Button
                onClick={onRefresh}
                variant="ghost"
                size="icon"
                disabled={loading}
                aria-label="Refresh inventory data"
                title="Refresh inventory data"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <OverviewMetric
              label="Tracked items"
              value={totalItems}
              detail={`${healthyItems} currently healthy`}
              icon={PackageCheck}
              tone="primary"
              onClick={onShowAllStock}
            />
            <OverviewMetric
              label="Needs attention"
              value={attentionCount}
              detail="Out, negative, critical, or low"
              icon={AlertTriangle}
              tone={attentionCount > 0 ? "danger" : "success"}
              onClick={onShowAttention}
            />
            <OverviewMetric
              label="Active drums"
              value={activeDrums}
              detail="Cable drums in operation"
              icon={Layers3}
              tone="violet"
              onClick={onShowDrums}
            />
            <OverviewMetric
              label="Waste this month"
              value={`${wastePercentage}%`}
              detail="Share of tracked stock"
              icon={TrendingDown}
              tone="amber"
              onClick={onShowWaste}
            />
          </div>
        </div>

        <div className="mx-auto hidden xl:block">
          <div className="relative grid h-44 w-44 place-items-center rounded-full p-[12px] shadow-xl shadow-primary/5" style={{ background: `conic-gradient(hsl(var(--primary)) ${healthyPercentage * 3.6}deg, hsl(var(--muted)) 0deg)` }}>
            <div className="grid h-full w-full place-items-center rounded-full border border-border/40 bg-background/95 text-center shadow-inner">
              <div>
                <p className="text-4xl font-black tabular-nums tracking-tight">{healthyPercentage}%</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Stock health</p>
                <p className="mt-2 text-xs text-muted-foreground">{healthyItems} of {totalItems} healthy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const metricTones = {
  primary: "border-primary/15 bg-primary/[0.045] text-primary",
  danger: "border-red-500/20 bg-red-500/[0.055] text-red-600 dark:text-red-400",
  success: "border-emerald-500/20 bg-emerald-500/[0.055] text-emerald-600 dark:text-emerald-400",
  violet: "border-violet-500/20 bg-violet-500/[0.055] text-violet-600 dark:text-violet-400",
  amber: "border-amber-500/20 bg-amber-500/[0.055] text-amber-700 dark:text-amber-400",
};

function OverviewMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof PackageCheck;
  tone: keyof typeof metricTones;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-h-[92px] items-center gap-3 rounded-2xl border p-3.5 text-left transition-all hover:-translate-y-0.5 hover:bg-background/80 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        metricTones[tone],
      )}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background/80 shadow-sm">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        <span className="mt-0.5 block text-2xl font-black tabular-nums text-foreground">{value}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}
