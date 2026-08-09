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
