"use client";

import { useState, useEffect } from "react";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import {
  Plus,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TaskManagementTable } from "@/components/tables/task-management-table";
import { AddTaskModal } from "@/components/modals/add-task-modal";
import { useAuth } from "@/contexts/auth-context";
import { AuthWrapper } from "@/components/auth/auth-wrapper";
import { useDataCache } from "@/contexts/data-cache-context";
import type { TaskRecord } from "@/types/tasks";
import { TasksSkeleton } from "@/components/skeletons/tasks-skeleton";

type DateFilter = "today" | "week" | "month";

function isDateFilter(value: string): value is DateFilter {
  return value === "today" || value === "week" || value === "month";
}

export default function TasksPage() {
  const { user, loading } = useAuth();
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dateFilter, setDateFilter] = useState<DateFilter>("month");
  const { cache, updateCache } = useDataCache();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tasks = cache.tasks.data || [];

  // Helper to get date range based on filter
  const getDateRange = (filter: DateFilter) => {
    const now = new Date();
    let start: Date, end: Date;
    if (filter === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else if (filter === "week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
      start = new Date(now.getFullYear(), now.getMonth(), diff);
      end = new Date(start);
      end.setDate(start.getDate() + 7);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
    return [start, end];
  };

  // Fetch tasks for the selected period
  const fetchTasksForPeriod = async (filter: DateFilter) => {
    setIsRefreshing(true);
    try {
      const [start, end] = getDateRange(filter);
      const response = await fetch(
        `/api/tasks?start=${start.toISOString()}&end=${end.toISOString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch tasks");
      const result = await response.json();
      updateCache("tasks", { data: result.data || [] });
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasksForPeriod(dateFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  // Refresh data when page becomes visible again
  usePageVisibility(() => {
    if (user) {
      fetchTasksForPeriod(dateFilter);
      setRefreshTrigger((prev) => prev + 1);
    }
  }, [user, dateFilter]);

  if (!user && !loading) {
    return <AuthWrapper />;
  }

  const handleAddSuccess = (newTask: TaskRecord) => {
    // Update cache immediately for stats and local state
    const existingTasks = (cache.tasks.data as TaskRecord[]) || [];
    const dedupedTasksMap = new Map<string, TaskRecord>();
    [newTask, ...existingTasks].forEach((task) => {
      dedupedTasksMap.set(task.id, task);
    });
    const dedupedTasks = Array.from(dedupedTasksMap.values());

    updateCache("tasks", { data: dedupedTasks });
    setRefreshTrigger((prev) => prev + 1);
    fetchTasksForPeriod(dateFilter);
  };

  return (
    <div className='space-y-6'>
      {loading ? (
        <TasksSkeleton />
      ) : (
        <>
          {/* Page Header */}
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
            <div>
              <h1 className='text-2xl sm:text-3xl font-bold'>
                Task Management
              </h1>
              <p className='text-muted-foreground'>
                Manage telecom installation and upgrade tasks
              </p>
            </div>
            <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => fetchTasksForPeriod(dateFilter)}
                disabled={isRefreshing}
                className='w-full sm:w-auto'
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""
                    }`}
                />
                Refresh
              </Button>
              <Select
                value={dateFilter}
                onValueChange={(value) => {
                  if (isDateFilter(value)) setDateFilter(value);
                }}
              >
                <SelectTrigger className='w-full sm:w-[180px]'>
                  <SelectValue placeholder='Select period' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='today'>Today</SelectItem>
                  <SelectItem value='week'>This Week</SelectItem>
                  <SelectItem value='month'>This Month</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => setAddTaskModalOpen(true)}
                className='gap-2 w-full sm:w-auto'
              >
                <Plus className='h-4 w-4' />
                Add Task
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Pending Tasks
                </CardTitle>
                <Clock className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {tasks.filter((task) => task.status === "pending").length}
                </div>
                <p className='text-xs text-muted-foreground'>
                  {
                    tasks.filter((task) => {
                      if (task.status !== "pending") return false;
                      const createdAt = new Date(task.created_at);
                      const now = new Date();
                      const yesterday = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate() - 1
                      );
                      return (
                        createdAt.getFullYear() === yesterday.getFullYear() &&
                        createdAt.getMonth() === yesterday.getMonth() &&
                        createdAt.getDate() === yesterday.getDate()
                      );
                    }).length
                  }{" "}
                  from yesterday
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Accepted Tasks
                </CardTitle>
                <CheckCircle className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {tasks.filter((task) => task.status === "accepted").length}
                </div>
                <p className='text-xs text-muted-foreground'>In progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Completed Tasks
                </CardTitle>
                <Calendar className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {tasks.filter((task) => task.status === "completed").length}
                </div>
                <p className='text-xs text-muted-foreground'>This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Rejected Tasks
                </CardTitle>
                <XCircle className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {tasks.filter((task) => task.status === "rejected").length}
                </div>
                <p className='text-xs text-muted-foreground'>Tasks rejected</p>
              </CardContent>
            </Card>
          </div>

          {/* Task Management Table */}
          <Card>
            <CardHeader>
              <CardTitle>Task Management</CardTitle>
              <CardDescription>
                Manage telecom installation tasks with Accept/Reject actions and
                completion tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='overflow-x-auto'>
                <TaskManagementTable
                  refreshTrigger={refreshTrigger}
                  dateFilter={dateFilter}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Task Modal */}
      <AddTaskModal
        open={addTaskModalOpen}
        onOpenChange={setAddTaskModalOpen}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
