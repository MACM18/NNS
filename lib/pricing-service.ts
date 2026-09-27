import { Prisma } from "@prisma/client";
import { computeCableMeasurements } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { classifyService, serviceDescription, OPTIONAL_ITEM_DESCRIPTIONS, OPTIONAL_ITEM_RATES, type OptionalItemCode, type OptionalItemInput, type ServiceType } from "@/lib/service-pricing-types";

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
  serviceType: ServiceType;
  description: string;
  baseRate: number;
  invoiceAmount: number;
  pricingScheduleId: string;
  pricingScheduleName: string;
}

export const DEFAULT_FTTH_TIERS: PricingTierInput[] = [
  { minLength: 0, maxLength: 100, rate: 6650 },
  { minLength: 101, maxLength: 200, rate: 7000 },
  { minLength: 201, maxLength: 300, rate: 7800 },
  { minLength: 301, maxLength: 400, rate: 8400 },
  { minLength: 401, maxLength: 500, rate: 8800 },
  { minLength: 501, maxLength: null, rate: 9000 },
];

export const DEFAULT_DATA_TIERS: PricingTierInput[] = [
  { minLength: 0, maxLength: 100, rate: 5000 },
  { minLength: 101, maxLength: 200, rate: 5500 },
  { minLength: 201, maxLength: 300, rate: 6800 },
  { minLength: 301, maxLength: 400, rate: 6800 },
  { minLength: 401, maxLength: 500, rate: 7200 },
  { minLength: 501, maxLength: null, rate: 7400 },
];

export const DEFAULT_PEO_TV_RATE = 1800;

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

function validMoney(value: number): boolean {
  const cents = value * 100;
  return Number.isFinite(value) && value > 0 && Number.isSafeInteger(Math.round(cents))
    && Math.abs(cents - Math.round(cents)) < 1e-7;
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
    if (!validMoney(rate)) throw new Error(`Tier ${index + 1} must have a positive rate with at most two decimal places`);
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
  const initialDate = new Date(Date.UTC(1970, 0, 1));
  const existing = await tx.pricingSchedule.findUnique({ where: { effectiveFrom: initialDate }, include: { tiers: true } });
  if (existing) return existing;

  const settings = await tx.companySettings.findFirst({ select: { pricingTiers: true } });
  const tiers = validatePricingTiers(parseLegacyTiers(settings?.pricingTiers).length ? parseLegacyTiers(settings?.pricingTiers) : DEFAULT_FTTH_TIERS);
  const effectiveFrom = initialDate;
  try {
    return await tx.pricingSchedule.create({
      data: {
        name: "Initial pricing schedule",
        effectiveFrom,
        status: "active",
        peoTvRate: DEFAULT_PEO_TV_RATE,
        optionalRates: OPTIONAL_ITEM_RATES,
        tiers: { create: [
          ...tiers.map(tierToJson).map((tier) => ({ serviceType: "FTTH", minLength: tier.min_length, maxLength: tier.max_length, rate: tier.rate })),
          ...DEFAULT_DATA_TIERS.map((tier) => ({ serviceType: "DATA", minLength: tier.minLength, maxLength: tier.maxLength, rate: tier.rate })),
        ] },
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
  dataTiers: PricingTierInput[];
  peoTvRate: number;
  optionalRates: Record<OptionalItemCode, number>;
  createdById: string;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Pricing schedule name is required");
  const effectiveFrom = dateOnly(input.effectiveFrom);
  const tiers = validatePricingTiers(input.tiers);
  const dataTiers = validatePricingTiers(input.dataTiers);
  const peoTvRate = Number(input.peoTvRate);
  if (!validMoney(peoTvRate)) throw new Error("Peo TV rate must be positive with at most two decimal places");
  const optionalRates = validateOptionalRates(input.optionalRates);

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
        peoTvRate,
        optionalRates,
        tiers: { create: [
          ...tiers.map((tier) => ({ serviceType: "FTTH", minLength: tier.minLength, maxLength: tier.maxLength, rate: tier.rate })),
          ...dataTiers.map((tier) => ({ serviceType: "DATA", minLength: tier.minLength, maxLength: tier.maxLength, rate: tier.rate })),
        ] },
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

export function validateOptionalRates(input: unknown): Record<OptionalItemCode, number> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Optional item rates are required");
  const rates = input as Record<string, unknown>;
  const result = {} as Record<OptionalItemCode, number>;
  for (const code of Object.keys(OPTIONAL_ITEM_RATES) as OptionalItemCode[]) {
    const value = Number(rates[code]);
    if (!validMoney(value)) throw new Error(`${OPTIONAL_ITEM_DESCRIPTIONS[code]} rate must be positive with at most two decimal places`);
    result[code] = value;
  }
  return result;
}

function optionalRatesForSchedule(value: unknown): Record<OptionalItemCode, number> {
  const stored = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return { ...OPTIONAL_ITEM_RATES, ...Object.fromEntries(
    (Object.keys(OPTIONAL_ITEM_RATES) as OptionalItemCode[])
      .filter((code) => Number.isFinite(Number(stored[code])) && Number(stored[code]) > 0)
      .map((code) => [code, Number(stored[code])]),
  ) } as Record<OptionalItemCode, number>;
}

function validateOptionalItems(input: unknown): Array<{ code: OptionalItemCode; quantity: number; unitRate?: number }> {
  if (input == null) return [];
  if (typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid optional invoice items");
  const items = input as Record<string, unknown>;
  for (const code of Object.keys(items)) {
    if (!(code in OPTIONAL_ITEM_RATES)) throw new Error(`Unknown optional invoice item: ${code}`);
  }
  return (Object.keys(OPTIONAL_ITEM_RATES) as OptionalItemCode[]).flatMap((code) => {
    const selection = items[code];
    const isDetail = selection != null && typeof selection === "object" && !Array.isArray(selection);
    const detail = isDetail ? selection as Record<string, unknown> : null;
    const quantity = Number(detail ? detail.quantity : selection ?? 0);
    if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error(`${OPTIONAL_ITEM_DESCRIPTIONS[code]} quantity must be a nonnegative whole number`);
    if (!quantity) return [];
    const unitRate = detail?.unitRate == null ? undefined : Number(detail.unitRate);
    if (unitRate !== undefined && !validMoney(unitRate)) throw new Error(`${OPTIONAL_ITEM_DESCRIPTIONS[code]} unit rate must be positive with at most two decimal places`);
    return [{ code, quantity, unitRate }];
  });
}

function tierForLength(length: number, tiers: Array<{ minLength: Prisma.Decimal | number; maxLength?: Prisma.Decimal | number | null; rate: Prisma.Decimal | number }>, serviceType: ServiceType) {
  const billableLength = Math.ceil(length);
  const tier = tiers.find((item) => billableLength >= Number(item.minLength) && (item.maxLength == null || billableLength <= Number(item.maxLength)));
  if (!tier) throw new Error(`No ${serviceType} pricing tier applies to cable length ${length} m. Set this rate in a pricing schedule before invoicing.`);
  return tier;
}

export async function calculateInvoicePricing(tx: Tx, input: { lineDetailsIds: string[]; invoiceType?: string; optionalItems?: OptionalItemInput }) {
  const ids = input.lineDetailsIds;
  if (!Array.isArray(ids) || ids.length === 0) throw new Error("At least one line is required");
  if (new Set(ids).size !== ids.length) throw new Error("Invoice lines cannot be duplicated");

  const lines = await tx.lineDetails.findMany({ where: { id: { in: ids } } });
  const byId = new Map(lines.map((line) => [line.id, line]));
  if (lines.length !== ids.length) throw new Error("One or more invoice lines no longer exist");

  const optionalItems = validateOptionalItems(input.optionalItems);
  const baseSnapshots: Array<PricingLineSnapshot & { baseCents: number }> = [];
  const schedules = new Map<string, { id: string; name: string; effectiveFrom: string; peoTvRate: number; optionalRates: Record<OptionalItemCode, number>; tiers: Array<{ serviceType: string; minLength: number; maxLength: number | null; rate: number }> }>();
  for (const id of ids) {
    const line = byId.get(id)!;
    const schedule = await scheduleForDate(tx, line.date);
    const cableLength = computeCableMeasurements(Number(line.cableStart), Number(line.cableMiddle), Number(line.cableEnd)).totalCable;
    const telephoneNo = line.telephoneNo || line.phoneNumber || "";
    const serviceType = classifyService(line.dp, telephoneNo);
    const applicableTiers = serviceType === "DATA"
      ? schedule.tiers.filter((tier) => tier.serviceType === "DATA")
      : schedule.tiers.filter((tier) => tier.serviceType !== "DATA");
    const rateTiers = serviceType === "DATA" && applicableTiers.length === 0 ? DEFAULT_DATA_TIERS : applicableTiers;
    const tier = serviceType === "PEO_TV" ? null : tierForLength(cableLength, rateTiers, serviceType);
    const baseRate = tier ? Number(tier.rate) : Number(schedule.peoTvRate ?? DEFAULT_PEO_TV_RATE);
    const description = serviceDescription(serviceType, tier ? Number(tier.minLength) : undefined, tier?.maxLength == null ? null : Number(tier.maxLength));
    schedules.set(schedule.id, {
      id: schedule.id,
      name: schedule.name,
      effectiveFrom: dateKey(schedule.effectiveFrom),
      peoTvRate: Number(schedule.peoTvRate ?? DEFAULT_PEO_TV_RATE),
      optionalRates: optionalRatesForSchedule(schedule.optionalRates),
      tiers: [
        ...schedule.tiers.map((tier) => ({ serviceType: tier.serviceType || "FTTH", minLength: Number(tier.minLength), maxLength: tier.maxLength == null ? null : Number(tier.maxLength), rate: Number(tier.rate) })),
        ...(schedule.tiers.some((tier) => tier.serviceType === "DATA") ? [] : DEFAULT_DATA_TIERS.map((tier) => ({ serviceType: "DATA", minLength: tier.minLength, maxLength: tier.maxLength ?? null, rate: tier.rate }))),
      ],
    });
    baseSnapshots.push({
      lineId: line.id,
      customerName: line.name || "",
      telephoneNo,
      address: line.address || "",
      serviceDate: dateKey(line.date),
      cableLength,
      serviceType,
      description,
      baseRate,
      invoiceAmount: baseRate,
      pricingScheduleId: schedule.id,
      pricingScheduleName: schedule.name,
      baseCents: Math.round(baseRate * 100),
    });
  }

  const optionalSchedule = optionalItems.length
    ? await scheduleForDate(tx, new Date(Math.max(...lines.map((line) => line.date.getTime()))))
    : null;
  const optionalRates = optionalRatesForSchedule(optionalSchedule?.optionalRates);
  const optionalSnapshots = optionalItems.map(({ code, quantity, unitRate }) => {
    const rate = unitRate ?? optionalRates[code];
    const baseAmount = rate * quantity;
    if (!Number.isSafeInteger(Math.round(baseAmount * 100))) throw new Error(`${OPTIONAL_ITEM_DESCRIPTIONS[code]} amount is too large`);
    return {
      code,
      description: OPTIONAL_ITEM_DESCRIPTIONS[code],
      quantity,
      unitRate: rate,
      baseAmount,
      invoiceAmount: baseAmount,
      pricingScheduleId: optionalSchedule!.id,
    };
  });
  if (optionalSchedule) schedules.set(optionalSchedule.id, {
    id: optionalSchedule.id,
    name: optionalSchedule.name,
    effectiveFrom: dateKey(optionalSchedule.effectiveFrom),
    peoTvRate: Number(optionalSchedule.peoTvRate ?? DEFAULT_PEO_TV_RATE),
    optionalRates,
    tiers: [
      ...optionalSchedule.tiers.map((tier) => ({ serviceType: tier.serviceType || "FTTH", minLength: Number(tier.minLength), maxLength: tier.maxLength == null ? null : Number(tier.maxLength), rate: Number(tier.rate) })),
      ...(optionalSchedule.tiers.some((tier) => tier.serviceType === "DATA") ? [] : DEFAULT_DATA_TIERS.map((tier) => ({ serviceType: "DATA", minLength: tier.minLength, maxLength: tier.maxLength ?? null, rate: tier.rate }))),
    ],
  });

  const totalCents = baseSnapshots.reduce((sum, line) => sum + line.baseCents, 0)
    + optionalSnapshots.reduce((sum, item) => sum + Math.round(item.baseAmount * 100), 0);
  const type = String(input.invoiceType || "").toUpperCase();
  const targetCents = type === "A" ? Math.round(totalCents * 0.9) : type === "B" ? totalCents - Math.round(totalCents * 0.9) : totalCents;
  let assigned = 0;
  const chargeRows: Array<{ baseCents: number; setAmount: (value: number) => void }> = [
    ...baseSnapshots.map((line) => ({ baseCents: line.baseCents, setAmount: (value: number) => { line.invoiceAmount = value; } })),
    ...optionalSnapshots.map((item) => ({ baseCents: Math.round(item.baseAmount * 100), setAmount: (value: number) => { item.invoiceAmount = value; } })),
  ];
  chargeRows.forEach((row, index) => {
    const share = index === chargeRows.length - 1
      ? targetCents - assigned
      : type === "A" ? Math.round(row.baseCents * 0.9) : type === "B" ? row.baseCents - Math.round(row.baseCents * 0.9) : row.baseCents;
    row.setAmount(share / 100);
    assigned += share;
  });

  return {
    totalAmount: targetCents / 100,
    lineCount: ids.length,
    lineDetailsIds: ids,
    lineDetailsSnapshot: baseSnapshots.map(({ baseCents: _baseCents, ...line }) => line),
    optionalItemsSnapshot: optionalSnapshots,
    pricingSnapshot: Array.from(schedules.values()),
    pricingScheduleId: schedules.size === 1 ? Array.from(schedules.keys())[0] : null,
  };
}

export async function calculateInvoicePricingPreview(input: { lineDetailsIds: string[]; invoiceType?: string; optionalItems?: OptionalItemInput }) {
  return prisma.$transaction((tx) => calculateInvoicePricing(tx, input));
}

