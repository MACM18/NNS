import "server-only";
import prisma from "@/lib/prisma";
import { currentConnectionForDate } from "@/lib/google-sheet-line-sync";
import { getGoogleSheetsClient } from "@/lib/google-sheets-client";
import { normalizeMaterialSourceName, parseMaterialBalanceValues } from "@/lib/material-balance-service";

const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const sameNumber = (a: unknown, b: unknown) => Math.abs(Number(a || 0) - Number(b || 0)) < 0.000001;

function columnName(index: number) {
  let result = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + (n - 1) % 26) + result;
  return result;
}

// Only invoices touched after this migration are registered. This deliberately
// avoids backfilling historical receipts into a sheet without a review.
export async function queueInventoryInvoice(invoiceId: string, db: any = prisma, allowHistorical = false) {
  const invoice = await db.inventoryInvoice.findUnique({ where: { id: invoiceId }, include: { items: true } });
  if (!invoice || invoice.isSystemGenerated) return;
  const old = await db.googleSheetInvoiceContribution.findMany({ where: { invoiceId } });
  const connection = await currentConnectionForDate(invoice.date, db) ||
    (old.some((entry: any) => dateKey(entry.sourceDate) === dateKey(invoice.date)) ? await db.googleSheetConnection.findUnique({ where: { id: old[0].connectionId } }) : null) ||
    (allowHistorical ? await db.googleSheetConnection.findFirst({ where: { year: invoice.date.getUTCFullYear(), month: invoice.date.getUTCMonth() + 1, status: "active" }, orderBy: { createdAt: "desc" } }) : null);
  const totals = new Map<string, number>();
  for (const item of invoice.items) {
    if (!item.itemId) continue;
    totals.set(item.itemId, (totals.get(item.itemId) || 0) + Number(item.quantityIssued || 0));
  }
  await db.googleSheetInvoiceContribution.deleteMany({ where: { invoiceId } });
  for (const [inventoryItemId, quantity] of totals) {
    if (!connection) continue;
    if (quantity) await db.googleSheetInvoiceContribution.create({ data: {
      invoiceId, inventoryItemId, connectionId: connection.id, sourceDate: invoice.date, quantity,
    } });
  }
  const affected = new Set([...old.map((item: any) => `${item.connectionId}:${dateKey(item.sourceDate)}:${item.inventoryItemId}`),
    ...(connection ? [...totals.keys()].map((itemId) => `${connection.id}:${dateKey(invoice.date)}:${itemId}`) : [])]);
  for (const key of affected) {
    const [connectionId, day, inventoryItemId] = key.split(":");
    const where = { connectionId_sourceDate_inventoryItemId: { connectionId, sourceDate: new Date(`${day}T00:00:00.000Z`), inventoryItemId } };
    const prior = await db.googleSheetIssuedSync.findUnique({ where });
    await db.googleSheetIssuedSync.upsert({
      where,
      create: { connectionId, sourceDate: new Date(`${day}T00:00:00.000Z`), inventoryItemId, status: "pending", revision: 1 },
      update: { status: prior?.status === "review" ? "review" : "pending", lastError: prior?.status === "review" ? prior.lastError : null, revision: { increment: 1 } },
    });
  }
}

export async function removeInventoryInvoiceContributions(invoiceId: string, db: any = prisma) {
  const old = await db.googleSheetInvoiceContribution.findMany({ where: { invoiceId } });
  await db.googleSheetInvoiceContribution.deleteMany({ where: { invoiceId } });
  for (const item of old) {
    const where = { connectionId_sourceDate_inventoryItemId: { connectionId: item.connectionId, sourceDate: item.sourceDate, inventoryItemId: item.inventoryItemId } };
    const prior = await db.googleSheetIssuedSync.findUnique({ where });
    await db.googleSheetIssuedSync.upsert({
      where,
      create: { connectionId: item.connectionId, sourceDate: item.sourceDate, inventoryItemId: item.inventoryItemId, status: "pending", revision: 1 },
      update: { status: prior?.status === "review" ? "review" : "pending", lastError: prior?.status === "review" ? prior.lastError : null, revision: { increment: 1 } },
    });
  }
}

export async function processIssuedWrite(id: string) {
  const state = await prisma.googleSheetIssuedSync.findUnique({ where: { id } });
  if (!state || state.status !== "pending") return;
  const claim = await prisma.googleSheetIssuedSync.updateMany({ where: { id, revision: state.revision, status: "pending" }, data: { status: "writing" } });
  if (!claim.count) return;
  const connection = await prisma.googleSheetConnection.findUnique({ where: { id: state.connectionId }, select: { sheetId: true, sheetUrl: true, month: true, year: true } });
  if (!connection) {
    await prisma.googleSheetIssuedSync.updateMany({ where: { id, revision: state.revision, status: "writing" }, data: { status: "review", lastError: "Sheet connection is no longer available" } });
    return;
  }
  const spreadsheetId = connection.sheetId || connection.sheetUrl.match(/\/spreadsheets\/d\/([^/]+)/)?.[1];
  if (!spreadsheetId) {
    await prisma.googleSheetIssuedSync.updateMany({ where: { id, revision: state.revision, status: "writing" }, data: { status: "review", lastError: "Connected spreadsheet ID is missing" } });
    return;
  }
  try {
    const sheet = await getGoogleSheetsClient();
    const [response, mappings, contributions] = await Promise.all([
      sheet.spreadsheets.values.get({ spreadsheetId, range: "'Material Balance'!A:ZZ", valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "SERIAL_NUMBER" }),
      prisma.materialBalanceItemMapping.findMany({ where: { inventoryItemId: state.inventoryItemId } }),
      prisma.googleSheetInvoiceContribution.findMany({ where: { connectionId: state.connectionId, sourceDate: state.sourceDate, inventoryItemId: state.inventoryItemId } }),
    ]);
    const parsed = parseMaterialBalanceValues((response.data.values || []) as unknown[][], connection.month, connection.year);
    const matches = parsed.items.filter((item) => mappings.some((mapping) => mapping.normalizedSourceName === normalizeMaterialSourceName(item.sourceItemName)));
    if (matches.length !== 1) {
      await prisma.googleSheetIssuedSync.updateMany({ where: { id, revision: state.revision, status: "writing" }, data: { status: "review", lastError: matches.length ? "Multiple Material Balance rows map to this item" : "Map this inventory item to exactly one Material Balance row" } });
      return;
    }
    const item = matches[0];
    const day = item.dailyEntries.find((entry) => entry.date === dateKey(state.sourceDate));
    if (!day) throw new Error("The invoice date has no daily Material Balance columns");
    const current = day.issued;
    const desired = contributions.reduce((total, entry) => total + Number(entry.quantity), 0);
    if ((state.sheetValue === null && current !== 0) || (state.sheetValue !== null && !sameNumber(current, state.sheetValue))) {
      await prisma.googleSheetIssuedSync.updateMany({ where: { id, revision: state.revision, status: "writing" }, data: {
        status: "review", observedValue: current, sheetRow: item.sourceRow, sheetColumn: day.sourceColumn + 1,
        lastError: "Issued has a sheet value that needs manager approval before replacement",
      } });
      return;
    }
    const column = columnName(day.sourceColumn + 1);
    if (!sameNumber(current, desired)) await sheet.spreadsheets.values.update({
      spreadsheetId, range: `'Material Balance'!${column}${item.sourceRow}`,
      valueInputOption: "RAW", requestBody: { values: [[desired || ""]] },
    });
    await prisma.googleSheetIssuedSync.updateMany({ where: { id, revision: state.revision, status: "writing" }, data: {
      status: "synced", sheetRow: item.sourceRow, sheetColumn: day.sourceColumn + 1,
      sheetValue: desired, observedValue: null, appQuantity: desired,
      lastError: null, lastSyncedAt: new Date(),
    } });
  } catch (error) {
    await prisma.googleSheetIssuedSync.updateMany({ where: { id, revision: state.revision, status: "writing" }, data: {
      status: "pending", lastError: error instanceof Error ? error.message.slice(0, 300) : "Sheet write failed",
    } });
  }
}

export async function processPendingIssuedWrites(connectionId?: string) {
  await prisma.googleSheetIssuedSync.updateMany({ where: { status: "writing", updatedAt: { lt: new Date(Date.now() - 5 * 60_000) }, ...(connectionId ? { connectionId } : {}) }, data: { status: "pending" } });
  const pending = await prisma.googleSheetIssuedSync.findMany({ where: { status: "pending", ...(connectionId ? { connectionId } : {}) }, take: 100, orderBy: { updatedAt: "asc" } });
  for (const state of pending) await processIssuedWrite(state.id);
  return pending.length;
}
