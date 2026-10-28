import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateInvoicePricing } from "@/lib/pricing-service";
import { OPTIONAL_ITEM_RATES, type OptionalItemInput } from "@/lib/service-pricing-types";
import { monthlyInvoiceNumber } from "@/lib/monthly-invoice-number";

type ReviewedInvoiceLine = {
  lineId: string;
  customerName: string;
  telephoneNo: string;
  address: string;
  serviceDate: string;
  cableLength: number;
  serviceType: "FTTH" | "DATA" | "PEO_TV";
  description: string;
  baseRate: number;
  invoiceAmount?: number;
  pricingScheduleId?: string;
  pricingScheduleName?: string;
};

type ReviewedOptionalItem = {
  code: string;
  description: string;
  quantity: number;
  unitRate: number;
};

function safeCents(value: unknown, label: string, allowZero = false) {
  const amount = Number(value);
  const cents = amount * 100;
  if (!Number.isFinite(amount) || (allowZero ? amount < 0 : amount <= 0) || !Number.isSafeInteger(Math.round(cents)) || Math.abs(cents - Math.round(cents)) > 1e-7) {
    throw new Error(`${label} must be a valid amount with up to two decimal places`);
  }
  return Math.round(cents);
}

function distributePercent(rows: Array<{ baseCents: number }>, percent: 90 | 10) {
  const target = percent === 90
    ? Math.round(rows.reduce((sum, row) => sum + row.baseCents, 0) * 0.9)
    : rows.reduce((sum, row) => sum + row.baseCents, 0) - Math.round(rows.reduce((sum, row) => sum + row.baseCents, 0) * 0.9);
  let assigned = 0;
  return rows.map((row, index) => {
    const cents = index === rows.length - 1
      ? target - assigned
      : percent === 90 ? Math.round(row.baseCents * 0.9) : row.baseCents - Math.round(row.baseCents * 0.9);
    assigned += cents;
    return cents;
  });
}

function normalizedReviewedSnapshot(input: {
  lines: unknown;
  optionalItems: unknown;
}): { lines: ReviewedInvoiceLine[]; optionalItems: ReviewedOptionalItem[] } {
  if (!Array.isArray(input.lines) || input.lines.length === 0 || input.lines.length > 2000) {
    throw new Error("Select at least one invoice line (up to 2,000 lines).");
  }
  const ids = new Set<string>();
  const lines = input.lines.map((raw, index): ReviewedInvoiceLine => {
    if (!raw || typeof raw !== "object") throw new Error(`Invoice line ${index + 1} is invalid.`);
    const row = raw as Record<string, unknown>;
    const lineId = String(row.lineId || "");
    if (!lineId || ids.has(lineId)) throw new Error("Invoice line IDs must be present and unique.");
    ids.add(lineId);
    const serviceType = String(row.serviceType || "").toUpperCase();
    if (!["FTTH", "DATA", "PEO_TV"].includes(serviceType)) throw new Error(`Invoice line ${index + 1} has an invalid service type.`);
    const cableLength = Number(row.cableLength);
    if (!Number.isFinite(cableLength) || cableLength < 0 || cableLength > 100000) throw new Error(`Invoice line ${index + 1} has an invalid cable length.`);
    const serviceDate = String(row.serviceDate || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate) || Number.isNaN(Date.parse(`${serviceDate}T00:00:00Z`))) throw new Error(`Invoice line ${index + 1} has an invalid service date.`);
    const text = (field: string, limit: number) => {
      const value = String(row[field] ?? "").trim();
      if (value.length > limit) throw new Error(`Invoice line ${index + 1} ${field} is too long.`);
      return value;
    };
    return {
      lineId,
      customerName: text("customerName", 200),
      telephoneNo: text("telephoneNo", 80),
      address: text("address", 500),
      serviceDate,
      cableLength,
      serviceType: serviceType as ReviewedInvoiceLine["serviceType"],
      description: text("description", 300),
      baseRate: safeCents(row.baseRate, `Invoice line ${index + 1} rate`) / 100,
      pricingScheduleId: typeof row.pricingScheduleId === "string" ? row.pricingScheduleId : undefined,
      pricingScheduleName: typeof row.pricingScheduleName === "string" ? row.pricingScheduleName.slice(0, 200) : undefined,
    };
  });

  if (input.optionalItems != null && !Array.isArray(input.optionalItems)) throw new Error("Optional invoice items are invalid.");
  const optionalItems = ((input.optionalItems || []) as unknown[]).map((raw, index): ReviewedOptionalItem => {
    if (!raw || typeof raw !== "object") throw new Error(`Optional item ${index + 1} is invalid.`);
    const item = raw as Record<string, unknown>;
    const code = String(item.code || "");
    if (!(code in OPTIONAL_ITEM_RATES)) throw new Error(`Optional item ${index + 1} has an invalid code.`);
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 100000) throw new Error(`Optional item ${index + 1} quantity is invalid.`);
    const description = String(item.description || "").trim();
    if (description.length > 200) throw new Error(`Optional item ${index + 1} description is too long.`);
    return { code, description, quantity, unitRate: safeCents(item.unitRate, `Optional item ${index + 1} rate`) / 100 };
  }).filter(item => item.quantity > 0);
  if (new Set(optionalItems.map(item => item.code)).size !== optionalItems.length) throw new Error("Optional item codes must be unique.");
  return { lines, optionalItems };
}

/** Create the reviewed A/B invoice pair from immutable invoice-only snapshots. */
export async function createReviewedInvoicePair(input: {
  month: number;
  year: number;
  lines: unknown;
  optionalItems: unknown;
  pricingSnapshot?: unknown;
  createdById: string;
}) {
  if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12 || !Number.isInteger(input.year) || input.year < 2000 || input.year > 2100) {
    throw new Error("Choose a valid invoice month and year.");
  }
  const selected = normalizedReviewedSnapshot(input);
  const invoiceNumbers = {
    A: monthlyInvoiceNumber(input.year, input.month, "A"),
    B: monthlyInvoiceNumber(input.year, input.month, "B"),
  } as const;
  const start = new Date(Date.UTC(input.year, input.month - 1, 1));
  const end = new Date(Date.UTC(input.year, input.month, 1));
  const baseRows = [
    ...selected.lines.map(line => ({ baseCents: safeCents(line.baseRate, "Invoice line rate") })),
    ...selected.optionalItems.map(item => ({ baseCents: safeCents(item.unitRate * item.quantity, "Optional item amount") })),
  ];
  const totalCents = baseRows.reduce((sum, row) => sum + row.baseCents, 0);
  if (totalCents <= 0) throw new Error("The invoice total must be greater than zero.");
  const shareByType = {
    A: distributePercent(baseRows, 90),
    B: distributePercent(baseRows, 10),
  };
  const jobMonth = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "Asia/Colombo" }).format(start);
  const nextMonthDate = new Date(Date.UTC(input.year, input.month, 2));

  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`service-invoice-pair:${input.year}-${String(input.month).padStart(2, "0")}`}))`;
    const sourceRows = await tx.lineDetails.findMany({
      where: { id: { in: selected.lines.map(line => line.lineId) } },
      select: { id: true, date: true },
    });
    if (sourceRows.length !== selected.lines.length) throw new Error("One or more source installation records no longer exist.");
    const sourceById = new Map(sourceRows.map(row => [row.id, row]));
    for (const line of selected.lines) {
      const source = sourceById.get(line.lineId)!;
      if (source.date < start || source.date >= end) throw new Error("The selected source data no longer matches the invoice month. Reload the month and review it again.");
    }
    const existing = await tx.generatedInvoice.findMany({ where: { invoiceNumber: { in: [invoiceNumbers.A, invoiceNumbers.B] } } });
    const existingTypes = new Set(existing.map(invoice => invoice.invoiceType));
    let reviewed = selected;
    let effectivePricingSnapshot = input.pricingSnapshot;
    if (existing.length === 1) {
      const saved = existing[0];
      if (!Array.isArray(saved.lineDetailsSnapshot)) throw new Error("The existing invoice has no saved line snapshot to create its counterpart.");
      const savedLines = saved.lineDetailsSnapshot as unknown as ReviewedInvoiceLine[];
      const savedOptional = Array.isArray(saved.optionalItemsSnapshot) ? saved.optionalItemsSnapshot as unknown as ReviewedOptionalItem[] : [];
      reviewed = normalizedReviewedSnapshot({ lines: savedLines, optionalItems: savedOptional });
      effectivePricingSnapshot = saved.pricingSnapshot ?? input.pricingSnapshot;
    }

    const effectiveRows = [
      ...reviewed.lines.map(line => ({ baseCents: safeCents(line.baseRate, "Invoice line rate") })),
      ...reviewed.optionalItems.map(item => ({ baseCents: safeCents(item.unitRate * item.quantity, "Optional item amount") })),
    ];
    const effectiveTotalCents = effectiveRows.reduce((sum, row) => sum + row.baseCents, 0);
    if (effectiveTotalCents <= 0) throw new Error("The invoice total must be greater than zero.");
    const effectiveShares = {
      A: distributePercent(effectiveRows, 90),
      B: distributePercent(effectiveRows, 10),
    };
    const results = [...existing];
    for (const type of ["A", "B"] as const) {
      if (existingTypes.has(type)) continue;
      const lineSnapshots = reviewed.lines.map((line, index) => ({
        ...line,
        invoiceAmount: effectiveShares[type][index] / 100,
      }));
      const itemSnapshots = reviewed.optionalItems.map((item, index) => ({
        ...item,
        baseAmount: item.unitRate * item.quantity,
        invoiceAmount: effectiveShares[type][reviewed.lines.length + index] / 100,
      }));
      const created = await tx.generatedInvoice.create({
        data: {
          invoiceNumber: invoiceNumbers[type],
          invoiceType: type,
          month: input.month,
          year: input.year,
          jobMonth,
          invoiceDate: nextMonthDate,
          totalAmount: effectiveShares[type].reduce((sum, value) => sum + value, 0) / 100,
          lineCount: reviewed.lines.length,
          lineDetailsIds: reviewed.lines.map(line => line.lineId) as Prisma.InputJsonValue,
          pricingSnapshot: effectivePricingSnapshot == null ? Prisma.JsonNull : effectivePricingSnapshot as Prisma.InputJsonValue,
          lineDetailsSnapshot: lineSnapshots as unknown as Prisma.InputJsonValue,
          optionalItemsSnapshot: itemSnapshots as unknown as Prisma.InputJsonValue,
          status: "generated",
        },
      });
      results.push(created);
    }
    return results.sort((a, b) => String(a.invoiceType).localeCompare(String(b.invoiceType)));
  });
}

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
