"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
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
} from "lucide-react";
import { AddTelephoneLineModal } from "@/components/modals/add-telephone-line-modal";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { supabase } from "@/lib/supabase";
import { useDataCache } from "@/contexts/data-cache-context";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";

interface DashboardStats {
  totalLines: number;
  activeTasks: number;
  pendingReviews: number;
  monthlyRevenue: number;
  lineChange: number;
  taskChange: number;
  reviewChange: number;
  revenueChange: number;
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

  const stats = cache.dashboard?.stats || {
    totalLines: 0,
    activeTasks: 0,
    pendingReviews: 0,
    monthlyRevenue: 0,
    lineChange: 0,
    taskChange: 0,
    reviewChange: 0,
    revenueChange: 0,
  };

  const recentActivities = cache.dashboard?.activities || [];
  const router = useRouter();

  // Auth check - redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  // Early return for unauthenticated users
  if (!user && !loading) {
    return null;
  }

  useEffect(() => {
    if (user && selectedDate) {
      const lastUpdated = cache.dashboard?.lastUpdated;
      const cachedMonth = lastUpdated
        ? `${lastUpdated.getFullYear()}-${(lastUpdated.getMonth() + 1)
            .toString()
            .padStart(2, "0")}`
        : null;
      const selectedMonth = `${selectedDate.getFullYear()}-${(
        selectedDate.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}`;
      console.log(
        `Checking cache: selectedMonth=${selectedMonth}, cachedMonth=${cachedMonth}`
      );
      if (cachedMonth !== selectedMonth) {
        fetchDashboardData();
      }
    }
  }, [user, selectedDate]);

  // Refresh data when page becomes visible again
  usePageVisibility(() => {
    if (user) {
      console.log("Page became visible, refreshing dashboard data");
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      const currentMonth = selectedDate.getMonth() + 1;
      const currentYear = selectedDate.getFullYear();
      const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const currentMonthStartDate = `${currentYear}-${currentMonth
        .toString()
        .padStart(2, "0")}-01`;
      const currentMonthLastDay = new Date(
        currentYear,
        currentMonth,
        0
      ).getDate();
      const currentMonthEndDate = `${currentYear}-${currentMonth
        .toString()
        .padStart(2, "0")}-${currentMonthLastDay.toString().padStart(2, "0")}`;
      const previousMonthStartDate = `${previousYear}-${previousMonth
        .toString()
        .padStart(2, "0")}-01`;
      const previousMonthLastDay = new Date(
        previousYear,
        previousMonth,
        0
      ).getDate();
      const previousMonthEndDate = `${previousYear}-${previousMonth
        .toString()
        .padStart(2, "0")}-${previousMonthLastDay.toString().padStart(2, "0")}`;

      // Fetch total lines for selected month
      const { data: currentLines } = await supabase
        .from("line_details")
        .select("*")
        .gte("created_at", currentMonthStartDate)
        .lte("created_at", currentMonthEndDate);

      const { data: previousLines } = await supabase
        .from("line_details")
        .select("*")
        .gte("created_at", previousMonthStartDate)
        .lte("created_at", previousMonthEndDate);

      // Fetch active tasks for selected month
      const { data: currentTasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "in_progress")
        .gte("created_at", currentMonthStartDate)
        .lte("created_at", currentMonthEndDate);

      const { data: previousTasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "in_progress")
        .gte("created_at", previousMonthStartDate)
        .lte("created_at", previousMonthEndDate);

      // Fetch pending reviews for selected month
      const { data: currentReviews } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "pending")
        .gte("created_at", currentMonthStartDate)
        .lte("created_at", currentMonthEndDate);

      const { data: previousReviews } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "pending")
        .gte("created_at", previousMonthStartDate)
        .lte("created_at", currentMonthEndDate);
      // Fetch monthly revenue for selected month
      const { data: currentInvoices } = await supabase
        .from("generated_invoices")
        .select("total_amount")
        .in("invoice_type", ["A", "B"]) // Only fetch A and B type invoices
        .gte("job_month", currentMonthStartDate)
        .lte("job_month", currentMonthEndDate);

      const { data: previousInvoices } = await supabase
        .from("generated_invoices")
        .select("total_amount")
        .in("invoice_type", ["A", "B"]) // Only fetch A and B type invoices
        .gte("job_month", previousMonthStartDate)
        .lte("job_month", previousMonthEndDate);

      // Fetch recent activities
      const { data: activities } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      // Format recent activities
      const formattedActivities: RecentActivity[] =
        activities?.map((task) => ({
          id: task.id,
          action: `Task: ${task.telephone_no}`,
          location: task.address || "Unknown Location",
          time: formatTimeAgo(task.created_at),
          status: task.status,
          created_at: task.created_at,
        })) || [];

      // Calculate stats and changes
      const totalLines = currentLines?.length || 0;
      const activeTasks = currentTasks?.length || 0;
      const pendingReviews = currentReviews?.length || 0;
      const monthlyRevenue =
        currentInvoices?.reduce(
          (sum, inv) => sum + (inv.total_amount || 0),
          0
        ) || 0;

      const prevLines = previousLines?.length || 0;
      const prevTasks = previousTasks?.length || 0;
      const prevReviews = previousReviews?.length || 0;
      const prevRevenue =
        previousInvoices?.reduce(
          (sum, inv) => sum + (inv.total_amount || 0),
          0
        ) || 0;

      const lineChange =
        prevLines > 0 ? ((totalLines - prevLines) / prevLines) * 100 : 0;
      const taskChange =
        prevTasks > 0 ? ((activeTasks - prevTasks) / prevTasks) * 100 : 0;
      const reviewChange =
        prevReviews > 0
          ? ((pendingReviews - prevReviews) / prevReviews) * 100
          : 0;
      const revenueChange =
        prevRevenue > 0
          ? ((monthlyRevenue - prevRevenue) / prevRevenue) * 100
          : 0;

      updateCache("dashboard", {
        stats: {
          totalLines,
          activeTasks,
          pendingReviews,
          monthlyRevenue,
          lineChange,
          taskChange,
          reviewChange,
          revenueChange,
        },
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
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
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

  const dashboardStats = [
    {
      title: "Total Lines",
      value: stats.totalLines.toLocaleString(),
      change: formatChange(stats.lineChange),
      icon: Cable,
      color: "text-blue-600",
    },
    {
      title: "Active Tasks",
      value: stats.activeTasks.toString(),
      change: formatChange(stats.taskChange),
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "Pending Reviews",
      value: stats.pendingReviews.toString(),
      change: formatChange(stats.reviewChange),
      icon: AlertCircle,
      color: "text-orange-600",
    },
    {
      title: "Monthly Revenue",
      value: formatCurrency(stats.monthlyRevenue),
      change: formatChange(stats.revenueChange),
      icon: TrendingUp,
      color: "text-purple-600",
    },
  ];

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className='flex-1 flex flex-col min-h-screen w-full'>
        <Header />
        <main className='flex-1 w-full max-w-full p-4 md:p-6 lg:p-8 pb-20 lg:pb-6 space-y-4 overflow-x-hidden'>
          {loading ? (
            <DashboardSkeleton />
          ) : (
            <div className='w-full max-w-7xl mx-auto space-y-4'>
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

              {/* Stats Grid */}
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
                {/* Recent Activities */}
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

                {/* Quick Actions */}
                <Card className='lg:col-span-3'>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                      Common tasks and shortcuts
                    </CardDescription>
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
            </div>
          )}
        </main>
      </div>
      <MobileBottomNav />
      <AddTelephoneLineModal
        open={openTelephoneLineModal}
        onOpenChange={setOpenTelephoneLineModal}
        onSuccess={() => {
          setOpenTelephoneLineModal(false);
          fetchDashboardData(); // Refresh data after adding new line
        }}
      />
    </SidebarProvider>
  );
}
