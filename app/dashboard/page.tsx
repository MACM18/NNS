"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Cable,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Plus,
  ArrowRight,
  RefreshCw,
  Clock,
} from "lucide-react";
import { AddTelephoneLineModal } from "@/components/modals/add-telephone-line-modal";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { useDataCache } from "@/contexts/data-cache-context";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";

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
  // legacy fields (kept for backward compatibility)
  activeTasks?: number;
  pendingReviews?: number;
  taskChange?: number;
  reviewChange?: number;
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
    activeTasks: 0, // kept for type compatibility but not shown
    pendingReviews: 0, // kept for compatibility
    monthlyRevenue: 0,
    lineChange: 0,
    taskChange: 0,
    reviewChange: 0,
    revenueChange: 0,
  };

  // If backend provides new keys, prefer them
  const totalLines = cache.dashboard?.stats?.totalLines ?? stats.totalLines;
  const completedLines = cache.dashboard?.stats?.completed ?? 0;
  const inProgressLines = cache.dashboard?.stats?.inProgress ?? 0;
  const pendingLines = cache.dashboard?.stats?.pending ?? 0;
  const monthlyRevenueValue = cache.dashboard?.stats?.monthlyRevenue ?? 0;

  const recentActivities: RecentActivity[] = cache.dashboard?.activities || [];

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  // Note: Avoid early return before hooks; we'll return null after hooks below

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedDate]);

  // Refresh when page becomes visible again
  usePageVisibility(() => {
    if (user) fetchDashboardData();
  }, [user]);

  // Early return during redirect (placed after hooks to satisfy rules-of-hooks)
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

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  const completionRate =
    totalLines > 0 ? Math.round((completedLines / totalLines) * 100) : 0;

  const dashboardStats = [
    {
      title: "Total Lines",
      value: totalLines.toLocaleString(),
      change: formatChange(cache.dashboard?.stats?.lineChange ?? 0),
      icon: Cable,
      color: "text-blue-600",
      subtitle: `${selectedDate.toLocaleString(undefined, { month: "long" })} ${selectedDate.getFullYear()}`,
    },
    {
      title: "Completed",
      value: completedLines.toString(),
      change: formatChange(cache.dashboard?.stats?.completedChange ?? 0),
      icon: CheckCircle,
      color: "text-green-600",
      subtitle: `${completionRate}% completion rate`,
    },
    {
      title: "In Progress",
      value: inProgressLines.toString(),
      change: formatChange(cache.dashboard?.stats?.inProgressChange ?? 0),
      icon: Clock,
      color: "text-blue-600",
      subtitle: "Currently being worked on",
    },
    {
      title: "Monthly Revenue",
      value: formatCurrency(monthlyRevenueValue),
      change: formatChange(cache.dashboard?.stats?.revenueChange ?? 0),
      icon: TrendingUp,
      color: "text-purple-600",
      subtitle: "Based on 90% invoice A calculation",
    },
  ];

  return (
    <div className='space-y-6'>
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className='flex flex-col gap-4'>
            <h2 className='text-2xl sm:text-3xl font-bold tracking-tight'>
              Dashboard
            </h2>
            <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2'>
              <MonthYearPicker
                date={selectedDate}
                onDateChange={setSelectedDate}
              />
              <Button
                variant='outline'
                size='sm'
                onClick={fetchDashboardData}
                disabled={isRefreshing}
                className='w-full sm:w-auto'
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
                className='w-full sm:w-auto'
              >
                <Plus className='mr-2 h-4 w-4' />
                Add Line
              </Button>
            </div>
          </div>

          <div className='grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'>
            {dashboardStats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {isRefreshing ? (
                      <div className='h-8 w-20 bg-gray-200 animate-pulse rounded'></div>
                    ) : (
                      stat.value
                    )}
                  </div>

                  {stat.subtitle && (
                    <p className='text-xs text-muted-foreground mb-1'>
                      {stat.subtitle}
                    </p>
                  )}

                  <p className='text-xs text-muted-foreground'>
                    <span
                      className={
                        stat.change.startsWith("+")
                          ? "text-green-600"
                          : stat.change.startsWith("-")
                            ? "text-red-600"
                            : "text-gray-600"
                      }
                    >
                      {isRefreshing ? "..." : stat.change}
                    </span>{" "}
                    from last month
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className='grid gap-4 grid-cols-1 lg:grid-cols-7'>
            <Card className='lg:col-span-4'>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>
                  Latest updates from your telecom operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {isRefreshing ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className='flex items-center space-x-4'>
                        <div className='flex-1 space-y-2'>
                          <div className='h-4 bg-gray-200 animate-pulse rounded w-3/4'></div>
                          <div className='h-3 bg-gray-200 animate-pulse rounded w-1/2'></div>
                        </div>
                        <div className='h-6 w-16 bg-gray-200 animate-pulse rounded'></div>
                      </div>
                    ))
                  ) : recentActivities.length > 0 ? (
                    recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className='flex items-center space-x-4'
                      >
                        <div className='flex-1 space-y-1'>
                          <p className='text-sm font-medium leading-none'>
                            {activity.action}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            {activity.location}
                          </p>
                        </div>
                        <div className='flex items-center space-x-2'>
                          <Badge
                            variant={
                              activity.status === "completed"
                                ? "default"
                                : activity.status === "in_progress"
                                  ? "secondary"
                                  : activity.status === "pending"
                                    ? "destructive"
                                    : "outline"
                            }
                          >
                            {activity.status}
                          </Badge>
                          <span className='text-xs text-muted-foreground'>
                            {activity.time}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className='text-sm text-muted-foreground text-center py-4'>
                      No recent activities found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className='lg:col-span-3'>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <Button
                  className='w-full justify-between'
                  variant='outline'
                  onClick={() => router.push("/dashboard/lines")}
                >
                  Add New Line Details
                  <ArrowRight className='h-4 w-4' />
                </Button>
                <Button
                  className='w-full justify-between'
                  variant='outline'
                  onClick={() => router.push("/dashboard/reports")}
                >
                  Generate Monthly Report
                  <ArrowRight className='h-4 w-4' />
                </Button>
                <Button
                  className='w-full justify-between'
                  variant='outline'
                  onClick={() => router.push("/dashboard/inventory")}
                >
                  Update Inventory
                  <ArrowRight className='h-4 w-4' />
                </Button>
                <Button
                  className='w-full justify-between'
                  variant='outline'
                  onClick={() => router.push("/dashboard/tasks")}
                >
                  Review Pending Tasks
                  <ArrowRight className='h-4 w-4' />
                </Button>
              </CardContent>
            </Card>
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
