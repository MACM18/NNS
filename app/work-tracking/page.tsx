"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Users as UsersIcon, Trash2 } from "lucide-react";

interface WorkerOption {
  id: string;
  full_name: string | null;
  role: string | null;
}

interface AssignmentInfo {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_role: string | null;
  assigned_date: string;
}

interface LineInfo {
  id: string;
  date: string;
  telephone_no: string | null;
  customer_name: string | null;
  address: string | null;
  dp: string | null;
  assignments: AssignmentInfo[];
}

interface DayInfo {
  date: string;
  lines: LineInfo[];
}

interface CalendarResponse {
  month: number;
  year: number;
  days: DayInfo[];
  workers: WorkerOption[];
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

export default function WorkTrackingCalendarPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const { toast } = useToast();

  const dayMap = useMemo(() => {
    const map = new Map<string, DayInfo>();
    data?.days.forEach((day) => {
      map.set(day.date, day);
    });
    return map;
  }, [data]);

  const workers = data?.workers ?? [];

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
        ? "You need admin or moderator permissions to use work tracking."
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
      const redirect = encodeURIComponent(pathname || "/work-tracking");
      router.replace(`/login?redirect=${redirect}`);
    }
  };

  const fetchData = async (month: number, year: number) => {
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
        throw new Error(json.error || "Failed to load work assignments");
      }
      setData(json);
    } catch (error: any) {
      toast({
        title: "Unable to load assignments",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedMonth, selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth - 1));
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [selectedMonth, selectedYear]);

  const handleOpenDay = (date: Date, lineId?: string) => {
    const key = format(date, "yyyy-MM-dd");
    setActiveDate(key);
    setActiveLineId(lineId ?? null);
    setDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!activeDate || !selectedWorker || !activeLineId) {
      toast({
        title: "Select worker and line",
        description: "Choose both a worker and a line before assigning.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAssignLoading(true);
      const res = await fetchWithAuth("/api/work-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineId: activeLineId,
          workerId: selectedWorker,
          date: activeDate,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        handleUnauthorized(res.status, json.error);
        return;
      }
      if (!res.ok) {
        throw new Error(json.error || "Failed to assign worker");
      }
      toast({ title: "Worker assigned" });
      setSelectedWorker(null);
      await fetchData(selectedMonth, selectedYear);
    } catch (error: any) {
      toast({
        title: "Assignment failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      const res = await fetchWithAuth("/api/work-assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        handleUnauthorized(res.status, json.error);
        return;
      }
      if (!res.ok) {
        throw new Error(json.error || "Failed to remove assignment");
      }
      toast({ title: "Assignment removed" });
      await fetchData(selectedMonth, selectedYear);
    } catch (error: any) {
      toast({
        title: "Removal failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const activeDay = activeDate ? dayMap.get(activeDate) : null;
  const linesForActiveDay = activeDay?.lines ?? [];

  useEffect(() => {
    if (activeLineId) {
      const exists = linesForActiveDay.some((line) => line.id === activeLineId);
      if (!exists) {
        setActiveLineId(null);
      }
    } else if (dialogOpen && linesForActiveDay.length > 0) {
      setActiveLineId(linesForActiveDay[0].id);
    }
  }, [linesForActiveDay, activeLineId, dialogOpen]);

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setActiveLineId(null);
      setSelectedWorker(null);
      setActiveDate(null);
    }
  };

  return (
    <div className='space-y-6'>
      <Card className='p-4 shadow-sm'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h2 className='text-xl font-semibold'>Monthly overview</h2>
            <p className='text-sm text-muted-foreground'>
              Assign team members to the lines they worked on.
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
              onClick={() => fetchData(selectedMonth, selectedYear)}
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

      <div className='grid grid-cols-7 gap-px rounded-lg border border-border bg-border overflow-hidden text-sm'>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className='bg-background py-2 text-center font-medium'>
            {day}
          </div>
        ))}
        {calendarDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayLines = dayMap.get(key)?.lines ?? [];
          const isCurrentMonth = isSameMonth(
            day,
            new Date(selectedYear, selectedMonth - 1)
          );
          return (
            <div
              key={key}
              className={cn(
                "min-h-[120px] bg-background p-2 border-border border-t",
                !isCurrentMonth && "bg-muted/40 text-muted-foreground",
                "cursor-pointer transition hover:bg-muted"
              )}
              onClick={() => handleOpenDay(day)}
            >
              <div className='flex items-center justify-between text-xs font-semibold mb-2'>
                <span>{format(day, "d")}</span>
                {dayLines.length > 0 && (
                  <Badge
                    variant='outline'
                    className='text-[10px] px-1 py-0 font-normal'
                  >
                    {dayLines.length} line{dayLines.length === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>
              <div className='space-y-1'>
                {dayLines.slice(0, 3).map((line) => (
                  <button
                    key={line.id}
                    className='w-full rounded bg-muted px-2 py-1 text-left text-xs hover:bg-muted/70'
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenDay(day, line.id);
                    }}
                  >
                    <div className='font-medium truncate'>
                      {line.telephone_no || line.customer_name || "Line"}
                    </div>
                    {line.assignments.length > 0 && (
                      <div className='text-[10px] text-muted-foreground truncate'>
                        {line.assignments
                          .map((assignment) => assignment.worker_name)
                          .join(", ")}
                      </div>
                    )}
                  </button>
                ))}
                {dayLines.length > 3 && (
                  <div className='text-[10px] text-muted-foreground'>
                    +{dayLines.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className='max-w-4xl'>
          <DialogHeader>
            <DialogTitle>
              {activeDate
                ? format(new Date(activeDate), "MMMM d, yyyy")
                : "Day details"}
            </DialogTitle>
            <DialogDescription>
              View lines scheduled for this day and assign the team members who
              worked on them.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 md:grid-cols-[1fr,300px]'>
            <ScrollArea className='h-[420px] rounded border border-border p-3'>
              <div className='space-y-4'>
                {linesForActiveDay.length === 0 && (
                  <div className='text-sm text-muted-foreground'>
                    No lines scheduled for this date.
                  </div>
                )}
                {linesForActiveDay.map((line) => (
                  <div
                    key={line.id}
                    className={cn(
                      "rounded border border-border p-3",
                      activeLineId === line.id && "border-primary"
                    )}
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div>
                        <h3 className='text-sm font-semibold'>
                          {line.telephone_no || line.customer_name || "Line"}
                        </h3>
                        <p className='text-xs text-muted-foreground'>
                          {line.address || "No address"}
                        </p>
                        {line.dp && (
                          <p className='text-xs text-muted-foreground'>
                            DP: {line.dp}
                          </p>
                        )}
                      </div>
                      <Button
                        variant={
                          activeLineId === line.id ? "default" : "outline"
                        }
                        size='sm'
                        onClick={() => setActiveLineId(line.id)}
                      >
                        Manage
                      </Button>
                    </div>

                    <div className='mt-3 space-y-2'>
                      <p className='text-xs font-medium text-muted-foreground'>
                        Assigned workers
                      </p>
                      {line.assignments.length === 0 && (
                        <p className='text-xs text-muted-foreground'>
                          No workers assigned yet.
                        </p>
                      )}
                      {line.assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className='flex items-center justify-between rounded border border-border px-2 py-1 text-xs'
                        >
                          <div className='flex items-center gap-2'>
                            <UsersIcon className='h-3 w-3 text-muted-foreground' />
                            <span>{assignment.worker_name}</span>
                            {assignment.worker_role && (
                              <Badge
                                variant='secondary'
                                className='text-[10px] uppercase'
                              >
                                {assignment.worker_role}
                              </Badge>
                            )}
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant='ghost' size='icon'>
                                <Trash2 className='h-4 w-4 text-destructive' />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Remove worker?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will detach {assignment.worker_name} from
                                  this line on{" "}
                                  {format(
                                    new Date(assignment.assigned_date),
                                    "MMMM d, yyyy"
                                  )}
                                  . This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemove(assignment.id)}
                                  className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className='h-[420px] rounded border border-dashed border-border p-4 flex flex-col gap-4'>
              <div>
                <h3 className='text-sm font-semibold'>Assign worker</h3>
                <p className='text-xs text-muted-foreground'>
                  Select a line and the worker who helped on that job.
                </p>
              </div>

              <div className='space-y-2'>
                <label className='text-xs font-medium text-muted-foreground'>
                  Line
                </label>
                <Select
                  value={activeLineId ?? undefined}
                  onValueChange={(value) => setActiveLineId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Choose a line' />
                  </SelectTrigger>
                  <SelectContent>
                    {linesForActiveDay.map((line) => (
                      <SelectItem key={line.id} value={line.id}>
                        {line.telephone_no || line.customer_name || "Line"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <label className='text-xs font-medium text-muted-foreground'>
                  Worker
                </label>
                <Select
                  value={selectedWorker ?? undefined}
                  onValueChange={(value) => setSelectedWorker(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Choose a worker' />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.length === 0 && (
                      <SelectItem value='__none' disabled>
                        No workers available
                      </SelectItem>
                    )}
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.full_name || "Unnamed"}
                        {worker.role ? ` (${worker.role})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className='mt-auto'
                onClick={handleAssign}
                disabled={assignLoading || !activeLineId || !selectedWorker}
              >
                {assignLoading ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <div className='flex items-center gap-2'>
                    <Plus className='h-4 w-4' />
                    <span>Assign worker</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
