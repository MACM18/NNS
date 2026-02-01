// Payroll Types for NNS Telecom Management System

export type PaymentType = "per_line" | "fixed_monthly";
export type PayrollStatus = "draft" | "processing" | "approved" | "paid";
export type PaymentStatus = "calculated" | "approved" | "paid";
export type AdjustmentType = "bonus" | "deduction";
export type AdjustmentCategory =
  | "performance_bonus"
  | "attendance_bonus"
  | "overtime"
  | "tax"
  | "epf"
  | "etf"
  | "advance"
  | "fine"
  | "other";
export type PaymentMethod = "bank_transfer" | "cash" | "cheque";

// Worker with payroll fields
export interface WorkerPayrollInfo {
  id: string;
  fullName: string;
  employeeNo?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  role: string;
  status: string;
  paymentType: PaymentType;
  perLineRate?: number | null;
  monthlyRate?: number | null;
  bankName?: string | null;
  bankBranch?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
}

// Payroll Period
export interface PayrollPeriod {
  id: string;
  name: string;
  month: number;
  year: number;
  startDate: string | Date;
  endDate: string | Date;
  status: PayrollStatus;
  totalAmount: number;
  paidDate?: string | Date | null;
  createdById: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy?: {
    id: string;
    fullName?: string | null;
  };
  payments?: WorkerPayment[];
  _count?: {
    payments: number;
  };
}

// Worker Payment
export interface WorkerPayment {
  id: string;
  payrollPeriodId: string;
  workerId: string;
  paymentType: PaymentType;
  linesCompleted: number;
  perLineRate?: number | null;
  baseAmount: number;
  bonusAmount: number;
  deductionAmount: number;
  netAmount: number;
  status: PaymentStatus;
  paidAt?: string | Date | null;
  paymentMethod?: PaymentMethod | null;
  paymentRef?: string | null;
  notes?: string | null;
  createdById: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  worker?: WorkerPayrollInfo;
  payrollPeriod?: PayrollPeriod;
  adjustments?: PayrollAdjustment[];
}

// Payroll Adjustment
export interface PayrollAdjustment {
  id: string;
  workerPaymentId: string;
  type: AdjustmentType;
  category: AdjustmentCategory;
  description: string;
  amount: number;
  createdById: string;
  createdAt: string | Date;
  createdBy?: {
    id: string;
    fullName?: string | null;
  };
}

// Form types for creating/editing
export interface CreatePayrollPeriodInput {
  name: string;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
}

export interface UpdatePayrollPeriodInput {
  name?: string;
  status?: PayrollStatus;
  paidDate?: string;
}

export interface CreateWorkerPaymentInput {
  payrollPeriodId: string;
  workerId: string;
  paymentType: PaymentType;
  linesCompleted?: number;
  perLineRate?: number;
  baseAmount: number;
  notes?: string;
}

export interface UpdateWorkerPaymentInput {
  baseAmount?: number;
  bonusAmount?: number;
  deductionAmount?: number;
  netAmount?: number;
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentRef?: string;
  notes?: string;
  paidAt?: string;
}

export interface AddAdjustmentInput {
  workerPaymentId: string;
  type: AdjustmentType;
  category: AdjustmentCategory;
  description: string;
  amount: number;
}

// Summary types for dashboard
export interface PayrollSummary {
  totalPeriods: number;
  draftPeriods: number;
  approvedPeriods: number;
  paidPeriods: number;
  totalPaidAmount: number;
  currentPeriod?: PayrollPeriod;
}

export interface WorkerPaymentSummary {
  workerId: string;
  workerName: string;
  totalPayments: number;
  totalEarnings: number;
  totalBonuses: number;
  totalDeductions: number;
  linesCompleted: number;
  lastPaymentDate?: string;
}

// Salary slip data
export interface SalarySlipData {
  // Company info
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;

  // Period info
  periodName: string;
  month: number;
  year: number;
  generatedDate: string;

  // Worker info
  worker: WorkerPayrollInfo;

  // Payment breakdown
  payment: WorkerPayment;

  // Adjustments grouped by type
  bonuses: PayrollAdjustment[];
  deductions: PayrollAdjustment[];

  // Bank details for payment
  bankDetails?: {
    bankName?: string;
    branch?: string;
    accountNumber?: string;
    accountName?: string;
  };

  // Reference
  slipNumber: string;
}

// API Response types
export interface PayrollApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedPayrollResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
