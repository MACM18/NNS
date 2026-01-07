// Payroll Service for NNS Telecom Management System
import { prisma } from "@/lib/prisma";
import type {
  PayrollPeriod,
  WorkerPayment,
  PayrollAdjustment,
  PayrollSummary,
  WorkerPaymentSummary,
  SalarySlipData,
  CreatePayrollPeriodInput,
  UpdatePayrollPeriodInput,
  AddAdjustmentInput,
  PaymentStatus,
  PayrollStatus,
  PaymentType,
  AdjustmentType,
  AdjustmentCategory,
  PaymentMethod,
} from "@/types/payroll";
import { Prisma } from "@prisma/client";

// Helper to convert Decimal to number
function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return parseFloat(value.toString());
}

// ==========================================
// PAYROLL PERIOD OPERATIONS
// ==========================================

export async function getPayrollPeriods(options?: {
  status?: string;
  year?: number;
  page?: number;
  pageSize?: number;
}): Promise<{ periods: PayrollPeriod[]; total: number }> {
  const { status, year, page = 1, pageSize = 10 } = options || {};

  const where: Prisma.PayrollPeriodWhereInput = {};
  if (status) where.status = status;
  if (year) where.year = year;

  const [periods, total] = await Promise.all([
    prisma.payrollPeriod.findMany({
      where,
      include: {
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { payments: true } },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payrollPeriod.count({ where }),
  ]);

  return {
    periods: periods.map((p) => ({
      ...p,
      status: p.status as PayrollStatus,
      totalAmount: decimalToNumber(p.totalAmount),
    })),
    total,
  };
}

export async function getPayrollPeriodById(
  id: string
): Promise<PayrollPeriod | null> {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, fullName: true } },
      payments: {
        include: {
          worker: true,
          adjustments: {
            include: { createdBy: { select: { id: true, fullName: true } } },
          },
        },
      },
    },
  });

  if (!period) return null;

  return {
    ...period,
    status: period.status as PayrollStatus,
    totalAmount: decimalToNumber(period.totalAmount),
    payments: period.payments.map((p) => ({
      ...p,
      status: p.status as PaymentStatus,
      paymentType: p.paymentType as PaymentType,
      paymentMethod: p.paymentMethod as PaymentMethod | null,
      baseAmount: decimalToNumber(p.baseAmount),
      bonusAmount: decimalToNumber(p.bonusAmount),
      deductionAmount: decimalToNumber(p.deductionAmount),
      netAmount: decimalToNumber(p.netAmount),
      perLineRate: decimalToNumber(p.perLineRate),
      worker: p.worker
        ? {
            ...p.worker,
            paymentType: p.worker.paymentType as PaymentType,
            perLineRate: decimalToNumber(p.worker.perLineRate),
            monthlyRate: decimalToNumber(p.worker.monthlyRate),
          }
        : undefined,
      adjustments: p.adjustments.map((a) => ({
        ...a,
        type: a.type as AdjustmentType,
        category: a.category as AdjustmentCategory,
        amount: decimalToNumber(a.amount),
      })),
    })),
  };
}

export async function createPayrollPeriod(
  input: CreatePayrollPeriodInput,
  createdById: string
): Promise<PayrollPeriod> {
  // Check if period already exists
  const existing = await prisma.payrollPeriod.findUnique({
    where: { month_year: { month: input.month, year: input.year } },
  });

  if (existing) {
    throw new Error(
      `Payroll period for ${input.month}/${input.year} already exists`
    );
  }

  const period = await prisma.payrollPeriod.create({
    data: {
      name: input.name,
      month: input.month,
      year: input.year,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      createdById,
    },
    include: {
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  return {
    ...period,
    status: period.status as PayrollStatus,
    totalAmount: decimalToNumber(period.totalAmount),
  };
}

export async function updatePayrollPeriod(
  id: string,
  input: UpdatePayrollPeriodInput
): Promise<PayrollPeriod> {
  const updateData: Prisma.PayrollPeriodUpdateInput = {};
  if (input.name) updateData.name = input.name;
  if (input.status) updateData.status = input.status;
  if (input.paidDate) updateData.paidDate = new Date(input.paidDate);

  const period = await prisma.payrollPeriod.update({
    where: { id },
    data: updateData,
    include: {
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  return {
    ...period,
    status: period.status as PayrollStatus,
    totalAmount: decimalToNumber(period.totalAmount),
  };
}

export async function deletePayrollPeriod(id: string): Promise<void> {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
  });

  if (!period) {
    throw new Error("Payroll period not found");
  }

  if (period.status === "paid") {
    throw new Error("Cannot delete a paid payroll period");
  }

  await prisma.payrollPeriod.delete({ where: { id } });
}

// ==========================================
// WORKER PAYMENT OPERATIONS
// ==========================================

export async function calculatePayrollForPeriod(
  periodId: string,
  createdById: string
): Promise<WorkerPayment[]> {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
  });

  if (!period) {
    throw new Error("Payroll period not found");
  }

  if (period.status !== "draft") {
    throw new Error("Can only calculate payroll for draft periods");
  }

  // Get all active workers
  const workers = await prisma.worker.findMany({
    where: { status: "active" },
  });

  const payments: WorkerPayment[] = [];

  for (const worker of workers) {
    // Count completed lines for this worker in this period
    const linesCompleted = await prisma.workAssignment.count({
      where: {
        workerId: worker.id,
        assignedDate: {
          gte: period.startDate,
          lte: period.endDate,
        },
        line: {
          status: "completed",
        },
      },
    });

    const paymentType = worker.paymentType || "per_line";
    let baseAmount = 0;
    let perLineRate: number | null = null;

    if (paymentType === "per_line") {
      perLineRate = decimalToNumber(worker.perLineRate) || 500; // Default rate
      baseAmount = linesCompleted * perLineRate;
    } else {
      baseAmount = decimalToNumber(worker.monthlyRate) || 0;
    }

    // Check if payment already exists
    const existingPayment = await prisma.workerPayment.findUnique({
      where: {
        payrollPeriodId_workerId: {
          payrollPeriodId: periodId,
          workerId: worker.id,
        },
      },
    });

    let payment;
    if (existingPayment) {
      // Update existing payment
      payment = await prisma.workerPayment.update({
        where: { id: existingPayment.id },
        data: {
          paymentType,
          linesCompleted,
          perLineRate,
          baseAmount,
          netAmount:
            baseAmount +
            decimalToNumber(existingPayment.bonusAmount) -
            decimalToNumber(existingPayment.deductionAmount),
        },
        include: {
          worker: true,
          adjustments: true,
        },
      });
    } else {
      // Create new payment
      payment = await prisma.workerPayment.create({
        data: {
          payrollPeriodId: periodId,
          workerId: worker.id,
          paymentType,
          linesCompleted,
          perLineRate,
          baseAmount,
          netAmount: baseAmount,
          createdById,
        },
        include: {
          worker: true,
          adjustments: true,
        },
      });
    }

    payments.push({
      ...payment,
      status: payment.status as PaymentStatus,
      paymentType: payment.paymentType as PaymentType,
      paymentMethod: payment.paymentMethod as PaymentMethod | null,
      baseAmount: decimalToNumber(payment.baseAmount),
      bonusAmount: decimalToNumber(payment.bonusAmount),
      deductionAmount: decimalToNumber(payment.deductionAmount),
      netAmount: decimalToNumber(payment.netAmount),
      perLineRate: decimalToNumber(payment.perLineRate),
      worker: payment.worker
        ? {
            ...payment.worker,
            paymentType: payment.worker.paymentType as PaymentType,
            perLineRate: decimalToNumber(payment.worker.perLineRate),
            monthlyRate: decimalToNumber(payment.worker.monthlyRate),
          }
        : undefined,
      adjustments: payment.adjustments.map((a) => ({
        ...a,
        type: a.type as AdjustmentType,
        category: a.category as AdjustmentCategory,
        amount: decimalToNumber(a.amount),
      })),
    });
  }

  // Update period total
  const totalAmount = payments.reduce((sum, p) => sum + p.netAmount, 0);
  await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: {
      totalAmount,
      status: "processing",
    },
  });

  return payments;
}

export async function getWorkerPayments(
  periodId: string
): Promise<WorkerPayment[]> {
  const payments = await prisma.workerPayment.findMany({
    where: { payrollPeriodId: periodId },
    include: {
      worker: true,
      adjustments: {
        include: { createdBy: { select: { id: true, fullName: true } } },
      },
    },
    orderBy: { worker: { fullName: "asc" } },
  });

  return payments.map((p) => ({
    ...p,
    status: p.status as PaymentStatus,
    paymentType: p.paymentType as PaymentType,
    paymentMethod: p.paymentMethod as PaymentMethod | null,
    baseAmount: decimalToNumber(p.baseAmount),
    bonusAmount: decimalToNumber(p.bonusAmount),
    deductionAmount: decimalToNumber(p.deductionAmount),
    netAmount: decimalToNumber(p.netAmount),
    perLineRate: decimalToNumber(p.perLineRate),
    worker: p.worker
      ? {
          ...p.worker,
          paymentType: p.worker.paymentType as PaymentType,
          perLineRate: decimalToNumber(p.worker.perLineRate),
          monthlyRate: decimalToNumber(p.worker.monthlyRate),
        }
      : undefined,
    adjustments: p.adjustments.map((a) => ({
      ...a,
      type: a.type as AdjustmentType,
      category: a.category as AdjustmentCategory,
      amount: decimalToNumber(a.amount),
    })),
  }));
}

export async function getWorkerPaymentById(
  id: string
): Promise<WorkerPayment | null> {
  const payment = await prisma.workerPayment.findUnique({
    where: { id },
    include: {
      worker: true,
      payrollPeriod: true,
      adjustments: {
        include: { createdBy: { select: { id: true, fullName: true } } },
      },
    },
  });

  if (!payment) return null;

  return {
    ...payment,
    status: payment.status as PaymentStatus,
    paymentType: payment.paymentType as PaymentType,
    paymentMethod: payment.paymentMethod as PaymentMethod | null,
    baseAmount: decimalToNumber(payment.baseAmount),
    bonusAmount: decimalToNumber(payment.bonusAmount),
    deductionAmount: decimalToNumber(payment.deductionAmount),
    netAmount: decimalToNumber(payment.netAmount),
    perLineRate: decimalToNumber(payment.perLineRate),
    worker: payment.worker
      ? {
          ...payment.worker,
          paymentType: payment.worker.paymentType as PaymentType,
          perLineRate: decimalToNumber(payment.worker.perLineRate),
          monthlyRate: decimalToNumber(payment.worker.monthlyRate),
        }
      : undefined,
    payrollPeriod: payment.payrollPeriod
      ? {
          ...payment.payrollPeriod,
          status: payment.payrollPeriod.status as PayrollStatus,
          totalAmount: decimalToNumber(payment.payrollPeriod.totalAmount),
        }
      : undefined,
    adjustments: payment.adjustments.map((a) => ({
      ...a,
      type: a.type as AdjustmentType,
      category: a.category as AdjustmentCategory,
      amount: decimalToNumber(a.amount),
    })),
  };
}

export async function updateWorkerPaymentStatus(
  id: string,
  status: PaymentStatus,
  paymentDetails?: { paymentMethod?: string; paymentRef?: string }
): Promise<WorkerPayment> {
  const updateData: Prisma.WorkerPaymentUpdateInput = { status };

  if (status === "paid") {
    updateData.paidAt = new Date();
    if (paymentDetails?.paymentMethod) {
      updateData.paymentMethod = paymentDetails.paymentMethod;
    }
    if (paymentDetails?.paymentRef) {
      updateData.paymentRef = paymentDetails.paymentRef;
    }
  }

  const payment = await prisma.workerPayment.update({
    where: { id },
    data: updateData,
    include: {
      worker: true,
      adjustments: true,
    },
  });

  return {
    ...payment,
    status: payment.status as PaymentStatus,
    paymentType: payment.paymentType as PaymentType,
    paymentMethod: payment.paymentMethod as PaymentMethod | null,
    baseAmount: decimalToNumber(payment.baseAmount),
    bonusAmount: decimalToNumber(payment.bonusAmount),
    deductionAmount: decimalToNumber(payment.deductionAmount),
    netAmount: decimalToNumber(payment.netAmount),
    perLineRate: decimalToNumber(payment.perLineRate),
    worker: payment.worker
      ? {
          ...payment.worker,
          paymentType: payment.worker.paymentType as PaymentType,
          perLineRate: decimalToNumber(payment.worker.perLineRate),
          monthlyRate: decimalToNumber(payment.worker.monthlyRate),
        }
      : undefined,
    adjustments: payment.adjustments.map((a) => ({
      ...a,
      type: a.type as AdjustmentType,
      category: a.category as AdjustmentCategory,
      amount: decimalToNumber(a.amount),
    })),
  };
}

// ==========================================
// ADJUSTMENT OPERATIONS
// ==========================================

export async function addAdjustment(
  input: AddAdjustmentInput,
  createdById: string
): Promise<PayrollAdjustment> {
  const payment = await prisma.workerPayment.findUnique({
    where: { id: input.workerPaymentId },
  });

  if (!payment) {
    throw new Error("Worker payment not found");
  }

  if (payment.status === "paid") {
    throw new Error("Cannot add adjustments to a paid payment");
  }

  const adjustment = await prisma.payrollAdjustment.create({
    data: {
      workerPaymentId: input.workerPaymentId,
      type: input.type,
      category: input.category,
      description: input.description,
      amount: input.amount,
      createdById,
    },
    include: {
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  // Update payment totals
  const allAdjustments = await prisma.payrollAdjustment.findMany({
    where: { workerPaymentId: input.workerPaymentId },
  });

  const bonusTotal = allAdjustments
    .filter((a) => a.type === "bonus")
    .reduce((sum, a) => sum + decimalToNumber(a.amount), 0);
  const deductionTotal = allAdjustments
    .filter((a) => a.type === "deduction")
    .reduce((sum, a) => sum + decimalToNumber(a.amount), 0);
  const netAmount =
    decimalToNumber(payment.baseAmount) + bonusTotal - deductionTotal;

  await prisma.workerPayment.update({
    where: { id: input.workerPaymentId },
    data: {
      bonusAmount: bonusTotal,
      deductionAmount: deductionTotal,
      netAmount,
    },
  });

  // Update period total
  const periodPayments = await prisma.workerPayment.findMany({
    where: { payrollPeriodId: payment.payrollPeriodId },
  });
  const periodTotal = periodPayments.reduce(
    (sum, p) =>
      sum +
      decimalToNumber(p.baseAmount) +
      decimalToNumber(p.bonusAmount) -
      decimalToNumber(p.deductionAmount),
    0
  );
  await prisma.payrollPeriod.update({
    where: { id: payment.payrollPeriodId },
    data: { totalAmount: periodTotal },
  });

  return {
    ...adjustment,
    type: adjustment.type as AdjustmentType,
    category: adjustment.category as AdjustmentCategory,
    amount: decimalToNumber(adjustment.amount),
  };
}

export async function deleteAdjustment(id: string): Promise<void> {
  const adjustment = await prisma.payrollAdjustment.findUnique({
    where: { id },
    include: { workerPayment: true },
  });

  if (!adjustment) {
    throw new Error("Adjustment not found");
  }

  if (adjustment.workerPayment.status === "paid") {
    throw new Error("Cannot delete adjustments from a paid payment");
  }

  await prisma.payrollAdjustment.delete({ where: { id } });

  // Recalculate payment totals
  const remainingAdjustments = await prisma.payrollAdjustment.findMany({
    where: { workerPaymentId: adjustment.workerPaymentId },
  });

  const bonusTotal = remainingAdjustments
    .filter((a) => a.type === "bonus")
    .reduce((sum, a) => sum + decimalToNumber(a.amount), 0);
  const deductionTotal = remainingAdjustments
    .filter((a) => a.type === "deduction")
    .reduce((sum, a) => sum + decimalToNumber(a.amount), 0);
  const netAmount =
    decimalToNumber(adjustment.workerPayment.baseAmount) +
    bonusTotal -
    deductionTotal;

  await prisma.workerPayment.update({
    where: { id: adjustment.workerPaymentId },
    data: {
      bonusAmount: bonusTotal,
      deductionAmount: deductionTotal,
      netAmount,
    },
  });
}

// ==========================================
// SUMMARY AND REPORTS
// ==========================================

export async function getPayrollSummary(): Promise<PayrollSummary> {
  const [
    totalPeriods,
    draftPeriods,
    approvedPeriods,
    paidPeriods,
    paidAmountResult,
    currentPeriod,
  ] = await Promise.all([
    prisma.payrollPeriod.count(),
    prisma.payrollPeriod.count({ where: { status: "draft" } }),
    prisma.payrollPeriod.count({ where: { status: "approved" } }),
    prisma.payrollPeriod.count({ where: { status: "paid" } }),
    prisma.payrollPeriod.aggregate({
      _sum: { totalAmount: true },
      where: { status: "paid" },
    }),
    prisma.payrollPeriod.findFirst({
      where: { status: { not: "paid" } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: { createdBy: { select: { id: true, fullName: true } } },
    }),
  ]);

  return {
    totalPeriods,
    draftPeriods,
    approvedPeriods,
    paidPeriods,
    totalPaidAmount: decimalToNumber(paidAmountResult._sum.totalAmount),
    currentPeriod: currentPeriod
      ? {
          ...currentPeriod,
          status: currentPeriod.status as PayrollStatus,
          totalAmount: decimalToNumber(currentPeriod.totalAmount),
        }
      : undefined,
  };
}

export async function getWorkerPaymentHistory(
  workerId: string
): Promise<WorkerPaymentSummary> {
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
  });

  if (!worker) {
    throw new Error("Worker not found");
  }

  const payments = await prisma.workerPayment.findMany({
    where: { workerId },
    orderBy: { createdAt: "desc" },
  });

  const totalPayments = payments.length;
  const totalEarnings = payments.reduce(
    (sum, p) => sum + decimalToNumber(p.netAmount),
    0
  );
  const totalBonuses = payments.reduce(
    (sum, p) => sum + decimalToNumber(p.bonusAmount),
    0
  );
  const totalDeductions = payments.reduce(
    (sum, p) => sum + decimalToNumber(p.deductionAmount),
    0
  );
  const linesCompleted = payments.reduce((sum, p) => sum + p.linesCompleted, 0);
  const lastPaidPayment = payments.find((p) => p.status === "paid");

  return {
    workerId,
    workerName: worker.fullName,
    totalPayments,
    totalEarnings,
    totalBonuses,
    totalDeductions,
    linesCompleted,
    lastPaymentDate: lastPaidPayment?.paidAt?.toISOString(),
  };
}

// ==========================================
// SALARY SLIP
// ==========================================

export async function generateSalarySlipData(
  paymentId: string
): Promise<SalarySlipData> {
  const payment = await getWorkerPaymentById(paymentId);
  if (!payment || !payment.worker || !payment.payrollPeriod) {
    throw new Error("Payment not found or incomplete data");
  }

  // Get company settings
  const companySettings = await prisma.companySettings.findFirst();

  const bonuses = payment.adjustments?.filter((a) => a.type === "bonus") || [];
  const deductions =
    payment.adjustments?.filter((a) => a.type === "deduction") || [];

  // Generate slip number
  const slipNumber = `PAY-${payment.payrollPeriod.year}${String(
    payment.payrollPeriod.month
  ).padStart(2, "0")}-${payment.worker.id.slice(-4).toUpperCase()}`;

  return {
    companyName: companySettings?.companyName || "NNS Enterprise",
    companyAddress: companySettings?.address || undefined,
    companyPhone: companySettings?.contactNumbers?.[0] || undefined,
    companyEmail: undefined,
    companyLogo: undefined,

    periodName: payment.payrollPeriod.name,
    month: payment.payrollPeriod.month,
    year: payment.payrollPeriod.year,
    generatedDate: new Date().toISOString(),

    worker: payment.worker,
    payment,
    bonuses,
    deductions,

    bankDetails: payment.worker.bankName
      ? {
          bankName: payment.worker.bankName || undefined,
          branch: payment.worker.bankBranch || undefined,
          accountNumber: payment.worker.accountNumber || undefined,
          accountName: payment.worker.accountName || undefined,
        }
      : undefined,

    slipNumber,
  };
}

// ==========================================
// APPROVE AND PAY OPERATIONS
// ==========================================

export async function approvePayrollPeriod(id: string): Promise<PayrollPeriod> {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    include: { payments: true },
  });

  if (!period) {
    throw new Error("Payroll period not found");
  }

  if (period.status !== "processing") {
    throw new Error("Can only approve processing payroll periods");
  }

  if (period.payments.length === 0) {
    throw new Error("Cannot approve a payroll period with no payments");
  }

  // Update all payments to approved
  await prisma.workerPayment.updateMany({
    where: { payrollPeriodId: id, status: "calculated" },
    data: { status: "approved" },
  });

  const updated = await prisma.payrollPeriod.update({
    where: { id },
    data: { status: "approved" },
    include: { createdBy: { select: { id: true, fullName: true } } },
  });

  return {
    ...updated,
    status: updated.status as PayrollStatus,
    totalAmount: decimalToNumber(updated.totalAmount),
  };
}

export async function markPayrollAsPaid(
  id: string,
  paidDate?: string
): Promise<PayrollPeriod> {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
  });

  if (!period) {
    throw new Error("Payroll period not found");
  }

  if (period.status !== "approved") {
    throw new Error("Can only mark approved payroll periods as paid");
  }

  // Update all payments to paid
  await prisma.workerPayment.updateMany({
    where: { payrollPeriodId: id, status: "approved" },
    data: {
      status: "paid",
      paidAt: paidDate ? new Date(paidDate) : new Date(),
    },
  });

  const updated = await prisma.payrollPeriod.update({
    where: { id },
    data: {
      status: "paid",
      paidDate: paidDate ? new Date(paidDate) : new Date(),
    },
    include: { createdBy: { select: { id: true, fullName: true } } },
  });

  return {
    ...updated,
    status: updated.status as PayrollStatus,
    totalAmount: decimalToNumber(updated.totalAmount),
  };
}
