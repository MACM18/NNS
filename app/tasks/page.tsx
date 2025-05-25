"use client";

import { useState } from "react";
import { Plus, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
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
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { TaskManagementTable } from "@/components/tables/task-management-table";
import { AddTaskModal } from "@/components/modals/add-task-modal";
import { useAuth } from "@/contexts/auth-context";
import { AuthWrapper } from "@/components/auth/auth-wrapper";
import { get } from "http";
import { getSupabaseClient } from "@/lib/supabase";

export default function TasksPage() {
  const { user, loading } = useAuth();
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month">(
    "month"
  );
  const [tasks, setTasks] = useState<any[]>([]);
  const supabase = getSupabaseClient();

  // Extract the current month's tasks from Supabase
  const fetchTasksForCurrentMonth = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfNextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      );

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .gte("created_at", startOfMonth.toISOString())
        .lt("created_at", startOfNextMonth.toISOString());

      if (error) {
        throw error;
      }
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };
  // Call the function to fetch tasks
  fetchTasksForCurrentMonth();

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
      </div>
    );
  }

  if (!user) {
    return <AuthWrapper />;
  }

  const handleAddSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />

        <main className='flex-1 space-y-6 p-6'>
          {/* Page Header */}
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
            <div>
              <h1 className='text-3xl font-bold'>Task Management</h1>
              <p className='text-muted-foreground'>
                Manage telecom installation and upgrade tasks
              </p>
            </div>
            <div className='flex gap-2'>
              <Select
                value={dateFilter}
                onValueChange={(value: any) => setDateFilter(value)}
              >
                <SelectTrigger className='w-[180px]'>
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
                className='gap-2'
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
              <TaskManagementTable
                refreshTrigger={refreshTrigger}
                dateFilter={dateFilter}
              />
            </CardContent>
          </Card>
        </main>

        {/* Add Task Modal */}
        <AddTaskModal
          open={addTaskModalOpen}
          onOpenChange={setAddTaskModalOpen}
          onSuccess={handleAddSuccess}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
