import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateInvoicePricing } from "@/lib/pricing-service";
import type { OptionalItemInput } from "@/lib/service-pricing-types";

/** Create an immutable service invoice without posting accounting entries. */
export async function createIssuedInvoiceFromLines(input: {
  invoiceNumber: string;
  invoiceType?: string;
  month?: number;
  year?: number;
  jobMonth?: string;
  invoiceDate?: Date;
  lineDetailsIds: string[];
  optionalItems?: OptionalItemInput;
  status?: string;
  createdById?: string;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.invoiceNumber}))`;
    const duplicate = await tx.generatedInvoice.findFirst({
      where: { invoiceNumber: input.invoiceNumber },
      select: { id: true },
    });
    if (duplicate) throw new Error("An invoice with this number already exists and cannot be regenerated");

    const pricing = await calculateInvoicePricing(tx, {
      lineDetailsIds: input.lineDetailsIds,
      invoiceType: input.invoiceType,
      optionalItems: input.optionalItems,
    });

    return tx.generatedInvoice.create({
      data: {
        invoiceNumber: input.invoiceNumber,
        invoiceType: input.invoiceType,
        month: input.month,
        year: input.year,
        jobMonth: input.jobMonth,
        invoiceDate: input.invoiceDate,
        totalAmount: pricing.totalAmount,
        lineCount: pricing.lineCount,
        lineDetailsIds: pricing.lineDetailsIds as Prisma.InputJsonValue,
        pricingScheduleId: pricing.pricingScheduleId,
        pricingSnapshot: pricing.pricingSnapshot as Prisma.InputJsonValue,
        lineDetailsSnapshot: pricing.lineDetailsSnapshot as Prisma.InputJsonValue,
        optionalItemsSnapshot: pricing.optionalItemsSnapshot as Prisma.InputJsonValue,
        status: input.status || "issued",
      },
    });
  });
}

/** Create a manually supplied service invoice without accounting setup. */
export async function createAndIssueGeneratedInvoice(input: {
  invoiceNumber: string;
  invoiceType?: string;
  month?: number;
  year?: number;
  jobMonth?: string;
  invoiceDate?: Date;
  totalAmount: number;
  lineCount?: number;
  lineDetailsIds?: Prisma.InputJsonValue;
  status?: string;
  createdById?: string;
}) {
  if (!Number.isFinite(input.totalAmount) || input.totalAmount <= 0) {
    throw new Error("Invoice amount must be a positive number");
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.invoiceNumber}))`;
    const duplicate = await tx.generatedInvoice.findFirst({
      where: { invoiceNumber: input.invoiceNumber },
      select: { id: true },
    });
    if (duplicate) throw new Error("An invoice with this number already exists and cannot be regenerated");

    return tx.generatedInvoice.create({
      data: {
        invoiceNumber: input.invoiceNumber,
        invoiceType: input.invoiceType,
        month: input.month,
        year: input.year,
        jobMonth: input.jobMonth,
        invoiceDate: input.invoiceDate,
        totalAmount: input.totalAmount,
        lineCount: input.lineCount,
        lineDetailsIds: input.lineDetailsIds,
        status: input.status || "issued",
      },
    });
  });
}
