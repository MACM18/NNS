"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
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
import { LineDetailsTable } from "@/components/tables/enhanced-line-details-table";
import { AssigneeManagementModal } from "@/components/modals/assignee-management-modal";
import { useAuth } from "@/contexts/auth-context";
import { AuthWrapper } from "@/components/auth/auth-wrapper";
import { useNotification } from "@/contexts/notification-context";
import { useDataCache } from "@/contexts/data-cache-context";
import { Button } from "@/components/ui/button";

interface LineStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
}

export default function LineDetailsPage() {
  const { user, loading } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [assigneeModalOpen, setAssigneeModalOpen] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { cache, updateCache } = useDataCache();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const lineStats = cache.lines.stats || {
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
  };

  const { addNotification } = useNotification();

  useEffect(() => {
    if (!cache.lines.lastUpdated) {
      fetchLineStats();
    }
  }, []);

  const fetchLineStats = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(
        `/api/lines?month=${selectedMonth}&year=${selectedYear}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch lines");
      }

      const result = await response.json();
      const lines = result.data || [];

      const stats = {
        total: lines.length,
        completed: lines.filter(
          (l: any) => l.completed === true || l.status === "completed"
        ).length,
        inProgress: lines.filter((l: any) => l.status === "in_progress").length,
        pending: lines.filter(
          (l: any) =>
            !(l.completed === true || l.status === "completed") &&
            l.status !== "in_progress"
        ).length,
      };

      updateCache("lines", {
        stats: stats,
      });
    } catch (error: any) {
      console.error("Stats error:", error);
      addNotification({
        title: "Error",
        message: `Failed to fetch line statistics: ${error.message}`,
        type: "error",
        category: "line_added",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

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

  const handleAssigneeSuccess = () => {
    fetchLineStats(); // Refresh data after assignee change
    setAssigneeModalOpen(false);
    setSelectedLineId(null);
  };

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

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i
  );

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold'>Line Details</h1>
          <p className='text-muted-foreground'>
            Manage telecom line installations and track progress
          </p>
        </div>
        <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
          <Button
            variant='outline'
            size='sm'
            onClick={fetchLineStats}
            disabled={isRefreshing}
            className='w-full sm:w-auto'
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Select
            value={selectedMonth.toString()}
            onValueChange={(value) => setSelectedMonth(Number.parseInt(value))}
          >
            <SelectTrigger className='w-full sm:w-[140px]'>
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
            onValueChange={(value) => setSelectedYear(Number.parseInt(value))}
          >
            <SelectTrigger className='w-full sm:w-[100px]'>
              <SelectValue placeholder='Year' />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Lines</CardTitle>
            <Calendar className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{lineStats.total}</div>
            <p className='text-xs text-muted-foreground'>
              {months.find((m) => m.value === selectedMonth)?.label}{" "}
              {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Completed</CardTitle>
            <CheckCircle className='h-4 w-4 text-green-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {lineStats.completed}
            </div>
            <p className='text-xs text-muted-foreground'>
              {lineStats.total > 0
                ? Math.round((lineStats.completed / lineStats.total) * 100)
                : 0}
              % completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>In Progress</CardTitle>
            <Clock className='h-4 w-4 text-blue-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-600'>
              {lineStats.inProgress}
            </div>
            <p className='text-xs text-muted-foreground'>
              Currently being worked on
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Pending</CardTitle>
            <AlertCircle className='h-4 w-4 text-orange-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-orange-600'>
              {lineStats.pending}
            </div>
            <p className='text-xs text-muted-foreground'>Awaiting assignment</p>
          </CardContent>
        </Card>
      </div>

      {/* Line Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Line Details</CardTitle>
          <CardDescription>
            Detailed view of all telecom lines for{" "}
            {months.find((m) => m.value === selectedMonth)?.label}{" "}
            {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LineDetailsTable
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            refreshTrigger={refreshTrigger}
            onAssigneeManage={(lineId) => {
              setSelectedLineId(lineId);
              setAssigneeModalOpen(true);
            }}
            onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
          />
        </CardContent>
      </Card>

      {/* Assignee Management Modal */}
      <AssigneeManagementModal
        open={assigneeModalOpen}
        onOpenChange={setAssigneeModalOpen}
        lineId={selectedLineId}
        onSuccess={handleAssigneeSuccess}
      />
    </div>
  );
}
