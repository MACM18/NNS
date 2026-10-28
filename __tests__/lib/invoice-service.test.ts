import { prisma } from "@/lib/prisma";
import { calculateInvoicePricing } from "@/lib/pricing-service";
import {
  createAndIssueGeneratedInvoice,
  createIssuedInvoiceFromLines,
  createReviewedInvoicePair,
} from "@/lib/invoice-service";

jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
jest.mock("@/lib/pricing-service", () => ({ calculateInvoicePricing: jest.fn() }));

describe("invoice service without accounting", () => {
  const invoice = {
    id: "invoice-1",
    invoiceNumber: "S/Southern/HR/NC/26/August",
    invoiceType: "A",
    month: 8,
    year: 2026,
    jobMonth: "AUGUST 2026",
    invoiceDate: new Date("2026-09-02T00:00:00.000Z"),
    totalAmount: 9000,
    lineCount: 1,
    lineDetailsIds: ["line-1"],
    status: "issued",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a priced invoice with saved snapshots and no ledger/payment fields", async () => {
    const tx = {
      $executeRaw: jest.fn(),
      generatedInvoice: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(invoice),
      },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((callback) => callback(tx));
    (calculateInvoicePricing as jest.Mock).mockResolvedValue({
      totalAmount: 9000,
      lineCount: 1,
      lineDetailsIds: ["line-1"],
      pricingScheduleId: "schedule-1",
      pricingSnapshot: { version: 1 },
      lineDetailsSnapshot: [{ lineId: "line-1" }],
      optionalItemsSnapshot: [],
    });

    await createIssuedInvoiceFromLines({
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: "A",
      month: 8,
      year: 2026,
      jobMonth: "AUGUST 2026",
      lineDetailsIds: ["line-1"],
    });

    const createData = tx.generatedInvoice.create.mock.calls[0][0].data;
    expect(createData.pricingSnapshot).toEqual({ version: 1 });
    expect(createData.lineDetailsSnapshot).toEqual([{ lineId: "line-1" }]);
    expect(createData.status).toBe("issued");
    expect(createData).not.toHaveProperty("accountingStatus");
    expect(createData).not.toHaveProperty("paymentStatus");
    expect(calculateInvoicePricing).toHaveBeenCalled();
  });

  it("rejects a duplicate invoice number without replacing the saved invoice", async () => {
    const tx = {
      $executeRaw: jest.fn(),
      generatedInvoice: {
        findFirst: jest.fn().mockResolvedValue({ id: "existing-invoice" }),
        create: jest.fn(),
      },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((callback) => callback(tx));

    await expect(
      createIssuedInvoiceFromLines({
        invoiceNumber: invoice.invoiceNumber,
        lineDetailsIds: ["line-1"],
      }),
    ).rejects.toThrow("already exists");
    expect(tx.generatedInvoice.create).not.toHaveBeenCalled();
    expect(calculateInvoicePricing).not.toHaveBeenCalled();
  });

  it("creates a manual invoice without requiring financial year or account setup", async () => {
    const tx = {
      $executeRaw: jest.fn(),
      generatedInvoice: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(invoice),
      },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((callback) => callback(tx));

    await createAndIssueGeneratedInvoice({
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: 9000,
      lineCount: 1,
      createdById: "profile-1",
    });

    expect(tx.generatedInvoice.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: 9000,
        status: "issued",
      }),
    }));
  });

  it("saves a reviewed pair with 90/10 totals while retaining edited snapshot values", async () => {
    const tx = {
      $executeRaw: jest.fn(),
      lineDetails: { findMany: jest.fn().mockResolvedValue([{ id: "line-1", date: new Date("2026-08-12T00:00:00.000Z") }]) },
      generatedInvoice: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn()
          .mockResolvedValueOnce({ ...invoice, id: "invoice-a", invoiceType: "A", totalAmount: 90 })
          .mockResolvedValueOnce({ ...invoice, id: "invoice-b", invoiceType: "B", totalAmount: 10 }),
      },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(callback => callback(tx));

    await createReviewedInvoicePair({
      month: 8,
      year: 2026,
      createdById: "profile-1",
      lines: [{
        lineId: "line-1", customerName: "Edited customer", telephoneNo: "0770000000", address: "Invoice-only address",
        serviceDate: "2026-08-12", cableLength: 123, serviceType: "DATA", description: "Reviewed data line", baseRate: 100,
      }],
      optionalItems: [],
      pricingSnapshot: [{ id: "schedule-1" }],
    });

    const createdA = tx.generatedInvoice.create.mock.calls[0][0].data;
    const createdB = tx.generatedInvoice.create.mock.calls[1][0].data;
    expect(createdA.totalAmount).toBe(90);
    expect(createdB.totalAmount).toBe(10);
    expect(createdA.lineDetailsSnapshot[0]).toMatchObject({ customerName: "Edited customer", description: "Reviewed data line", baseRate: 100, invoiceAmount: 90 });
    expect(createdB.lineDetailsSnapshot[0].invoiceAmount).toBe(10);
    expect(tx.generatedInvoice.create).toHaveBeenCalledTimes(2);
  });

  it("preserves an existing invoice and creates only its missing counterpart from that saved snapshot", async () => {
    const savedLine = {
      lineId: "line-1", customerName: "Original review", telephoneNo: "0770000000", address: "Saved address",
      serviceDate: "2026-08-12", cableLength: 123, serviceType: "DATA", description: "Saved description", baseRate: 200,
    };
    const savedA = {
      ...invoice,
      id: "invoice-a",
      invoiceType: "A",
      totalAmount: 180,
      lineDetailsSnapshot: [{ ...savedLine, invoiceAmount: 180 }],
      optionalItemsSnapshot: [],
      pricingSnapshot: [{ id: "saved-schedule" }],
    };
    const tx = {
      $executeRaw: jest.fn(),
      lineDetails: { findMany: jest.fn().mockResolvedValue([{ id: "line-1", date: new Date("2026-08-12T00:00:00.000Z") }]) },
      generatedInvoice: {
        findMany: jest.fn().mockResolvedValue([savedA]),
        create: jest.fn().mockResolvedValue({ ...invoice, id: "invoice-b", invoiceType: "B", totalAmount: 20 }),
      },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(callback => callback(tx));

    await createReviewedInvoicePair({
      month: 8,
      year: 2026,
      createdById: "profile-1",
      lines: [{ ...savedLine, customerName: "Unsaved attempted change", baseRate: 500 }],
      optionalItems: [],
    });

    expect(tx.generatedInvoice.create).toHaveBeenCalledTimes(1);
    const created = tx.generatedInvoice.create.mock.calls[0][0].data;
    expect(created.invoiceType).toBe("B");
    expect(created.totalAmount).toBe(20);
    expect(created.lineDetailsSnapshot[0].customerName).toBe("Original review");
    expect(created.pricingSnapshot).toEqual([{ id: "saved-schedule" }]);
  });

  it("rejects source lines outside the selected month without creating invoices", async () => {
    const tx = {
      $executeRaw: jest.fn(),
      lineDetails: { findMany: jest.fn().mockResolvedValue([{ id: "line-1", date: new Date("2026-09-01T00:00:00.000Z") }]) },
      generatedInvoice: { findMany: jest.fn(), create: jest.fn() },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(callback => callback(tx));
    await expect(createReviewedInvoicePair({
      month: 8, year: 2026, createdById: "profile-1", lines: [{
        lineId: "line-1", customerName: "A", telephoneNo: "1", address: "A", serviceDate: "2026-08-31",
        cableLength: 100, serviceType: "FTTH", description: "FTTH", baseRate: 100,
      }], optionalItems: [],
    })).rejects.toThrow("invoice month");
    expect(tx.generatedInvoice.create).not.toHaveBeenCalled();
  });
});
