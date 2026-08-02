import { Prisma } from "@prisma/client";
import { computeCableMeasurements } from "@/lib/db";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export interface PricingTierInput {
  minLength: number;
  maxLength?: number | null;
  rate: number;
}

export interface PricingLineSnapshot {
  lineId: string;
  customerName: string;
  telephoneNo: string;
  address: string;
  serviceDate: string;
  cableLength: number;
  baseRate: number;
  invoiceAmount: number;
  pricingScheduleId: string;
  pricingScheduleName: string;
}

const DEFAULT_TIERS: PricingTierInput[] = [
  { minLength: 0, maxLength: 100, rate: 6000 },
  { minLength: 101, maxLength: 200, rate: 6500 },
  { minLength: 201, maxLength: 300, rate: 7200 },
  { minLength: 301, maxLength: 400, rate: 7800 },
  { minLength: 401, maxLength: 500, rate: 8200 },
  { minLength: 501, maxLength: null, rate: 8400 },
];

function dateOnly(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid pricing date");
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dateKey(value: Date | string): string {
  return dateOnly(value).toISOString().slice(0, 10);
}

function parseLegacyTiers(value: unknown): PricingTierInput[] {
  if (!value) return [];
  let tiers: unknown = value;
  if (typeof tiers === "string") {
    try {
      tiers = JSON.parse(tiers);
    } catch {
      return [];
    }
  }
  if (Array.isArray(tiers)) {
    return tiers.map((tier) => {
      const item = tier as Record<string, unknown>;
      return {
        minLength: Number(item.min_length ?? item.minLength),
        maxLength:
          item.max_length == null || String(item.max_length) === "" || Number(item.max_length) >= 999999
            ? null
            : Number(item.max_length ?? item.maxLength),
        rate: Number(item.rate),
      };
    });
  }
  if (typeof tiers === "object") {
    return Object.entries(tiers as Record<string, unknown>).map(([range, rate]) => {
      if (range.endsWith("+")) {
        return { minLength: Number(range.slice(0, -1)), maxLength: null, rate: Number(rate) };
      }
      const [min, max] = range.split("-").map(Number);
      return { minLength: min, maxLength: max, rate: Number(rate) };
    });
  }
  return [];
}

export function validatePricingTiers(input: PricingTierInput[]): PricingTierInput[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("At least one pricing tier is required");
  }
  let previousMax: number | null = null;
  return input.map((tier, index) => {
    const minLength = Number(tier.minLength);
    const maxLength = tier.maxLength == null || Number(tier.maxLength) >= 999999
      ? null
      : Number(tier.maxLength);
    const rate = Number(tier.rate);
    if (!Number.isFinite(minLength) || minLength < 0) throw new Error(`Tier ${index + 1} has an invalid minimum length`);
    if (maxLength !== null && (!Number.isFinite(maxLength) || maxLength < minLength)) {
      throw new Error(`Tier ${index + 1} has an invalid maximum length`);
    }
    if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Tier ${index + 1} must have a positive rate`);
    if (previousMax !== null && minLength <= previousMax) {
      throw new Error("Pricing tiers must be ordered and non-overlapping");
    }
    if (previousMax === null && index > 0) {
      throw new Error("An open-ended pricing tier must be the final tier");
    }
    previousMax = maxLength;
    return { minLength, maxLength, rate };
  });
}

function tierToJson(tier: PricingTierInput) {
  return {
    min_length: tier.minLength,
    max_length: tier.maxLength,
    rate: tier.rate,
  };
}

async function ensureInitialPricingSchedule(tx: Tx = prisma as unknown as Tx) {
  const existing = await tx.pricingSchedule.findFirst({ orderBy: { effectiveFrom: "desc" } });
  if (existing) return tx.pricingSchedule.findUniqueOrThrow({ where: { id: existing.id }, include: { tiers: true } });

  const settings = await tx.companySettings.findFirst({ select: { pricingTiers: true } });
  const tiers = validatePricingTiers(parseLegacyTiers(settings?.pricingTiers).length ? parseLegacyTiers(settings?.pricingTiers) : DEFAULT_TIERS);
  const effectiveFrom = new Date(Date.UTC(1970, 0, 1));
  try {
    return await tx.pricingSchedule.create({
      data: {
        name: "Initial pricing schedule",
        effectiveFrom,
        status: "active",
        tiers: { create: tiers.map(tierToJson).map((tier) => ({ minLength: tier.min_length, maxLength: tier.max_length, rate: tier.rate })) },
      },
      include: { tiers: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return tx.pricingSchedule.findUniqueOrThrow({ where: { effectiveFrom }, include: { tiers: true } });
    }
    throw error;
  }
}

export async function listPricingSchedules() {
  await ensureInitialPricingSchedule();
  return prisma.pricingSchedule.findMany({
    include: { tiers: { orderBy: { minLength: "asc" } } },
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function createPricingSchedule(input: {
  name: string;
  effectiveFrom: Date | string;
  tiers: PricingTierInput[];
  createdById: string;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Pricing schedule name is required");
  const effectiveFrom = dateOnly(input.effectiveFrom);
  const tiers = validatePricingTiers(input.tiers);

  return prisma.$transaction(async (tx) => {
    const previous = await tx.pricingSchedule.findFirst({
      where: { effectiveFrom: { lte: effectiveFrom } },
      orderBy: { effectiveFrom: "desc" },
    });
    if (previous && dateKey(previous.effectiveFrom) === dateKey(effectiveFrom)) {
      throw new Error("A pricing schedule already exists for this effective date");
    }
    const schedule = await tx.pricingSchedule.create({
      data: {
        name,
        effectiveFrom,
        status: "active",
        createdById: input.createdById,
        tiers: { create: tiers.map((tier) => ({ minLength: tier.minLength, maxLength: tier.maxLength, rate: tier.rate })) },
      },
      include: { tiers: { orderBy: { minLength: "asc" } } },
    });

    if (previous && previous.status === "active") {
      await tx.pricingSchedule.update({ where: { id: previous.id }, data: { status: "retired", lockedAt: previous.lockedAt || new Date() } });
    }
    return schedule;
  });
}

async function scheduleForDate(tx: Tx, serviceDate: Date) {
  await ensureInitialPricingSchedule(tx);
  const schedule = await tx.pricingSchedule.findFirst({
    where: {
      effectiveFrom: { lte: dateOnly(serviceDate) },
      status: { in: ["active", "retired"] },
    },
    include: { tiers: { orderBy: { minLength: "asc" } } },
    orderBy: { effectiveFrom: "desc" },
  });
  if (!schedule) throw new Error(`No pricing schedule applies to ${dateKey(serviceDate)}`);
  return schedule;
}

function rateForLength(length: number, tiers: Array<{ minLength: Prisma.Decimal; maxLength: Prisma.Decimal | null; rate: Prisma.Decimal }>) {
  const tier = tiers.find((item) => length >= Number(item.minLength) && (item.maxLength == null || length <= Number(item.maxLength)));
  if (!tier) throw new Error(`No pricing tier applies to cable length ${length}`);
  return Number(tier.rate);
}

export async function calculateInvoicePricing(tx: Tx, input: { lineDetailsIds: string[]; invoiceType?: string }) {
  const ids = input.lineDetailsIds;
  if (!Array.isArray(ids) || ids.length === 0) throw new Error("At least one line is required");
  if (new Set(ids).size !== ids.length) throw new Error("Invoice lines cannot be duplicated");

  const lines = await tx.lineDetails.findMany({ where: { id: { in: ids } } });
  const byId = new Map(lines.map((line) => [line.id, line]));
  if (lines.length !== ids.length) throw new Error("One or more invoice lines no longer exist");

  const baseSnapshots: Array<PricingLineSnapshot & { baseCents: number }> = [];
  const schedules = new Map<string, { id: string; name: string; effectiveFrom: string; tiers: Array<{ minLength: number; maxLength: number | null; rate: number }> }>();
  for (const id of ids) {
    const line = byId.get(id)!;
    const schedule = await scheduleForDate(tx, line.date);
    const cableLength = computeCableMeasurements(Number(line.cableStart), Number(line.cableMiddle), Number(line.cableEnd)).totalCable;
    const baseRate = rateForLength(cableLength, schedule.tiers);
    schedules.set(schedule.id, {
      id: schedule.id,
      name: schedule.name,
      effectiveFrom: dateKey(schedule.effectiveFrom),
      tiers: schedule.tiers.map((tier) => ({ minLength: Number(tier.minLength), maxLength: tier.maxLength == null ? null : Number(tier.maxLength), rate: Number(tier.rate) })),
    });
    baseSnapshots.push({
      lineId: line.id,
      customerName: line.name || "",
      telephoneNo: line.telephoneNo || line.phoneNumber || "",
      address: line.address || "",
      serviceDate: dateKey(line.date),
      cableLength,
      baseRate,
      invoiceAmount: baseRate,
      pricingScheduleId: schedule.id,
      pricingScheduleName: schedule.name,
      baseCents: Math.round(baseRate * 100),
    });
  }

  const totalCents = baseSnapshots.reduce((sum, line) => sum + line.baseCents, 0);
  const type = String(input.invoiceType || "").toUpperCase();
  const targetCents = type === "A" ? Math.round(totalCents * 0.9) : type === "B" ? totalCents - Math.round(totalCents * 0.9) : totalCents;
  let assigned = 0;
  baseSnapshots.forEach((line, index) => {
    if (index === baseSnapshots.length - 1) {
      line.invoiceAmount = (targetCents - assigned) / 100;
    } else {
      const share = type === "A" ? Math.round(line.baseCents * 0.9) : type === "B" ? line.baseCents - Math.round(line.baseCents * 0.9) : line.baseCents;
      line.invoiceAmount = share / 100;
      assigned += share;
    }
  });

  return {
    totalAmount: targetCents / 100,
    lineCount: ids.length,
    lineDetailsIds: ids,
    lineDetailsSnapshot: baseSnapshots.map(({ baseCents: _baseCents, ...line }) => line),
    pricingSnapshot: Array.from(schedules.values()),
    pricingScheduleId: schedules.size === 1 ? Array.from(schedules.keys())[0] : null,
  };
}

export async function calculateInvoicePricingPreview(input: { lineDetailsIds: string[]; invoiceType?: string }) {
  return prisma.$transaction((tx) => calculateInvoicePricing(tx, input));
}

