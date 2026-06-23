"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RefreshCw,
  Cable,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { AddTelephoneLineModal } from "@/components/modals/add-telephone-line-modal";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { useDataCache } from "@/contexts/data-cache-context";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";

// Import new premium dashboard components
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { StatusDonut } from "@/components/dashboard/status-donut";
import { TopWorkersChart } from "@/components/dashboard/top-workers-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ActiveDrums } from "@/components/dashboard/active-drums";
import { SystemAlerts } from "@/components/dashboard/system-alerts";

interface DashboardStats {
  totalLines: number;
  completed?: number;
  inProgress?: number;
  pending?: number;
  monthlyRevenue: number;
  lineChange: number;
  completedChange?: number;
  inProgressChange?: number;
  pendingChange?: number;
  revenueChange: number;
  revenueTrend?: { month: string; revenue: number; cable_used?: number }[];
  topWorkers?: { name: string; lines: number }[];
  drumStats?: {
    activeDrumsCount: number;
    totalRemainingCable: number;
    lowStockDrumsCount: number;
  };
  taskStats?: {
    pendingTasksCount: number;
    activeTasksCount: number;
    completedTasksThisMonth: number;
  };
  invoiceStats?: {
    unpaidInvoicesCount: number;
  };
  activeDrums?: {
    id: string;
    drum_number: string;
    cable_type: string;
    initial_quantity: number;
    current_quantity: number;
  }[];
}

interface RecentActivity {
  id: string;
  action: string;
  location: string;
  time: string;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [openTelephoneLineModal, setOpenTelephoneLineModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { cache, updateCache } = useDataCache();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const stats: DashboardStats = cache.dashboard?.stats || {
    totalLines: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    monthlyRevenue: 0,
    lineChange: 0,
    completedChange: 0,
    inProgressChange: 0,
    pendingChange: 0,
    revenueChange: 0,
    revenueTrend: [],
    topWorkers: [],
  };

  const totalLines = stats.totalLines ?? 0;
  const completedLines = stats.completed ?? 0;
  const inProgressLines = stats.inProgress ?? 0;
  const pendingLines = stats.pending ?? 0;
  const monthlyRevenueValue = stats.monthlyRevenue ?? 0;
  const revenueTrend = stats.revenueTrend || [];
  const topWorkers = stats.topWorkers || [];
  
  const activeDrumsList = stats.activeDrums || [];
  const drumStats = stats.drumStats || { activeDrumsCount: 0, totalRemainingCable: 0, lowStockDrumsCount: 0 };
  const taskStats = stats.taskStats || { pendingTasksCount: 0, activeTasksCount: 0, completedTasksThisMonth: 0 };
  const invoiceStats = stats.invoiceStats || { unpaidInvoicesCount: 0 };

  const statusBreakdown = {
    completed: completedLines,
    inProgress: inProgressLines,
    pending: pendingLines,
  };

  const recentActivities: RecentActivity[] = cache.dashboard?.activities || [];

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  // Fetch when month changes or cache invalid
  useEffect(() => {
    if (!user) return;
    const lastUpdated = cache.dashboard?.lastUpdated as Date | undefined;
    const cachedMonth = lastUpdated
      ? `${lastUpdated.getFullYear()}-${(lastUpdated.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`
      : null;
    const selectedMonthKey = `${selectedDate.getFullYear()}-${(
      selectedDate.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}`;
    if (cachedMonth !== selectedMonthKey) {
      fetchDashboardData();
    }
  }, [user, selectedDate]);

  // Refresh when page becomes visible again
  usePageVisibility(() => {
    if (user) fetchDashboardData();
  }, [user]);

  // Early return during redirect
  if (!user && !loading) return null;

  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      const currentMonth = selectedDate.getMonth() + 1;
      const currentYear = selectedDate.getFullYear();

      const response = await fetch(
        `/api/dashboard/stats?month=${currentMonth}&year=${currentYear}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const result = await response.json();
      const { stats, activities } = result.data;

      // Format activities with time ago
      const formattedActivities: RecentActivity[] = activities.map(
        (activity: any) => ({
          ...activity,
          time: formatTimeAgo(activity.created_at),
        }),
      );

      updateCache("dashboard", {
        stats,
        activities: formattedActivities,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );
    if (diffInHours < 1) return "Less than an hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const completionRate =
    totalLines > 0 ? Math.round((completedLines / totalLines) * 100) : 0;

  return (
    <div className="space-y-6">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Header section with Picker and actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground">
                Dashboard
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Overview and statistics for NNS Telecom operations
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <MonthYearPicker
                date={selectedDate}
                onDateChange={setSelectedDate}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchDashboardData}
                  disabled={isRefreshing}
                  className="flex-1 sm:flex-none h-9"
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
                <Button
                  onClick={() => setOpenTelephoneLineModal(true)}
                  className="flex-1 sm:flex-none h-9 glass-button"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </div>
            </div>
          </div>

          {/* Premium KPI Cards Row (5 Cards) */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              title="Completed"
              value={completedLines.toLocaleString()}
              icon={CheckCircle}
              color="green"
              ringValue={completionRate}
              subtitle="Fiber lines done"
              isLoading={isRefreshing}
              delay={0}
            />
            <KpiCard
              title="Installations Queue"
              value={(pendingLines + inProgressLines).toLocaleString()}
              icon={Clock}
              color="amber"
              subtitle={`${pendingLines} Pending • ${inProgressLines} In-Progress`}
              isLoading={isRefreshing}
              delay={100}
            />
            <KpiCard
              title="Cable Inventory"
              value={`${Math.round(drumStats.totalRemainingCable).toLocaleString()}m`}
              icon={Cable}
              color="blue"
              subtitle={`${drumStats.activeDrumsCount} Active Drums`}
              isLoading={isRefreshing}
              delay={200}
            />
            <KpiCard
              title="Assigned Tasks"
              value={(taskStats.activeTasksCount + taskStats.pendingTasksCount).toLocaleString()}
              icon={AlertTriangle}
              color="purple"
              subtitle={`${taskStats.pendingTasksCount} Pending • ${taskStats.activeTasksCount} Active`}
              isLoading={isRefreshing}
              delay={300}
            />
            <KpiCard
              title="Monthly Revenue"
              value={formatCurrency(monthlyRevenueValue)}
              change={stats.revenueChange}
              icon={TrendingUp}
              color="purple"
              subtitle="90% invoice A projection"
              isLoading={isRefreshing}
              delay={400}
            />
          </div>

          {/* Bento Grid layout for charts & logs */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
            {/* Row 1: Interactive Charts */}
            <div className="lg:col-span-8 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              <RevenueChart data={revenueTrend} isLoading={isRefreshing} />
            </div>

            <div className="lg:col-span-4 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
              <StatusDonut data={statusBreakdown} isLoading={isRefreshing} />
            </div>

            {/* Row 2: Active Inventory & Activity Feed */}
            <div className="lg:col-span-6 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
              <ActiveDrums data={activeDrumsList} isLoading={isRefreshing} />
            </div>

            <div className="lg:col-span-6 animate-fade-in-up" style={{ animationDelay: "500ms" }}>
              <ActivityFeed activities={recentActivities} isLoading={isRefreshing} />
            </div>

            {/* Row 3: Top Workers, System Alerts & Quick Actions */}
            <div className="lg:col-span-4 animate-fade-in-up" style={{ animationDelay: "600ms" }}>
              <TopWorkersChart data={topWorkers} isLoading={isRefreshing} />
            </div>

            <div className="lg:col-span-4 animate-fade-in-up" style={{ animationDelay: "700ms" }}>
              <SystemAlerts
                drumStats={drumStats}
                taskStats={taskStats}
                invoiceStats={invoiceStats}
                isLoading={isRefreshing}
              />
            </div>

            <div className="lg:col-span-4 animate-fade-in-up" style={{ animationDelay: "800ms" }}>
              <QuickActions />
            </div>
          </div>
        </>
      )}
      <AddTelephoneLineModal
        open={openTelephoneLineModal}
        onOpenChange={setOpenTelephoneLineModal}
        onSuccess={() => {
          setOpenTelephoneLineModal(false);
          fetchDashboardData();
        }}
      />
    </div>
  );
}
