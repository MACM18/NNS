"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Users,
  BarChart3,
  TrendingUp,
  Award,
  Calendar,
  Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { WorkTrackingHeader } from "@/components/work-tracking/work-tracking-header";

interface DayData {
  date: string;
  count: number;
}

interface WorkerAnalytics {
  worker_id: string;
  worker_name: string;
  total_jobs: number;
  days_worked: number;
  avg_per_day: number;
  trend: "up" | "down" | "stable";
  rank: number;
}

interface AnalyticsData {
  month: number;
  year: number;
  totalJobs: number;
  uniqueEmployees: number;
  avgJobsPerEmployee: number;
  avgJobsPerDay: number;
  dailyTrend: DayData[];
  topPerformers: WorkerAnalytics[];
  allWorkers: WorkerAnalytics[];
  availableWorkers: Array<{ id: string; full_name: string | null }>;
}

const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const yearOptions = Array.from({ length: 6 }, (_, idx) => {
  const base = new Date().getFullYear();
  return base - 2 + idx;
});

export default function WorkTrackingAnalyticsPage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const { toast } = useToast();

  // Check authorization
  useEffect(() => {
    if (!authLoading) {
      const normalizedRole = (role || "").toLowerCase();
      if (!normalizedRole || !["admin", "moderator"].includes(normalizedRole)) {
        router.replace("/");
      }
    }
  }, [role, authLoading, router]);

  if (authLoading) {
    return null;
  }

  const normalizedRole = (role || "").toLowerCase();
  if (!normalizedRole || !["admin", "moderator"].includes(normalizedRole)) {
    return null;
  }

  const getAuthToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const fetchWithAuth = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => {
    let token = await getAuthToken();
    let response = await fetch(input, {
      ...init,
      credentials: "include",
      headers: (() => {
        const headers = new Headers(init?.headers || {});
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        return headers;
      })(),
    });

    if (response.status === 401) {
      await supabase.auth.refreshSession();
      token = await getAuthToken();
      response = await fetch(input, {
        ...init,
        credentials: "include",
        headers: (() => {
          const headers = new Headers(init?.headers || {});
          if (token) {
            headers.set("Authorization", `Bearer ${token}`);
          }
          return headers;
        })(),
      });
    }

    return response;
  };

  const handleUnauthorized = (status: number, message?: string) => {
    const description =
      message ||
      (status === 403
        ? "You need admin or moderator permissions to view analytics."
        : "Please sign in again to continue.");

    toast({
      title: status === 403 ? "Access denied" : "Session expired",
      description,
      variant: "destructive",
    });

    if (status === 403) {
      router.replace("/");
      return;
    }

    if (!user) {
      const redirect = encodeURIComponent(
        pathname || "/dashboard/work-tracking/analytics"
      );
      router.replace(`/login?redirect=${redirect}`);
    }
  };

  const fetchAnalytics = async (month: number, year: number) => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(
        `/api/work-assignments?month=${month}&year=${year}`
      );
      const json = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        handleUnauthorized(res.status, json.error);
        return;
      }
      if (!res.ok) {
        throw new Error(json.error || "Failed to load analytics");
      }

      // Process data for analytics
      const dailyCount = new Map<string, number>();
      const workerStats = new Map<
        string,
        { name: string; dates: Set<string>; count: number }
      >();

      json.days.forEach((day: any) => {
        let dayTotal = 0;
        day.lines.forEach((line: any) => {
          dayTotal += line.assignments.length;
          line.assignments.forEach((assignment: any) => {
            const existing = workerStats.get(assignment.worker_id);
            if (existing) {
              existing.count += 1;
              existing.dates.add(day.date);
            } else {
              workerStats.set(assignment.worker_id, {
                name: assignment.worker_name,
                dates: new Set([day.date]),
                count: 1,
              });
            }
          });
        });
        dailyCount.set(day.date, dayTotal);
      });

      const dailyTrend = Array.from(dailyCount.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const allWorkers: WorkerAnalytics[] = Array.from(workerStats.entries())
        .map(([id, stats], index) => {
          const daysWorked = stats.dates.size;
          const avgPerDay = daysWorked > 0 ? stats.count / daysWorked : 0;
          return {
            worker_id: id,
            worker_name: stats.name,
            total_jobs: stats.count,
            days_worked: daysWorked,
            avg_per_day: avgPerDay,
            trend: "stable" as const,
            rank: index + 1,
          };
        })
        .sort((a, b) => b.total_jobs - a.total_jobs)
        .map((worker, idx) => ({ ...worker, rank: idx + 1 }));

      const totalJobs = allWorkers.reduce((sum, w) => sum + w.total_jobs, 0);
      const uniqueEmployees = allWorkers.length;

      setAnalytics({
        month,
        year,
        totalJobs,
        uniqueEmployees,
        avgJobsPerEmployee:
          uniqueEmployees > 0 ? totalJobs / uniqueEmployees : 0,
        avgJobsPerDay:
          dailyTrend.length > 0
            ? dailyTrend.reduce((sum, d) => sum + d.count, 0) /
              dailyTrend.length
            : 0,
        dailyTrend,
        topPerformers: allWorkers.slice(0, 5),
        allWorkers,
        availableWorkers: json.workers || [],
      });
    } catch (error: any) {
      toast({
        title: "Unable to load analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedMonth, selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const filteredWorkers = useMemo(() => {
    if (!analytics || selectedEmployee === "all")
      return analytics?.allWorkers ?? [];
    return analytics.allWorkers.filter((w) => w.worker_id === selectedEmployee);
  }, [analytics, selectedEmployee]);

  const maxDailyJobs = useMemo(() => {
    return Math.max(...(analytics?.dailyTrend.map((d) => d.count) ?? [1]), 1);
  }, [analytics]);

  return (
    <div className='space-y-6'>
      <WorkTrackingHeader />
      
      <Card className='p-4 shadow-sm'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-xl font-semibold'>Performance analytics</h2>
            <p className='text-sm text-muted-foreground'>
              Deep insights into employee productivity and trends.
            </p>
          </div>
          <div className='flex gap-2'>
            <Select
              value={selectedEmployee}
              onValueChange={setSelectedEmployee}
            >
              <SelectTrigger className='w-[180px]'>
                <SelectValue placeholder='All employees' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All employees</SelectItem>
                {analytics?.availableWorkers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.full_name || "Unnamed"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(Number(value))}
            >
              <SelectTrigger className='w-[140px]'>
                <SelectValue placeholder='Month' />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(Number(value))}
            >
              <SelectTrigger className='w-[120px]'>
                <SelectValue placeholder='Year' />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant='outline'
              onClick={() => fetchAnalytics(selectedMonth, selectedYear)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                "Refresh"
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card className='p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-xs text-muted-foreground uppercase mb-1'>
                Total jobs
              </p>
              <p className='text-2xl font-bold'>{analytics?.totalJobs ?? 0}</p>
            </div>
            <BarChart3 className='h-8 w-8 text-blue-500' />
          </div>
        </Card>

        <Card className='p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-xs text-muted-foreground uppercase mb-1'>
                Active employees
              </p>
              <p className='text-2xl font-bold'>
                {analytics?.uniqueEmployees ?? 0}
              </p>
            </div>
            <Users className='h-8 w-8 text-green-500' />
          </div>
        </Card>

        <Card className='p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-xs text-muted-foreground uppercase mb-1'>
                Avg/employee
              </p>
              <p className='text-2xl font-bold'>
                {analytics?.avgJobsPerEmployee.toFixed(1) ?? "0"}
              </p>
            </div>
            <Target className='h-8 w-8 text-orange-500' />
          </div>
        </Card>

        <Card className='p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-xs text-muted-foreground uppercase mb-1'>
                Avg/day
              </p>
              <p className='text-2xl font-bold'>
                {analytics?.avgJobsPerDay.toFixed(1) ?? "0"}
              </p>
            </div>
            <Calendar className='h-8 w-8 text-purple-500' />
          </div>
        </Card>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        {/* Daily Trend Chart */}
        <Card className='p-4'>
          <h3 className='text-lg font-semibold mb-4'>Daily trend</h3>
          {loading ? (
            <div className='flex items-center justify-center h-64'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : (
            <ScrollArea className='h-64'>
              <div className='space-y-2 pr-4'>
                {analytics?.dailyTrend.map((day) => (
                  <div key={day.date} className='flex items-center gap-3'>
                    <span className='text-xs text-muted-foreground w-20 shrink-0'>
                      {new Date(day.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <div className='flex-1 bg-muted rounded-full h-6 overflow-hidden relative'>
                      <div
                        className='bg-gradient-to-r from-blue-500 to-blue-600 h-full flex items-center px-2 transition-all'
                        style={{
                          width: `${(day.count / maxDailyJobs) * 100}%`,
                        }}
                      >
                        {day.count > 0 && (
                          <span className='text-xs font-semibold text-white'>
                            {day.count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {analytics?.dailyTrend.length === 0 && (
                  <p className='text-sm text-muted-foreground text-center py-8'>
                    No data available for this period
                  </p>
                )}
              </div>
            </ScrollArea>
          )}
        </Card>

        {/* Top Performers */}
        <Card className='p-4'>
          <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
            <Award className='h-5 w-5 text-yellow-500' />
            Top performers
          </h3>
          {loading ? (
            <div className='flex items-center justify-center h-64'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : (
            <ScrollArea className='h-64'>
              <div className='space-y-3'>
                {analytics?.topPerformers.map((worker, idx) => (
                  <div
                    key={worker.worker_id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg",
                      idx === 0 &&
                        "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200",
                      idx === 1 &&
                        "bg-gray-50 dark:bg-gray-950/20 border border-gray-200",
                      idx === 2 &&
                        "bg-orange-50 dark:bg-orange-950/20 border border-orange-200",
                      idx > 2 && "bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
                        idx === 0 && "bg-yellow-500 text-white",
                        idx === 1 && "bg-gray-400 text-white",
                        idx === 2 && "bg-orange-500 text-white",
                        idx > 2 &&
                          "bg-muted-foreground/20 text-muted-foreground"
                      )}
                    >
                      {idx + 1}
                    </div>
                    <div className='flex-1'>
                      <p className='font-semibold text-sm'>
                        {worker.worker_name}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {worker.days_worked} days •{" "}
                        {worker.avg_per_day.toFixed(1)} avg/day
                      </p>
                    </div>
                    <Badge variant='outline' className='font-bold'>
                      {worker.total_jobs}
                    </Badge>
                  </div>
                ))}
                {analytics?.topPerformers.length === 0 && (
                  <p className='text-sm text-muted-foreground text-center py-8'>
                    No performance data available
                  </p>
                )}
              </div>
            </ScrollArea>
          )}
        </Card>
      </div>

      {/* Detailed Worker Stats */}
      <Card className='p-4'>
        <h3 className='text-lg font-semibold mb-4'>
          {selectedEmployee === "all" ? "All employees" : "Employee details"}
        </h3>
        <ScrollArea className='h-96'>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='border-b'>
                <tr className='text-left'>
                  <th className='pb-2 font-semibold'>Rank</th>
                  <th className='pb-2 font-semibold'>Employee</th>
                  <th className='pb-2 font-semibold text-right'>Total jobs</th>
                  <th className='pb-2 font-semibold text-right'>Days worked</th>
                  <th className='pb-2 font-semibold text-right'>Avg/day</th>
                  <th className='pb-2 font-semibold text-center'>Trend</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((worker) => (
                  <tr
                    key={worker.worker_id}
                    className='border-b hover:bg-muted/50'
                  >
                    <td className='py-3'>
                      <Badge variant='outline' className='font-mono'>
                        #{worker.rank}
                      </Badge>
                    </td>
                    <td className='py-3 font-medium'>{worker.worker_name}</td>
                    <td className='py-3 text-right font-semibold'>
                      {worker.total_jobs}
                    </td>
                    <td className='py-3 text-right'>{worker.days_worked}</td>
                    <td className='py-3 text-right'>
                      {worker.avg_per_day.toFixed(2)}
                    </td>
                    <td className='py-3 text-center'>
                      <TrendingUp className='h-4 w-4 text-green-600 mx-auto' />
                    </td>
                  </tr>
                ))}
                {filteredWorkers.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className='py-8 text-center text-muted-foreground'
                    >
                      No employee data available for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
