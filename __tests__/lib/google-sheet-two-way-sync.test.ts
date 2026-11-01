jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    googleSheetLineSync: { findUnique: jest.fn(), updateMany: jest.fn(), delete: jest.fn() },
    lineDetails: { findUnique: jest.fn() },
    googleSheetConnection: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/google-sheets-client", () => ({ getGoogleSheetsClient: jest.fn() }));

import prisma from "@/lib/prisma";
import { getGoogleSheetsClient } from "@/lib/google-sheets-client";
import { canRemoveMissingSheetLine, clearApprovedDeletedLine, lineSnapshot, processLineWrite } from "@/lib/google-sheet-line-sync";

const db = prisma as unknown as {
  googleSheetLineSync: { findUnique: jest.Mock; updateMany: jest.Mock; delete: jest.Mock };
  lineDetails: { findUnique: jest.Mock };
  googleSheetConnection: { findUnique: jest.Mock };
};

function fixture(sheetName: string) {
  const headers = Array(46).fill("");
  headers[2] = "Number";
  headers[6] = "Name";
  const row = Array(46).fill("");
  row[2] = "0342212345";
  row[6] = sheetName;
  row[45] = "line-1";
  const sheets = {
    spreadsheets: {
      values: { get: jest.fn().mockResolvedValue({ data: { values: [headers, row] } }), batchUpdate: jest.fn().mockResolvedValue({}) },
      get: jest.fn().mockResolvedValue({ data: { sheets: [
        { properties: { sheetId: 1, title: "All", gridProperties: { rowCount: 100 } } },
        { properties: { sheetId: 2, title: "Drum Number", gridProperties: { rowCount: 100 } } },
      ] } }),
      batchUpdate: jest.fn().mockResolvedValue({}),
    },
  };
  (getGoogleSheetsClient as jest.Mock).mockResolvedValue(sheets);
  db.googleSheetLineSync.findUnique.mockResolvedValue({
    lineId: "line-1", connectionId: "connection-1", status: "pending", revision: 1,
    sheetRow: 2, pendingOperation: "upsert", pendingFields: ["name"], baseline: { name: "Old name", telephoneNo: "0342212345" },
    drumBaseline: {},
  });
  db.googleSheetLineSync.updateMany.mockResolvedValue({ count: 1 });
  db.lineDetails.findUnique.mockResolvedValue({ id: "line-1", telephoneNo: "0342212345", name: "New name", date: new Date("2026-11-01") });
  db.googleSheetConnection.findUnique.mockResolvedValue({ sheetId: "spreadsheet-1", sheetUrl: "" });
  return sheets;
}

beforeEach(() => jest.clearAllMocks());

it("removes only confirmed untouched sheet-origin lines", () => {
  const line = { id: "line-1", telephoneNo: "0342212345", name: "Customer", date: new Date("2026-11-01") };
  const baseline = lineSnapshot(line);
  expect(canRemoveMissingSheetLine({ origin: "sheet", appTouched: false, status: "synced", baseline }, line)).toBe(true);
  expect(canRemoveMissingSheetLine({ origin: "legacy_unknown", appTouched: false, status: "synced", baseline }, line)).toBe(false);
  expect(canRemoveMissingSheetLine({ origin: "app", appTouched: false, status: "synced", baseline }, line)).toBe(false);
  expect(canRemoveMissingSheetLine({ origin: "sheet", appTouched: true, status: "synced", baseline }, line)).toBe(false);
  expect(canRemoveMissingSheetLine({ origin: "sheet", appTouched: false, status: "synced", baseline }, { ...line, name: "Edited in NNS" })).toBe(false);
});

it("writes changed input cells without touching the All formula columns", async () => {
  const sheets = fixture("Old name");
  await processLineWrite("line-1");
  const writes = sheets.spreadsheets.values.batchUpdate.mock.calls[0][0].requestBody.data;
  expect(writes).toContainEqual({ range: "'All'!G2", values: [["New name"]] });
  expect(writes.some((write: { range: string }) => /'All'![LMN]2/.test(write.range))).toBe(false);
  expect(db.googleSheetLineSync.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "synced" }) }));
});

it("requires review when the same field changed in the sheet and app", async () => {
  const sheets = fixture("Different sheet edit");
  await processLineWrite("line-1");
  expect(sheets.spreadsheets.values.batchUpdate).not.toHaveBeenCalled();
  expect(db.googleSheetLineSync.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: "review", conflictFields: ["name"] }),
  }));
});

it("adds a new row while copying the All and Drum Number formulas", async () => {
  const sheets = fixture("Another customer");
  db.googleSheetLineSync.findUnique.mockResolvedValue({
    lineId: "line-1", connectionId: "connection-1", status: "pending", revision: 1,
    sheetRow: null, pendingOperation: "upsert", pendingFields: ["telephoneNo", "name", "drumNumber", "wastage"],
    baseline: {}, drumBaseline: {},
  });
  sheets.spreadsheets.values.get.mockImplementation(async ({ range }: { range: string }) => {
    if (range.startsWith("'Drum Number'")) return { data: { values: [] } };
    const headers = Array(46).fill("");
    headers[2] = "Number"; headers[6] = "Name";
    const existing = Array(46).fill(""); existing[2] = "0342299999"; existing[6] = "Another customer";
    return { data: { values: [headers, existing] } };
  });
  await processLineWrite("line-1");
  const formulaCopies = sheets.spreadsheets.batchUpdate.mock.calls[0][0].requestBody.requests
    .filter((request: { copyPaste?: unknown }) => request.copyPaste);
  expect(formulaCopies).toHaveLength(2);
  expect(formulaCopies[0].copyPaste.destination.startRowIndex).toBe(2);
  expect(formulaCopies[1].copyPaste.destination.startRowIndex).toBe(2);
});

it("finds an older deleted line by phone and clears inputs without clearing formulas", async () => {
  db.googleSheetLineSync.findUnique.mockResolvedValue({
    lineId: "line-1", connectionId: "connection-1", sheetRow: null,
    pendingOperation: "delete", baseline: { telephoneNo: "0342212345" },
  });
  db.googleSheetConnection.findUnique.mockResolvedValue({ sheetId: "spreadsheet-1", sheetUrl: "" });
  const headers = Array(46).fill(""); headers[2] = "Number";
  const row = Array(46).fill(""); row[2] = "0342212345"; row[45] = "line-1";
  const sheet = { spreadsheets: { values: {
    get: jest.fn().mockResolvedValueOnce({ data: { values: [headers, row] } }).mockResolvedValueOnce({ data: { values: [row] } }),
    batchClear: jest.fn().mockResolvedValue({}),
  } } };
  (getGoogleSheetsClient as jest.Mock).mockResolvedValue(sheet);

  await clearApprovedDeletedLine("line-1");
  const ranges = sheet.spreadsheets.values.batchClear.mock.calls[0][0].requestBody.ranges;
  expect(ranges).toEqual(["'All'!B2:K2", "'All'!O2:AS2", "'All'!AT2", "'Drum Number'!F2:G2"]);
  expect(db.googleSheetLineSync.delete).toHaveBeenCalledWith({ where: { lineId: "line-1" } });
});
