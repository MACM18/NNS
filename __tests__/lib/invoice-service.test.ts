import { prisma } from "@/lib/prisma";
import { calculateInvoicePricing } from "@/lib/pricing-service";
import {
  createAndIssueGeneratedInvoice,
  createIssuedInvoiceFromLines,
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
});
