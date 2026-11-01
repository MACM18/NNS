jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/lib/google-sheet-line-sync", () => ({ currentConnectionForDate: jest.fn() }));
jest.mock("@/lib/material-balance-service", () => ({
  normalizeMaterialSourceName: (value: string) => value.toLowerCase().replace(/[^a-z]/g, ""),
  parseMaterialBalanceValues: jest.fn(),
}));
jest.mock("@/lib/google-sheets-client", () => ({ getGoogleSheetsClient: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ __esModule: true, default: {
  googleSheetIssuedSync: { findUnique: jest.fn(), updateMany: jest.fn() },
  googleSheetConnection: { findUnique: jest.fn() },
  materialBalanceItemMapping: { findMany: jest.fn() },
  googleSheetInvoiceContribution: { findMany: jest.fn() },
} }));

import prisma from "@/lib/prisma";
import { getGoogleSheetsClient } from "@/lib/google-sheets-client";
import { parseMaterialBalanceValues } from "@/lib/material-balance-service";
import { processIssuedWrite } from "@/lib/google-sheet-issued-sync";

const db = prisma as unknown as {
  googleSheetIssuedSync: { findUnique: jest.Mock; updateMany: jest.Mock };
  googleSheetConnection: { findUnique: jest.Mock };
  materialBalanceItemMapping: { findMany: jest.Mock };
  googleSheetInvoiceContribution: { findMany: jest.Mock };
};

function fixture(sheetValue: number, ownedValue: number | null) {
  db.googleSheetIssuedSync.findUnique.mockResolvedValue({
    id: "sync-1", connectionId: "connection-1", sourceDate: new Date("2026-11-01T00:00:00.000Z"),
    inventoryItemId: "item-1", status: "pending", revision: 1, sheetValue: ownedValue,
  });
  db.googleSheetIssuedSync.updateMany.mockResolvedValue({ count: 1 });
  db.googleSheetConnection.findUnique.mockResolvedValue({ sheetId: "spreadsheet-1", sheetUrl: "", month: 11, year: 2026 });
  db.materialBalanceItemMapping.findMany.mockResolvedValue([{ normalizedSourceName: "chook" }]);
  db.googleSheetInvoiceContribution.findMany.mockResolvedValue([{ quantity: 4 }, { quantity: 3 }]);
  (parseMaterialBalanceValues as jest.Mock).mockReturnValue({ items: [{
    sourceItemName: "C-Hook", sourceRow: 3,
    dailyEntries: [{ date: "2026-11-01", issued: sheetValue, sourceColumn: 2 }],
  }] });
  const sheets = { spreadsheets: { values: {
    get: jest.fn().mockResolvedValue({ data: { values: [] } }),
    update: jest.fn().mockResolvedValue({}),
  } } };
  (getGoogleSheetsClient as jest.Mock).mockResolvedValue(sheets);
  return sheets;
}

beforeEach(() => jest.clearAllMocks());

it("holds a nonempty unowned Issued cell for manager review", async () => {
  const sheets = fixture(5, null);
  await processIssuedWrite("sync-1");
  expect(sheets.spreadsheets.values.update).not.toHaveBeenCalled();
  expect(db.googleSheetIssuedSync.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: "review", observedValue: 5 }),
  }));
});

it("replaces an owned Issued cell with the sum of app invoices", async () => {
  const sheets = fixture(5, 5);
  await processIssuedWrite("sync-1");
  expect(sheets.spreadsheets.values.update).toHaveBeenCalledWith(expect.objectContaining({
    range: "'Material Balance'!D3", requestBody: { values: [[7]] },
  }));
  expect(db.googleSheetIssuedSync.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: "synced", appQuantity: 7 }),
  }));
});
