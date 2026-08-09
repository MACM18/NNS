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
    warnings: [],
    discrepancies: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates mapped operational stock once and skips the same checksum", async () => {
    const tx = {
      materialBalanceItemMapping: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      inventoryItem: {
        findMany: jest.fn().mockResolvedValue([
          { id: "inventory-1", name: "C-Hook", currentStock: 2 },
        ]),
        update: jest.fn().mockResolvedValue({}),
      },
      materialBalanceImport: {
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
      inventoryStockEvent: {
        create: jest.fn().mockResolvedValue({ id: "event-1" }),
      },
    };

    mockPrisma.materialBalanceImport.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingImport);
    mockPrisma.$transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));

    const values = [
      ["Title", null, "Date", "2026-08-01", null, null, "Total"],
      ["Item", "Unit", "Previous Day balance", "Issued", "Usage", "Balance Return", "Issued", "Usage", "Return", "Final Balance"],
      ["C-Hook(NOS)", "NOS", 4, 2, 1, 0, 2, 1, 0, 5],
    ];

    const first = await importMaterialBalanceValues({
      connectionId: "connection-1",
      month: 8,
      year: 2026,
      values,
      createdById: "profile-1",
    });
    const second = await importMaterialBalanceValues({
      connectionId: "connection-1",
      month: 8,
      year: 2026,
      values,
      createdById: "profile-1",
    });

    expect(first.imported).toBe(true);
    expect(first.updatedStockCount).toBe(1);
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: "inventory-1" },
      data: { currentStock: 5 },
    });
    expect(tx.inventoryStockEvent.create).toHaveBeenCalledTimes(1);
    expect(second.skipped).toBe(true);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
