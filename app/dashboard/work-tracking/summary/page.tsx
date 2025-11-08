"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  TrendingUp,
  TrendingDown,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { WorkTrackingHeader } from "@/components/work-tracking/work-tracking-header";

interface WorkerSummary {
  worker_id: string;
  worker_name: string;
  worker_role: string | null;
  assignments: number;
  status?: "active" | "inactive" | "on-leave";
  performance?: number;
}

interface SummaryState {
  month: number;
  year: number;
  totals: WorkerSummary[];
  totalAssignments: number;
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

export default function WorkTrackingSummaryPage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const { toast } = useToast();

  const filteredTotals = useMemo(() => {
    if (!summary || selectedEmployee === "all") {
      return summary?.totals ?? [];
    }
    return summary.totals.filter((w) => w.worker_id === selectedEmployee);
  }, [summary, selectedEmployee]);

  // Check authorization and redirect if needed
  useEffect(() => {
    if (!authLoading) {
      const normalizedRole = (role || "").toLowerCase();
      if (!normalizedRole || !["admin", "moderator"].includes(normalizedRole)) {
        router.replace("/");
      }
    }
  }, [role, authLoading, router]);

  // Early return if still loading or unauthorized
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
        ? "You need admin or moderator permissions to view work tracking."
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
        pathname || "/dashboard/work-tracking/summary"
      );
      router.replace(`/login?redirect=${redirect}`);
    }
  };

  const pathname = usePathname();

  const fetchSummary = async (month: number, year: number) => {
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
        throw new Error(json.error || "Failed to load summary");
      }

      const totalsMap = new Map<string, WorkerSummary>();
      json.days.forEach((day: any) => {
        day.lines.forEach((line: any) => {
          line.assignments.forEach((assignment: any) => {
            const existing = totalsMap.get(assignment.worker_id);
            if (existing) {
              existing.assignments += 1;
            } else {
              totalsMap.set(assignment.worker_id, {
                worker_id: assignment.worker_id,
                worker_name: assignment.worker_name,
                worker_role: assignment.worker_role,
                assignments: 1,
              });
            }
          });
        });
      });

      const totals = Array.from(totalsMap.values()).sort(
        (a, b) => b.assignments - a.assignments
      );
      const totalAssignments = totals.reduce(
        (acc, item) => acc + item.assignments,
        0
      );

      // Calculate performance and status for each worker
      const average = totals.length > 0 ? totalAssignments / totals.length : 0;
      const enhancedTotals = totals.map((worker) => ({
        ...worker,
        performance: average > 0 ? (worker.assignments / average) * 100 : 100,
        status: (worker.assignments >= average
          ? "active"
          : worker.assignments > 0
          ? "inactive"
          : "on-leave") as "active" | "inactive" | "on-leave",
      }));

      setSummary({
        month,
        year,
        totals: enhancedTotals,
        totalAssignments,
        availableWorkers: json.workers || [],
      });
    } catch (error: any) {
      toast({
        title: "Unable to load summary",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(selectedMonth, selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-700 border-green-200";
      case "inactive":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-200";
      case "on-leave":
        return "bg-gray-500/10 text-gray-700 border-gray-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPerformanceIndicator = (performance?: number) => {
    if (!performance) return null;
    if (performance >= 100) {
      return <TrendingUp className='h-3 w-3 text-green-600' />;
    }
    return <TrendingDown className='h-3 w-3 text-orange-600' />;
  };

  return (
    <div className='space-y-6'>
      <WorkTrackingHeader />
      
      <Card className='p-4 shadow-sm'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-xl font-semibold'>Assignment summary</h2>
            <p className='text-sm text-muted-foreground'>
              Track how many jobs each team member completed for the selected
              period.
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
                {summary?.availableWorkers.map((worker) => (
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
              onClick={() => fetchSummary(selectedMonth, selectedYear)}
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

      <div className='grid gap-4 md:grid-cols-[1fr,320px]'>
        <Card className='p-4'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-semibold'>Team activity</h3>
            <Badge variant='secondary'>
              {filteredTotals.length} employee
              {filteredTotals.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <ScrollArea className='h-[480px]'>
            <div className='space-y-3'>
              {filteredTotals.length === 0 && !loading && (
                <p className='text-sm text-muted-foreground'>
                  No assignments for this period.
                </p>
              )}
              {loading && (
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <Loader2 className='h-4 w-4 animate-spin' /> Loading
                  summary...
                </div>
              )}
              {filteredTotals.map((item) => (
                <Card
                  key={item.worker_id}
                  className='p-4 hover:shadow-md transition-shadow'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 mb-2'>
                        <Users className='h-4 w-4 text-muted-foreground' />
                        <span className='text-sm font-semibold'>
                          {item.worker_name}
                        </span>
                        {getPerformanceIndicator(item.performance)}
                      </div>

                      <div className='flex items-center gap-2 flex-wrap'>
                        <Badge
                          variant='outline'
                          className={cn(
                            "text-[10px] capitalize",
                            getStatusColor(item.status)
                          )}
                        >
                          {item.status || "unknown"}
                        </Badge>
                        {item.worker_role && (
                          <Badge
                            variant='secondary'
                            className='text-[10px] uppercase'
                          >
                            {item.worker_role}
                          </Badge>
                        )}
                      </div>

                      {item.performance && (
                        <div className='mt-3 space-y-1'>
                          <div className='flex justify-between text-xs text-muted-foreground'>
                            <span>Performance</span>
                            <span>{item.performance.toFixed(0)}%</span>
                          </div>
                          <div className='w-full bg-muted rounded-full h-2 overflow-hidden'>
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                item.performance >= 100
                                  ? "bg-green-500"
                                  : "bg-orange-500"
                              )}
                              style={{
                                width: `${Math.min(item.performance, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className='text-right'>
                      <Badge
                        variant='outline'
                        className='text-sm font-bold mb-1'
                      >
                        {item.assignments}
                      </Badge>
                      <p className='text-[10px] text-muted-foreground'>
                        job{item.assignments === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <div className='space-y-4'>
          <Card className='p-4'>
            <h3 className='text-lg font-semibold mb-3'>Quick stats</h3>
            <div className='space-y-3'>
              <div className='flex justify-between items-center p-2 rounded bg-muted/50'>
                <span className='text-sm text-muted-foreground'>
                  Total jobs
                </span>
                <span className='font-bold'>
                  {summary?.totalAssignments ?? 0}
                </span>
              </div>
              <div className='flex justify-between items-center p-2 rounded bg-muted/50'>
                <span className='text-sm text-muted-foreground'>
                  Active employees
                </span>
                <span className='font-bold'>
                  {summary?.totals.filter((w) => w.status === "active")
                    .length ?? 0}
                </span>
              </div>
              <div className='flex justify-between items-center p-2 rounded bg-muted/50'>
                <span className='text-sm text-muted-foreground'>
                  Avg per employee
                </span>
                <span className='font-bold'>
                  {summary?.totals.length
                    ? (
                        summary.totalAssignments / summary.totals.length
                      ).toFixed(1)
                    : "0"}
                </span>
              </div>
            </div>
          </Card>

          <Card className='p-4 space-y-3'>
            <h3 className='text-sm font-semibold flex items-center gap-2'>
              <CheckCircle2 className='h-4 w-4 text-green-600' />
              Status guide
            </h3>
            <div className='space-y-2 text-xs'>
              <div className='flex items-center gap-2'>
                <Badge
                  variant='outline'
                  className='bg-green-500/10 text-green-700 border-green-200'
                >
                  Active
                </Badge>
                <span className='text-muted-foreground'>
                  ≥ Average performance
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <Badge
                  variant='outline'
                  className='bg-yellow-500/10 text-yellow-700 border-yellow-200'
                >
                  Inactive
                </Badge>
                <span className='text-muted-foreground'>
                  Below average, but working
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <Badge
                  variant='outline'
                  className='bg-gray-500/10 text-gray-700 border-gray-200'
                >
                  On-leave
                </Badge>
                <span className='text-muted-foreground'>
                  No assignments this period
                </span>
              </div>
            </div>
          </Card>

          <Card className='p-4 space-y-2'>
            <h3 className='text-sm font-semibold'>Export & reports</h3>
            <p className='text-xs text-muted-foreground'>
              Use this data for payroll reconciliation, performance reviews, and
              workload planning.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
