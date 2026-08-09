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

function createFixture(options: { includeMissingItem?: boolean } = {}) {
  let inventoryCurrentStock = 2;
  let importCreated = false;
  let invoiceSequence = 0;
  const invoices: any[] = [];
  const invoiceItems: any[] = [];
  const stockEvents: any[] = [];
  const inventoryItems = [
    { id: "inventory-1", name: "C-Hook", unit: "NOS", currentStock: inventoryCurrentStock },
  ];

  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    $queryRaw: jest.fn().mockImplementation(async () => [{ current_stock: inventoryCurrentStock }]),
    materialBalanceItemMapping: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({}),
    },
    inventoryItem: {
      findMany: jest.fn().mockResolvedValue(inventoryItems),
      findUnique: jest.fn().mockImplementation(async ({ where }: { where: { id?: string; name?: string } }) => {
        const found = inventoryItems.find((item) =>
          where.id ? item.id === where.id : item.name === where.name,
        );
        return found || null;
      }),
      create: jest.fn().mockImplementation(async ({ data }: { data: { name: string; unit: string; currentStock: number } }) => {
        const item = { id: `inventory-${inventoryItems.length + 1}`, ...data };
        inventoryItems.push(item);
        return item;
      }),
      upsert: jest.fn().mockImplementation(async ({ create, update }: { create: any; update: any }) => {
        const existing = inventoryItems.find((item) => item.name === create.name);
        if (existing) return existing;
        const item = { id: `inventory-${inventoryItems.length + 1}`, ...create };
        inventoryItems.push(item);
        return { ...item, ...update };
      }),
      update: jest.fn().mockImplementation(async ({ where, data }: { where: { id: string }; data: { currentStock: number } }) => {
        const item = inventoryItems.find((candidate) => candidate.id === where.id);
        if (item) {
          inventoryCurrentStock = Number(data.currentStock);
          item.currentStock = inventoryCurrentStock;
        }
        return item;
      }),
    },
    materialBalanceImport: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockImplementation(async () => {
        if (!importCreated) return null;
        return {
          id: "import-1",
          importedAt: new Date("2026-08-09T00:00:00.000Z"),
          status: "success",
          sourceDayCount: 1,
          itemCount: options.includeMissingItem ? 2 : 1,
          mappedItemCount: options.includeMissingItem ? 2 : 1,
          unmappedItemCount: 0,
          updatedStockCount: 1,
          dailyIssueInvoiceCount: 1,
          dailyIssueInvoiceUpdateCount: 0,
          dailyIssueInvoiceReversalCount: 0,
          correctionInvoiceCount: 0,
          reconciliationCount: 1,
          monthlySourceTab: "Material Balance - Month",
          monthlyChecksum: "monthly-checksum",
          monthlyItemCount: options.includeMissingItem ? 2 : 1,
          stockChanges: [],
          warnings: [],
          discrepancies: [],
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
            monthOpeningBalance: 4,
            monthStockIssued: 2,
            monthInHand: 5,
            monthMaterialUsed: 1,
            monthSourceRow: 3,
            status: "mapped",
            warning: null,
            inventoryItem: { id: "inventory-1", name: "C-Hook", currentStock: inventoryCurrentStock, unit: "NOS" },
            dailyEntries: [{
              balanceDate: new Date("2026-08-01T00:00:00.000Z"),
              previousBalance: 4,
              issued: 2,
              usage: 1,
              balanceReturn: 0,
              closingBalance: 5,
              sourceColumn: 3,
              sourceBlockIndex: 0,
            }],
          }],
        };
      }),
      create: jest.fn().mockImplementation(async () => {
        importCreated = true;
        return { id: "import-1", importedAt: new Date("2026-08-09T00:00:00.000Z") };
      }),
      update: jest.fn().mockImplementation(async () => ({
        id: "import-1",
        importedAt: new Date("2026-08-09T00:00:00.000Z"),
        status: "success",
        sourceDayCount: 1,
        itemCount: options.includeMissingItem ? 2 : 1,
        mappedItemCount: options.includeMissingItem ? 2 : 1,
        unmappedItemCount: 0,
        updatedStockCount: 1,
        dailyIssueInvoiceCount: 1,
        dailyIssueInvoiceUpdateCount: 0,
        dailyIssueInvoiceReversalCount: 0,
        correctionInvoiceCount: 0,
        reconciliationCount: 1,
        monthlySourceTab: "Material Balance - Month",
        monthlyChecksum: "monthly-checksum",
        monthlyItemCount: options.includeMissingItem ? 2 : 1,
        stockChanges: [],
        warnings: [],
        discrepancies: [],
      })),
    },
    materialBalanceItem: { create: jest.fn().mockResolvedValue({ id: "snapshot-1" }) },
    materialBalanceDailyEntry: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    inventoryInvoice: {
      findMany: jest.fn().mockImplementation(async ({ where }: { where?: any } = {}) => invoices.filter((invoice) => {
        if (where?.sourceType?.in && !where.sourceType.in.includes(invoice.sourceType)) return false;
        if (where?.sourceType && typeof where.sourceType === "string" && invoice.sourceType !== where.sourceType) return false;
        if (where?.sourceDate?.gte && invoice.sourceDate < where.sourceDate.gte) return false;
        if (where?.sourceDate?.lte && invoice.sourceDate > where.sourceDate.lte) return false;
        if (where?.status?.not && invoice.status === where.status.not) return false;
        return true;
      })),
      findUnique: jest.fn().mockImplementation(async ({ where }: { where: { sourceKey?: string } }) =>
        invoices.find((invoice) => invoice.sourceKey === where.sourceKey) || null),
      create: jest.fn().mockImplementation(async ({ data }: { data: any }) => {
        const invoice = { id: `invoice-${++invoiceSequence}`, createdAt: new Date(), updatedAt: new Date(), ...data };
        invoices.push(invoice);
        return { id: invoice.id, invoiceNumber: invoice.invoiceNumber };
      }),
      update: jest.fn().mockImplementation(async ({ where, data }: { where: { id: string }; data: any }) => {
        const invoice = invoices.find((candidate) => candidate.id === where.id);
        if (invoice) Object.assign(invoice, data, { updatedAt: new Date() });
        return { id: invoice.id, invoiceNumber: invoice.invoiceNumber };
      }),
    },
    inventoryInvoiceItem: {
      findMany: jest.fn().mockImplementation(async ({ where }: { where: { invoiceId: string } }) =>
        invoiceItems.filter((item) => item.invoiceId === where.invoiceId)),
      create: jest.fn().mockImplementation(async ({ data }: { data: any }) => {
        const item = { id: `invoice-item-${invoiceItems.length + 1}`, ...data, item: inventoryItems.find((candidate) => candidate.id === data.itemId) || null };
        invoiceItems.push(item);
        return item;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }: { where: { id: string }; data: any }) => {
        const item = invoiceItems.find((candidate) => candidate.id === where.id);
        if (item) Object.assign(item, data);
        return item;
      }),
      delete: jest.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
        const index = invoiceItems.findIndex((candidate) => candidate.id === where.id);
        if (index >= 0) invoiceItems.splice(index, 1);
        return {};
      }),
    },
    inventoryStockEvent: {
      create: jest.fn().mockImplementation(async ({ data }: { data: any }) => {
        const event = { id: `event-${stockEvents.length + 1}`, ...data };
        stockEvents.push(event);
        return { id: event.id };
      }),
      findMany: jest.fn().mockImplementation(async ({ where }: { where: any }) => stockEvents.filter((event) =>
        (!where.sourceReferenceId?.in || where.sourceReferenceId.in.includes(event.sourceReferenceId)) &&
        (!where.sourceType?.in || where.sourceType.in.includes(event.sourceType)),
      )),
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };

  return { tx, getStock: () => inventoryCurrentStock, invoices, invoiceItems, inventoryItems, stockEvents };
}

const dailyValues = (issued: number, itemName = "C-Hook(NOS)", unit = "NOS") => [
  ["Title", null, "Date:", "2026-08-01", null, null, "Total"],
  ["Item", "Unit", "Previous Day balance", "Issued", "Usage", "Balance Return", "Issued", "Usage", "Return", "Final Balance"],
  [itemName, unit, 4, issued, 1, 0, issued, 1, 0, 5],
];

const monthlyValues = (endingWip: number, itemName = "C-Hook(NOS)") => [
  ["MATERIAL BALANCE SHEET FOR NEW CONNECTION"],
  ["No", "Item", "Opening Balance", "Stock Issued", null, "In hand End of the month", "Material used for invoice", "Ending WIP Material"],
  [1, itemName, 4, 2, null, endingWip, 1, endingWip],
];

describe("Material Balance stock import", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates one daily invoice, reconciles month-end stock, and stays idempotent", async () => {
    const fixture = createFixture();
    mockPrisma.materialBalanceImport.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "import-1" });
    mockPrisma.$transaction.mockImplementation(async (callback: (value: unknown) => unknown) => callback(fixture.tx));

    const first = await importMaterialBalanceValues({
      connectionId: "connection-1",
      month: 8,
      year: 2026,
      values: dailyValues(2),
      monthlyValues: monthlyValues(5),
      createdById: "profile-1",
    });
    const second = await importMaterialBalanceValues({
      connectionId: "connection-1",
      month: 8,
      year: 2026,
      values: dailyValues(2),
      monthlyValues: monthlyValues(5),
      createdById: "profile-1",
    });

    expect(first.imported).toBe(true);
    expect(first.dailyIssueInvoiceCount).toBe(1);
    expect(first.reconciliationCount).toBe(1);
    expect(fixture.getStock()).toBe(5);
    expect(fixture.invoices.filter((invoice) => invoice.sourceType === "google_material_balance_issue")).toHaveLength(1);
    expect(fixture.invoices).toHaveLength(2);
    expect(fixture.stockEvents).toHaveLength(2);
    expect(second.skipped).toBe(true);
    expect(second.updatedStockCount).toBe(0);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it("creates a missing item and updates the same daily invoice on a changed sync", async () => {
    const fixture = createFixture();
    mockPrisma.materialBalanceImport.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockPrisma.$transaction.mockImplementation(async (callback: (value: unknown) => unknown) => callback(fixture.tx));

    await importMaterialBalanceValues({
      connectionId: "connection-2",
      month: 8,
      year: 2026,
      values: dailyValues(2, "U-Clip(NOS)"),
      monthlyValues: monthlyValues(5, "U-Clip(NOS)"),
      createdById: "profile-1",
    });
    fixture.tx.materialBalanceImport.findUnique.mockResolvedValue(null);
    const second = await importMaterialBalanceValues({
      connectionId: "connection-2",
      month: 8,
      year: 2026,
      values: dailyValues(4, "U-Clip(NOS)"),
      monthlyValues: monthlyValues(7, "U-Clip(NOS)"),
      createdById: "profile-1",
    });

    expect(fixture.inventoryItems.some((item) => item.name === "U-Clip")).toBe(true);
    expect(fixture.invoices.filter((invoice) => invoice.sourceType === "google_material_balance_issue")).toHaveLength(1);
    expect(fixture.invoices.filter((invoice) => invoice.sourceType === "google_material_balance_adjustment")).toHaveLength(0);
    expect(second.dailyIssueInvoiceUpdateCount).toBe(1);
    expect(fixture.invoiceItems.find((item) => item.itemId === fixture.inventoryItems.find((candidate) => candidate.name === "U-Clip")?.id)?.quantityIssued).toBe(4);
  });

  it("does not change stock or create invoices when the month-end tab is missing", async () => {
    const fixture = createFixture();
    fixture.tx.materialBalanceImport.update.mockResolvedValue({
      id: "import-missing-month",
      importedAt: new Date("2026-08-09T00:00:00.000Z"),
      status: "warning",
      sourceDayCount: 1,
      itemCount: 1,
      mappedItemCount: 1,
      unmappedItemCount: 0,
      updatedStockCount: 0,
      dailyIssueInvoiceCount: 0,
      dailyIssueInvoiceUpdateCount: 0,
      dailyIssueInvoiceReversalCount: 0,
      correctionInvoiceCount: 0,
      reconciliationCount: 0,
      monthlySourceTab: "Material Balance - Month",
      monthlyChecksum: null,
      monthlyItemCount: 0,
      stockChanges: [],
      warnings: ["Material Balance - Month is required before automatic stock invoices can be applied"],
      discrepancies: [],
    });
    mockPrisma.materialBalanceImport.findUnique.mockResolvedValueOnce(null);
    mockPrisma.$transaction.mockImplementationOnce(async (callback: (value: unknown) => unknown) => callback(fixture.tx));

    const result = await importMaterialBalanceValues({
      connectionId: "connection-missing-month",
      month: 8,
      year: 2026,
      values: dailyValues(2),
      createdById: "profile-1",
    });

    expect(result.status).toBe("warning");
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("Material Balance - Month is required"),
    ]));
    expect(fixture.getStock()).toBe(2);
    expect(fixture.invoices).toHaveLength(0);
  });

  it("skips a missing sheet row when both month-end and issued values are zero", async () => {
    const fixture = createFixture();
    mockPrisma.materialBalanceImport.findUnique.mockResolvedValueOnce(null);
    mockPrisma.$transaction.mockImplementationOnce(async (callback: (value: unknown) => unknown) => callback(fixture.tx));

    const result = await importMaterialBalanceValues({
      connectionId: "connection-zero-only",
      month: 8,
      year: 2026,
      values: dailyValues(0, "Missing Zero Item(NOS)"),
      monthlyValues: monthlyValues(0, "Missing Zero Item(NOS)"),
      createdById: "profile-1",
    });

    expect(fixture.tx.materialBalanceItem.create).not.toHaveBeenCalled();
    expect(fixture.inventoryItems.some((item) => item.name === "Missing Zero Item")).toBe(false);
    expect(fixture.invoices).toHaveLength(0);
  });

  it("keeps a same-name material with a different unit separate", async () => {
    const fixture = createFixture();
    mockPrisma.materialBalanceImport.findUnique.mockResolvedValueOnce(null);
    mockPrisma.$transaction.mockImplementationOnce(async (callback: (value: unknown) => unknown) => callback(fixture.tx));

    await importMaterialBalanceValues({
      connectionId: "connection-unit-variant",
      month: 8,
      year: 2026,
      values: dailyValues(2, "C-Hook(M)", "M"),
      monthlyValues: monthlyValues(5, "C-Hook(M)"),
      createdById: "profile-1",
    });

    expect(fixture.inventoryItems.some((item) => item.name === "C-Hook (M)" && item.unit === "M")).toBe(true);
    expect(fixture.inventoryItems.find((item) => item.name === "C-Hook")?.currentStock).toBe(2);
  });
});
