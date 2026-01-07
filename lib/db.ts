/**
 * Database Service Layer
 * Provides a unified interface for database operations using Prisma
 * This replaces the Supabase client while maintaining similar patterns
 *
 * Usage:
 * - Import and use: import db from "@/lib/db"
 * - Or use prisma directly: import { prisma } from "@/lib/db"
 *
 * For TypeScript types, after running `prisma generate`, you can import:
 * import type { Profile, LineDetails, Task, etc. } from "@prisma/client"
 */

import type { Prisma } from "@prisma/client";

import prisma from "./prisma";

// Re-export prisma for direct access when needed
export { prisma };

/**
 * Type guard to check if error is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Safely get error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
}

/**
 * Helper to compute f1, g1, and total_cable from cable measurements
 * Since these were generated columns in Supabase, we compute them in application code
 */
export function computeCableMeasurements(
  cableStart: number,
  cableMiddle: number,
  cableEnd: number
) {
  const f1 = Math.abs(cableStart - cableMiddle);
  const g1 = Math.abs(cableMiddle - cableEnd);
  const totalCable = f1 + g1;
  return { f1, g1, totalCable };
}

/**
 * Profile operations
 */
export const profiles = {
  findById: (id: string) => prisma.profile.findUnique({ where: { id } }),
  findByUserId: (userId: string) =>
    prisma.profile.findUnique({ where: { userId } }),
  findByEmail: (email: string) =>
    prisma.profile.findFirst({ where: { email } }),
  findAll: () => prisma.profile.findMany(),
  create: (
    data: Prisma.ProfileCreateInput | Prisma.ProfileUncheckedCreateInput
  ) => prisma.profile.create({ data }),
  update: (
    id: string,
    data: Prisma.ProfileUpdateInput | Prisma.ProfileUncheckedUpdateInput
  ) => prisma.profile.update({ where: { id }, data }),
  updateByUserId: (
    userId: string,
    data: Prisma.ProfileUpdateInput | Prisma.ProfileUncheckedUpdateInput
  ) => prisma.profile.update({ where: { userId }, data }),
  delete: (id: string) => prisma.profile.delete({ where: { id } }),
};

/**
 * User operations (for auth)
 */
export const users = {
  findById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    }),
  findByEmail: (email: string) =>
    prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    }),
  create: (data: Prisma.UserCreateInput | Prisma.UserUncheckedCreateInput) =>
    prisma.user.create({ data, include: { profile: true } }),
  update: (
    id: string,
    data: Prisma.UserUpdateInput | Prisma.UserUncheckedUpdateInput
  ) => prisma.user.update({ where: { id }, data, include: { profile: true } }),
  delete: (id: string) => prisma.user.delete({ where: { id } }),
};

/**
 * Line Details operations
 */
export const lineDetails = {
  findById: (id: string) => prisma.lineDetails.findUnique({ where: { id } }),
  findByTelephoneNo: (telephoneNo: string) =>
    prisma.lineDetails.findFirst({ where: { telephoneNo } }),
  findMany: (options?: Prisma.LineDetailsFindManyArgs) =>
    prisma.lineDetails.findMany(options),
  create: (
    data: Prisma.LineDetailsCreateInput | Prisma.LineDetailsUncheckedCreateInput
  ) => prisma.lineDetails.create({ data }),
  update: (
    id: string,
    data: Prisma.LineDetailsUpdateInput | Prisma.LineDetailsUncheckedUpdateInput
  ) => prisma.lineDetails.update({ where: { id }, data }),
  upsert: (
    telephoneNo: string,
    date: Date,
    data: Prisma.LineDetailsCreateInput | Prisma.LineDetailsUncheckedCreateInput
  ) =>
    prisma.lineDetails.upsert({
      where: { telephoneNo_date: { telephoneNo, date } },
      create: data,
      update: data,
    }),
  delete: (id: string) => prisma.lineDetails.delete({ where: { id } }),
  count: (where?: Prisma.LineDetailsWhereInput) =>
    prisma.lineDetails.count({ where }),
};

/**
 * Tasks operations
 */
export const tasks = {
  findById: (id: string) => prisma.task.findUnique({ where: { id } }),
  findByTelephoneNo: (telephoneNo: string) =>
    prisma.task.findFirst({
      where: { telephoneNo },
      orderBy: { createdAt: "desc" },
    }),
  findMany: (options?: Prisma.TaskFindManyArgs) =>
    prisma.task.findMany(options),
  create: (data: Prisma.TaskCreateInput | Prisma.TaskUncheckedCreateInput) =>
    prisma.task.create({ data }),
  update: (
    id: string,
    data: Prisma.TaskUpdateInput | Prisma.TaskUncheckedUpdateInput
  ) => prisma.task.update({ where: { id }, data }),
  delete: (id: string) => prisma.task.delete({ where: { id } }),
  count: (where?: Prisma.TaskWhereInput) => prisma.task.count({ where }),
};

/**
 * Inventory Items operations
 */
export const inventoryItems = {
  findById: (id: string) => prisma.inventoryItem.findUnique({ where: { id } }),
  findByName: (name: string) =>
    prisma.inventoryItem.findUnique({ where: { name } }),
  findMany: (options?: Prisma.InventoryItemFindManyArgs) =>
    prisma.inventoryItem.findMany(options),
  create: (
    data:
      | Prisma.InventoryItemCreateInput
      | Prisma.InventoryItemUncheckedCreateInput
  ) => prisma.inventoryItem.create({ data }),
  update: (
    id: string,
    data:
      | Prisma.InventoryItemUpdateInput
      | Prisma.InventoryItemUncheckedUpdateInput
  ) => prisma.inventoryItem.update({ where: { id }, data }),
  delete: (id: string) => prisma.inventoryItem.delete({ where: { id } }),
};

/**
 * Drum Tracking operations
 */
export const drumTracking = {
  findById: (id: string) => prisma.drumTracking.findUnique({ where: { id } }),
  findByDrumNumber: (drumNumber: string) =>
    prisma.drumTracking.findFirst({ where: { drumNumber } }),
  findMany: (options?: Prisma.DrumTrackingFindManyArgs) =>
    prisma.drumTracking.findMany(options),
  create: (
    data:
      | Prisma.DrumTrackingCreateInput
      | Prisma.DrumTrackingUncheckedCreateInput
  ) => prisma.drumTracking.create({ data }),
  update: (
    id: string,
    data:
      | Prisma.DrumTrackingUpdateInput
      | Prisma.DrumTrackingUncheckedUpdateInput
  ) => prisma.drumTracking.update({ where: { id }, data }),
  delete: (id: string) => prisma.drumTracking.delete({ where: { id } }),
};

/**
 * Drum Usage operations
 */
export const drumUsage = {
  findById: (id: string) => prisma.drumUsage.findUnique({ where: { id } }),
  findMany: (options?: Prisma.DrumUsageFindManyArgs) =>
    prisma.drumUsage.findMany(options),
  create: (
    data: Prisma.DrumUsageCreateInput | Prisma.DrumUsageUncheckedCreateInput
  ) => prisma.drumUsage.create({ data }),
  update: (
    id: string,
    data: Prisma.DrumUsageUpdateInput | Prisma.DrumUsageUncheckedUpdateInput
  ) => prisma.drumUsage.update({ where: { id }, data }),
  delete: (id: string) => prisma.drumUsage.delete({ where: { id } }),
};

/**
 * Inventory Invoices operations
 */
export const inventoryInvoices = {
  findById: (id: string) =>
    prisma.inventoryInvoice.findUnique({
      where: { id },
      include: { items: true },
    }),
  findByInvoiceNumber: (invoiceNumber: string) =>
    prisma.inventoryInvoice.findUnique({ where: { invoiceNumber } }),
  findMany: (options?: Prisma.InventoryInvoiceFindManyArgs) =>
    prisma.inventoryInvoice.findMany(options),
  create: (
    data:
      | Prisma.InventoryInvoiceCreateInput
      | Prisma.InventoryInvoiceUncheckedCreateInput
  ) => prisma.inventoryInvoice.create({ data }),
  update: (
    id: string,
    data:
      | Prisma.InventoryInvoiceUpdateInput
      | Prisma.InventoryInvoiceUncheckedUpdateInput
  ) => prisma.inventoryInvoice.update({ where: { id }, data }),
  delete: (id: string) => prisma.inventoryInvoice.delete({ where: { id } }),
};

/**
 * Generated Invoices operations
 */
export const generatedInvoices = {
  findById: (id: string) =>
    prisma.generatedInvoice.findUnique({ where: { id } }),
  findMany: (options?: Prisma.GeneratedInvoiceFindManyArgs) =>
    prisma.generatedInvoice.findMany(options),
  create: (
    data:
      | Prisma.GeneratedInvoiceCreateInput
      | Prisma.GeneratedInvoiceUncheckedCreateInput
  ) => prisma.generatedInvoice.create({ data }),
  update: (
    id: string,
    data:
      | Prisma.GeneratedInvoiceUpdateInput
      | Prisma.GeneratedInvoiceUncheckedUpdateInput
  ) => prisma.generatedInvoice.update({ where: { id }, data }),
  delete: (id: string) => prisma.generatedInvoice.delete({ where: { id } }),
  count: (where?: Prisma.GeneratedInvoiceWhereInput) =>
    prisma.generatedInvoice.count({ where }),
};

/**
 * Workers operations
 */
export const workers = {
  findById: (id: string) => prisma.worker.findUnique({ where: { id } }),
  findMany: (options?: Prisma.WorkerFindManyArgs) =>
    prisma.worker.findMany(options),
  create: (
    data: Prisma.WorkerCreateInput | Prisma.WorkerUncheckedCreateInput
  ) => prisma.worker.create({ data }),
  update: (
    id: string,
    data: Prisma.WorkerUpdateInput | Prisma.WorkerUncheckedUpdateInput
  ) => prisma.worker.update({ where: { id }, data }),
  delete: (id: string) => prisma.worker.delete({ where: { id } }),
};

/**
 * Work Assignments operations
 */
export const workAssignments = {
  findById: (id: string) => prisma.workAssignment.findUnique({ where: { id } }),
  findMany: (options?: Prisma.WorkAssignmentFindManyArgs) =>
    prisma.workAssignment.findMany(options),
  create: (
    data:
      | Prisma.WorkAssignmentCreateInput
      | Prisma.WorkAssignmentUncheckedCreateInput
  ) => prisma.workAssignment.create({ data }),
  update: (
    id: string,
    data:
      | Prisma.WorkAssignmentUpdateInput
      | Prisma.WorkAssignmentUncheckedUpdateInput
  ) => prisma.workAssignment.update({ where: { id }, data }),
  delete: (id: string) => prisma.workAssignment.delete({ where: { id } }),
};

/**
 * Notifications operations
 */
export const notifications = {
  findById: (id: string) => prisma.notification.findUnique({ where: { id } }),
  findByUserId: (userId: string) =>
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  create: (
    data:
      | Prisma.NotificationCreateInput
      | Prisma.NotificationUncheckedCreateInput
  ) => prisma.notification.create({ data }),
  update: (
    id: string,
    data:
      | Prisma.NotificationUpdateInput
      | Prisma.NotificationUncheckedUpdateInput
  ) => prisma.notification.update({ where: { id }, data }),
  markAsRead: (id: string) =>
    prisma.notification.update({ where: { id }, data: { isRead: true } }),
  markAllAsRead: (userId: string) =>
    prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    }),
  delete: (id: string) => prisma.notification.delete({ where: { id } }),
};

/**
 * Google Sheet Connections operations
 */
export const googleSheetConnections = {
  findById: (id: string) =>
    prisma.googleSheetConnection.findUnique({ where: { id } }),
  findByMonthYear: (month: number, year: number) =>
    prisma.googleSheetConnection.findFirst({ where: { month, year } }),
  findMany: (options?: Prisma.GoogleSheetConnectionFindManyArgs) =>
    prisma.googleSheetConnection.findMany(options),
  create: (
    data:
      | Prisma.GoogleSheetConnectionCreateInput
      | Prisma.GoogleSheetConnectionUncheckedCreateInput
  ) => prisma.googleSheetConnection.create({ data }),
  update: (
    id: string,
    data:
      | Prisma.GoogleSheetConnectionUpdateInput
      | Prisma.GoogleSheetConnectionUncheckedUpdateInput
  ) => prisma.googleSheetConnection.update({ where: { id }, data }),
  delete: (id: string) =>
    prisma.googleSheetConnection.delete({ where: { id } }),
};

/**
 * Blogs operations
 */
export const blogs = {
  findById: (id: number) => prisma.blog.findUnique({ where: { id } }),
  findBySlug: (slug: string) => prisma.blog.findUnique({ where: { slug } }),
  findMany: (options?: Prisma.BlogFindManyArgs) =>
    prisma.blog.findMany(options),
  findActive: () =>
    prisma.blog.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
    }),
  create: (data: Prisma.BlogCreateInput | Prisma.BlogUncheckedCreateInput) =>
    prisma.blog.create({ data }),
  update: (
    id: number,
    data: Prisma.BlogUpdateInput | Prisma.BlogUncheckedUpdateInput
  ) => prisma.blog.update({ where: { id }, data }),
  delete: (id: number) => prisma.blog.delete({ where: { id } }),
};

/**
 * Posts operations
 */
export const posts = {
  findById: (id: number) => prisma.post.findUnique({ where: { id } }),
  findMany: (options?: Prisma.PostFindManyArgs) =>
    prisma.post.findMany(options),
  findActive: () =>
    prisma.post.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
    }),
  create: (data: Prisma.PostCreateInput | Prisma.PostUncheckedCreateInput) =>
    prisma.post.create({ data }),
  update: (
    id: number,
    data: Prisma.PostUpdateInput | Prisma.PostUncheckedUpdateInput
  ) => prisma.post.update({ where: { id }, data }),
  delete: (id: number) => prisma.post.delete({ where: { id } }),
};

/**
 * Job Vacancies operations
 */
export const jobVacancies = {
  findById: (id: number) => prisma.jobVacancy.findUnique({ where: { id } }),
  findMany: (options?: Prisma.JobVacancyFindManyArgs) =>
    prisma.jobVacancy.findMany(options),
  findActive: () =>
    prisma.jobVacancy.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
    }),
  create: (
    data: Prisma.JobVacancyCreateInput | Prisma.JobVacancyUncheckedCreateInput
  ) => prisma.jobVacancy.create({ data }),
  update: (
    id: number,
    data: Prisma.JobVacancyUpdateInput | Prisma.JobVacancyUncheckedUpdateInput
  ) => prisma.jobVacancy.update({ where: { id }, data }),
  delete: (id: number) => prisma.jobVacancy.delete({ where: { id } }),
};

/**
 * Company Settings operations
 */
export const companySettings = {
  get: () => prisma.companySettings.findFirst(),
  update: (
    id: string,
    data:
      | Prisma.CompanySettingsUpdateInput
      | Prisma.CompanySettingsUncheckedUpdateInput
  ) => prisma.companySettings.update({ where: { id }, data }),
  upsert: (
    data:
      | Prisma.CompanySettingsCreateInput
      | Prisma.CompanySettingsUncheckedCreateInput
  ) =>
    prisma.companySettings.upsert({
      where: { id: (data as { id?: string }).id || "default" },
      create: data,
      update: data,
    }),
};

/**
 * Utility function to generate invoice numbers
 * Replaces the Supabase RPC function
 */
export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  // Get the count of invoices for this month
  const count = await prisma.inventoryInvoice.count({
    where: {
      createdAt: {
        gte: new Date(year, now.getMonth(), 1),
        lt: new Date(year, now.getMonth() + 1, 1),
      },
    },
  });

  const sequence = String(count + 1).padStart(4, "0");
  return `INV-${year}${month}-${sequence}`;
}

/**
 * Transaction helper
 * Usage: await db.transaction(async (tx) => { ... })
 */
export function transaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn);
}

// Default export with all services
const db = {
  prisma,
  profiles,
  users,
  lineDetails,
  tasks,
  inventoryItems,
  drumTracking,
  drumUsage,
  inventoryInvoices,
  generatedInvoices,
  workers,
  workAssignments,
  notifications,
  googleSheetConnections,
  blogs,
  posts,
  jobVacancies,
  companySettings,
  generateInvoiceNumber,
  transaction,
  computeCableMeasurements,
};

export default db;
