import { calculateInvoicePricing, validatePricingTiers } from "@/lib/pricing-service";

describe("historical pricing", () => {
  it("rejects overlapping or unordered tiers", () => {
    expect(() => validatePricingTiers([
      { minLength: 0, maxLength: 100, rate: 6000 },
      { minLength: 100, maxLength: 200, rate: 6500 },
    ])).toThrow("ordered and non-overlapping");
  });

  it("calculates invoice-specific split amounts without trusting client totals", async () => {
    const oldSchedule = {
      id: "old-schedule",
      name: "Old rates",
      effectiveFrom: new Date("2026-04-01T00:00:00Z"),
      status: "retired",
      tiers: [{ minLength: 0, maxLength: 100, rate: 6000 }],
    };
    const newSchedule = {
      id: "new-schedule",
      name: "New rates",
      effectiveFrom: new Date("2026-07-01T00:00:00Z"),
      status: "active",
      tiers: [{ minLength: 0, maxLength: 100, rate: 7000 }],
    };
    const tx = {
      pricingSchedule: {
        findFirst: jest.fn((args?: { where?: { effectiveFrom?: { lte: Date } } }) => {
          if (!args?.where?.effectiveFrom) return oldSchedule;
          return args.where.effectiveFrom.lte >= new Date("2026-07-01T00:00:00Z") ? newSchedule : oldSchedule;
        }),
        findUnique: jest.fn(() => oldSchedule),
        findUniqueOrThrow: jest.fn(() => oldSchedule),
      },
      companySettings: { findFirst: jest.fn(() => null) },
      lineDetails: {
        findMany: jest.fn(() => [
          { id: "line-old", date: new Date("2026-06-15T00:00:00Z"), telephoneNo: "0111111111", phoneNumber: null, name: "Old Customer", address: "Old address", cableStart: 0, cableMiddle: 50, cableEnd: 50 },
          { id: "line-new", date: new Date("2026-07-15T00:00:00Z"), telephoneNo: "0222222222", phoneNumber: null, name: "New Customer", address: "New address", cableStart: 0, cableMiddle: 50, cableEnd: 50 },
        ]),
      },
    };

    const result = await calculateInvoicePricing(tx as never, { lineDetailsIds: ["line-old", "line-new"], invoiceType: "A" });

    expect(result.totalAmount).toBe(11700);
    expect(result.lineDetailsSnapshot).toEqual(expect.arrayContaining([
      expect.objectContaining({ lineId: "line-old", baseRate: 6000, pricingScheduleId: "old-schedule" }),
      expect.objectContaining({ lineId: "line-new", baseRate: 7000, pricingScheduleId: "new-schedule" }),
    ]));
    expect(result.lineDetailsSnapshot.reduce((sum, line) => sum + line.invoiceAmount, 0)).toBe(result.totalAmount);
  });
});

describe("service type and optional invoice pricing", () => {
  it("classifies mixed imported and manually entered lines, and bills only selected optional items", async () => {
    const schedule = {
      id: "rates-2026",
      name: "Current rates",
      effectiveFrom: new Date("2026-09-01T00:00:00Z"),
      status: "active",
      peoTvRate: 1800,
      optionalRates: { POLE_56: 700, POLE_67: 800, POLE_8: 900, HIGH_RISE: 3800 },
      tiers: [
        { serviceType: "FTTH", minLength: 0, maxLength: 100, rate: 6650 },
        { serviceType: "DATA", minLength: 0, maxLength: 100, rate: 5000 },
        { serviceType: "DATA", minLength: 201, maxLength: 300, rate: 6800 },
      ],
    };
    const tx = {
      pricingSchedule: {
        findFirst: jest.fn(() => schedule),
        findUnique: jest.fn(() => schedule),
      },
      lineDetails: {
        findMany: jest.fn(() => [
          { id: "ftth", date: new Date("2026-09-15T00:00:00Z"), dp: "HR-PKJ-0536-021-05", telephoneNo: "0342217442", name: "FTTH", cableStart: 0, cableMiddle: 50, cableEnd: 100 },
          { id: "data", date: new Date("2026-09-15T00:00:00Z"), dp: "HR-PKJ-0536-021-06", telephoneNo: "E0342217443", name: "Data", cableStart: 0, cableMiddle: 50, cableEnd: 100 },
          { id: "data-250", date: new Date("2026-09-15T00:00:00Z"), dp: "HR-PKJ-0536-021-07", telephoneNo: "E0342217445", name: "Data 250", cableStart: 0, cableMiddle: 125, cableEnd: 250 },
          { id: "peo", date: new Date("2026-09-15T00:00:00Z"), dp: "pEo Tv", telephoneNo: "0342217444", name: "TV", cableStart: 0, cableMiddle: 50, cableEnd: 100 },
        ]),
      },
    };

    const input = { lineDetailsIds: ["ftth", "data", "data-250", "peo"], optionalItems: { POLE_56: 2 } };
    const invoiceA = await calculateInvoicePricing(tx as never, { ...input, invoiceType: "A" });
    const invoiceB = await calculateInvoicePricing(tx as never, { ...input, invoiceType: "B" });

    expect(invoiceA.lineDetailsSnapshot.map((line) => [line.serviceType, line.baseRate])).toEqual([
      ["FTTH", 6650], ["DATA", 5000], ["DATA", 6800], ["PEO_TV", 1800],
    ]);
    expect(invoiceA.optionalItemsSnapshot).toEqual([expect.objectContaining({ code: "POLE_56", quantity: 2, unitRate: 700 })]);
    expect(invoiceA.totalAmount).toBe(19485);
    expect(invoiceB.totalAmount).toBe(2165);
    expect(invoiceA.lineDetailsSnapshot.reduce((sum, line) => sum + line.invoiceAmount, 0)
      + invoiceA.optionalItemsSnapshot.reduce((sum, item) => sum + item.invoiceAmount, 0)).toBe(invoiceA.totalAmount);

    const customized = await calculateInvoicePricing(tx as never, {
      lineDetailsIds: ["ftth", "data", "data-250", "peo"],
      optionalItems: { POLE_56: { quantity: 2, unitRate: 750 } },
    });
    expect(customized.totalAmount).toBe(21750);
    expect(customized.optionalItemsSnapshot[0].unitRate).toBe(750);

    const withoutOptional = await calculateInvoicePricing(tx as never, { lineDetailsIds: ["ftth", "data", "data-250", "peo"] });
    expect(withoutOptional.optionalItemsSnapshot).toEqual([]);
    expect(withoutOptional.totalAmount).toBe(20250);
  });
});
