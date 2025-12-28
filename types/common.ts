/**
 * Common Types for NNS Telecom Management System
 * Replaces `any` types with proper TypeScript definitions
 */

import type { Prisma } from "@prisma/client";

// ==========================================
// DATABASE WHERE CLAUSES
// ==========================================

export type WhereClause = Record<string, unknown>;

export type LineDetailsWhereInput = Prisma.LineDetailsWhereInput;
export type TaskWhereInput = Prisma.TaskWhereInput;
export type InventoryItemWhereInput = Prisma.InventoryItemWhereInput;
export type InvoiceWhereInput = Prisma.GeneratedInvoiceWhereInput;
export type NotificationWhereInput = Prisma.NotificationWhereInput;
export type DrumWhereInput = Prisma.DrumTrackingWhereInput;

// ==========================================
// UPDATE DATA TYPES
// ==========================================

export type UpdateData = Record<string, unknown>;

export type LineDetailsUpdateInput = Prisma.LineDetailsUpdateInput;
export type TaskUpdateInput = Prisma.TaskUpdateInput;
export type InventoryItemUpdateInput = Prisma.InventoryItemUpdateInput;
export type DrumUpdateInput = Prisma.DrumTrackingUpdateInput;
export type WorkerUpdateInput = Prisma.WorkerUpdateInput;

// ==========================================
// TRANSACTION TYPES
// ==========================================

export type PrismaTransaction = Omit<
  typeof Prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use"
>;

// ==========================================
// PRICING TIERS
// ==========================================

export interface PricingTier {
  min_length: number;
  max_length: number;
  rate: number;
}

// ==========================================
// COMPANY SETTINGS
// ==========================================

export interface BankDetails {
  bank_name: string;
  account_title: string;
  account_number: string;
  branch_code: string;
  iban?: string;
}

export interface CompanySettings {
  id?: string;
  company_name: string;
  address: string;
  contact_numbers: string[];
  website: string;
  registered_number: string;
  bank_details: BankDetails;
  pricing_tiers: PricingTier[];
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// SECURITY & NOTIFICATION SETTINGS
// ==========================================

export interface SecuritySettings {
  two_factor_enabled?: boolean;
  session_timeout?: number;
  password_expiry_days?: number;
  login_attempts_limit?: number;
  [key: string]: unknown;
}

export interface NotificationSettings {
  email_enabled?: boolean;
  push_enabled?: boolean;
  line_added?: boolean;
  task_completed?: boolean;
  invoice_generated?: boolean;
  inventory_low?: boolean;
  [key: string]: unknown;
}

// ==========================================
// LINE DETAILS & ASSIGNMENTS
// ==========================================

export interface LineAssignee {
  id: string;
  userId: string;
  user?: {
    id: string;
    fullName: string | null;
    role: string;
  };
}

export interface LineDetailsWithAssignees {
  id: string;
  name: string | null;
  address: string | null;
  telephoneNo: string;
  dp: string;
  date: Date;
  status: string | null;
  taskId: string | null;
  powerDp: number;
  powerInbox: number;
  cableStart: number;
  cableMiddle: number;
  cableEnd: number;
  wastage: number;
  lineAssignees: LineAssignee[];
}

// ==========================================
// WORK ASSIGNMENTS
// ==========================================

export interface DayAssignment {
  date: string;
  lines: Array<{
    id: string;
    name: string | null;
    address: string | null;
    telephoneNo: string;
    dp: string;
    status: string | null;
    assignments: Array<{
      id: string;
      workerId: string;
      role: string;
    }>;
  }>;
}

export interface WorkerOption {
  id: string;
  name: string;
  nic: string;
  phone: string;
  specialization: string | null;
}

// ==========================================
// INVENTORY
// ==========================================

export interface InventoryInvoiceItem {
  id: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  item?: {
    id: string;
    name: string;
    unit: string;
  };
}

export interface WasteTrackingItem {
  id: string;
  itemId: string;
  quantity: number;
  reason: string;
  date: Date;
  reportedById: string;
}

export interface InventoryItemWithRelations {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  drumSize: number | null;
  reorderLevel: number;
  createdAt: Date;
  updatedAt: Date;
  inventoryInvoiceItems?: InventoryInvoiceItem[];
  wasteTracking?: WasteTrackingItem[];
}

// ==========================================
// DRUM USAGE
// ==========================================

export interface DrumUsageData {
  id: string;
  drumId: string;
  lineDetailsId: string | null;
  quantityUsed: number;
  usageDate: Date;
  cableStartPoint: number;
  cableEndPoint: number;
  wastageCalculated: number;
  createdAt: Date;
}

// ==========================================
// TASKS
// ==========================================

export interface TaskWithRelations {
  id: string;
  taskDate: Date;
  telephoneNo: string;
  dp: string;
  contactNo: string | null;
  customerName: string;
  address: string;
  status: string;
  connectionTypeNew: string;
  connectionServices: string[];
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
  rejectionReason: string | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  completedAt: Date | null;
  completedBy: string | null;
  lineDetailsId: string | null;
}

// ==========================================
// SEARCH RESULTS
// ==========================================

export interface SearchResult {
  id: string;
  type: "line" | "task" | "invoice" | "inventory";
  title: string;
  subtitle: string;
  url: string;
  metadata?: {
    status?: string;
    date?: string;
    amount?: number;
    stock?: number;
    [key: string]: unknown;
  };
}

// ==========================================
// EXPORT DATA
// ==========================================

export interface ExportableData {
  [key: string]: string | number | boolean | null | undefined;
}

// ==========================================
// REPORT DATA
// ==========================================

export interface ReportData {
  title: string;
  dateRange?: {
    start: string;
    end: string;
  };
  sections?: Array<{
    title: string;
    data: ExportableData[];
  }>;
  summary?: Record<string, unknown>;
}

// ==========================================
// API ERROR RESPONSE
// ==========================================

export interface ApiError {
  error: string;
  message?: string;
  details?: unknown;
}

// ==========================================
// PAGE PROPS
// ==========================================

// Next.js 15+ uses async params and searchParams
export interface PageProps {
  params: Promise<{ [key: string]: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// ==========================================
// FORM DATA
// ==========================================

export interface FormData {
  [key: string]: string | number | boolean | Date | null | undefined | string[];
}
