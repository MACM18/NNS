"use client";

import { useEffect, useState, useCallback, use } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Loader2,
  DollarSign,
  Users,
  TrendingUp,
  Minus,
  Download,
  Calculator,
  CheckCircle,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Separator } from "@/components/ui/separator";
import { useNotification } from "@/contexts/notification-context";
import { useAuth } from "@/contexts/auth-context";
import type {
  PayrollPeriod,
  WorkerPayment,
  AdjustmentCategory,
  AdjustmentType,
} from "@/types/payroll";
import Link from "next/link";
import { generateSalarySlipPDF } from "@/lib/salary-slip-pdf";

const ADJUSTMENT_CATEGORIES: Record<
  AdjustmentType,
  { label: string; options: { value: AdjustmentCategory; label: string }[] }
> = {
  bonus: {
    label: "Bonus",
    options: [
      { value: "performance_bonus", label: "Performance Bonus" },
      { value: "attendance_bonus", label: "Attendance Bonus" },
      { value: "overtime", label: "Overtime" },
      { value: "other", label: "Other Bonus" },
    ],
  },
  deduction: {
    label: "Deduction",
    options: [
      { value: "tax", label: "Tax" },
      { value: "advance", label: "Advance Recovery" },
      { value: "fine", label: "Fine/Penalty" },
      { value: "other", label: "Other Deduction" },
    ],
  },
};

export default function PayrollPeriodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [payments, setPayments] = useState<WorkerPayment[]>([]);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<WorkerPayment | null>(
    null
  );
  const [salarySlipPayment, setSalarySlipPayment] =
    useState<WorkerPayment | null>(null);
  const [processingAction, setProcessingAction] = useState(false);

  // Adjustment form
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: "bonus" as AdjustmentType,
    category: "" as AdjustmentCategory | "",
    description: "",
    amount: 0,
  });

  const { addNotification } = useNotification();
  const { role } = useAuth();
  const canManage = role === "admin" || role === "moderator";

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payroll/periods/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch period");
      }

      const data = await response.json();
      setPeriod(data.data);
      setPayments(data.data?.payments || []);
    } catch (error) {
      addNotification({
        title: "Error",
        message: "Failed to load payroll period",
        type: "error",
        category: "system",
      });
    } finally {
      setLoading(false);
    }
  }, [id, addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (action: string) => {
    try {
      setProcessingAction(true);

      const response = await fetch(`/api/payroll/periods/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action}`);
      }

      addNotification({
        title: "Success",
        message: `Action completed successfully`,
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
      setProcessingAction(false);
    }
  };

  const handleAddAdjustment = async () => {
    if (!selectedPayment || !adjustmentForm.category) return;

    try {
      const response = await fetch("/api/payroll/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerPaymentId: selectedPayment.id,
          type: adjustmentForm.type,
          category: adjustmentForm.category,
          description: adjustmentForm.description,
          amount: adjustmentForm.amount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add adjustment");
      }

      addNotification({
        title: "Success",
        message: "Adjustment added",
        type: "success",
        category: "system",
      });

      setAdjustmentModalOpen(false);
      setSelectedPayment(null);
      setAdjustmentForm({
        type: "bonus",
        category: "",
        description: "",
        amount: 0,
      });
      fetchData();
    } catch (error) {
      addNotification({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to add adjustment",
        type: "error",
        category: "system",
      });
    }
  };

  const handleDeleteAdjustment = async (adjustmentId: string) => {
    try {
      const response = await fetch(
        `/api/payroll/adjustments?id=${adjustmentId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete adjustment");
      }

      addNotification({
        title: "Success",
        message: "Adjustment deleted",
        type: "success",
        category: "system",
      });

      fetchData();
    } catch (error) {
      addNotification({
        title: "Error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete adjustment",
        type: "error",
        category: "system",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: "bg-gray-500",
      processing: "bg-yellow-500",
      approved: "bg-blue-500",
      paid: "bg-green-500",
      calculated: "bg-yellow-500",
    };
    return (
      <Badge className={variants[status] || "bg-gray-500"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
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

  if (!period) {
    return (
      <div className='flex-1 space-y-4 p-4 md:p-8 pt-6'>
        <div className='text-center py-12'>
          <h2 className='text-xl font-semibold'>Payroll Period Not Found</h2>
          <p className='text-muted-foreground mt-2'>
            The requested payroll period could not be found.
          </p>
          <Button asChild className='mt-4'>
            <Link href='/dashboard/payroll'>Back to Payroll</Link>
          </Button>
        </div>
      </div>
    );
  }

  const totals = {
    base: payments.reduce((sum, p) => sum + p.baseAmount, 0),
    bonus: payments.reduce((sum, p) => sum + p.bonusAmount, 0),
    deduction: payments.reduce((sum, p) => sum + p.deductionAmount, 0),
    net: payments.reduce((sum, p) => sum + p.netAmount, 0),
    lines: payments.reduce((sum, p) => sum + p.linesCompleted, 0),
  };

  return (
    <div className='flex-1 space-y-4 p-4 md:p-8 pt-6'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' asChild>
            <Link href='/dashboard/payroll'>
              <ArrowLeft className='h-5 w-5' />
            </Link>
          </Button>
          <div>
            <h2 className='text-3xl font-bold tracking-tight'>{period.name}</h2>
            <p className='text-muted-foreground'>
              {format(new Date(period.startDate), "MMM d")} -{" "}
              {format(new Date(period.endDate), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {getStatusBadge(period.status)}
          {canManage && period.status === "draft" && (
            <Button
              onClick={() => handleAction("calculate")}
              disabled={processingAction}
            >
              {processingAction ? (
                <Loader2 className='h-4 w-4 animate-spin mr-2' />
              ) : (
                <Calculator className='h-4 w-4 mr-2' />
              )}
              Calculate Payroll
            </Button>
          )}
          {canManage && period.status === "processing" && (
            <Button
              onClick={() => handleAction("approve")}
              disabled={processingAction}
            >
              {processingAction ? (
                <Loader2 className='h-4 w-4 animate-spin mr-2' />
              ) : (
                <CheckCircle className='h-4 w-4 mr-2' />
              )}
              Approve
            </Button>
          )}
          {canManage && period.status === "approved" && (
            <Button
              onClick={() => handleAction("pay")}
              disabled={processingAction}
            >
              {processingAction ? (
                <Loader2 className='h-4 w-4 animate-spin mr-2' />
              ) : (
                <CreditCard className='h-4 w-4 mr-2' />
              )}
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-5'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Workers</CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{payments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Lines Completed
            </CardTitle>
            <TrendingUp className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{totals.lines}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Base Amount</CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {formatCurrency(totals.base)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Bonuses</CardTitle>
            <Plus className='h-4 w-4 text-green-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {formatCurrency(totals.bonus)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Net Payroll</CardTitle>
            <DollarSign className='h-4 w-4 text-blue-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-600'>
              {formatCurrency(totals.net)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Worker Payments</CardTitle>
          <CardDescription>
            Individual payment breakdown for each worker
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='min-w-[150px]'>Worker</TableHead>
                  <TableHead className='min-w-[100px]'>Type</TableHead>
                  <TableHead className='min-w-[80px] text-right'>
                    Lines
                  </TableHead>
                  <TableHead className='min-w-[100px] text-right'>
                    Base
                  </TableHead>
                  <TableHead className='min-w-[100px] text-right'>
                    Bonus
                  </TableHead>
                  <TableHead className='min-w-[100px] text-right'>
                    Deduction
                  </TableHead>
                  <TableHead className='min-w-[100px] text-right'>
                    Net
                  </TableHead>
                  <TableHead className='min-w-[120px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className='text-center text-muted-foreground py-8'
                    >
                      No payments calculated yet. Click &quot;Calculate
                      Payroll&quot; to generate payments.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className='font-medium'>
                        {payment.worker?.fullName || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>
                          {payment.paymentType === "per_line"
                            ? "Per Line"
                            : "Monthly"}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right font-mono'>
                        {payment.linesCompleted}
                      </TableCell>
                      <TableCell className='text-right font-mono'>
                        {formatCurrency(payment.baseAmount)}
                      </TableCell>
                      <TableCell className='text-right font-mono text-green-600'>
                        {payment.bonusAmount > 0
                          ? `+${formatCurrency(payment.bonusAmount)}`
                          : "-"}
                      </TableCell>
                      <TableCell className='text-right font-mono text-red-600'>
                        {payment.deductionAmount > 0
                          ? `-${formatCurrency(payment.deductionAmount)}`
                          : "-"}
                      </TableCell>
                      <TableCell className='text-right font-mono font-bold'>
                        {formatCurrency(payment.netAmount)}
                      </TableCell>
                      <TableCell>
                        <div className='flex gap-1'>
                          {canManage && period.status !== "paid" && (
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() => {
                                setSelectedPayment(payment);
                                setAdjustmentModalOpen(true);
                              }}
                            >
                              <Plus className='h-4 w-4' />
                            </Button>
                          )}
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => setSalarySlipPayment(payment)}
                          >
                            <FileText className='h-4 w-4' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Adjustments List */}
      {payments.some((p) => p.adjustments && p.adjustments.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Adjustments</CardTitle>
            <CardDescription>
              All bonuses and deductions for this period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className='text-right'>Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments
                    .flatMap((p) =>
                      (p.adjustments || []).map((a) => ({
                        ...a,
                        workerName: p.worker?.fullName || "Unknown",
                        paymentStatus: p.status,
                      }))
                    )
                    .map((adjustment) => (
                      <TableRow key={adjustment.id}>
                        <TableCell>{adjustment.workerName}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              adjustment.type === "bonus"
                                ? "bg-green-500"
                                : "bg-red-500"
                            }
                          >
                            {adjustment.type === "bonus"
                              ? "Bonus"
                              : "Deduction"}
                          </Badge>
                        </TableCell>
                        <TableCell className='capitalize'>
                          {adjustment.category.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>{adjustment.description}</TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            adjustment.type === "bonus"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {adjustment.type === "bonus" ? "+" : "-"}
                          {formatCurrency(adjustment.amount)}
                        </TableCell>
                        <TableCell>
                          {canManage && adjustment.paymentStatus !== "paid" && (
                            <Button
                              size='sm'
                              variant='ghost'
                              onClick={() =>
                                handleDeleteAdjustment(adjustment.id)
                              }
                            >
                              <Trash2 className='h-4 w-4 text-destructive' />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Adjustment Modal */}
      <Dialog open={adjustmentModalOpen} onOpenChange={setAdjustmentModalOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Add Adjustment</DialogTitle>
            <DialogDescription>
              Add a bonus or deduction for {selectedPayment?.worker?.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label>Type</Label>
              <Select
                value={adjustmentForm.type}
                onValueChange={(value: AdjustmentType) =>
                  setAdjustmentForm({
                    ...adjustmentForm,
                    type: value,
                    category: "",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='bonus'>Bonus</SelectItem>
                  <SelectItem value='deduction'>Deduction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>Category</Label>
              <Select
                value={adjustmentForm.category}
                onValueChange={(value: AdjustmentCategory) =>
                  setAdjustmentForm({ ...adjustmentForm, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select category' />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_CATEGORIES[adjustmentForm.type].options.map(
                    (opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>Amount (LKR)</Label>
              <Input
                type='number'
                min='0'
                step='0.01'
                value={adjustmentForm.amount}
                onChange={(e) =>
                  setAdjustmentForm({
                    ...adjustmentForm,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className='space-y-2'>
              <Label>Description</Label>
              <Textarea
                value={adjustmentForm.description}
                onChange={(e) =>
                  setAdjustmentForm({
                    ...adjustmentForm,
                    description: e.target.value,
                  })
                }
                placeholder='Reason for adjustment...'
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setAdjustmentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAdjustment}
              disabled={!adjustmentForm.category || adjustmentForm.amount <= 0}
            >
              Add Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Salary Slip Preview Modal */}
      <Dialog
        open={!!salarySlipPayment}
        onOpenChange={(open) => !open && setSalarySlipPayment(null)}
      >
        <DialogContent className='sm:max-w-[600px] max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Salary Slip</DialogTitle>
            <DialogDescription>
              Payment details for {salarySlipPayment?.worker?.fullName}
            </DialogDescription>
          </DialogHeader>
          {salarySlipPayment && (
            <div className='space-y-6 py-4'>
              {/* Company Header */}
              <div className='text-center border-b pb-4'>
                <h3 className='text-xl font-bold'>NNS Enterprise</h3>
                <p className='text-sm text-muted-foreground'>
                  Payslip for {period.name}
                </p>
              </div>

              {/* Worker Details */}
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <p className='text-muted-foreground'>Employee Name</p>
                  <p className='font-medium'>
                    {salarySlipPayment.worker?.fullName}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground'>Employee ID</p>
                  <p className='font-mono'>
                    {salarySlipPayment.worker?.id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground'>Payment Type</p>
                  <p>
                    {salarySlipPayment.paymentType === "per_line"
                      ? "Per Line Completion"
                      : "Fixed Monthly"}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground'>Period</p>
                  <p>
                    {format(new Date(period.startDate), "dd MMM")} -{" "}
                    {format(new Date(period.endDate), "dd MMM yyyy")}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Earnings */}
              <div>
                <h4 className='font-semibold mb-2'>Earnings</h4>
                <div className='space-y-1 text-sm'>
                  <div className='flex justify-between'>
                    <span>
                      Base Pay{" "}
                      {salarySlipPayment.paymentType === "per_line" &&
                        `(${
                          salarySlipPayment.linesCompleted
                        } lines × ${formatCurrency(
                          salarySlipPayment.perLineRate || 0
                        )})`}
                    </span>
                    <span className='font-mono'>
                      {formatCurrency(salarySlipPayment.baseAmount)}
                    </span>
                  </div>
                  {salarySlipPayment.adjustments
                    ?.filter((a) => a.type === "bonus")
                    .map((bonus) => (
                      <div
                        key={bonus.id}
                        className='flex justify-between text-green-600'
                      >
                        <span>{bonus.description}</span>
                        <span className='font-mono'>
                          +{formatCurrency(bonus.amount)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Deductions */}
              {salarySlipPayment.adjustments?.some(
                (a) => a.type === "deduction"
              ) && (
                <div>
                  <h4 className='font-semibold mb-2'>Deductions</h4>
                  <div className='space-y-1 text-sm'>
                    {salarySlipPayment.adjustments
                      ?.filter((a) => a.type === "deduction")
                      .map((deduction) => (
                        <div
                          key={deduction.id}
                          className='flex justify-between text-red-600'
                        >
                          <span>{deduction.description}</span>
                          <span className='font-mono'>
                            -{formatCurrency(deduction.amount)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Totals */}
              <div className='space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span>Gross Earnings</span>
                  <span className='font-mono'>
                    {formatCurrency(
                      salarySlipPayment.baseAmount +
                        salarySlipPayment.bonusAmount
                    )}
                  </span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span>Total Deductions</span>
                  <span className='font-mono text-red-600'>
                    -{formatCurrency(salarySlipPayment.deductionAmount)}
                  </span>
                </div>
                <div className='flex justify-between text-lg font-bold border-t pt-2'>
                  <span>Net Pay</span>
                  <span className='font-mono text-blue-600'>
                    {formatCurrency(salarySlipPayment.netAmount)}
                  </span>
                </div>
              </div>

              {/* Bank Details */}
              {salarySlipPayment.worker?.bankName && (
                <>
                  <Separator />
                  <div>
                    <h4 className='font-semibold mb-2'>Payment Details</h4>
                    <div className='text-sm space-y-1'>
                      <p>
                        <span className='text-muted-foreground'>Bank:</span>{" "}
                        {salarySlipPayment.worker.bankName}
                      </p>
                      {salarySlipPayment.worker.bankBranch && (
                        <p>
                          <span className='text-muted-foreground'>Branch:</span>{" "}
                          {salarySlipPayment.worker.bankBranch}
                        </p>
                      )}
                      {salarySlipPayment.worker.accountNumber && (
                        <p>
                          <span className='text-muted-foreground'>
                            Account:
                          </span>{" "}
                          {salarySlipPayment.worker.accountNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setSalarySlipPayment(null)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (salarySlipPayment && period) {
                  generateSalarySlipPDF({
                    payment: salarySlipPayment,
                    period: period,
                  });
                }
              }}
            >
              <Download className='h-4 w-4 mr-2' />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
