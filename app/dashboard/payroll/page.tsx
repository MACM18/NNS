"use client";

import { useEffect, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import {
  DollarSign,
  Users,
  Calendar,
  Plus,
  Calculator,
  CheckCircle,
  CreditCard,
  Loader2,
  FileText,
  Clock,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  Columns,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotification } from "@/contexts/notification-context";
import { useAuth } from "@/contexts/auth-context";
import type { PayrollPeriod, PayrollSummary } from "@/types/payroll";
import Link from "next/link";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const COLUMNS = [
  { id: "name", label: "Period" },
  { id: "date_range", label: "Date Range" },
  { id: "status", label: "Status" },
  { id: "workers", label: "Workers" },
  { id: "total_amount", label: "Total Amount" },
  { id: "actions", label: "Actions" },
];

export default function PayrollPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [processingPeriod, setProcessingPeriod] = useState<string | null>(null);

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(COLUMNS.map((c) => c.id))
  );

  const toggleColumn = (id: string) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisibleColumns(newVisible);
  };

  // Form state
  const [periodForm, setPeriodForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    name: "",
  });

  const { addNotification } = useNotification();
  const { role } = useAuth();
  const canManage = role === "admin" || role === "moderator";

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, periodsRes] = await Promise.all([
        fetch("/api/payroll/periods?action=summary"),
        fetch("/api/payroll/periods?pageSize=20"),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data.data);
      }

      if (periodsRes.ok) {
        const data = await periodsRes.json();
        setPeriods(data.data || []);
      }
    } catch (error) {
      addNotification({
        title: "Error",
        message: "Failed to load payroll data",
        type: "error",
        category: "system",
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Auto-generate period name when month/year changes
    const name = `${MONTHS[periodForm.month - 1]} ${periodForm.year} Payroll`;
    setPeriodForm((prev) => ({ ...prev, name }));
  }, [periodForm.month, periodForm.year]);

  const handleCreatePeriod = async () => {
    try {
      const startDate = startOfMonth(
        new Date(periodForm.year, periodForm.month - 1)
      );
      const endDate = endOfMonth(startDate);

      const response = await fetch("/api/payroll/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: periodForm.name,
          month: periodForm.month,
          year: periodForm.year,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create period");
      }

      addNotification({
        title: "Success",
        message: "Payroll period created",
        type: "success",
        category: "system",
      });

      setCreateModalOpen(false);
      fetchData();
    } catch (error) {
      addNotification({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to create period",
        type: "error",
        category: "system",
      });
    }
  };

  const handleAction = async (periodId: string, action: string) => {
    try {
      setProcessingPeriod(periodId);

      const response = await fetch(`/api/payroll/periods/${periodId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action}`);
      }

      const actionMessages: Record<string, string> = {
        calculate: "Payroll calculated successfully",
        approve: "Payroll approved",
        pay: "Payroll marked as paid",
      };

      addNotification({
        title: "Success",
        message: actionMessages[action] || "Action completed",
        type: "success",
        category: "system",
      });

      fetchData();
    } catch (error) {
      addNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Action failed",
        type: "error",
        category: "system",
      });
    } finally {
      setProcessingPeriod(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { className: string; icon: React.ReactNode }
    > = {
      draft: {
        className: "bg-gray-500",
        icon: <FileText className='h-3 w-3 mr-1' />,
      },
      processing: {
        className: "bg-yellow-500",
        icon: <Clock className='h-3 w-3 mr-1' />,
      },
      approved: {
        className: "bg-blue-500",
        icon: <CheckCircle className='h-3 w-3 mr-1' />,
      },
      paid: {
        className: "bg-green-500",
        icon: <CreditCard className='h-3 w-3 mr-1' />,
      },
    };
    const variant = variants[status] || variants.draft;
    return (
      <Badge className={variant.className}>
        {variant.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className='flex-1 space-y-4 p-4 md:p-8 pt-6'>
        <div className='flex items-center justify-center h-64'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      </div>
    );
  }

  return (
    <div className='flex-1 space-y-4 p-4 md:p-8 pt-6'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>Payroll</h2>
          <p className='text-muted-foreground'>
            Manage worker payments and salary processing
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className='h-4 w-4 mr-2' />
            New Payroll Period
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Periods</CardTitle>
            <Calendar className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {summary?.totalPeriods || 0}
            </div>
            <p className='text-xs text-muted-foreground'>
              {summary?.draftPeriods || 0} drafts,{" "}
              {summary?.approvedPeriods || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Paid</CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(summary?.totalPaidAmount || 0)}
            </div>
            <p className='text-xs text-muted-foreground'>
              Across {summary?.paidPeriods || 0} periods
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Current Period
            </CardTitle>
            <TrendingUp className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {summary?.currentPeriod
                ? formatCurrency(summary.currentPeriod.totalAmount)
                : "N/A"}
            </div>
            <p className='text-xs text-muted-foreground'>
              {summary?.currentPeriod?.name || "No active period"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Pending Approval
            </CardTitle>
            <AlertCircle className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {periods.filter((p) => p.status === "processing").length}
            </div>
            <p className='text-xs text-muted-foreground'>
              Periods awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Periods Table */}
      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <div className='space-y-1.5'>
            <CardTitle>Payroll Periods</CardTitle>
            <CardDescription>
              Manage monthly payroll periods and payments
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm' className='h-8'>
                <Columns className='mr-2 h-4 w-4' />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {COLUMNS.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className='capitalize'
                  checked={visibleColumns.has(column.id)}
                  onCheckedChange={() => toggleColumn(column.id)}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.has("name") && (
                    <TableHead className='min-w-[180px]'>Period</TableHead>
                  )}
                  {visibleColumns.has("date_range") && (
                    <TableHead className='min-w-[120px]'>Date Range</TableHead>
                  )}
                  {visibleColumns.has("status") && (
                    <TableHead className='min-w-[100px]'>Status</TableHead>
                  )}
                  {visibleColumns.has("workers") && (
                    <TableHead className='min-w-[100px]'>Workers</TableHead>
                  )}
                  {visibleColumns.has("total_amount") && (
                    <TableHead className='min-w-[120px]'>Total Amount</TableHead>
                  )}
                  {visibleColumns.has("actions") && (
                    <TableHead className='min-w-[200px]'>Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.size}
                      className='text-center text-muted-foreground py-8'
                    >
                      No payroll periods yet. Create your first period to get
                      started.
                    </TableCell>
                  </TableRow>
                ) : (
                  periods.map((period) => (
                    <TableRow key={period.id}>
                      {visibleColumns.has("name") && (
                        <TableCell className='font-medium'>
                          {period.name}
                        </TableCell>
                      )}
                      {visibleColumns.has("date_range") && (
                        <TableCell>
                          {format(new Date(period.startDate), "MMM d")} -{" "}
                          {format(new Date(period.endDate), "MMM d, yyyy")}
                        </TableCell>
                      )}
                      {visibleColumns.has("status") && (
                        <TableCell>{getStatusBadge(period.status)}</TableCell>
                      )}
                      {visibleColumns.has("workers") && (
                        <TableCell>
                          <div className='flex items-center gap-1'>
                            <Users className='h-4 w-4 text-muted-foreground' />
                            {period._count?.payments || 0}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.has("total_amount") && (
                        <TableCell className='font-mono'>
                          {formatCurrency(period.totalAmount)}
                        </TableCell>
                      )}
                      {visibleColumns.has("actions") && (
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            {canManage && period.status === "draft" && (
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() =>
                                  handleAction(period.id, "calculate")
                                }
                                disabled={processingPeriod === period.id}
                              >
                                {processingPeriod === period.id ? (
                                  <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                  <>
                                    <Calculator className='h-4 w-4 mr-1' />
                                    Calculate
                                  </>
                                )}
                              </Button>
                            )}
                            {canManage && period.status === "processing" && (
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() =>
                                  handleAction(period.id, "approve")
                                }
                                disabled={processingPeriod === period.id}
                              >
                                {processingPeriod === period.id ? (
                                  <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                  <>
                                    <CheckCircle className='h-4 w-4 mr-1' />
                                    Approve
                                  </>
                                )}
                              </Button>
                            )}
                            {canManage && period.status === "approved" && (
                              <Button
                                size='sm'
                                variant='default'
                                onClick={() => handleAction(period.id, "pay")}
                                disabled={processingPeriod === period.id}
                              >
                                {processingPeriod === period.id ? (
                                  <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                  <>
                                    <CreditCard className='h-4 w-4 mr-1' />
                                    Mark Paid
                                  </>
                                )}
                              </Button>
                            )}
                            <Button size='sm' variant='ghost' asChild>
                              <Link href={`/dashboard/payroll/${period.id}`}>
                                View
                                <ChevronRight className='h-4 w-4 ml-1' />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Period Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Create Payroll Period</DialogTitle>
            <DialogDescription>
              Create a new payroll period for processing worker payments
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>Month</Label>
                <Select
                  value={periodForm.month.toString()}
                  onValueChange={(value) =>
                    setPeriodForm({ ...periodForm, month: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Year</Label>
                <Select
                  value={periodForm.year.toString()}
                  onValueChange={(value) =>
                    setPeriodForm({ ...periodForm, year: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(5)].map((_, i) => {
                      const year = new Date().getFullYear() - 1 + i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='space-y-2'>
              <Label>Period Name</Label>
              <Input
                value={periodForm.name}
                onChange={(e) =>
                  setPeriodForm({ ...periodForm, name: e.target.value })
                }
                placeholder='January 2026 Payroll'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePeriod} disabled={!periodForm.name}>
              Create Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
