"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

interface WorkerSummary {
  worker_id: string;
  worker_name: string;
  worker_role: string | null;
  assignments: number;
}

interface SummaryState {
  month: number;
  year: number;
  totals: WorkerSummary[];
  totalAssignments: number;
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
  const pathname = usePathname();
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const { toast } = useToast();

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
      const redirect = encodeURIComponent(pathname || "/work-tracking/summary");
      router.replace(`/login?redirect=${redirect}`);
    }
  };

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

      setSummary({ month, year, totals, totalAssignments });
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

  return (
    <div className='space-y-6'>
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

      <div className='grid gap-4 md:grid-cols-[1fr,300px]'>
        <Card className='p-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-semibold'>Team activity</h3>
            <Badge variant='secondary'>
              {summary?.totalAssignments ?? 0} assignment
              {summary && summary.totalAssignments === 1 ? "" : "s"}
            </Badge>
          </div>
          <ScrollArea className='mt-4 h-[420px]'>
            <div className='space-y-3'>
              {summary && summary.totals.length === 0 && !loading && (
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
              {summary?.totals.map((item) => (
                <Card key={item.worker_id} className='p-3'>
                  <div className='flex items-start justify-between gap-2'>
                    <div>
                      <div className='flex items-center gap-2'>
                        <Users className='h-4 w-4 text-muted-foreground' />
                        <span className='text-sm font-medium'>
                          {item.worker_name}
                        </span>
                      </div>
                      {item.worker_role && (
                        <p className='text-xs uppercase text-muted-foreground mt-1'>
                          {item.worker_role}
                        </p>
                      )}
                    </div>
                    <Badge variant='outline' className='text-xs font-semibold'>
                      {item.assignments} job{item.assignments === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className='p-4 space-y-3'>
          <h3 className='text-lg font-semibold'>How this helps</h3>
          <p className='text-sm text-muted-foreground'>
            Use this view to reconcile payments and monitor workload balance.
            Export to CSV via Supabase dashboards or extend this page with
            download actions.
          </p>
          <div className='rounded border border-dashed border-border p-3 text-sm text-muted-foreground'>
            Need more details? Filter by technician or export upcoming
            improvements straight from this section.
          </div>
        </Card>
      </div>
    </div>
  );
}
