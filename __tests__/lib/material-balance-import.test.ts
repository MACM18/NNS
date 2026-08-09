jest.mock("@/lib/prisma", () => {
  const client = {
    materialBalanceImport: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  return { __esModule: true, default: client };
});

import { importMaterialBalanceValues } from "@/lib/material-balance-service";
import prisma from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  materialBalanceImport: { findUnique: jest.Mock };
  $transaction: jest.Mock;
};

describe("Material Balance stock import", () => {
  const existingImport = {
    id: "import-1",
    importedAt: new Date("2026-08-09T00:00:00.000Z"),
    status: "success",
    sourceDayCount: 1,
    itemCount: 1,
    mappedItemCount: 1,
    unmappedItemCount: 0,
    updatedStockCount: 1,
    dailyIssueInvoiceCount: 1,
    correctionInvoiceCount: 0,
    reconciliationCount: 1,
    monthlySourceTab: "Material Balance - Month",
    monthlyChecksum: "monthly-checksum",
    monthlyItemCount: 1,
    stockChanges: [],
    warnings: [],
    discrepancies: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates free issue and month-end reconciliation records once", async () => {
    let inventoryCurrentStock = 2;
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      materialBalanceItemMapping: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      inventoryItem: {
        findMany: jest.fn().mockResolvedValue([
          { id: "inventory-1", name: "C-Hook", currentStock: 2 },
        ]),
        findUnique: jest.fn().mockImplementation(async () => ({
          id: "inventory-1",
          name: "C-Hook",
          unit: "NOS",
          currentStock: inventoryCurrentStock,
        })),
        update: jest.fn().mockImplementation(async ({ data }: { data: { currentStock: number } }) => {
          inventoryCurrentStock = Number(data.currentStock);
          return {};
        }),
      },
      materialBalanceImport: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValue({
          ...existingImport,
          items: [{
            id: "snapshot-1",
            sourceItemName: "C-Hook(NOS)",
            normalizedSourceName: "chook",
            sourceUnit: "NOS",
            sourceRow: 3,
            inventoryItemId: "inventory-1",
            openingBalance: 4,
            totalIssued: 2,
            totalUsage: 1,
            totalReturned: 0,
            finalBalance: 5,
            monthEndingWip: 5,
            warning: null,
            inventoryItem: { id: "inventory-1", name: "C-Hook", currentStock: 5, unit: "NOS" },
          }],
          }),
        create: jest.fn().mockResolvedValue({
          id: "import-1",
          importedAt: existingImport.importedAt,
        }),
        update: jest.fn().mockResolvedValue(existingImport),
      },
      materialBalanceItem: {
        create: jest.fn().mockResolvedValue({ id: "snapshot-1" }),
      },
      materialBalanceDailyEntry: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      inventoryInvoice: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn()
          .mockResolvedValueOnce({ id: "invoice-issue-1", invoiceNumber: "MB-ISSUE-1" })
          .mockResolvedValueOnce({ id: "invoice-reconcile-1", invoiceNumber: "MB-RECONCILE-1" }),
      },
      inventoryInvoiceItem: {
        create: jest.fn().mockResolvedValue({}),
      },
      inventoryStockEvent: {
        create: jest.fn()
          .mockResolvedValueOnce({ id: "event-issue-1" })
          .mockResolvedValueOnce({ id: "event-reconcile-1" }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    mockPrisma.materialBalanceImport.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "import-1" });
    mockPrisma.$transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));

    const values = [
      ["Title", null, "Date:", "2026-08-01", null, null, "Total"],
      ["Item", "Unit", "Previous Day balance", "Issued", "Usage", "Balance Return", "Issued", "Usage", "Return", "Final Balance"],
      ["C-Hook(NOS)", "NOS", 4, 2, 1, 0, 2, 1, 0, 5],
    ];
    const monthlyValues = [
      ["MATERIAL BALANCE SHEET FOR NEW CONNECTION"],
      ["No", "Item", "Opening Balance", "Stock Issued", null, "In hand End of the month", "Material used for invoice", "Ending WIP Material"],
      [1, "C-Hook(NOS)", 4, 2, null, 5, 1, 5],
    ];

    const first = await importMaterialBalanceValues({
      connectionId: "connection-1",
      month: 8,
      year: 2026,
      values,
      monthlyValues,
      createdById: "profile-1",
    });
    const second = await importMaterialBalanceValues({
      connectionId: "connection-1",
      month: 8,
      year: 2026,
      values,
      monthlyValues,
      createdById: "profile-1",
    });

    expect(first.imported).toBe(true);
    expect(first.dailyIssueInvoiceCount).toBe(1);
    expect(first.reconciliationCount).toBe(1);
    expect(inventoryCurrentStock).toBe(5);
    expect(tx.inventoryInvoice.create).toHaveBeenCalledTimes(2);
    expect(tx.inventoryStockEvent.create).toHaveBeenCalledTimes(2);
    expect(second.skipped).toBe(true);
    expect(second.updatedStockCount).toBe(0);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it("does not change stock or create invoices when the month-end tab is missing", async () => {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      materialBalanceItemMapping: { findMany: jest.fn().mockResolvedValue([]) },
      inventoryItem: {
        findMany: jest.fn().mockResolvedValue([{ id: "inventory-1", name: "C-Hook", currentStock: 2 }]),
        update: jest.fn(),
      },
      materialBalanceImport: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "import-missing-month", importedAt: new Date() }),
        update: jest.fn().mockResolvedValue({
          ...existingImport,
          status: "warning",
          warnings: ["Material Balance - Month is required before automatic stock invoices can be applied"],
        }),
      },
      materialBalanceItem: { create: jest.fn().mockResolvedValue({ id: "snapshot-missing-month" }) },
      materialBalanceDailyEntry: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      inventoryInvoice: { findUnique: jest.fn(), create: jest.fn() },
      inventoryInvoiceItem: { create: jest.fn() },
      inventoryStockEvent: { create: jest.fn(), findFirst: jest.fn() },
    };
    mockPrisma.materialBalanceImport.findUnique.mockResolvedValueOnce(null);
    mockPrisma.$transaction.mockImplementationOnce(async (callback: (value: typeof tx) => unknown) => callback(tx));

    const result = await importMaterialBalanceValues({
      connectionId: "connection-missing-month",
      month: 8,
      year: 2026,
      values: [
        ["Title", null, "Date:", "2026-08-01"],
        ["Item", "Unit", "Previous Day balance", "Issued", "Usage", "Balance Return"],
        ["C-Hook(NOS)", "NOS", 4, 2, 1, 0],
      ],
      createdById: "profile-1",
    });

    expect(result.status).toBe("warning");
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("Material Balance - Month is required"),
    ]));
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
    expect(tx.inventoryInvoice.create).not.toHaveBeenCalled();
  });
});
